"use client";

/**
 * 面接セッションで OpenAI Realtime API を使うための React フック。
 *
 * 現状サポート:
 * - 個人 / プレゼン / 口頭試問モード: 単一セッションで WebRTC 接続
 * - 集団討論 (GD): Phase 1 ではフォールバック扱い (今後 GdOrchestrator で並列対応)
 *
 * 使い方:
 * ```tsx
 * const rt = useRealtimeInterview({ mode, universityName, ... });
 * // rt.status === "ready" になったら rt.start() でセッション開始
 * // 終了時は rt.stop()
 * // メッセージは rt.messages で購読
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { RealtimeSession } from "@/lib/interview/realtime/client";
import { GdOrchestrator, type GdOrchestratorTokens } from "@/lib/interview/realtime/gd-orchestrator";
import type { ActiveSpeaker } from "@/lib/interview/realtime/gd-director";
import { buildWhisperPrompt } from "@/lib/interview/whisper-context";
import type { InterviewMessage, InterviewMode } from "@/lib/types/interview";

/** AI 発話終了からマイクを再開するまでの待機時間 (末尾エコー対策) */
const MIC_RESUME_DELAY_MS = 1000;

/**
 * transcript が transcription prompt の漏れ (echo + prompt hallucination) と思われる場合 true。
 * 完全一致または 90% 以上一致を「漏れ」とみなして破棄する。
 */
function isPromptEcho(transcript: string, prompt: string): boolean {
  const t = transcript.trim();
  const p = prompt.trim();
  if (!t || !p) return false;
  if (t === p) return true;
  // どちらかが他方を 90% 以上含めば漏れとみなす
  const longer = t.length > p.length ? t : p;
  const shorter = t.length > p.length ? p : t;
  if (shorter.length === 0) return false;
  let match = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) match++;
  }
  return match / shorter.length >= 0.9 && shorter.length >= 30;
}

/** 文字起こし結果が咳/息などの非言語ノイズと思われる場合 true（実発話の誤破棄を避け保守的に判定）。 */
const NOISE_HALLUCINATIONS = new Set([
  "ご視聴ありがとうございました",
  "ご視聴ありがとうございました。",
  "ご清聴ありがとうございました",
  "ご清聴ありがとうございました。",
  "おやすみなさい",
  "おやすみなさい。",
]);
function isLikelyNoise(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  // 句読点・記号・空白を除去した実質文字数が 1 以下（咳→「ん」「。」「…」等）
  const core = t.replace(/[\s。、，．,.!?！？…‥・「」『』（）()\[\]【】〜~ー-]/g, "");
  if (core.length <= 1) return true;
  // 無音区間で出やすい既知の定型ハルシネーション（面接で実際に言う表現は含めない）
  if (NOISE_HALLUCINATIONS.has(t)) return true;
  return false;
}

export type RealtimeStatus =
  | "idle"
  | "requesting_token"
  | "connecting"
  | "connected"
  | "fallback_rate_limited"
  | "fallback_error"
  | "closed";

interface UseRealtimeInterviewOptions {
  mode: InterviewMode;
  /** トークン発行エンドポイント。既定は模擬面接用。スキルチェック等で差し替える */
  tokenEndpoint?: string;
  universityId?: string;
  facultyId?: string;
  universityName: string;
  facultyName: string;
  admissionPolicy: string;
  weaknessList?: string;
  presentationContent?: string;
  /** 毎メッセージ追加時に呼ばれる (会話履歴を上位コンポーネントにシンクしたい場合) */
  onMessageAppend?: (message: InterviewMessage) => void;
  /**
   * 直近の AI メッセージの content / isThinking を更新するときに呼ばれる。
   * 考え中バブルの差し替えなど「最後の AI バブル」を扱う場面で使う。
   *
   * 注意: delta ストリーミング用途には使わないこと。複数 response が並行発火する
   * 状況で「最後のバブル」は対象 responseId と一致するとは限らず、誤上書きが起きる。
   * delta は onMessageUpdateByResponseId を使う。
   */
  onMessageUpdateLast?: (patch: { content?: string; isThinking?: boolean }) => void;
  /**
   * 特定 responseId に紐づく AI メッセージを更新するときに呼ばれる。
   * page.tsx 側で messages を独自管理する場合、responseId 指定で安全に
   * update できる (並行 response 時の最後のバブル誤上書きを防ぐ)。
   */
  onMessageUpdateByResponseId?: (
    responseId: string,
    patch: { content?: string; isThinking?: boolean }
  ) => void;
}

interface RealtimeStartResult {
  success: boolean;
  fallback?: "rate_limited" | "error";
  nextAvailableAt?: string;
}

export function useRealtimeInterview(options: UseRealtimeInterviewOptions) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  /**
   * 現在の発話ターン (GD モードのみ更新)。"user" のときは UI 側で
   * 「あなたの番です」表示・マイクランプ点灯に使う。個人面接モードは
   * 常に null (未使用)。
   */
  const [currentSpeaker, setCurrentSpeaker] = useState<ActiveSpeaker | null>(null);
  /**
   * GD モードで AI 発話完了後、「次へ」ボタン待ちかどうか。
   * true の間はユーザーが advanceGdTurn() を呼ぶまで次の話者は話し始めない。
   * 被り対策として AI 発話の自動進行を撤去した代わりの UI フック。
   */
  const [isAwaitingNext, setIsAwaitingNext] = useState(false);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const orchestratorRef = useRef<GdOrchestrator | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const optsRef = useRef(options);
  /** AI 応答中フラグ。マイク制御 (mute/unmute) に使う */
  const isAiRespondingRef = useRef(false);
  /**
   * AI transcript ストリーミング中フラグ。
   * 初回 delta で append、以降 update last、done でリセット。
   * response.created で勝手にバブルを生やすと多重化するため、
   * バブル生成は必ず first-delta タイミングで行う。
   */
  const isAiStreamingRef = useRef(false);
  /** マイク再開予定の setTimeout ID (AI 応答終了後に再開) */
  const micResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * 既に AI バブルを append 済みの responseId 集合。
   *
   * Why: setMessages 内の closure で `exists` 判定すると React 18 の batching で
   * state 反映前に連続 delta が走り、毎回 false 判定 → delta ごとに新バブルが
   * 増殖する (個人面接で挨拶が 1 文字ずつ別バブルになる事故の原因)。
   * useRef は同期更新なので連続 delta でも 2 回目以降は必ず has() === true に
   * なり、update 側に分岐できる。
   */
  const seenResponseIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    const stream = micStreamRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.enabled = enabled;
    }
  }, []);

  const appendMessage = useCallback((m: InterviewMessage) => {
    setMessages((prev) => [...prev, m]);
    optsRef.current.onMessageAppend?.(m);
  }, []);

  const updateLastAiMessage = useCallback((patch: { content?: string; isThinking?: boolean }) => {
    setMessages((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].role !== "ai") return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
      return copy;
    });
    optsRef.current.onMessageUpdateLast?.(patch);
  }, []);

  /**
   * responseId に紐づく AI メッセージを更新する (複数 response 並行時の正確な対応用)。
   * 同 responseId のメッセージが見つからなければ何もしない (呼び出し側で append 判断)。
   *
   * hook 内 messages と page.tsx 側 messages は別管理なので、page.tsx にも
   * update 通知を流す必要がある。**onMessageUpdateLast は使わない** (並行 response
   * 時に「最後の AI = 別 response のバブル」を誤上書きする事故が起きるため、
   * responseId 指定の onMessageUpdateByResponseId に統一)。
   */
  const updateAiMessageByResponseId = useCallback(
    (responseId: string, patch: { content?: string; isThinking?: boolean }) => {
      setMessages((prev) => {
        const idx = prev.findLastIndex(
          (m) => m.role === "ai" && m.responseId === responseId,
        );
        if (idx < 0) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...patch };
        return copy;
      });
      optsRef.current.onMessageUpdateByResponseId?.(responseId, patch);
    },
    [],
  );

  /**
   * GD モードで「次へ」ボタン押下時に呼ぶ。AI 発話完了後に立っている
   * isAwaitingNext を解除し、orchestrator に次の話者へ進むよう依頼する。
   * 個人面接モードでは no-op (orchestrator が無いため)。
   */
  const advanceGdTurn = useCallback(() => {
    orchestratorRef.current?.advanceTurnManually();
  }, []);

  const stop = useCallback(() => {
    if (micResumeTimerRef.current) {
      clearTimeout(micResumeTimerRef.current);
      micResumeTimerRef.current = null;
    }
    isAiRespondingRef.current = false;
    isAiStreamingRef.current = false;
    seenResponseIdsRef.current.clear();
    setIsAwaitingNext(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (orchestratorRef.current) {
      orchestratorRef.current.close();
      orchestratorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setMicStream(null);
    setStatus("closed");
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const start = useCallback(async (
    startOpts?: { priorMessages?: InterviewMessage[] }
  ): Promise<RealtimeStartResult> => {
    setError(null);
    setStatus("requesting_token");
    // 前回セッションの残骸防止: currentSpeaker を null に明示リセット
    // (これがないと前回の "user" 状態が残ってランプが「あなたの番」のままに見える)
    setCurrentSpeaker(null);
    setIsAwaitingNext(false);
    // 前回セッションの seen responseId をクリア (新セッションで再利用される ID は無いが念のため)
    seenResponseIdsRef.current.clear();

    // 1. ephemeral token を取得
    let tokenData: {
      mode?: string;
      model?: string;
      tokens?: { speaker: string; voice: string; token: string; expiresAt: number }[];
      rateLimited?: boolean;
      nextAvailableAt?: string;
      error?: string;
    };
    try {
      const res = await authFetch(optsRef.current.tokenEndpoint ?? "/api/interview/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: optsRef.current.mode,
          universityId: optsRef.current.universityId,
          facultyId: optsRef.current.facultyId,
          universityName: optsRef.current.universityName,
          facultyName: optsRef.current.facultyName,
          admissionPolicy: optsRef.current.admissionPolicy,
          weaknessList: optsRef.current.weaknessList ?? "（過去の弱点なし）",
          presentationContent: optsRef.current.presentationContent,
        }),
      });
      tokenData = await res.json();
      if (tokenData.rateLimited) {
        setStatus("fallback_rate_limited");
        setNextAvailableAt(tokenData.nextAvailableAt ?? null);
        return { success: false, fallback: "rate_limited", nextAvailableAt: tokenData.nextAvailableAt };
      }
      if (!res.ok || !tokenData.tokens || tokenData.tokens.length === 0) {
        const debugInfo = (tokenData as { debug?: unknown }).debug;
        console.warn("[useRealtimeInterview] token fetch rejected", res.status, tokenData);
        const detail = debugInfo ? JSON.stringify(debugInfo).slice(0, 300) : tokenData.error ?? `HTTP ${res.status}`;
        throw new Error(`token: ${detail}`);
      }
    } catch (err) {
      console.warn("[useRealtimeInterview] token fetch failed", err);
      setStatus("fallback_error");
      setError(err instanceof Error ? err.message : "token fetch failed");
      return { success: false, fallback: "error" };
    }

    // 2. マイクを取得 (エコー除去・ノイズ抑制を明示してクリア化)
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000, // Realtime API は 24kHz mono pcm16
        },
      });
      micStreamRef.current = micStream;
      setMicStream(micStream);
    } catch (err) {
      console.warn("[useRealtimeInterview] mic access failed", err);
      setStatus("fallback_error");
      setError("マイクへのアクセスが拒否されました");
      return { success: false, fallback: "error" };
    }

    // 3. WebRTC 接続
    setStatus("connecting");
    try {
      const model = tokenData.model ?? "gpt-4o-mini-realtime-preview-2024-12-17";

      if (optsRef.current.mode === "group_discussion") {
        // GD: 3 並列セッションを GdOrchestrator で束ねる
        const gdTokens: GdOrchestratorTokens[] = tokenData.tokens.map((t) => ({
          speaker: t.speaker as ActiveSpeaker,
          voice: t.voice,
          token: t.token,
        }));
        const orch = new GdOrchestrator({
          tokens: gdTokens,
          model,
          micStream,
          // 接続後に各セッションに hidden 注入する背景情報 (instructions 分離化)
          contextMessage:
            typeof (tokenData as { contextMessage?: string }).contextMessage === "string"
              ? (tokenData as { contextMessage?: string }).contextMessage
              : null,
          onMessageAppend: appendMessage,
          onMessageUpdateLast: updateLastAiMessage,
          onAiRespondingChange: (isResponding) => {
            isAiRespondingRef.current = isResponding;
            if (isResponding) {
              // AI が話し始めたら必ず mic OFF (タイマーを消してキャンセル)
              if (micResumeTimerRef.current) {
                clearTimeout(micResumeTimerRef.current);
                micResumeTimerRef.current = null;
              }
              setMicEnabled(false);
            }
            // 注: AI 終了時は何もしない。マイクの ON/OFF は onTurnChange に委ねる
          },
          onTurnChange: (nextSpeaker) => {
            // user ターンなら mic ON、それ以外 (moderator / peer) は OFF を維持
            if (micResumeTimerRef.current) {
              clearTimeout(micResumeTimerRef.current);
              micResumeTimerRef.current = null;
            }
            setMicEnabled(nextSpeaker === "user");
            // UI のランプ表示用に現在ターンを公開
            setCurrentSpeaker(nextSpeaker);
            // 次の話者に進んだので「次へ」ボタンは隠す
            setIsAwaitingNext(false);
          },
          onAwaitingNext: () => {
            // AI 発話完了 → ユーザーの「次へ」ボタン押下待ち
            setIsAwaitingNext(true);
          },
          onError: (err) => {
            console.warn("[useRealtimeInterview] GD orchestrator error", err);
            setError(err.message);
          },
        });
        await orch.connect();
        orchestratorRef.current = orch;
        // 接続完了直後: 司会 opening 中はマイク OFF (被って話さないように)
        setMicEnabled(false);
        // 接続完了後、教授から議論をキックオフ
        orch.startOpening();
        setStatus("connected");
        return { success: true };
      }

      // 個人系モード: 単一セッション
      if (!audioElementRef.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        el.setAttribute("playsinline", ""); // iOS Safari 対策 (HTMLAudioElement に playsInline プロパティはないので属性で)
        el.volume = 1.0;
        el.style.display = "none";
        document.body.appendChild(el);
        audioElementRef.current = el;
      }

      // transcription prompt のリーク（エコー → whisper hallucination）検出用
      const transcriptionPrompt = buildWhisperPrompt(
        optsRef.current.facultyName,
        optsRef.current.universityName,
      );

      const session = new RealtimeSession({
        ephemeralToken: tokenData.tokens[0].token,
        model,
        audioOutputElement: audioElementRef.current,
        micStream,
        withMic: true,
        onUserTranscript: (text) => {
          // エコーが whisper に拾われ prompt がリークしたケースを破棄
          if (isPromptEcho(text, transcriptionPrompt)) {
            console.warn("[useRealtimeInterview] dropping echoed transcription-prompt:", text.slice(0, 60));
            return;
          }
          // semantic_vad をすり抜けた咳/息が文字化けして確定したケースを破棄（保険）
          if (isLikelyNoise(text)) {
            console.warn("[useRealtimeInterview] dropping noise-like transcript:", JSON.stringify(text).slice(0, 40));
            return;
          }
          // ユーザー発話が確定したら AI streaming 状態は強制リセット
          isAiStreamingRef.current = false;
          appendMessage({ role: "student", content: text });
          // create_response: false にしたため、AI 応答を明示的に triggerResponse で発火させる。
          // これにより VAD 誤発火 (環境音・呼吸) による自動 response 多重発火を防ぐ。
          sessionRef.current?.triggerResponse();
        },
        onResponseStart: () => {
          // AI が応答開始:
          // 1) サーバー VAD を完全停止 → AI 自身の音声エコーで誤検知 →
          //    新たな response が auto-create される事故を根絶
          // 2) マイクをミュートしてエコーループを断つ
          // 3) サーバー側の入力音声バッファを強制クリア (ミュート前の残留を破棄)
          // バブル生成は意図的に行わない (first-delta で 1 個だけ生やす)
          isAiRespondingRef.current = true;
          if (micResumeTimerRef.current) {
            clearTimeout(micResumeTimerRef.current);
            micResumeTimerRef.current = null;
          }
          setMicEnabled(false);
          try {
            sessionRef.current?.updateSession({ audio: { input: { turn_detection: null } } });
            sessionRef.current?.sendEvent({ type: "input_audio_buffer.clear" });
          } catch {
            /* noop */
          }
        },
        onAssistantTranscriptDelta: (cumulative, responseId) => {
          // 既に append 済みなら update、未 append なら append。
          // setMessages の closure 内で exists 判定すると React batching で
          // 連続 delta が全て false 判定になりバブルが増殖する → useRef で
          // 同期的に「append 済 responseId」を管理して回避。
          const key = responseId ?? "__single__";
          if (seenResponseIdsRef.current.has(key)) {
            updateAiMessageByResponseId(key, { content: cumulative });
          } else {
            seenResponseIdsRef.current.add(key);
            appendMessage({ role: "ai", content: cumulative, responseId: key });
          }
        },
        onAssistantTranscript: (text, responseId) => {
          // 最終 transcript で確定。append 済みなら update、未 append なら append
          // (delta が来なかった場合のフォールバック)。
          const key = responseId ?? "__single__";
          if (seenResponseIdsRef.current.has(key)) {
            updateAiMessageByResponseId(key, { content: text });
          } else {
            seenResponseIdsRef.current.add(key);
            appendMessage({ role: "ai", content: text, responseId: key });
          }
        },
        onResponseEnd: () => {
          isAiRespondingRef.current = false;
          isAiStreamingRef.current = false;
          // 末尾エコー回避のため少し待ってからマイク + VAD を再開。
          // VAD を null にしていると次のユーザー発話を検知しないので、
          // ここで元の server_vad 設定に戻す。
          micResumeTimerRef.current = setTimeout(() => {
            setMicEnabled(true);
            try {
              sessionRef.current?.updateSession({
                audio: {
                  input: {
                    // semantic_vad: 咳/息などの非言語音で発話終了を誤検知しない。
                    // create_response:false にして hook 側 onUserTranscript で
                    // 明示的に triggerResponse を呼ぶ (多重 response 防止)。
                    // ※ ルート初期設定と揃える。これを server_vad に戻すと
                    //   AI 応答後だけ咳に反応する不整合が起きるため semantic_vad で統一。
                    turn_detection: {
                      type: "semantic_vad",
                      eagerness: "low",
                      create_response: false,
                    },
                  },
                },
              });
            } catch {
              /* noop */
            }
            micResumeTimerRef.current = null;
          }, MIC_RESUME_DELAY_MS);
        },
        onError: (err) => {
          console.warn("[useRealtimeInterview] session error", err);
          setError(err.message);
        },
      });
      await session.connect();
      sessionRef.current = session;

      // 履歴から再開した場合: 過去の会話を新セッションに流し込んで文脈継続
      const prior = startOpts?.priorMessages?.filter((m) => m.content?.trim()) ?? [];
      if (prior.length > 0) {
        session.addConversationItem(
          "system",
          "これは前回の面接の続きです。挨拶し直さず、これまでの会話を踏まえて自然に続けてください。",
        );
        for (const m of prior) {
          session.addConversationItem(m.role === "ai" ? "assistant" : "user", m.content);
        }
        // UI 側にも過去会話を表示
        setMessages(prior.map((m) => ({ role: m.role, content: m.content })));
      }

      // 接続後、AI 側から（再開時は文脈を踏まえて）応答を始めるよう指示
      session.triggerResponse();

      setStatus("connected");
      return { success: true };
    } catch (err) {
      console.warn("[useRealtimeInterview] connect failed", err);
      setStatus("fallback_error");
      setError(err instanceof Error ? err.message : "connect failed");
      // マイクストリームは stop 内で解放される
      stop();
      return { success: false, fallback: "error" };
    }
  }, [appendMessage, updateLastAiMessage, updateAiMessageByResponseId, setMicEnabled, stop]);

  return {
    status,
    messages,
    error,
    nextAvailableAt,
    micStream,
    currentSpeaker,
    /** ユーザーが発話してよいタイミングか (GD は currentSpeaker === "user"、個人面接は常に true) */
    isUserTurn: optsRef.current.mode === "group_discussion" ? currentSpeaker === "user" : status === "connected",
    /** GD モードで AI 発話完了後の「次へ」ボタン待ち状態 (個人面接は常に false) */
    isAwaitingNext,
    /** GD モードで「次へ」ボタンが押されたときに呼ぶ */
    advanceGdTurn,
    start,
    stop,
    isActive: status === "connected",
  };
}

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
const MIC_RESUME_DELAY_MS = 500;

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
   * 考え中バブルの差し替えと delta ストリーミングで使う。
   */
  onMessageUpdateLast?: (patch: { content?: string; isThinking?: boolean }) => void;
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

  const sessionRef = useRef<RealtimeSession | null>(null);
  const orchestratorRef = useRef<GdOrchestrator | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const optsRef = useRef(options);
  /** AI 応答中フラグ。考え中バブル → delta → done の差し替えと、マイク制御に使う */
  const isAiRespondingRef = useRef(false);
  /** マイク再開予定の setTimeout ID (AI 応答終了後 500ms に再開) */
  const micResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const stop = useCallback(() => {
    if (micResumeTimerRef.current) {
      clearTimeout(micResumeTimerRef.current);
      micResumeTimerRef.current = null;
    }
    isAiRespondingRef.current = false;
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

  const start = useCallback(async (): Promise<RealtimeStartResult> => {
    setError(null);
    setStatus("requesting_token");

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
      const res = await authFetch("/api/interview/realtime-session", {
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
          onMessageAppend: appendMessage,
          onMessageUpdateLast: updateLastAiMessage,
          onAiRespondingChange: (isResponding) => {
            isAiRespondingRef.current = isResponding;
            if (isResponding) {
              if (micResumeTimerRef.current) {
                clearTimeout(micResumeTimerRef.current);
                micResumeTimerRef.current = null;
              }
              setMicEnabled(false);
            } else {
              micResumeTimerRef.current = setTimeout(() => {
                setMicEnabled(true);
                micResumeTimerRef.current = null;
              }, MIC_RESUME_DELAY_MS);
            }
          },
          onError: (err) => {
            console.warn("[useRealtimeInterview] GD orchestrator error", err);
            setError(err.message);
          },
        });
        await orch.connect();
        orchestratorRef.current = orch;
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
          appendMessage({ role: "student", content: text });
        },
        onResponseStart: () => {
          // AI が応答開始: マイクをミュートしてエコーループを断つ
          isAiRespondingRef.current = true;
          if (micResumeTimerRef.current) {
            clearTimeout(micResumeTimerRef.current);
            micResumeTimerRef.current = null;
          }
          setMicEnabled(false);
          // 「考え中」プレースホルダーバブルを生やす
          appendMessage({ role: "ai", content: "", isThinking: true });
        },
        onAssistantTranscriptDelta: (cumulative) => {
          // 部分テキストで考え中バブルを差し替え (タイプライター風)
          updateLastAiMessage({ content: cumulative, isThinking: false });
        },
        onAssistantTranscript: (text) => {
          // 最終 transcript で確定。delta が来なかったケース (考え中のまま) でも置換する
          updateLastAiMessage({ content: text, isThinking: false });
        },
        onResponseEnd: () => {
          isAiRespondingRef.current = false;
          // 末尾エコー回避のため少し待ってからマイクを再開
          micResumeTimerRef.current = setTimeout(() => {
            setMicEnabled(true);
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

      // 接続後、AI 側から挨拶を始めるよう指示
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
  }, [appendMessage, updateLastAiMessage, setMicEnabled, stop]);

  return {
    status,
    messages,
    error,
    nextAvailableAt,
    micStream,
    start,
    stop,
    isActive: status === "connected",
  };
}

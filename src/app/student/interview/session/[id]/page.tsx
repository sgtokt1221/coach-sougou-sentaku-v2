"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, StopCircle, ChevronDown, ChevronUp, Video, VideoOff, Volume2, VolumeX, Pencil, Check, X } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { InterviewMessage, InterviewMode, InterviewInputMode, VoiceAnalysis, VideoAnalysis, AppearanceAnalysis } from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import ContinuousVoiceRecorder from "@/components/interview/ContinuousVoiceRecorder";
import VoiceAnalyzer, { refineWithTranscription } from "@/components/interview/VoiceAnalyzer";
import VideoAnalyzer from "@/components/interview/VideoAnalyzer";
import CameraPreview from "@/components/interview/CameraPreview";
import {
  resolveSpeaker,
  splitIntoUtterances,
  DEFAULT_INTERVIEWER,
  type TtsVoice,
  GD_SPEAKERS,
} from "@/lib/interview/speakers";

interface SessionInfo {
  universityId: string;
  facultyId: string;
  mode: InterviewMode;
  inputMode?: InterviewInputMode;
  universityContext: {
    universityName: string;
    facultyName: string;
    admissionPolicy: string;
  };
  openingMessage: string;
  presentationContent?: string;
  /** サーバーが先行生成したオープニング最初の1文の音声 (base64 MP3) */
  preOpeningAudioBase64?: string;
  preOpeningVoice?: string;
  preOpeningText?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
  const [appearanceAnalysis, setAppearanceAnalysis] = useState<AppearanceAnalysis | null>(null);
  const [appearanceAlert, setAppearanceAlert] = useState<string | null>(null);
  const [gazeAlert, setGazeAlert] = useState<string | null>(null);
  const gazeAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearanceCheckCount = useRef(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  /** 音声自動再生がブロックされた場合に表示するボタン */
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  /** 編集中のメッセージインデックス。null なら編集していない */
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const startEditMessage = useCallback((idx: number) => {
    setEditingIdx(idx);
    setEditDraft(messages[idx]?.content ?? "");
  }, [messages]);

  const commitEditMessage = useCallback(() => {
    if (editingIdx === null) return;
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditingIdx(null);
      return;
    }
    setMessages((prev) =>
      prev.map((m, i) => (i === editingIdx ? { ...m, content: trimmed } : m)),
    );
    setEditingIdx(null);
    setEditDraft("");
  }, [editingIdx, editDraft]);

  const cancelEditMessage = useCallback(() => {
    setEditingIdx(null);
    setEditDraft("");
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  /** 現在再生中の BufferSource をすべて追跡する (連打重複 & 遷移中断対策) */
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  /** unmount 後の非同期コールバック抑止用 */
  const isMountedRef = useRef(true);

  // AudioContextを初期化（Autoplay Policy対策）
  // /new ページで作成された window.__interviewAudioCtx があれば再利用する
  // (クライアントサイドナビゲーションなので window は同一タブで維持される)
  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") return;
    interface WindowWithAudio extends Window {
      __interviewAudioCtx?: AudioContext;
      webkitAudioContext?: typeof AudioContext;
    }
    const win = window as WindowWithAudio;

    if (!audioContextRef.current) {
      if (win.__interviewAudioCtx && win.__interviewAudioCtx.state !== "closed") {
        audioContextRef.current = win.__interviewAudioCtx;
      } else {
        const Ctor = window.AudioContext || win.webkitAudioContext;
        if (Ctor) {
          audioContextRef.current = new Ctor();
          win.__interviewAudioCtx = audioContextRef.current;
        }
      }
    }
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  /**
   * 現在再生中の全 BufferSource を即時停止する。
   * - speakText/speakUtterances の再入時に呼び、音声の重なりを防ぐ
   * - TTS トグル OFF 時、ページ unmount 時にも呼ぶ
   */
  const stopAllAudio = useCallback(() => {
    const sources = activeSourcesRef.current;
    activeSourcesRef.current = [];
    for (const src of sources) {
      try {
        src.onended = null;
        src.stop(0);
      } catch {
        /* 既に停止済み or 未開始なら無視 */
      }
      try {
        src.disconnect();
      } catch {
        /* noop */
      }
    }
    if (isMountedRef.current) {
      setAiSpeaking(false);
    }
  }, []);

  /**
   * 再生用に作成した BufferSource を登録する。
   * onended では自動的に配列から除去し、全て再生完了したら aiSpeaking を落とす。
   */
  const registerSource = useCallback((source: AudioBufferSourceNode, isLast: boolean) => {
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (isLast && activeSourcesRef.current.length === 0 && isMountedRef.current) {
        setAiSpeaking(false);
      }
    };
  }, []);

  /**
   * 長文を文境界で複数チャンクに分割する。
   * - 第1チャンク: 最初の1文だけ(max 80字)にして最初の音を最速で出す
   * - それ以降: 150-250字でまとめる
   */
  const splitIntoChunks = (text: string): string[] => {
    const sentences = text
      .replace(/\r/g, "")
      .split(/(?<=[。！？!?])/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) return [text];
    if (sentences.length === 1) return sentences;

    const chunks: string[] = [];

    // 第1チャンク: 最初の1文だけ(長すぎる場合は読点で区切る)
    const first = sentences[0];
    if (first.length > 80) {
      const parts = first.split(/(?<=、)/);
      chunks.push(parts[0]);
      const rest = parts.slice(1).join("");
      if (rest) chunks.push(rest);
    } else {
      chunks.push(first);
    }

    // 残りの文: 150-250 字でまとめる
    let buf = "";
    for (let i = 1; i < sentences.length; i++) {
      const s = sentences[i];
      if ((buf + s).length > 250 && buf.length >= 100) {
        chunks.push(buf);
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf) chunks.push(buf);
    return chunks;
  };

  /** 1 チャンクを fetch して AudioBuffer を返す (並列実行可能) */
  const fetchChunkAudio = useCallback(async (text: string, voice: TtsVoice): Promise<AudioBuffer | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        console.warn("[TTS] chunk fetch failed:", res.status);
        return null;
      }
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength === 0) return null;

      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === "closed") return null;
      return await ctx.decodeAudioData(buffer.slice(0));
    } catch (err) {
      console.warn("[TTS] chunk decode failed:", err instanceof Error ? err.message : err);
      return null;
    }
  }, []);

  /**
   * テキストを文単位で並列 fetch し、順次 Web Audio API で再生する。
   * 最初のチャンクが届き次第再生開始するため、体感遅延が最小化される。
   */
  const speakText = useCallback(async (text: string, voice: TtsVoice = "alloy") => {
    if (!ttsEnabled) return;
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === "closed") {
      console.warn("[TTS] AudioContext unavailable");
      return;
    }

    // 再入時に過去再生を打ち切り、音声の重なりを防ぐ
    stopAllAudio();

    try {
      setAiSpeaking(true);
      const chunks = splitIntoChunks(text);
      console.log("[TTS] chunks:", chunks.length, "voice:", voice);

      // 全チャンクを並列 fetch (順序は保持)
      const buffers = chunks.map((c) => fetchChunkAudio(c, voice));

      let cursorTime = ctx.currentTime;
      for (let i = 0; i < buffers.length; i++) {
        const audioBuffer = await buffers[i];
        if (!audioBuffer) continue;
        // unmount 後は新 source を開始しない
        if (!isMountedRef.current || (ctx.state as string) === "closed") return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        // 次のチャンクの開始時刻を計算してギャップなく連結
        const startAt = Math.max(cursorTime, ctx.currentTime);
        source.start(startAt);
        cursorTime = startAt + audioBuffer.duration;

        registerSource(source, i === buffers.length - 1);
      }
    } catch (err) {
      console.warn("[TTS] speakText error:", err instanceof Error ? err.message : err);
      if (isMountedRef.current) setAiSpeaking(false);
    }
  }, [ttsEnabled, fetchChunkAudio, stopAllAudio, registerSource]);

  /**
   * GD モードの複数人連続発話を、話者ごとに voice を切り替えて順次読み上げる。
   *
   * 重要: **1 発言 = 1 TTS リクエスト** を徹底する。
   * 同じ話者の発言を複数チャンクに分割すると、OpenAI TTS は同じ voice でも
   * 入力テキストごとに声質がわずかに変わるため、「1 人の発言が途中で別人風になる」
   * という違和感が出る。発言全体を丸ごと 1 リクエストで送れば、
   * 話者交代のタイミングでだけ voice が切り替わる自然な討論になる。
   */
  const speakUtterances = useCallback(
    async (content: string) => {
      if (!ttsEnabled) return;
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === "closed") return;

      const utterances = splitIntoUtterances(content, DEFAULT_INTERVIEWER);
      if (utterances.length === 0) return;

      // 再入時に過去再生を打ち切る
      stopAllAudio();

      setAiSpeaking(true);

      // 各発言を 1 リクエストで並列 fetch。順序は utterance インデックスで保持
      const buffers = utterances.map((u) => fetchChunkAudio(u.body, u.profile.voice));

      let cursorTime = ctx.currentTime;
      for (let i = 0; i < buffers.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        const audioBuffer = await buffers[i];
        if (!audioBuffer) continue;
        if (!isMountedRef.current || (ctx.state as string) === "closed") return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        // 発言境界に 250ms のポーズ(自然な間)
        const gap = i > 0 ? 0.25 : 0;
        const startAt = Math.max(cursorTime + gap, ctx.currentTime);
        source.start(startAt);
        cursorTime = startAt + audioBuffer.duration;

        registerSource(source, i === buffers.length - 1);
      }
    },
    [ttsEnabled, fetchChunkAudio, stopAllAudio, registerSource],
  );

  /**
   * autoplay policy で音声再生がブロックされた場合、
   * ユーザーがボタンクリックで unlock + オープニング再生を開始する。
   */
  const handleAudioUnlock = useCallback(async () => {
    if (typeof window === "undefined") return;
    // 連打対策: ボタンを即座に隠して二重押下を物理的に防ぐ
    setNeedsAudioUnlock(false);
    interface WindowWithAudio extends Window {
      __interviewAudioCtx?: AudioContext;
      webkitAudioContext?: typeof AudioContext;
    }
    const win = window as WindowWithAudio;
    if (!audioContextRef.current) {
      const Ctor = window.AudioContext || win.webkitAudioContext;
      if (Ctor) {
        audioContextRef.current = new Ctor();
        win.__interviewAudioCtx = audioContextRef.current;
      }
    }
    const ctx = audioContextRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      // 無音1サンプル再生で iOS Safari の autoplay を unlock
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (err) {
      console.warn("[TTS] unlock failed", err);
    }

    // 再生: sessionInfo から openingMessage を読み直して speak する
    const stored = sessionStorage.getItem(`interview_session_${sessionId}`);
    if (!stored) return;
    const info: SessionInfo = JSON.parse(stored);

    if (info.mode === "group_discussion") {
      speakUtterances(info.openingMessage);
    } else {
      const { profile } = resolveSpeaker(info.openingMessage, DEFAULT_INTERVIEWER);
      speakText(info.openingMessage, profile.voice);
    }
  }, [sessionId, speakText, speakUtterances]);

  // Load session info from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`interview_session_${sessionId}`);
    if (!stored) return;

    const info: SessionInfo = JSON.parse(stored);
    setSessionInfo(info);
    setMessages([{ role: "ai", content: info.openingMessage }]);

    if (info.inputMode !== "voice") return;

    // AudioContext を必ず初期化してから再生
    ensureAudioContext();
    setCameraEnabled(true);

    // autoplay policy で AudioContext が suspended の場合は unlock ボタンを出す
    const ctx0 = audioContextRef.current;
    if (ctx0 && ctx0.state === "suspended") {
      setNeedsAudioUnlock(true);
      // ボタン経由で再生するので即 return
      return;
    }

    // サーバープリフェッチ音声があれば即座に再生、残りテキストは話者単位で 1 リクエストずつ fetch
    if (info.preOpeningAudioBase64 && info.preOpeningText) {
      void (async () => {
        const ctx = audioContextRef.current;
        if (!ctx || ctx.state === "closed") return;
        // autoplay policy 対策: suspended 状態なら resume を待つ
        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
          } catch {
            /* noop */
          }
        }
        try {
          // 初回 preOpening 再生前にも念のため既存音声を停止
          stopAllAudio();
          setAiSpeaking(true);
          // base64 → ArrayBuffer → decode → 即再生
          const binary = atob(info.preOpeningAudioBase64!);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
          if (!isMountedRef.current || (ctx.state as string) === "closed") return;
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          const startAt = ctx.currentTime;
          source.start(startAt);
          let cursorTime = startAt + audioBuffer.duration;

          // 残りテキストを取得: preOpeningText は接頭辞付きの最初の発話
          // openingMessage からそれを除いた後続を取り出す
          const remaining = info.openingMessage.slice(info.preOpeningText!.length).trim();
          if (remaining.length === 0) {
            registerSource(source, true);
            return;
          }
          // 先頭 source は末尾ではないので isLast=false で登録
          registerSource(source, false);

          // 残りを話者単位に分解、各発言を 1 リクエストで並列 fetch
          const utterances =
            info.mode === "group_discussion"
              ? splitIntoUtterances(remaining, DEFAULT_INTERVIEWER)
              : [{ profile: resolveSpeaker(info.openingMessage, DEFAULT_INTERVIEWER).profile, body: remaining }];

          const buffers = utterances.map((u) => fetchChunkAudio(u.body, u.profile.voice));

          for (let i = 0; i < buffers.length; i++) {
            // eslint-disable-next-line no-await-in-loop
            const buf = await buffers[i];
            if (!buf) continue;
            if (!isMountedRef.current || (ctx.state as string) === "closed") return;
            const src2 = ctx.createBufferSource();
            src2.buffer = buf;
            src2.connect(ctx.destination);
            const gap = 0.25; // 話者境界のポーズ
            const at = Math.max(cursorTime + gap, ctx.currentTime);
            src2.start(at);
            cursorTime = at + buf.duration;

            registerSource(src2, i === buffers.length - 1);
          }
        } catch (err) {
          console.warn("[TTS] preOpening playback failed", err);
          if (isMountedRef.current) setAiSpeaking(false);
          // フォールバック: 通常経路で最初から読み直す
          if (info.mode === "group_discussion") {
            speakUtterances(info.openingMessage);
          } else {
            const { profile } = resolveSpeaker(info.openingMessage, DEFAULT_INTERVIEWER);
            speakText(info.openingMessage, profile.voice);
          }
        }
      })();
      return;
    }

    // プリフェッチがない場合は通常経路
    if (info.mode === "group_discussion") {
      speakUtterances(info.openingMessage);
    } else {
      const { profile } = resolveSpeaker(info.openingMessage, DEFAULT_INTERVIEWER);
      speakText(info.openingMessage, profile.voice);
    }
  }, [sessionId, speakText, speakUtterances, ensureAudioContext, fetchChunkAudio, stopAllAudio, registerSource]);

  // Restore messages from sessionStorage backup
  useEffect(() => {
    const backup = sessionStorage.getItem(`interview_messages_${sessionId}`);
    if (backup) {
      const parsed: InterviewMessage[] = JSON.parse(backup);
      if (parsed.length > 0) {
        setMessages(parsed);
      }
    }
  }, [sessionId]);

  // Camera initialization
  useEffect(() => {
    if (!cameraEnabled || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        setVideoStream(s);
      })
      .catch(() => {
        setCameraEnabled(false);
      });
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setVideoStream(null);
      }
    };
  }, [cameraEnabled]);

  // Appearance check via Claude Vision
  const runAppearanceCheck = useCallback(async () => {
    if (!videoStream || appearanceCheckCount.current >= 3) return;
    try {
      const video = document.querySelector("video");
      if (!video) return;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 320, 240);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const imageBase64 = dataUrl.split(",")[1];

      const res = await authFetch("/api/interview/appearance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });
      if (!res.ok) return;
      const analysis: AppearanceAnalysis = await res.json();
      setAppearanceAnalysis(analysis);
      appearanceCheckCount.current++;

      const critical = analysis.issues.filter((i) => i.severity === "critical");
      if (critical.length > 0) {
        setAppearanceAlert(critical.map((i) => i.description).join("、"));
        setTimeout(() => setAppearanceAlert(null), 8000);
      }
    } catch {
      // 外見チェック失敗は無視
    }
  }, [videoStream]);

  // Run appearance check on camera start and every 5 minutes
  useEffect(() => {
    if (!videoStream) return;
    // Initial check after 3 seconds (let camera stabilize)
    const initialTimeout = setTimeout(runAppearanceCheck, 3000);
    // Periodic check every 5 minutes
    const interval = setInterval(runAppearanceCheck, 5 * 60 * 1000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [videoStream, runAppearanceCheck]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ページ unmount 時に音声再生を完全停止する (画面遷移で音声が垂れ流しになるのを防ぐ)
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAllAudio();
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== "closed") {
        ctx.close().catch(() => {});
      }
      audioContextRef.current = null;
      if (typeof window !== "undefined") {
        (window as unknown as { __interviewAudioCtx?: AudioContext }).__interviewAudioCtx = undefined;
      }
      if (gazeAlertTimerRef.current) {
        clearTimeout(gazeAlertTimerRef.current);
        gazeAlertTimerRef.current = null;
      }
    };
  }, [stopAllAudio]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Backup messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(`interview_messages_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  const sendMessage = useCallback(async () => {
    ensureAudioContext();
    const text = input.trim();
    if (!text || isLoading) return;

    const studentMessage: InterviewMessage = { role: "student", content: text };
    const updatedMessages = [...messages, studentMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await authFetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: updatedMessages,
          mode: sessionInfo?.mode,
          universityContext: sessionInfo?.universityContext,
          presentationContent: sessionInfo?.presentationContent,
          elapsedSeconds: elapsed,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.content }]);
      if (sessionInfo?.inputMode === "voice") {
        if (sessionInfo.mode === "group_discussion") {
          speakUtterances(data.content);
        } else {
          const { profile } = resolveSpeaker(data.content, DEFAULT_INTERVIEWER);
          speakText(data.content, profile.voice);
        }
      }
      if (!data.isActive) {
        setShowEndDialog(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠ 通信エラーが発生しました。もう一度お話しください。" },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, sessionId, sessionInfo, speakText, speakUtterances, ensureAudioContext, elapsed]);

  async function handleEnd() {
    setIsEnding(true);
    try {
      console.log("[handleEnd] Sending messages:", messages.length, "turns, duration:", elapsed);
      console.log("[handleEnd] Messages:", JSON.stringify(messages.map(m => ({ role: m.role, content: m.content.slice(0, 50) }))));

      // フィラー・相槌検出のため、ユーザー発言の文字起こしを集約して refineWithTranscription を呼ぶ
      let refinedVoiceAnalysis = voiceAnalysis;
      if (voiceAnalysis) {
        const studentTexts = messages
          .filter((m) => m.role === "student")
          .map((m) => m.content)
          .join(" ");
        if (studentTexts.length > 0) {
          refinedVoiceAnalysis = refineWithTranscription(
            voiceAnalysis,
            studentTexts,
            elapsed,
          );
        }
      }

      const res = await authFetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, messages, duration: elapsed,
          mode: sessionInfo?.mode,
          presentationContent: sessionInfo?.presentationContent,
          ...(refinedVoiceAnalysis ? { voiceAnalysis: refinedVoiceAnalysis } : {}),
          ...(videoAnalysis ? { videoAnalysis } : {}),
          ...(appearanceAnalysis ? { appearanceAnalysis } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Store result for immediate display on result page
      sessionStorage.setItem(`interview_result_${data.interviewId}`, JSON.stringify({
        ...data,
        messages,
        universityName: sessionInfo?.universityContext?.universityName ?? "",
        facultyName: sessionInfo?.universityContext?.facultyName ?? "",
        mode: sessionInfo?.mode ?? "individual",
        duration: elapsed,
        practicedAt: new Date().toISOString(),
      }));
      sessionStorage.removeItem(`interview_session_${sessionId}`);
      sessionStorage.removeItem(`interview_messages_${sessionId}`);
      router.push(`/student/interview/${data.interviewId}/result`);
    } catch (err) {
      console.error("Interview end failed:", err);
      alert("面接結果の生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsEnding(false);
      setShowEndDialog(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const handleVoiceComplete = useCallback(
    async (audioBase64: string, mimeType: string) => {
      ensureAudioContext();
      if (isLoading) return;
      setIsLoading(true);

      try {
        const res = await authFetch("/api/interview/voice-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            audioBase64,
            mimeType,
            messages,
            mode: sessionInfo?.mode,
            universityContext: sessionInfo?.universityContext,
            presentationContent: sessionInfo?.presentationContent,
            elapsedSeconds: elapsed,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          { role: "student", content: data.transcribedText },
          { role: "ai", content: data.aiResponse },
        ]);
        if (sessionInfo?.mode === "group_discussion") {
          speakUtterances(data.aiResponse);
        } else {
          const { profile } = resolveSpeaker(data.aiResponse, DEFAULT_INTERVIEWER);
          speakText(data.aiResponse, profile.voice);
        }

        if (!data.isActive) {
          setShowEndDialog(true);
        }
      } catch {
        const errorMsg = "⚠ 音声の処理に失敗しました。もう一度お話しください。";
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: errorMsg },
        ]);
        speakText(errorMsg, "alloy");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, messages, sessionInfo, speakText, speakUtterances, ensureAudioContext, elapsed]
  );

  const isVoiceMode = sessionInfo?.inputMode === "voice";
  const modeLabel = sessionInfo ? INTERVIEW_MODE_LABELS[sessionInfo.mode] : "";

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-76px)] lg:h-[calc(100dvh-3.5rem)] max-w-2xl lg:max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div>
          <p className="font-semibold text-sm">
            {sessionInfo
              ? `${sessionInfo.universityContext.universityName} ${sessionInfo.universityContext.facultyName}`
              : "面接セッション"}
          </p>
          <p className="text-xs text-muted-foreground">
            {modeLabel}
            {sessionInfo?.mode === "group_discussion" && " — 教員3名 + 他受験生3名が参加"}
            {sessionInfo?.mode === "presentation" && " — プレゼン後に質疑応答"}
            {sessionInfo?.mode === "oral_exam" && " — 専門知識を問う試問"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTtsEnabled((v) => {
                // ON → OFF に切り替える時は再生中の音声を即停止
                if (v) stopAllAudio();
                return !v;
              });
            }}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${ttsEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            title={ttsEnabled ? "音声ON" : "音声OFF"}
          >
            {ttsEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button
            onClick={() => setCameraEnabled((v) => !v)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${cameraEnabled ? "text-emerald-600 bg-emerald-50" : "text-muted-foreground hover:text-foreground"}`}
            title={cameraEnabled ? "カメラ分析ON" : "カメラ分析OFF"}
          >
            {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </button>
          <span
            className={`text-sm font-mono tabular-nums ${
              sessionInfo?.mode === "group_discussion" && elapsed >= 14 * 60
                ? "text-rose-600 font-semibold"
                : sessionInfo?.mode === "group_discussion" && elapsed >= 11 * 60
                  ? "text-amber-600 font-semibold"
                  : "text-muted-foreground"
            }`}
          >
            {formatTime(elapsed)}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEndDialog(true)}
          >
            <StopCircle className="size-4 mr-1" />
            終了
          </Button>
        </div>
      </div>

      {/* Audio unlock prompt */}
      {needsAudioUnlock && (
        <div className="mx-4 mt-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="text-sm">
            <strong>音声を開始</strong>
            <p className="text-xs text-muted-foreground mt-0.5">
              ブラウザの自動再生制限のため、ボタンを押して面接音声を開始してください
            </p>
          </div>
          <Button size="sm" onClick={handleAudioUnlock}>
            <Volume2 className="size-4 mr-1" />
            開始
          </Button>
        </div>
      )}

      {/* Appearance alert */}
      {appearanceAlert && (
        <div className="mx-4 mt-2 rounded-lg border border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-300 animate-in fade-in slide-in-from-top-2">
          <strong>身だしなみ:</strong> {appearanceAlert}
        </div>
      )}

      {/* Gaze alert (リアルタイム視線指導) */}
      {gazeAlert && (
        <div className="mx-4 mt-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 animate-in fade-in slide-in-from-top-2">
          <strong>目線:</strong> {gazeAlert}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {sessionInfo?.mode === "group_discussion" && messages.length > 0 && (
          <div className="mb-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">
              👥 集団討論の参加者
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(GD_SPEAKERS).map((sp) => (
                <span
                  key={sp.role}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${sp.colorClass}`}
                  title={sp.description}
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-white/70 text-[9px] font-bold">
                    {sp.avatar}
                  </span>
                  {sp.displayName}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  あ
                </span>
                あなた
              </span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "student") {
            const isEditing = editingIdx === i;
            return (
              <div key={i} className="flex justify-end group">
                {isEditing ? (
                  <div className="w-full max-w-[90%] lg:max-w-[80%] rounded-2xl rounded-tr-sm border-2 border-primary bg-primary/5 p-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full min-h-[60px] text-sm bg-background rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          commitEditMessage();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEditMessage();
                        }
                      }}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        ⌘+Enterで保存 / Escでキャンセル
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={cancelEditMessage}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                          type="button"
                        >
                          <X className="size-3" />
                          取消
                        </button>
                        <button
                          onClick={commitEditMessage}
                          className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                          type="button"
                        >
                          <Check className="size-3" />
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEditMessage(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
                      title="発言を編集(誤変換を修正)"
                      aria-label="発言を編集"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <div className="max-w-[85%] lg:max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // AI 発言: GDモードなら複数発言を話者別カードに分解、それ以外は従来の吹き出し
          if (sessionInfo?.mode === "group_discussion") {
            const utterances = splitIntoUtterances(msg.content, DEFAULT_INTERVIEWER);
            return (
              <div key={i} className="flex flex-col gap-2">
                {utterances.map((u, j) => (
                  <div key={j} className="flex justify-start">
                    <div
                      className={`max-w-[90%] lg:max-w-[80%] rounded-2xl rounded-tl-sm border px-3 py-2 ${u.profile.colorClass}`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="flex size-5 items-center justify-center rounded-full bg-white/70 text-[10px] font-bold">
                          {u.profile.avatar}
                        </span>
                        <span className="text-xs font-semibold">
                          {u.profile.displayName}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {u.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // 個人面接・プレゼン・口頭試問: 従来通り
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] lg:max-w-[75%] rounded-2xl rounded-tl-sm bg-muted text-foreground px-4 py-2 text-sm">
                {msg.content}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Memo area */}
      <div className="px-4 border-t shrink-0">
        <button
          onClick={() => setMemoOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-muted-foreground py-2"
        >
          {memoOpen ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          メモ
        </button>
        {memoOpen && (
          <textarea
            className="w-full h-20 text-xs rounded border bg-muted/50 p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring mb-2"
            placeholder="面接中のメモ（採点には影響しません）"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-background shrink-0">
        {isVoiceMode ? (
          <ContinuousVoiceRecorder
            autoStart
            onRecordingComplete={handleVoiceComplete}
            onStreamReady={(stream) => setMediaStream(stream)}
            onInterrupt={() => {
              // Stop TTS playback when user starts speaking
              stopAllAudio();
            }}
            disabled={isLoading}
            aiSpeaking={aiSpeaking}
          />
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-lg border bg-background px-3 py-2.5 lg:px-4 lg:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="回答を入力してください..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              <Send className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Voice Analyzer (hidden, analysis engine only) */}
      {isVoiceMode && (
        <VoiceAnalyzer
          mediaStream={mediaStream}
          isRecording={!!mediaStream && !isLoading}
          onAnalysisComplete={setVoiceAnalysis}
        />
      )}

      {/* Camera Preview & Video Analyzer */}
      {videoStream && <CameraPreview mediaStream={videoStream} />}
      {videoStream && (
        <VideoAnalyzer
          mediaStream={videoStream}
          isRecording={!isEnding && elapsed > 0}
          onAnalysisComplete={setVideoAnalysis}
          onGazeAlert={(msg) => {
            setGazeAlert(msg);
            if (gazeAlertTimerRef.current) clearTimeout(gazeAlertTimerRef.current);
            gazeAlertTimerRef.current = setTimeout(() => setGazeAlert(null), 6000);
          }}
        />
      )}

      {/* End Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>面接を終了しますか？</DialogTitle>
            <DialogDescription>
              採点・フィードバックを受けるか、評価なしで終了できます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              disabled={isEnding}
            >
              続ける
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                // Stop TTS/recording (unmount cleanup でも止まるが即応性のため明示呼び出し)
                stopAllAudio();
                router.push("/student/interview/history");
              }}
              disabled={isEnding}
            >
              評価せずに終了
            </Button>
            <Button onClick={handleEnd} disabled={isEnding}>
              {isEnding ? "採点中..." : "終了して採点"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

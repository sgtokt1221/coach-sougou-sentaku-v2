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
import type { InterviewMessage, InterviewMode } from "@/lib/types/interview";

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
  universityName: string;
  facultyName: string;
  admissionPolicy: string;
  weaknessList?: string;
  presentationContent?: string;
  /** 毎メッセージ追加時に呼ばれる (会話履歴を上位コンポーネントにシンクしたい場合) */
  onMessageAppend?: (message: InterviewMessage) => void;
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

  const sessionRef = useRef<RealtimeSession | null>(null);
  const orchestratorRef = useRef<GdOrchestrator | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  const appendMessage = useCallback((m: InterviewMessage) => {
    setMessages((prev) => [...prev, m]);
    optsRef.current.onMessageAppend?.(m);
  }, []);

  const stop = useCallback(() => {
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

    // 2. マイクを取得
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
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
        el.style.display = "none";
        document.body.appendChild(el);
        audioElementRef.current = el;
      }

      const session = new RealtimeSession({
        ephemeralToken: tokenData.tokens[0].token,
        model,
        audioOutputElement: audioElementRef.current,
        micStream,
        withMic: true,
        onUserTranscript: (text) => {
          appendMessage({ role: "student", content: text });
        },
        onAssistantTranscript: (text) => {
          appendMessage({ role: "ai", content: text });
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
  }, [appendMessage, stop]);

  return {
    status,
    messages,
    error,
    nextAvailableAt,
    start,
    stop,
    isActive: status === "connected",
  };
}

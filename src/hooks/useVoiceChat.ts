"use client";

/**
 * 汎用の OpenAI Realtime 音声チャットフック。
 *
 * 面接専用の useRealtimeInterview に対して、こちらは自己分析・志望校マッチング等
 * あらゆる用途で単一セッションの音声チャットを提供する汎用フック。
 *
 * 使い方:
 * ```tsx
 * const vc = useVoiceChat();
 * await vc.start({ instructions, voice: "alloy" });
 * // vc.status === "connected" になったら音声対話が開始
 * // 終了時: vc.stop()
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { RealtimeSession } from "@/lib/interview/realtime/client";

export type VoiceChatStatus =
  | "idle"
  | "requesting_token"
  | "connecting"
  | "connected"
  | "error"
  | "closed";

export interface VoiceChatOptions {
  instructions: string;
  voice?: string;
  /** 転写ヒント (大学名・学部名・専門用語を列挙した文字列) 誤変換対策 */
  transcriptionHint?: string;
  /** ユーザーが話した transcription が確定したとき */
  onUserTranscript?: (text: string) => void;
  /** AI の応答テキストが確定したとき */
  onAssistantTranscript?: (text: string) => void;
}

export function useVoiceChat() {
  const [status, setStatus] = useState<VoiceChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
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

  const start = useCallback(async (opts: VoiceChatOptions): Promise<boolean> => {
    setError(null);
    setStatus("requesting_token");

    // 1. ephemeral token 取得
    let tokenData: { model?: string; token?: string; error?: string };
    try {
      const res = await authFetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: opts.instructions,
          voice: opts.voice ?? "alloy",
          transcriptionHint: opts.transcriptionHint,
        }),
      });
      tokenData = await res.json();
      if (!res.ok || !tokenData.token) {
        throw new Error(tokenData.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("[useVoiceChat] token fetch failed", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "token fetch failed");
      return false;
    }

    // 2. マイク取得
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
    } catch (err) {
      console.warn("[useVoiceChat] mic access failed", err);
      setStatus("error");
      setError("マイクへのアクセスが拒否されました");
      return false;
    }

    // 3. audio 出力要素を用意
    if (!audioElementRef.current) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.style.display = "none";
      document.body.appendChild(el);
      audioElementRef.current = el;
    }

    // 4. WebRTC 接続
    setStatus("connecting");
    try {
      const session = new RealtimeSession({
        ephemeralToken: tokenData.token,
        model: tokenData.model ?? "gpt-4o-mini-realtime-preview-2024-12-17",
        audioOutputElement: audioElementRef.current,
        micStream,
        withMic: true,
        onUserTranscript: opts.onUserTranscript,
        onAssistantTranscript: opts.onAssistantTranscript,
        onError: (err) => {
          console.warn("[useVoiceChat] session error", err);
          setError(err.message);
        },
      });
      await session.connect();
      sessionRef.current = session;

      // 接続完了後、AI 側から会話を始める
      session.triggerResponse();

      setStatus("connected");
      return true;
    } catch (err) {
      console.warn("[useVoiceChat] connect failed", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "connect failed");
      stop();
      return false;
    }
  }, [stop]);

  return {
    status,
    error,
    start,
    stop,
    isActive: status === "connected",
  };
}

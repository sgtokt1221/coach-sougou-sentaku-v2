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
import type { InterviewVoiceSession } from "@/lib/interview/realtime/voice-session";
import { createVoiceSession } from "@/lib/interview/realtime/voice-session-factory";
import { resolveVoiceProvider } from "@/lib/interview/voice-provider";

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

  const sessionRef = useRef<InterviewVoiceSession | null>(null);
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

    // 音声チャットは Gemini Live に一本化
    const provider = resolveVoiceProvider();

    // 1. ephemeral token 取得
    let tokenData: { model?: string; token?: string; error?: string };
    try {
      const res = await authFetch("/api/realtime/gemini-session", {
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

    // 2. マイク取得 (エコー除去・ノイズ抑制を明示してクリア化)
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          // Gemini Live 16kHz
          sampleRate: 16000,
        },
      });
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
      el.setAttribute("playsinline", ""); // iOS Safari 対策
      el.volume = 1.0;
      el.style.display = "none";
      document.body.appendChild(el);
      audioElementRef.current = el;
    }

    // 4. WebRTC 接続
    setStatus("connecting");
    try {
      const session = createVoiceSession({
        provider,
        ephemeralToken: tokenData.token,
        model: tokenData.model ?? "gpt-4o-mini-realtime-preview-2024-12-17",
        audioOutputElement: audioElementRef.current,
        micStream,
        withMic: true,
        // 1対1の単一セッション(自己分析・マッチング等)。割り込み(barge-in)で
        // AIの発話が途中で途切れないよう、面接と同じ厳しめターン制御を有効化。
        // トークン側 liveConnectConstraints だけでは効かないため client config に直接渡す。
        strictTurnTaking: true,
        // 汎用チャットなので面接固定の文言ではなく中立の口火に
        openingNudge: "よろしくお願いします。始めてください。",
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

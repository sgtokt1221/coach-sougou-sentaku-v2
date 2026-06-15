/**
 * 音声面接プロバイダ（OpenAI Realtime / Gemini Live）の解決ヘルパー。
 *
 * 優先順位:
 * 1. localStorage の上書き（dev/admin がトグルで設定）
 * 2. env `NEXT_PUBLIC_INTERVIEW_VOICE_PROVIDER`
 * 3. 既定 "openai"
 */

import type { VoiceProvider } from "@/lib/interview/realtime/voice-session-factory";

const OVERRIDE_KEY = "interviewVoiceProvider";

export function resolveVoiceProvider(): VoiceProvider {
  if (typeof window !== "undefined") {
    const o = window.localStorage.getItem(OVERRIDE_KEY);
    if (o === "gemini" || o === "openai") return o;
  }
  return process.env.NEXT_PUBLIC_INTERVIEW_VOICE_PROVIDER === "gemini" ? "gemini" : "openai";
}

export function setVoiceProviderOverride(p: VoiceProvider | null): void {
  if (typeof window === "undefined") return;
  if (p) window.localStorage.setItem(OVERRIDE_KEY, p);
  else window.localStorage.removeItem(OVERRIDE_KEY);
}

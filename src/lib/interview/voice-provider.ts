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

/**
 * 既定プロバイダ。
 * ※【一時的・テスト中】Gemini Live を既定にしている。OpenAI に戻すには
 *   この値を "openai" に変えるだけ（端末ごとなら localStorage で上書き可）。
 */
const DEFAULT_PROVIDER: VoiceProvider = "gemini";

export function resolveVoiceProvider(): VoiceProvider {
  if (typeof window !== "undefined") {
    const o = window.localStorage.getItem(OVERRIDE_KEY);
    if (o === "gemini" || o === "openai") return o;
  }
  // env で明示されていればそれを優先、無ければ DEFAULT_PROVIDER
  const env = process.env.NEXT_PUBLIC_INTERVIEW_VOICE_PROVIDER;
  if (env === "gemini" || env === "openai") return env;
  return DEFAULT_PROVIDER;
}

export function setVoiceProviderOverride(p: VoiceProvider | null): void {
  if (typeof window === "undefined") return;
  if (p) window.localStorage.setItem(OVERRIDE_KEY, p);
  else window.localStorage.removeItem(OVERRIDE_KEY);
}

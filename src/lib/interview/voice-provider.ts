/**
 * 音声面接プロバイダの解決ヘルパー。
 * 音声面接は Gemini Live に一本化済み（OpenAI Realtime は廃止）。
 * 互換のため関数は残すが、常に "gemini" を返す。
 */

import type { VoiceProvider } from "@/lib/interview/realtime/voice-session-factory";

export function resolveVoiceProvider(): VoiceProvider {
  return "gemini";
}

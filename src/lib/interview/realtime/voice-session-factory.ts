/**
 * プロバイダ（OpenAI Realtime / Gemini Live）に応じて
 * `InterviewVoiceSession` 実装を生成するファクトリ。
 */

import { RealtimeSession } from "./client";
import { GeminiLiveSession } from "./gemini-live-client";
import type { InterviewVoiceSession, VoiceSessionCallbacks } from "./voice-session";

export type VoiceProvider = "openai" | "gemini";

export interface CreateVoiceSessionParams extends VoiceSessionCallbacks {
  provider: VoiceProvider;
  /** ephemeral token（OpenAI: client_secret / Gemini: auth token name） */
  ephemeralToken: string;
  model: string;
  /** OpenAI のみ使用（WebRTC の音声出力先）。Gemini は内部 AudioContext で再生するため不要 */
  audioOutputElement: HTMLAudioElement;
  micStream: MediaStream | null;
  withMic?: boolean;
}

export function createVoiceSession(params: CreateVoiceSessionParams): InterviewVoiceSession {
  const { provider, audioOutputElement, ...rest } = params;
  if (provider === "gemini") {
    // GeminiLiveSession は audioOutputElement を使わない
    return new GeminiLiveSession(rest);
  }
  return new RealtimeSession({ ...rest, audioOutputElement });
}

/**
 * `InterviewVoiceSession` 実装を生成するファクトリ。
 * 音声面接は Gemini Live に一本化済み（OpenAI Realtime は廃止）。
 */

import { GeminiLiveSession } from "./gemini-live-client";
import type { InterviewVoiceSession, VoiceSessionCallbacks } from "./voice-session";

/** 音声プロバイダ。Gemini Live に一本化。 */
export type VoiceProvider = "gemini";

export interface CreateVoiceSessionParams extends VoiceSessionCallbacks {
  provider: VoiceProvider;
  /** ephemeral token（Gemini auth token name） */
  ephemeralToken: string;
  model: string;
  /** 後方互換のため受けるが Gemini は内部 AudioContext で再生するため未使用 */
  audioOutputElement?: HTMLAudioElement;
  micStream: MediaStream | null;
  withMic?: boolean;
  /** オープニング nudge */
  openingNudge?: string;
  /** 出力音声を鳴らさない（GDの耳セッション） */
  muteOutput?: boolean;
  /** triggerResponse を毎回発火（GDの話者） */
  repeatableTrigger?: boolean;
}

export function createVoiceSession(params: CreateVoiceSessionParams): InterviewVoiceSession {
  // audioOutputElement / provider は後方互換で受けるが Gemini では未使用。
  const { provider: _provider, audioOutputElement: _audioOutputElement, ...rest } = params;
  void _provider;
  void _audioOutputElement;
  return new GeminiLiveSession(rest);
}

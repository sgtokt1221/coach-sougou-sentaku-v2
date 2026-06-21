/**
 * Gemini Live 用 ephemeral token 発行の共通ヘルパー。
 * 模擬面接 / 面接スキルチェック など複数のルートで使い回し、モデルIDや
 * session config の定義を一元化する。
 */

import { GoogleGenAI, Modality, EndSensitivity } from "@google/genai";

/** ネイティブ音声モデル（env で差し替え可）。プレビュー系のため ID 変動前提。 */
export const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-native-audio-preview-12-2025";

/** 個人系（1対1）モードの既定ボイス。 */
export const GEMINI_INDIVIDUAL_VOICE = "Kore";

/** v1alpha 固定の GoogleGenAI クライアントを作る（Live API + token 必須）。 */
export function getGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
}

/**
 * 1 セッション分の ephemeral auth token を発行する。
 * systemInstruction / voice / transcription / resumption / compression を
 * liveConnectConstraints.config にサーバー側で封入する。
 */
export async function issueGeminiLiveToken(
  ai: GoogleGenAI,
  instructions: string,
  voice: string,
): Promise<{ value: string; expiresAt: number } | null> {
  const now = Date.now();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      liveConnectConstraints: {
        model: GEMINI_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: instructions }] },
          speechConfig: {
            languageCode: "ja-JP",
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          // 入力文字起こしの言語を日本語に固定（自動判定だと言語取り違えで誤変換が増える）。
          // ※固有名詞・語彙ヒントは Gemini Live に該当APIが無く steer 不可。
          inputAudioTranscription: { languageCodes: ["ja-JP"] },
          outputAudioTranscription: { languageCodes: ["ja-JP"] },
          // ターン検出: 話の途中の間で勝手にターンが切れないよう、無音許容を長めにし
          // 終話判定を鈍く(LOW)する。考えながら話す受験生が言い切る前に遮られるのを防ぐ。
          realtimeInputConfig: {
            automaticActivityDetection: {
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
              prefixPaddingMs: 300,
              silenceDurationMs: 1200,
            },
          },
          sessionResumption: {},
          contextWindowCompression: { slidingWindow: {} },
        },
      },
      httpOptions: { apiVersion: "v1alpha" },
    },
  });
  if (!token.name) return null;
  return { value: token.name, expiresAt: Date.parse(expireTime) };
}

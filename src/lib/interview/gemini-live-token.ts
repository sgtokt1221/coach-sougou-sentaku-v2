/**
 * Gemini Live 用 ephemeral token 発行の共通ヘルパー。
 * 模擬面接 / 面接スキルチェック など複数のルートで使い回し、モデルIDや
 * session config の定義を一元化する。
 */

import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
} from "@google/genai";

/**
 * 1対1面接（個人/プレゼン/口頭試問・スキルチェック）の音声ターン制御設定。
 * 未指定だと既定VADが過敏で、考え中の「間」を発話終了と誤検知して相槌が割り込む／
 * 物音でAIが中断される（barge-in）。集団討論(GD)はクライアント側で進行制御するため適用しない。
 * - silenceDurationMs: 終話確定までに必要な無音長。長めにして「間」を許容する。
 * - start/endSensitivity: LOW（雑音を発話と誤検知しにくく、終話を急がない）。
 * - activityHandling NO_INTERRUPTION: AI発話中はユーザーの物音で中断されない
 *   （マイクはAI発話中ミュートしているため1往復ずつの交代になる）。
 */
const INTERVIEW_REALTIME_INPUT_CONFIG = {
  automaticActivityDetection: {
    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
    prefixPaddingMs: 300,
    silenceDurationMs: 1200,
  },
  activityHandling: ActivityHandling.NO_INTERRUPTION,
};

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
  /** 1対1面接の厳しめターン制御(VAD/割り込み)を適用する。GDでは渡さない。 */
  opts?: { strictTurnTaking?: boolean },
): Promise<{ value: string; expiresAt: number } | null> {
  const now = Date.now();
  // ネイティブ音声セッションは寿命があり goAway→sessionResumption で再接続する。
  // 再接続は同じ ephemeral token を再利用するため、uses は複数回（=初回＋多数の再接続）、
  // newSessionExpireTime は面接が続く間ずっと再接続できるよう長め(=expireTime近く)にする。
  // uses:1 / 2分 のままだと最初の goAway で再接続に失敗し「時間制限のように」会話が切れる。
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 25 * 60 * 1000).toISOString();

  const token = await ai.authTokens.create({
    config: {
      uses: 50,
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
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          sessionResumption: {},
          contextWindowCompression: { slidingWindow: {} },
          ...(opts?.strictTurnTaking
            ? { realtimeInputConfig: INTERVIEW_REALTIME_INPUT_CONFIG }
            : {}),
        },
      },
      httpOptions: { apiVersion: "v1alpha" },
    },
  });
  if (!token.name) return null;
  return { value: token.name, expiresAt: Date.parse(expireTime) };
}

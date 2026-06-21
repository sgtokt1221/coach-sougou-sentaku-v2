import { authFetch } from "@/lib/api/client";

/**
 * 生徒の発話音声(WAV base64)を専用STT(/api/interview/stt-turn)に通して文字起こしを得る
 * クライアント共通ヘルパー。個人面接・スキルチェック・GD で共用する。
 *
 * 返り値: STT テキスト（空・失敗時は null）。呼び出し側は null のとき Gemini 内蔵
 * 文字起こし等のフォールバックを採用する（面接を止めない）。
 */
export interface SttTurnContext {
  universityName?: string;
  facultyName?: string;
  studentName?: string;
  highSchoolName?: string;
}

export async function transcribeTurnViaStt(
  audioWavBase64: string,
  ctx: SttTurnContext = {},
): Promise<string | null> {
  try {
    const res = await authFetch("/api/interview/stt-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioWavBase64, ...ctx }),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.text === "string" && data.text.trim()) {
      return data.text;
    }
    return null;
  } catch {
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { buildWhisperPrompt } from "@/lib/interview/whisper-context";
import { recordAiTrace } from "@/lib/ai/trace";

/**
 * 生徒の発話音声(WAV)を専用STTで文字起こしする軽量ルート。
 *
 * Gemini Live 内蔵の文字起こし（語彙ヒント不可・低精度）の代わりに、語彙ヒントを
 * 渡せる gpt-4o-transcribe を使い、面接の固有名詞（大学/学部/氏名/高校）に強い
 * 文字起こしを返す。失敗時は whisper-1 にフォールバックし、最終失敗は空文字を返して
 * 呼び出し側で Gemini テキストにフォールバックさせる（面接を止めない）。
 */

const PRIMARY_MODEL = "gpt-4o-transcribe";
const FALLBACK_MODEL = "whisper-1";

/** OpenAI 文字起こしを1回叩いて text を返す。失敗時は null。 */
async function transcribe(
  apiKey: string,
  blob: Blob,
  model: string,
  prompt: string,
): Promise<string | null> {
  const form = new FormData();
  form.append("file", blob, "audio.wav");
  form.append("model", model);
  form.append("language", "ja");
  form.append("response_format", "json");
  if (prompt) form.append("prompt", prompt.slice(0, 800)); // whisper prompt は約224トークン上限

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    console.warn(`[stt-turn] ${model} error`, res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  return typeof data.text === "string" ? data.text.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const audioWavBase64: string = typeof body.audioWavBase64 === "string" ? body.audioWavBase64 : "";
    if (!audioWavBase64) {
      return NextResponse.json({ text: "" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ text: "" });
    }

    // 語彙ヒント: 学部別語彙 + 大学/学部名 に、本人の氏名・高校名を追記
    const vocab = buildWhisperPrompt(
      typeof body.facultyName === "string" ? body.facultyName : undefined,
      typeof body.universityName === "string" ? body.universityName : undefined,
    );
    const names = [body.studentName, body.highSchoolName]
      .filter((s) => typeof s === "string" && s.trim())
      .join("、");
    const prompt = names ? `${names}、${vocab}` : vocab;

    const blob = new Blob([Buffer.from(audioWavBase64, "base64")], { type: "audio/wav" });

    const startedAt = Date.now();
    let text = await transcribe(apiKey, blob, PRIMARY_MODEL, prompt);
    let usedModel = PRIMARY_MODEL;
    if (text === null) {
      // モデル不可用・一時エラー時は whisper-1 で1回リトライ
      text = await transcribe(apiKey, blob, FALLBACK_MODEL, prompt);
      usedModel = FALLBACK_MODEL;
    }

    void recordAiTrace({
      feature: "interview-stt-turn",
      model: usedModel,
      startedAt,
      ok: text !== null,
    });

    return NextResponse.json({ text: text ?? "" });
  } catch (err) {
    console.warn("[stt-turn] failed", err);
    return NextResponse.json({ text: "" });
  }
}

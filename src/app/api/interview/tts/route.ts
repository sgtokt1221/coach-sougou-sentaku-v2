import { NextRequest, NextResponse } from "next/server";

const ALLOWED_VOICES = new Set([
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice } = body;

    if (!text) {
      return NextResponse.json({ error: "text は必須です" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json(
        { error: "TTS APIキーが設定されていません", fallbackText: text },
        { status: 503 }
      );
    }

    // 許容リスト外や未指定の場合は alloy にフォールバック
    const safeVoice =
      typeof voice === "string" && ALLOWED_VOICES.has(voice) ? voice : "alloy";

    // gpt-4o-mini-tts は tts-1 より高速。未サポート環境では tts-1 にフォールバック
    const callOpenAI = (model: string) =>
      fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
          voice: safeVoice,
          response_format: "mp3",
        }),
      });

    let ttsRes = await callOpenAI("gpt-4o-mini-tts");
    if (!ttsRes.ok && (ttsRes.status === 400 || ttsRes.status === 404)) {
      // モデル未対応の場合のみ tts-1 にフォールバック
      console.warn("[TTS] gpt-4o-mini-tts failed, falling back to tts-1");
      ttsRes = await callOpenAI("tts-1");
    }

    if (!ttsRes.ok) {
      console.error("TTS API error:", ttsRes.status, await ttsRes.text().catch(() => ""));
      return NextResponse.json(
        { error: "音声生成に失敗しました", fallbackText: text },
        { status: 502 }
      );
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "TTS処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

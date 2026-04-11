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

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: safeVoice,
      }),
    });

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

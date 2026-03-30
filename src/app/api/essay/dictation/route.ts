import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { audioBase64, mimeType } = await request.json();

    if (!audioBase64) {
      return NextResponse.json({ error: "audioBase64 は必須です" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY が設定されていません" }, { status: 500 });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const ext = mimeType?.includes("webm") ? "webm" : mimeType?.includes("mp4") ? "m4a" : "wav";
    const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });

    const formData = new FormData();
    formData.append("file", blob, `dictation.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("language", "ja");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    const data = await whisperRes.json();

    if (!whisperRes.ok) {
      console.error("[Dictation] Whisper error:", data);
      return NextResponse.json({ error: "音声認識に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({
      text: data.text ?? "",
      segments: (data.segments ?? []).map((s: { start: number; end: number; text: string }) => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
      })),
      duration: data.duration ?? 0,
      language: data.language ?? "ja",
    });
  } catch (error) {
    console.error("Dictation error:", error);
    return NextResponse.json({ error: "音読処理中にエラーが発生しました" }, { status: 500 });
  }
}

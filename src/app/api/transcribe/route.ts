import { NextRequest, NextResponse } from "next/server";
import type { Transcription } from "@/lib/types/interview";

export async function POST(request: NextRequest) {
  try {
    const { audioBase64, mimeType, language } = await request.json();
    if (!audioBase64) {
      return NextResponse.json({ error: "audioBase64 は必須です" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const ext = mimeType?.includes("webm") ? "webm" : mimeType?.includes("mp4") ? "mp4" : "wav";

    const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });
    const formData = new FormData();
    formData.append("file", blob, `audio.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("language", language || "ja");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      console.error("Whisper API error:", await response.text());
      return NextResponse.json(
        { error: "文字起こしAPIでエラーが発生しました" },
        { status: 502 }
      );
    }

    const data = await response.json();

    const transcription: Transcription = {
      segments: (data.segments || []).map((s: { start: number; end: number; text: string }) => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
      })),
      fullText: data.text || "",
      language: data.language || language || "ja",
      duration: data.duration || 0,
    };

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "文字起こし処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

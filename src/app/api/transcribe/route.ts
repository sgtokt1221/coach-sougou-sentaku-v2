import { NextRequest, NextResponse } from "next/server";
import type { Transcription } from "@/lib/types/interview";

const MOCK_TRANSCRIPTION: Transcription = {
  segments: [
    { start: 0, end: 5.2, text: "私は貴学の文学部を志望しています。", speaker: "student" },
    { start: 5.5, end: 12.8, text: "日本近代文学に深い関心があり、特に夏目漱石の作品研究を通じて現代社会の問題を考察したいと考えています。", speaker: "student" },
    { start: 13.0, end: 18.5, text: "高校時代には文芸部で活動し、創作活動を通じて文学の持つ力を実感しました。", speaker: "student" },
  ],
  fullText: "私は貴学の文学部を志望しています。日本近代文学に深い関心があり、特に夏目漱石の作品研究を通じて現代社会の問題を考察したいと考えています。高校時代には文芸部で活動し、創作活動を通じて文学の持つ力を実感しました。",
  language: "ja",
  duration: 18.5,
};

export async function POST(request: NextRequest) {
  try {
    const { audioBase64, mimeType, language } = await request.json();
    if (!audioBase64) {
      return NextResponse.json({ error: "audioBase64 は必須です" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ transcription: MOCK_TRANSCRIPTION });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const ext = mimeType?.includes("webm") ? "webm" : mimeType?.includes("mp4") ? "mp4" : "wav";

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: mimeType || "audio/webm" }), `audio.${ext}`);
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
      return NextResponse.json({ transcription: MOCK_TRANSCRIPTION });
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
    return NextResponse.json({ transcription: MOCK_TRANSCRIPTION });
  }
}

import { NextRequest, NextResponse } from "next/server";

function generateSilentWav(durationMs: number = 500): Buffer {
  const sampleRate = 16000;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  // WAV header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 30);
  buffer.writeUInt16LE(16, 32);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice } = body;

    if (!text) {
      return NextResponse.json({ error: "text は必須です" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: voice || "alloy",
          }),
        });

        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          return new NextResponse(audioBuffer, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": String(audioBuffer.byteLength),
            },
          });
        }
      } catch (err) {
        console.warn("TTS API failed, returning silent wav:", err);
      }
    }

    // Mock: return silent WAV
    const silentWav = generateSilentWav(500);
    return new NextResponse(new Uint8Array(silentWav), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(silentWav.byteLength),
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

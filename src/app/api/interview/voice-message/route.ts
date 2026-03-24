import { NextRequest, NextResponse } from "next/server";

const MOCK_RESPONSE = {
  transcribedText:
    "私は貴学の文学部を志望しています。日本近代文学に深い関心があり、特に夏目漱石の作品研究を通じて現代社会の問題を考察したいと考えています。",
  aiResponse:
    "志望理由を具体的に述べていただきありがとうございます。夏目漱石の作品の中で、特にどの作品に関心をお持ちですか？また、その作品を通じてどのような現代社会の問題を考察されたいですか？",
  isActive: true,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, audioBase64, mimeType } = body;

    if (!sessionId || !audioBase64) {
      return NextResponse.json(
        { error: "sessionId, audioBase64 は必須です" },
        { status: 400 }
      );
    }

    // Step 1: Transcribe with Whisper
    let transcribedText = MOCK_RESPONSE.transcribedText;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const audioBuffer = Buffer.from(audioBase64, "base64");
        const ext = mimeType?.includes("webm") ? "webm" : "wav";
        const file = new File([audioBuffer], `recording.${ext}`, { type: mimeType || "audio/webm" });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("model", "whisper-1");
        formData.append("language", "ja");

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: formData,
        });

        if (whisperRes.ok) {
          const whisperData = await whisperRes.json();
          transcribedText = whisperData.text || transcribedText;
        }
      } catch (err) {
        console.warn("Whisper transcription failed, using mock:", err);
      }
    }

    // Step 2: Generate AI response with Claude
    let aiResponse = MOCK_RESPONSE.aiResponse;
    let isActive = true;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic();

        const res = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system:
            "あなたは大学入試の面接官です。学生の回答に対して適切にフォローアップの質問をしてください。日本語で応答してください。",
          messages: [
            {
              role: "user",
              content: `学生の回答: ${transcribedText}`,
            },
          ],
        });

        if (res.content[0].type === "text") {
          aiResponse = res.content[0].text;
        }

        if (res.stop_reason === "end_turn") {
          isActive = true;
        }
      } catch (err) {
        console.warn("Claude API failed, using mock:", err);
      }
    }

    return NextResponse.json({
      transcribedText,
      aiResponse,
      isActive,
    });
  } catch (error) {
    console.error("Voice message error:", error);
    return NextResponse.json(
      { error: "音声メッセージの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

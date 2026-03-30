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
    const { sessionId, audioBase64, mimeType, messages: existingMessages, mode, universityContext } = body;

    if (!sessionId || !audioBase64) {
      return NextResponse.json(
        { error: "sessionId, audioBase64 は必須です" },
        { status: 400 }
      );
    }

    // Step 1: Transcribe with Whisper
    let transcribedText = "";
    let transcriptionSource = "none";
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const audioBuffer = Buffer.from(audioBase64, "base64");
        console.log("[voice-message] Audio size:", audioBuffer.length, "bytes, mimeType:", mimeType);
        const ext = mimeType?.includes("webm") ? "webm" : mimeType?.includes("mp4") ? "m4a" : "wav";
        const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });

        const formData = new FormData();
        formData.append("file", blob, `recording.${ext}`);
        formData.append("model", "whisper-1");
        formData.append("language", "ja");

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: formData,
        });

        const whisperData = await whisperRes.json().catch(() => ({}));
        console.log("[voice-message] Whisper response:", whisperRes.status, JSON.stringify(whisperData).slice(0, 200));
        if (whisperRes.ok && whisperData.text) {
          transcribedText = whisperData.text;
          transcriptionSource = "whisper";
        } else {
          console.warn("[voice-message] Whisper API error:", whisperRes.status, whisperData);
          transcriptionSource = "whisper-error";
        }
      } catch (err) {
        console.warn("[voice-message] Whisper exception:", err);
        transcriptionSource = "whisper-exception";
      }
    } else {
      transcriptionSource = "no-api-key";
    }

    // If Whisper failed, return error instead of mock
    if (!transcribedText) {
      return NextResponse.json(
        { error: "音声を認識できませんでした。もう一度話してください。", transcriptionSource },
        { status: 422 }
      );
    }

    // Step 2: Generate AI response with Claude
    let aiResponse = "";
    let isActive = true;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const { buildInterviewSystemPrompt } = await import("@/lib/ai/prompts/interview");
        const client = new Anthropic();

        // システムプロンプトを構築
        let systemPrompt = "あなたは大学入試の面接官です。総合型選抜の面接を行ってください。日本語で応答してください。";
        if (universityContext) {
          systemPrompt = buildInterviewSystemPrompt(
            mode ?? "individual",
            universityContext.universityName ?? "（大学名未設定）",
            universityContext.facultyName ?? "（学部名未設定）",
            universityContext.admissionPolicy ?? "（AP未設定）",
            "（過去の弱点なし）"
          );
        }

        // 既存の会話履歴 + 今回の発言を組み立て
        const allMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
        if (existingMessages && Array.isArray(existingMessages)) {
          for (const m of existingMessages) {
            allMessages.push({
              role: m.role === "ai" ? "assistant" : "user",
              content: m.content,
            });
          }
        }
        allMessages.push({ role: "user", content: transcribedText });

        const res = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: allMessages,
        });

        if (res.content[0].type === "text") {
          aiResponse = res.content[0].text;
        }

        const totalTurns = allMessages.length;
        isActive =
          totalTurns < 16 &&
          !aiResponse.includes("以上で面接を終了") &&
          !aiResponse.includes("面接を終わりにします");
      } catch (err) {
        console.error("[voice-message] Claude API failed:", err);
        return NextResponse.json(
          { error: "AI応答の生成に失敗しました", transcribedText },
          { status: 500 }
        );
      }
    }

    if (!aiResponse) {
      return NextResponse.json(
        { error: "AI APIキーが設定されていません", transcribedText },
        { status: 500 }
      );
    }

    console.log("[voice-message] Result:", { transcriptionSource, transcribedText: transcribedText.slice(0, 50) });
    return NextResponse.json({
      transcribedText,
      aiResponse,
      isActive,
      _debug: { transcriptionSource },
    });
  } catch (error) {
    console.error("Voice message error:", error);
    return NextResponse.json(
      { error: "音声メッセージの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

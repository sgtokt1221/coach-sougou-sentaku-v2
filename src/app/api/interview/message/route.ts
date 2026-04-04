import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview";
import type { InterviewMessageResponse, InterviewMessage, InterviewMode } from "@/lib/types/interview";

const MOCK_QUESTIONS = [
  "なるほど、具体的にどのような経験がそのような考えに至ったきっかけですか？",
  "それは興味深いですね。では、その経験を通じて学んだことを、大学でどのように活かしたいですか？",
  "将来のキャリアについてはどのようにお考えですか？",
  "最後に、本学に対して何か質問はありますか？",
  "ありがとうございました。以上で面接を終了いたします。",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messages, mode, universityContext, presentationContent }: {
      sessionId: string;
      messages: InterviewMessage[];
      mode?: InterviewMode;
      universityContext?: any;
      presentationContent?: string;
    } = body;

    if (!sessionId || !messages) {
      return NextResponse.json(
        { error: "sessionId, messages は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      );
    }

    // セッション情報からシステムプロンプトを構築
    let systemPrompt = "あなたは大学入試の面接官です。総合型選抜の面接を行ってください。";

    // 1. リクエストボディから直接コンテキストを取得（優先）
    if (universityContext) {
      systemPrompt = buildInterviewSystemPrompt(
        mode ?? "individual",
        universityContext.universityName ?? "（大学名未設定）",
        universityContext.facultyName ?? "（学部名未設定）",
        universityContext.admissionPolicy ?? "（AP未設定）",
        "（過去の弱点なし）",
        undefined,
        presentationContent
      );
    } else {
      // 2. Firestoreから取得（フォールバック）
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        try {
          const sessionDoc = await adminDb.doc(`interviews/${sessionId}`).get();
          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data()!;
            const ctx = sessionData.universityContext;
            if (ctx) {
              systemPrompt = buildInterviewSystemPrompt(
                sessionData.mode ?? "individual",
                ctx.universityName,
                ctx.facultyName,
                ctx.admissionPolicy,
                "（過去の弱点なし）"
              );
            }
          }
        } catch (err) {
          console.warn("Failed to fetch session from Firestore:", err);
        }
      }
    }

    const client = new Anthropic();

    // ai→assistant, student→user に変換
    const claudeMessages = messages.map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    // stop_reason が end_turn かつ終了フレーズが含まれる場合は非アクティブ
    const isActive =
      messages.length < 16 &&
      !content.includes("以上で面接を終了") &&
      !content.includes("面接を終わりにします") &&
      response.stop_reason !== "end_turn" ||
      messages.length < 8;

    const result: InterviewMessageResponse = { content, isActive: Boolean(isActive) };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview message error:", error);
    return NextResponse.json(
      { error: "面接メッセージ処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

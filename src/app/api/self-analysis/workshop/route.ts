import { NextRequest, NextResponse } from "next/server";
import { buildSelfAnalysisPrompt } from "@/lib/ai/prompts/self-analysis";

interface WorkshopRequest {
  step: number;
  message: string;
  history?: Array<{ role: string; content: string }>;
  previousStepsData?: Record<string, unknown>;
  /** 音声会話からの終了依頼: これまでの history のみから stepData を抽出する */
  forceComplete?: boolean;
}


export async function POST(request: NextRequest) {
  try {
    const body: WorkshopRequest = await request.json();
    const { step, message, history, previousStepsData, forceComplete } = body;

    if (!message || !step) {
      return NextResponse.json(
        { error: "step と message は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    let systemPrompt = buildSelfAnalysisPrompt(step, previousStepsData);
    if (forceComplete) {
      systemPrompt += `\n\n## 重要: 即時完了モード
ここまでの history を踏まえ、追加質問はせず直ちに stepData を抽出して JSON で返してください。
必ず isComplete: true で、全フィールドを history から抽出してください。追加質問は禁止です。`;
    }
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          aiQuestion: parsed.aiQuestion ?? text,
          isComplete: parsed.isComplete ?? false,
          stepData: parsed.stepData,
        });
      }
    } catch {
      // JSON parse failed, return raw text
    }

    return NextResponse.json({
      aiQuestion: text,
      isComplete: false,
    });
  } catch (error) {
    console.error("Self-analysis workshop error:", error);
    return NextResponse.json(
      { error: "ワークショップ処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

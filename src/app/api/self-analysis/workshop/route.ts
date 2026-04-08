import { NextRequest, NextResponse } from "next/server";
import { buildSelfAnalysisPrompt } from "@/lib/ai/prompts/self-analysis";

interface WorkshopRequest {
  step: number;
  message: string;
  history?: Array<{ role: string; content: string }>;
  previousStepsData?: Record<string, unknown>;
}


export async function POST(request: NextRequest) {
  try {
    const body: WorkshopRequest = await request.json();
    const { step, message, history, previousStepsData } = body;

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

    const systemPrompt = buildSelfAnalysisPrompt(step, previousStepsData);
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

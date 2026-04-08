import { NextRequest, NextResponse } from "next/server";
import { buildActivityInterviewPrompt } from "@/lib/ai/prompts/activity";

interface InterviewRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const body: InterviewRequest = await request.json();
    const { message, history } = body;

    if (!message) {
      return NextResponse.json({ error: "message は必須です" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ヒアリング機能にはAPIキーが必要です", available: false },
        { status: 503 }
      );
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const systemPrompt = buildActivityInterviewPrompt();
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

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          aiQuestion: parsed.aiQuestion ?? text,
          isComplete: parsed.isComplete ?? false,
          structuredData: parsed.structuredData,
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
    console.error("Activity interview error:", error);
    return NextResponse.json(
      { error: "ヒアリング処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

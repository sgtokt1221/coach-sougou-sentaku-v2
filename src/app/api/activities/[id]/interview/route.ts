import { NextRequest, NextResponse } from "next/server";
import { buildActivityInterviewPrompt } from "@/lib/ai/prompts/activity";
import type { StructuredActivityData } from "@/lib/types/activity";

interface InterviewRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

const MOCK_QUESTIONS = [
  "その活動を始めたきっかけは何ですか？どのような背景や動機がありましたか？",
  "具体的にどのような行動をとりましたか？特に工夫した点や苦労した点を教えてください。",
  "その活動を通じてどのような成果が得られましたか？数値で表せるものがあれば教えてください。",
];

const MOCK_STRUCTURED_DATA: StructuredActivityData = {
  motivation: "自分の好きなことを通じて仲間と一緒に成長したいという思いから活動を始めた。",
  actions: [
    "チームメンバーとの定期的なミーティングを主催",
    "外部との連携イベントを企画・実行",
  ],
  results: [
    "参加者数の大幅な増加を達成",
    "活動の認知度向上に成功",
  ],
  learnings: [
    "リーダーシップとチームワークの重要性",
    "計画を実行に移す力",
  ],
  connection: "大学での学びと将来のキャリアに活動経験を活かしたい。",
};

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
      const turnCount = (history?.length ?? 0) + 1;
      if (turnCount >= 6) {
        return NextResponse.json({
          aiQuestion: "ヒアリングが完了しました。活動の全体像が把握できましたので、以下の内容で構造化しました。内容を確認してください。",
          isComplete: true,
          structuredData: MOCK_STRUCTURED_DATA,
        });
      }

      const questionIndex = Math.min(
        Math.floor(turnCount / 2),
        MOCK_QUESTIONS.length - 1
      );
      return NextResponse.json({
        aiQuestion: MOCK_QUESTIONS[questionIndex],
        isComplete: false,
      });
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

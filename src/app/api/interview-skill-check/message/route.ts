import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { INTERVIEW_SKILL_CHECK_SYSTEM_PROMPT } from "@/lib/ai/prompts/interview-skill-check";
import type { InterviewMessage } from "@/lib/types/interview";
import { INTERVIEW_SKILL_CHECK_MAX_TURNS } from "@/lib/types/interview-skill-check";

export const maxDuration = 60;

/**
 * 面接スキルチェック: 1ターンのAI応答
 * - 5ターン固定。プロンプトが現在のターン数を把握できるよう付加情報を注入
 */
export async function POST(request: NextRequest) {
  let body: { sessionId: string; messages: InterviewMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONパース失敗" }, { status: 400 });
  }
  const { messages } = body;
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messagesが不正です" }, { status: 400 });
  }

  // 生徒発話の数 = 完了したターン数
  const studentTurns = messages.filter((m) => m.role === "student").length;
  const currentTurn = Math.min(studentTurns + 1, INTERVIEW_SKILL_CHECK_MAX_TURNS);
  const isFinal = studentTurns >= INTERVIEW_SKILL_CHECK_MAX_TURNS;

  if (!process.env.ANTHROPIC_API_KEY) {
    // モック応答（dev fallback）
    const mockTexts = [
      "ありがとうございます。そのテーマに関心を持ったきっかけは何でしたか？",
      "なるほど。別の見方として、逆の立場から考える人もいると思いますが、それについてはどう思いますか？",
      "10年後の社会を想像したとき、そのテーマはどのように変化していると思いますか？",
      "今日の対話を通じて、自分の中で新しく見えてきたことはありますか？",
      "ありがとうございました。これで面接は終わります。お疲れさまでした。",
    ];
    const idx = Math.min(studentTurns - 1, mockTexts.length - 1);
    return NextResponse.json({
      content: idx < 0 ? mockTexts[0] : mockTexts[idx],
      turnNumber: currentTurn,
      isFinal,
    });
  }

  const phaseHint = isFinal
    ? "現在 T5（結・総括）です。受験生の自己メタ認知を促した後、必ず「これで面接は終わります。お疲れさまでした。」で締めてください。"
    : `現在 T${currentTurn} です。プロンプトの構造に従って質問してください。`;

  const systemPrompt = `${INTERVIEW_SKILL_CHECK_SYSTEM_PROMPT}\n\n# 進行状況\n${phaseHint}`;

  const client = new Anthropic();
  const conversation: Array<{ role: "user" | "assistant"; content: string }> = messages.map((m) => ({
    role: m.role === "student" ? "user" : "assistant",
    content: m.content,
  }));

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: systemPrompt,
      messages: conversation,
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({
      content: text,
      turnNumber: currentTurn,
      isFinal,
    });
  } catch (err) {
    console.error("Interview skill check message error:", err);
    return NextResponse.json(
      { error: "応答生成でエラーが発生しました" },
      { status: 500 },
    );
  }
}

import type { SessionSummary } from "@/lib/types/session";
import { buildSummaryPrompt } from "@/lib/ai/prompts/summary";

const MOCK_SUMMARY: SessionSummary = {
  overview:
    "志望理由書の方向性と面接対策について包括的に指導した。生徒は意欲的に取り組んでおり、着実に成長が見られる。",
  topicsDiscussed: [
    "志望理由書レビュー",
    "面接練習の振り返り",
    "今後のスケジュール確認",
  ],
  strengths: ["積極的な姿勢", "志望動機の一貫性"],
  improvements: ["具体的エピソードの充実", "時間配分の意識"],
  actionItems: [
    {
      task: "志望理由書を修正して再提出",
      assignee: "student" as const,
      completed: false,
    },
    {
      task: "次回面接練習の質問リスト作成",
      assignee: "teacher" as const,
      completed: false,
    },
  ],
  generatedAt: new Date().toISOString(),
};

/**
 * セッションのAIサマリーを生成する共通関数。
 * Claude APIキーが未設定の場合はモックサマリーを返す。
 */
export async function generateSessionSummary(params: {
  notes?: string;
  type?: string;
}): Promise<SessionSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ...MOCK_SUMMARY, generatedAt: new Date().toISOString() };
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const prompt = buildSummaryPrompt({ type: params.type });
    const contentText = params.notes || "（メモなし）";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n## セッションメモ\n\n${contentText}`,
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      return { ...MOCK_SUMMARY, generatedAt: new Date().toISOString() };
    }

    const parsed = JSON.parse(jsonMatch[1]);
    return {
      overview: parsed.overview || "",
      topicsDiscussed: parsed.topicsDiscussed || [],
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      actionItems: (parsed.actionItems || []).map(
        (a: {
          task: string;
          assignee: string;
          deadline?: string;
          completed?: boolean;
        }) => ({
          task: a.task,
          assignee: a.assignee as "student" | "teacher",
          deadline: a.deadline,
          completed: a.completed ?? false,
        })
      ),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Summary generation error:", error);
    return { ...MOCK_SUMMARY, generatedAt: new Date().toISOString() };
  }
}

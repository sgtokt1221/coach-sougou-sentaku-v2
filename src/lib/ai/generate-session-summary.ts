import type { SessionSummary } from "@/lib/types/session";
import { buildSummaryPrompt } from "@/lib/ai/prompts/summary";

const EMPTY_SUMMARY: SessionSummary = {
  overview: "",
  topicsDiscussed: [],
  strengths: [],
  improvements: [],
  actionItems: [],
  generatedAt: new Date().toISOString(),
};

/**
 * セッションのAIサマリーを生成する共通関数。
 * Claude APIキーが未設定の場合はエラーをスローする。
 */
export async function generateSessionSummary(params: {
  notes?: string;
  type?: string;
}): Promise<SessionSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("APIキーが設定されていません");
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
      return { ...EMPTY_SUMMARY, overview: rawText, generatedAt: new Date().toISOString() };
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
    return { ...EMPTY_SUMMARY, generatedAt: new Date().toISOString() };
  }
}

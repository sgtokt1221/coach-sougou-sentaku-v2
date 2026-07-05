import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import type { ChocoParagraph, ChocoEvaluation } from "@/lib/types/choco";
import { buildChocoReviewPrompt } from "@/lib/ai/prompts/choco";

export class ChocoParseError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
  ) {
    super(message);
    this.name = "ChocoParseError";
  }
}

function toScore(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

/** 生徒の1段落を評価。AI呼び出し＋堅牢JSONパースのみ（Firestore I/Oは含まない）。 */
export async function reviewChocoParagraph(input: {
  paragraphs: ChocoParagraph[];
  blankIndex: number;
  studentText: string;
}): Promise<ChocoEvaluation> {
  const prompt = buildChocoReviewPrompt(
    input.paragraphs,
    input.blankIndex,
    input.studentText,
  );
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) ?? rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new ChocoParseError("JSONブロックが見つかりません", rawText);

  let parsed: {
    scores?: { logic?: unknown; coherence?: unknown; expression?: unknown };
    feedback?: Partial<ChocoEvaluation["feedback"]>;
  };
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch {
    parsed = JSON.parse(jsonrepair(jsonMatch[1]));
  }

  const feedback = parsed.feedback ?? {};
  return {
    scores: {
      logic: toScore(parsed.scores?.logic),
      coherence: toScore(parsed.scores?.coherence),
      expression: toScore(parsed.scores?.expression),
    },
    feedback: {
      overall: feedback.overall ?? "",
      goodPoints: feedback.goodPoints ?? [],
      improvements: feedback.improvements ?? [],
      languageCorrections: feedback.languageCorrections ?? [],
      weaknessTags: feedback.weaknessTags ?? [],
      nextTip: feedback.nextTip ?? "",
    },
  };
}

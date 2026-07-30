import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ChocoParagraph, ChocoEvaluation } from "@/lib/types/choco";
import { buildChocoReviewPrompt } from "@/lib/ai/prompts/choco";
import { ChocoReviewOutputSchema } from "@/lib/ai/schemas/choco";
import { AI_MODEL_REVIEW } from "@/lib/ai/prompt-versions";

export class ChocoParseError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
  ) {
    super(message);
    this.name = "ChocoParseError";
  }
}

/**
 * 生徒の1段落を評価。AI呼び出しのみ（Firestore I/Oは含まない）。
 *
 * 以前はテキスト応答から正規表現でJSONを切り出して JSON.parse し、失敗したら
 * jsonrepair で補修していた。モデルが引用符やエスケープを1文字誤ると添削全体が
 * 落ちる経路で、小論文添削・スキルチェックでは実際に本番のパース失敗が出ている。
 * 構造化出力 + Zod 検証に移行してこの経路を構造的に消した。
 */
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
  const response = await client.messages.parse({
    model: AI_MODEL_REVIEW,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
    output_config: {
      format: zodOutputFormat(ChocoReviewOutputSchema),
      // 拡張思考に max_tokens を食われて本文が切れるのを防ぐ
      effort: "low",
    },
  });

  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  if (response.stop_reason === "max_tokens") {
    throw new ChocoParseError(
      "AI 添削結果が最大トークン数で途中終了しました",
      rawText,
    );
  }
  const parsed = response.parsed_output;
  if (!parsed) {
    console.error("[choco] 構造化応答が不正", {
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
    throw new ChocoParseError(
      "AI 添削結果が構造化出力スキーマを満たしませんでした",
      rawText,
    );
  }

  // 引用できない指摘は表示しても直せないため、原文に一致しないものは落とす。
  // プロンプトでも完全一致を指示しているが、守られないことがあるためサーバーで確定させる。
  const languageCorrections = parsed.feedback.languageCorrections.filter(
    (c) =>
      c.original.length > 0 &&
      input.studentText.includes(c.original) &&
      c.original !== c.suggestion,
  );

  return {
    scores: {
      logic: parsed.scores.logic,
      coherence: parsed.scores.coherence,
      expression: parsed.scores.expression,
    },
    feedback: {
      overall: parsed.feedback.overall,
      goodPoints: parsed.feedback.goodPoints,
      improvements: parsed.feedback.improvements,
      languageCorrections,
      weaknessTags: parsed.feedback.weaknessTags,
      nextTip: parsed.feedback.nextTip,
    },
  };
}

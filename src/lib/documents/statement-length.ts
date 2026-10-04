import type Anthropic from "@anthropic-ai/sdk";
import {
  charRangeFor,
  fitToCharLimit,
  fitToCharRange,
} from "@/lib/ai/fit-char-limit";
import { STATEMENT_SECTION_RATIOS } from "@/lib/ai/prompts/statement";

export type StatementStructure = {
  intro: string;
  body: string;
  strengths: string;
  conclusion: string;
};

/** 伸ばすときに渡すセクションの役割（伸ばす方向がぶれないようにする） */
const STATEMENT_SECTION_LABELS: Record<keyof StatementStructure, string> = {
  intro: "志望理由書の導入（志望のきっかけと結論）",
  body: "志望理由（その学部で学びたいこと・問題意識）",
  strengths: "自己の強みと、大学でどう生かし貢献するか",
  conclusion: "将来への展開（卒業後に何をしたいか）",
};

export function joinStatementStructure(structure: StatementStructure): string {
  return Object.values(structure)
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 志望理由書の4セクションを、生徒が設定した字数（targetWordCount）の90〜110%に合わせる。
 *
 * - 超えていれば、各セクションを長さの比で縮める（以前からの動き）。
 * - 足りなければ、目安の字数に届かないセクションだけを、事実を足さずに考えを展開して伸ばす。
 *   以前は「材料が足りなければ短いままで構わない」として伸ばす処理が無く、
 *   設定より大きく短い下書きが返っていた。
 *
 * 一括作成の API と検証スクリプトで同じものを使う。
 */
export async function fitStatementToTarget(
  client: Anthropic,
  input: StatementStructure,
  target: number
): Promise<StatementStructure> {
  const structure = { ...input };
  const limit = Math.round(target * 1.1);
  let draft = joinStatementStructure(structure);
  if (draft.length > limit) {
    const entries = Object.entries(structure).filter(([, text]) => text.trim());
    const contentBudget = Math.max(1, limit - (entries.length - 1) * 2);
    const originalLength = entries.reduce(
      (sum, [, text]) => sum + text.length,
      0
    );
    // セクションは互いに独立なので並列で圧縮する（直列だと4本分の待ち時間になる）
    const compressed = await Promise.all(
      entries.map(async ([key, text]) => {
        const sectionLimit = Math.max(
          20,
          Math.floor(contentBudget * (text.length / originalLength))
        );
        return [key, await fitToCharLimit(client, text, sectionLimit)] as const;
      })
    );
    for (const [key, text] of compressed)
      structure[key as keyof StatementStructure] = text;
    draft = joinStatementStructure(structure);
  }
  if (draft.length < charRangeFor(target).min) {
    const expanded = await Promise.all(
      (
        Object.keys(STATEMENT_SECTION_RATIOS) as (keyof StatementStructure)[]
      ).map(async (key) => {
        const text = structure[key] ?? "";
        const desired = (target * STATEMENT_SECTION_RATIOS[key]) / 100;
        const { min, max } = charRangeFor(desired);
        if (!text.trim() || text.length >= min) return [key, text] as const;
        return [
          key,
          await fitToCharRange(
            client,
            text,
            min,
            max,
            STATEMENT_SECTION_LABELS[key]
          ),
        ] as const;
      })
    );
    for (const [key, text] of expanded) structure[key] = text;
  }
  return structure;
}

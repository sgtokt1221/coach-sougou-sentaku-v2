import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  DocumentFeedback,
  DocumentProgressItem,
  DocumentReviewProgress,
} from "@/lib/types/document";
import { documentScoreLayout, documentTotal } from "@/lib/documents/score-axes";

/**
 * 再添削のとき、前回の添削の指摘が新しい本文で直ったかを判定する。
 *
 * 以前は再添削のたびに結果を上書きするだけで、前回の指摘が直ったのか、
 * 点がどう動いたのかが生徒にも講師にも見えなかった。
 *
 * 赤ペンは「前回の原文が新しい本文に残っているか」で計算して決める。
 * 改善点とAPの欠けていた要素は文面の言い換えで直すので、AI で判定する。
 */

/** 判定に回す前回の指摘。キーは結果を結び付けるためだけに使う */
export interface PreviousIssue {
  key: string;
  kind: DocumentProgressItem["kind"];
  label: string;
}

/** 前回の添削から、判定する指摘を取り出す。赤ペンは計算で判定済みの状態を付ける */
export function collectPreviousIssues(
  previous: Partial<DocumentFeedback>,
  newContent: string
): { language: DocumentProgressItem[]; toJudge: PreviousIssue[] } {
  const language: DocumentProgressItem[] = (
    previous.languageCorrections ?? []
  ).map((c) => ({
    kind: "language",
    label: `${c.original} → ${c.suggestion}`,
    status: newContent.includes(c.original) ? "unchanged" : "resolved",
    note: null,
  }));
  const toJudge: PreviousIssue[] = [
    ...(previous.improvementDetails ?? []).map((d, i) => ({
      key: `improvement:${i}`,
      kind: "improvement" as const,
      label: d.problem,
    })),
    ...(previous.apMap ?? [])
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => a.status !== "met")
      .map(({ a, i }) => ({
        key: `ap:${i}`,
        kind: "ap" as const,
        label: `APの「${a.element}」に応えていない`,
      })),
  ];
  return { language, toJudge };
}

/**
 * 判定の結果と合わせて保存する形にする。判定が無い（失敗した）指摘は出さない
 * （「まだ」と出すと、直っているのに直っていないと見える）。
 */
export function buildProgress(params: {
  previous: Partial<DocumentFeedback>;
  previousAt: string | null;
  /** 書類の種類。前回の合計を、その種類の軸の並びで出すのに使う */
  documentType?: string;
  language: DocumentProgressItem[];
  toJudge: PreviousIssue[];
  judged: Map<
    string,
    { status: DocumentProgressItem["status"]; note: string | null }
  > | null;
}): DocumentReviewProgress {
  const judgedItems: DocumentProgressItem[] = params.judged
    ? params.toJudge.flatMap((issue) => {
        const j = params.judged!.get(issue.key);
        return j
          ? [
              {
                kind: issue.kind,
                label: issue.label,
                status: j.status,
                note: j.note,
              },
            ]
          : [];
      })
    : [];
  // 前回の合計は、前回の軸の版のまま出す（v10 と旧軸の合計は比べられない）
  const layout = documentScoreLayout(params.previous, params.documentType);
  const total = documentTotal(layout);
  return {
    previousAt: params.previousAt,
    previousTotal:
      layout.incomplete || total.max === 0
        ? null
        : {
            version: layout.version,
            total: total.total,
            max: total.max,
            percentage: total.percentage,
          },
    items: [...judgedItems, ...params.language],
  };
}

const ProgressOutputSchema = z.object({
  results: z
    .array(
      z.object({
        key: z.string().max(40),
        status: z.enum(["resolved", "improved", "unchanged"]),
        note: z.string().max(400),
      })
    )
    .max(20),
});

const SYSTEM_PROMPT = `あなたは総合型選抜の出願書類を指導する講師です。
前回の添削で指摘した点が、書き直した本文で直ったかを判定します。

- resolved: 指摘の問題が解消している（言い回しが助言と違っていても、問題が無くなっていれば resolved）
- improved: 手を入れた跡があり良くなったが、まだ不十分
- unchanged: 直っていない、または該当箇所に手が入っていない
- note: 判定の理由を1文で。直った・良くなったときは本文のどこで直ったか、まだのときは何が残っているかを書く
- 渡された key をそのまま返す。すべての指摘について1件ずつ返す`;

export async function judgeProgress(params: {
  client: Anthropic;
  model: string;
  issues: PreviousIssue[];
  newContent: string;
}): Promise<Map<
  string,
  { status: DocumentProgressItem["status"]; note: string | null }
> | null> {
  if (params.issues.length === 0) return new Map();
  try {
    const response = await params.client.messages.parse({
      model: params.model,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<previous_issues>
${JSON.stringify(params.issues.map(({ key, label }) => ({ key, issue: label })))}
</previous_issues>
<revised_document>
${params.newContent}
</revised_document>`,
        },
      ],
      output_config: {
        format: zodOutputFormat(ProgressOutputSchema),
        effort: "low",
      },
    });
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      console.error("[documents/progress] 判定を受け取れませんでした", {
        model: params.model,
        stop_reason: response.stop_reason,
      });
      return null;
    }
    const keys = new Set(params.issues.map((i) => i.key));
    return new Map(
      response.parsed_output.results
        .filter((r) => keys.has(r.key))
        .map((r) => [r.key, { status: r.status, note: r.note || null }])
    );
  } catch (err) {
    console.error("[documents/progress] 判定に失敗", {
      model: params.model,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

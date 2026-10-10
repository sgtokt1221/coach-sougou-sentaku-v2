import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { DocumentApMapItem } from "@/lib/types/document";

/**
 * APとの対応表。APを要素に分け、書類の本文が要素ごとに応えているかを判定する。
 *
 * AP合致度が点数1つと自由文だけで、生徒にはAPのどこに応えていて
 * 何が欠けているのかが分からなかった。本体の添削スキーマに足すと出力が伸びて
 * max_tokens の枠（thinking と共有）が苦しくなるので、並列の別呼び出しにする。
 * 失敗しても添削そのものは返せるよう、例外は投げず null を返す。
 */

/** 上限はモデルが現実に返す幅で取る。超えると parse が丸ごと落ちる */
const ApMapOutputSchema = z.object({
  elements: z
    .array(
      z.object({
        element: z.string().max(200),
        apQuote: z.string().max(600),
        status: z.enum(["met", "partial", "missing"]),
        evidence: z.string().max(600).nullable(),
        advice: z.string().max(600).nullable(),
      })
    )
    .max(10),
});

const DISPLAY_MAX_ELEMENTS = 8;

const SYSTEM_PROMPT = `あなたは総合型選抜の出願書類を読む大学教員です。
アドミッション・ポリシー（AP）を、求められている要素に分け、受験生の書類の本文がそれぞれに応えているかを判定します。

手順:
1. APを、求める資質・関心・経験・学びの姿勢などの要素に分ける（3〜8個）。同じことを言い換えている文は1つにまとめる。
   - element: その要素を20字程度で要約する
   - apQuote: その要素の根拠になるAPの文を、APから一字一句そのまま引用する
2. 本文がその要素に応えているかを判定する。
   - met: 本文に、その要素に当たる具体的な経験・考え・計画が書かれている
   - partial: 触れてはいるが、言葉をなぞっただけ・具体が無い・つながりが書かれていない
   - missing: 本文に該当する記述が無い
   APの単語が本文に出てくるだけでは met にしない。
3. evidence: met / partial のとき、根拠になる本文の一文（または一文の一部）を、本文から一字一句そのまま引用する。改変・要約しない。missing のときは null。
4. advice: partial / missing のとき、その要素に応えるには何を書けばよいかを1〜2文で示す。
   - 本文と参考情報に無い経験・数字・実績を作らない。「〜の経験があれば、それを書く」「〜を入学後にどう学ぶかを一文足す」のように、本人が持っている材料を引き出す形で書く
   - met のときは null。`;

export async function judgeApMap(params: {
  client: Anthropic;
  model: string;
  admissionPolicy: string;
  content: string;
  documentType: string;
  universityName: string;
  facultyName: string;
}): Promise<DocumentApMapItem[] | null> {
  try {
    const response = await params.client.messages.parse({
      model: params.model,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<reference_data>
${JSON.stringify({
  universityName: params.universityName,
  facultyName: params.facultyName,
  documentType: params.documentType,
})}
</reference_data>
<admission_policy>
${params.admissionPolicy}
</admission_policy>
<document_under_review>
${params.content}
</document_under_review>`,
        },
      ],
      output_config: {
        format: zodOutputFormat(ApMapOutputSchema),
        effort: "low",
      },
    });
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      console.error("[documents/ap-map] 判定を受け取れませんでした", {
        model: params.model,
        stop_reason: response.stop_reason,
        usage: response.usage,
      });
      return null;
    }
    return response.parsed_output.elements
      .slice(0, DISPLAY_MAX_ELEMENTS)
      .map((e) => {
        // 本文に完全一致しない引用は根拠として採らない（作られた引用を弾く）
        const evidence =
          e.status !== "missing" &&
          e.evidence &&
          params.content.includes(e.evidence)
            ? e.evidence
            : null;
        return {
          element: e.element,
          apQuote: e.apQuote,
          status: e.status,
          evidence,
          advice: e.status === "met" ? null : e.advice,
        };
      });
  } catch (err) {
    console.error("[documents/ap-map] 判定に失敗", {
      model: params.model,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

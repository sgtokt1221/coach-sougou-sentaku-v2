/**
 * 答案が課題文を実際に読んで書かれたかを、添削とは別の1回の呼び出しで判定する。
 *
 * **なぜ添削のスキーマに載せないか。**
 * 構造化出力のスキーマは既に限界で、3値の enum を1つ足しただけで
 * Anthropic API が `The compiled grammar is too large` で 400 を返し、
 * **全答案の添削が失敗した**（2026-09-09 に実測。項目を削っても回復せず、
 * 外すと成功する対照実験で確定）。判定だけを別呼び出しに切り出す。
 *
 * **なぜ語の一致で数えないか。**
 * 最初は課題文にしか出ない語が答案にいくつ現れるかで測ったが、
 * 8000字級の課題文だと「意見・全員・雰囲気」のような一般語が偶然一致し、
 * 課題文の論点に一度も触れていない答案を grounded と誤判定した（実答案で確認）。
 * 判定に要るのは語の重なりではなく「設問だけで書けたか」の判断なので、
 * ここは意味を読める側に任せる。
 *
 * 添削本体と同時に走らせる（`Promise.all`）ので、生徒の待ち時間は増えない。
 * 失敗しても null を返して減点しない。判定が取れないことを理由に生徒の点を
 * 下げてはいけない。
 */
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL_REVIEW } from "@/lib/ai/prompt-versions";
import type { SourceEngagementLevel } from "@/lib/essay/source-engagement";

const SourceEngagementSchema = z.object({
  level: z.enum(["grounded", "shallow", "absent"]),
  /** そう判断した根拠。生徒にそのまま見せる */
  basis: z.string().max(300),
});

export interface SourceEngagementJudgement {
  level: SourceEngagementLevel;
  basis: string;
}

const SYSTEM_PROMPT = `あなたは大学入試小論文の採点者です。課題文つきの設問に対する答案を読み、
**その答案が課題文を実際に読んで書かれたか**だけを判定します。答案の良し悪しは採点しません。

判定の決め手はただ一つ、「設問文だけを読んで、課題文を読まずに書けた答案か」です。

- absent: 課題文にしか無い論点・区別・具体例が一つも使われていない。
  話題が同じでも、設問に書いてある主題について一般論と自分の経験だけで書いているなら absent です。
  よく書けている答案でも、課題文を読んだ形跡が無ければ absent にしてください。
- shallow: 課題文の話題や語には触れているが、筆者の主張を自分の議論に組み込んでいない。
  「課題文にもあるように」と一言添えるだけ、要点をなぞるだけの場合はここです。
- grounded: 課題文の特定の主張・区別・具体例を取り出し、それに賛成・反論・限定・応用するなど、
  自分の議論の一部として使っている。

判断に迷ったら軽いほう（grounded 寄り）にしてください。読んだ答案を読んでいないと誤って
断じることのほうが害が大きいためです。

basis には、答案のどこが課題文のどの内容に対応していたか（または対応が無かったか）を
日本語150字以内で書いてください。`;

export async function judgeSourceEngagement(params: {
  client: Anthropic;
  essayText: string;
  sourceText: string;
  topic?: string | null;
}): Promise<SourceEngagementJudgement | null> {
  const source = params.sourceText.trim();
  const essay = params.essayText.trim();
  if (!source || !essay) return null;

  try {
    const res = await params.client.messages.parse({
      model: AI_MODEL_REVIEW,
      // 本文は300字弱だが、max_tokens は thinking と共有される。
      // 絞りすぎると thinking が食い潰して本文が0バイトになる
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<question>
${params.topic ?? ""}
</question>
<source_text>
${source}
</source_text>
<essay>
${essay}
</essay>`,
        },
      ],
      output_config: {
        format: zodOutputFormat(SourceEngagementSchema),
        effort: "medium",
      },
    });
    // stop_reason の確認は parse の前に置く（parse は失敗時に例外を投げる）
    if (res.stop_reason === "max_tokens") return null;
    const parsed = res.parsed_output;
    if (!parsed) return null;
    return { level: parsed.level, basis: parsed.basis };
  } catch (err) {
    // 減点しない側に倒す。判定の失敗で生徒の点が下がってはいけない
    console.error("[source-engagement] 判定に失敗:", err);
    return null;
  }
}

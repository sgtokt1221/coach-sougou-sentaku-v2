/**
 * 口頭試問型の答案の「知識の整理」を作る。テーマ深掘り（essay-deep-dive）の代わり。
 *
 * 深掘りは「何が対立している論点か・主な立場」という、意見を書く小論文向けの
 * 読み物。口頭試問は知識を問う出題なので、用語の定義・事実・取り違えやすい点を
 * 問ごとに外せないことまで整理する。
 *
 * 深掘りと同じく採点ではないので「入力から確認できることだけ」の縛りは掛けない。
 * 代わりに、自信のない数値・年号・固有名詞は出さない。
 */
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  EssayFeedback,
  OralExamKnowledgeDigest,
  OralExamQuestionSet,
} from "@/lib/types/essay";

// 配列の .max() は受け取り後の Zod 検査で効く。超えると丸ごと返らないので広めに取る
const KnowledgeDigestSchema = z.object({
  summary: z.string(),
  terms: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .max(15),
  keyPoints: z
    .array(z.object({ point: z.string(), detail: z.string() }))
    .max(12),
  misconceptions: z
    .array(z.object({ wrong: z.string(), right: z.string() }))
    .max(10),
  perQuestion: z
    .array(z.object({ no: z.number().int().min(1), mustInclude: z.string() }))
    .max(10),
});

const MAX_ESSAY_CHARS = 4000;

function buildPrompt(
  set: OralExamQuestionSet,
  essayText: string,
  feedback: EssayFeedback,
  facultyName: string | null
): string {
  const questions = set.subQuestions
    .map((q) => `問${q.no} ${q.prompt}（${q.wordLimit}字程度）`)
    .join("\n");
  const errors = (feedback.knowledgeInsights?.errors ?? [])
    .map((e) => `- 「${e.claim}」→ ${e.correction}`)
    .join("\n");

  return `あなたは大学入試の口頭試問を指導する講師です。テーマ「${set.theme}」の小問集合に
高校生が答えた答案を読み、**このテーマで答えるために押さえるべき知識の整理**を書いてください。
${facultyName ? `志望学部は「${facultyName}」です。その分野で問われやすい知識に寄せてください。\n` : ""}
<questions>
${questions}
</questions>
<essay>
${essayText.trim().slice(0, MAX_ESSAY_CHARS)}
</essay>
<knowledge_errors>
${errors || "（指摘なし）"}
</knowledge_errors>

## 目的
- 次に同じテーマで口頭試問を受けたときに、正確に答えられるようにする読み物です
- 答案の採点ではありません。良し悪しの評価は書きません
- 「自分で調べてみましょう」で終わらせません

## 各項目
- summary: このテーマで押さえるべきことを2〜3文で
- terms: 定義を言えるようにしておく用語（3〜8個）。定義は高校生が口で説明できる長さで
- keyPoints: 知っておくべき事実・仕組み・理由（3〜6個）
- misconceptions: 取り違えやすい点（2〜5個）。答案で誤りが指摘されていれば必ず含める
- perQuestion: 問ごとに、答えるときに外せないこと（すべての問について、問番号の順に）

## 正確さ
- 自信のない数値・年号・固有名詞は書きません。一般的な言い方にとどめます
- 説が分かれることは「説が分かれる」と書きます
- 高校生に分かる言葉で書きます。である調で書きます`;
}

export async function generateOralExamKnowledgeDigest(args: {
  client: Anthropic;
  set: OralExamQuestionSet;
  essayText: string;
  feedback: EssayFeedback;
  facultyName: string | null;
}): Promise<Omit<OralExamKnowledgeDigest, "generatedAt"> | null> {
  const response = await args.client.messages.parse({
    // テーマ深掘りと同じモデル・上限（事実の正確さが価値そのもの）
    model: "claude-opus-5",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: buildPrompt(
          args.set,
          args.essayText,
          args.feedback,
          args.facultyName
        ),
      },
    ],
    output_config: {
      format: zodOutputFormat(KnowledgeDigestSchema),
      effort: "high",
    },
  });
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    console.warn("[oral-exam-knowledge-digest] 構造化応答が不正", {
      stop_reason: response.stop_reason,
    });
    return null;
  }
  const out = response.parsed_output;
  return {
    ...out,
    perQuestion: [...out.perQuestion].sort((a, b) => a.no - b.no),
  };
}

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import {
  AI_PROMPT_VERSIONS,
  selectDocumentModel,
} from "@/lib/ai/prompt-versions";
import { DocumentReviewError } from "@/lib/documents/review-core";
import type { DocumentInterviewQuestion } from "@/lib/types/document";

/**
 * 書類の本文から、面接で突っ込まれそうな箇所と質問を出す。
 *
 * 志望理由書は面接官の手元で読まれ、そこから質問が来る。添削は「書類としての出来」を
 * 見るだけで、どの文が深掘りされるかの準備には使えなかった。
 * 添削のたびには作らず、押したときだけ作る（読まない人のぶんまで払わない）。
 * 生徒と管理者の双方から呼ぶので、認可は各ルートに置き、中身はここに集める。
 */

const QuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        quote: z.string().max(600),
        question: z.string().max(300),
        intent: z.string().max(400),
        prep: z.string().max(600),
      })
    )
    .max(8),
});

const DISPLAY_MAX = 5;

const SYSTEM_PROMPT = `あなたは総合型選抜の面接官です。受験生が提出した書類を手元に置いて面接します。
書類の本文から、面接で必ず深掘りする箇所を3〜5か所選び、そこで聞く質問を作ります。

選ぶ箇所の目安（重要な順）:
- 抽象的な言葉で済ませていて、本人の具体的な経験・判断を聞かないと中身が分からない文
- 志望理由・将来像と経験のつながりが飛んでいる文
- 大学で学ぶ内容について、どこまで調べたかを確かめたくなる文
- 本人の経験として書かれているが、詳しく聞けば本当に本人のものか分かる文

各項目:
- quote: その箇所の本文を、本文から一字一句そのまま引用する（改変・要約しない。1文以内）
- question: 面接官が実際に口にする質問（1文）
- intent: その質問で面接官が確かめたいこと（1文）
- prep: 受験生が答える前に整理しておくこと（1〜2文）。答えの文例は書かない。本文に無い経験を作らない`;

export async function generateDocumentInterviewQuestions(params: {
  documentId: string;
}): Promise<DocumentInterviewQuestion[]> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) throw new DocumentReviewError("サーバー設定エラー", 500);

  const ref = adminDb.doc(`documents/${params.documentId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new DocumentReviewError("書類が見つかりません", 404);
  const data = snap.data()!;
  // 印は添削した本文に付けるので、その本文に対して作る
  const text = data.feedbackContent;
  if (!data.feedback || typeof text !== "string" || !text.trim()) {
    throw new DocumentReviewError("先にAI添削を実行してください", 400);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new DocumentReviewError("APIキーが設定されていません", 503);
  }

  let admissionPolicy = "";
  if (typeof data.universityId === "string" && data.universityId) {
    const uni = await adminDb.doc(`universities/${data.universityId}`).get();
    const faculty = Array.isArray(uni.data()?.faculties)
      ? uni
          .data()!
          .faculties.find((f: { id?: string }) => f.id === data.facultyId)
      : undefined;
    if (typeof faculty?.admissionPolicy === "string") {
      admissionPolicy = prepareAdmissionPolicy(faculty.admissionPolicy).text;
    }
  }

  const model = selectDocumentModel(data.type);
  const response = await new Anthropic().messages
    .parse({
      model,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<reference_data>
${JSON.stringify({
  universityName: data.universityName ?? "未指定",
  facultyName: data.facultyName ?? "未指定",
  documentType: data.type ?? "出願書類",
  admissionPolicy: admissionPolicy || null,
})}
</reference_data>
<document>
${text}
</document>`,
        },
      ],
      output_config: {
        format: zodOutputFormat(QuestionsSchema),
        effort: "low",
      },
    })
    .catch((err) => {
      console.error("[documents/interview-questions] 生成に失敗", {
        model,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new DocumentReviewError(
        "質問を作れませんでした。もう一度実行してください",
        502
      );
    });
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new DocumentReviewError(
      "質問を作れませんでした。もう一度実行してください",
      502
    );
  }

  // 本文に完全一致しない引用は捨てる（作られた引用で印がずれないように）
  const questions = response.parsed_output.questions
    .filter((q) => q.quote.length > 0 && text.includes(q.quote))
    .slice(0, DISPLAY_MAX);

  await ref.update({
    "feedback.interviewQuestions": questions,
    "feedback.interviewQuestionsMetadata": {
      ...AI_PROMPT_VERSIONS.documentInterviewQuestions,
      model,
    },
  });
  return questions;
}

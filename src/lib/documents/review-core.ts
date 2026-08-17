import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildDocumentReviewPrompt } from "@/lib/ai/prompts/document";
import type { SelfAnalysisContext } from "@/lib/ai/prompts/document";
import { DocumentReviewOutputSchema } from "@/lib/ai/schemas/document-review";
import type { DocumentFeedback } from "@/lib/types/document";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import {
  AI_PROMPT_VERSIONS,
  selectDocumentModel,
} from "@/lib/ai/prompt-versions";

/**
 * 出願書類のAI添削のコア。
 *
 * 生徒（/api/documents/[id]/review）と管理者・講師
 * （/api/admin/students/[id]/documents/[docId]/review-ai）の双方から呼ぶ。
 * 添削の中身が2箇所にあると、片方だけプロンプトやAP取得を直して採点結果が
 * 食い違う。認可（誰が呼べるか）だけを各ルートに残し、採点はここに集める。
 *
 * 役割外: 認証・認可、機能ゲート（requireFeature）。
 */

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapSelfAnalysis(raw: Record<string, unknown>): SelfAnalysisContext {
  const obj = (k: string) =>
    raw[k] && typeof raw[k] === "object"
      ? (raw[k] as Record<string, unknown>)
      : {};
  const values = obj("values");
  const strengths = obj("strengths");
  const vision = obj("vision");
  const identity = obj("identity");

  return {
    values: stringArray(values.coreValues),
    strengths: stringArray(strengths.strengths),
    vision: stringValue(vision.longTermVision),
    selfStatement: stringValue(identity.selfStatement),
    uniqueNarrative: stringValue(identity.uniqueNarrative),
  };
}

/** 本文に完全一致しない引用は根拠として採らない（作られた引用を弾く） */
function matchingEvidence(content: string, values: string[]): string[] {
  return values.filter((value) => value.length > 0 && content.includes(value));
}

export class DocumentReviewError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DocumentReviewError";
  }
}

export interface DocumentReviewResult {
  feedback: DocumentFeedback;
  feedbackAt: string;
}

/**
 * 書類を添削して結果を保存する。
 *
 * @param documentId documents/{id}
 * @param ownerUid その書類の持ち主（自己分析を引くのに使う。呼び出し側で確認済みのこと）
 * @param content 添削対象の本文。省略時は保存済みの本文
 */
export async function reviewDocumentCore(params: {
  documentId: string;
  ownerUid: string;
  content?: string;
}): Promise<DocumentReviewResult> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) throw new DocumentReviewError("サーバー設定エラー", 500);

  const documentSnap = await adminDb.doc(`documents/${params.documentId}`).get();
  if (!documentSnap.exists) {
    throw new DocumentReviewError("書類が見つかりません", 404);
  }
  const documentData = documentSnap.data()!;

  const content =
    typeof params.content === "string" && params.content.trim()
      ? params.content
      : documentData.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new DocumentReviewError("添削する本文がありません", 400);
  }

  // 志望校のAP。取れないときは AP合致度を採点しない（推測させない）
  let admissionPolicy = "";
  const universityId = documentData.universityId;
  const facultyId = documentData.facultyId;
  if (typeof universityId === "string" && universityId) {
    const universitySnap = await adminDb
      .doc(`universities/${universityId}`)
      .get();
    if (universitySnap.exists) {
      const universityData = universitySnap.data()!;
      const faculty = Array.isArray(universityData.faculties)
        ? universityData.faculties.find(
            (item: { id?: string }) => item.id === facultyId,
          )
        : undefined;
      if (typeof faculty?.admissionPolicy === "string") {
        admissionPolicy = prepareAdmissionPolicy(faculty.admissionPolicy).text;
      }
    }
  }

  // 自己分析。書類の持ち主のものを引く（新旧2つの保存先に対応）
  let selfAnalysis: SelfAnalysisContext | undefined;
  let selfAnalysisSnap = await adminDb.doc(`selfAnalysis/${params.ownerUid}`).get();
  if (!selfAnalysisSnap.exists) {
    selfAnalysisSnap = await adminDb
      .doc(`users/${params.ownerUid}/selfAnalysis/current`)
      .get();
  }
  if (selfAnalysisSnap.exists) {
    selfAnalysis = mapSelfAnalysis(selfAnalysisSnap.data()!);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new DocumentReviewError("APIキーが設定されていません", 503);
  }

  const client = new Anthropic();
  const hasAdmissionPolicy = admissionPolicy.length > 0;
  const reviewModel = selectDocumentModel(documentData.type);
  /**
   * 字数はサーバーで確定して渡す（モデルに数えさせると集計とずれる）。
   * 空白を除いた文字数で数える。小論文側の calculateFillRate と同じ考え方。
   */
  const wordCount = Array.from(content.replace(/\s/g, "")).length;
  const targetWordCount =
    typeof documentData.targetWordCount === "number" &&
    documentData.targetWordCount > 0
      ? Math.round(documentData.targetWordCount)
      : undefined;
  const fillRate = targetWordCount
    ? Math.round((wordCount / targetWordCount) * 100)
    : null;

  const systemPrompt = buildDocumentReviewPrompt({
    hasAdmissionPolicy,
    documentType: documentData.type,
    targetWordCount,
    fillRate,
  });
  const referenceData = {
    universityName: documentData.universityName ?? "未指定",
    facultyName: documentData.facultyName ?? "未指定",
    documentType: documentData.type ?? "出願書類",
    admissionPolicy: hasAdmissionPolicy ? admissionPolicy : null,
    selfAnalysis: selfAnalysis ?? null,
  };

  const response = await client.messages.parse({
    model: reviewModel,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `<reference_data>
${JSON.stringify(referenceData)}
</reference_data>
<document_under_review>
${content}
</document_under_review>`,
      },
    ],
    output_config: {
      format: zodOutputFormat(DocumentReviewOutputSchema),
    },
  });

  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new DocumentReviewError("AIレスポンスの検証に失敗しました", 502);
  }

  const parsed = response.parsed_output;
  if (hasAdmissionPolicy && parsed.apAlignmentScore === null) {
    throw new DocumentReviewError(
      "AP合致度の評価結果を検証できませんでした",
      502,
    );
  }

  const feedback: DocumentFeedback = {
    apAlignmentScore: hasAdmissionPolicy ? parsed.apAlignmentScore : null,
    apAlignmentAssessability: hasAdmissionPolicy
      ? "assessable"
      : "insufficient_context",
    structureScore: parsed.structureScore,
    originalityScore: parsed.originalityScore,
    expressionScore: parsed.expressionScore,
    overallFeedback: parsed.overallFeedback,
    improvements: parsed.improvements,
    apSpecificNotes: hasAdmissionPolicy
      ? parsed.apSpecificNotes
      : "アドミッションポリシーを取得できなかったため、AP合致度は評価していません。",
    scoreEvidence: {
      apAlignment: hasAdmissionPolicy
        ? matchingEvidence(content, parsed.scoreEvidence.apAlignment)
        : [],
      structure: matchingEvidence(content, parsed.scoreEvidence.structure),
      originality: matchingEvidence(content, parsed.scoreEvidence.originality),
    },
    /**
     * 赤ペンは本文に完全一致する原文だけを残す。作られた引用を弾くため。
     * 直し先が原文と同じものも落とす（直っていない指摘は役に立たない）。
     */
    languageCorrections: (parsed.languageCorrections ?? []).filter(
      (c) =>
        c.original.length > 0 &&
        content.includes(c.original) &&
        c.original !== c.suggestion,
    ),
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.documentReview,
      model: reviewModel,
    },
  };

  /**
   * 添削結果を保存する。どの本文に対する評価かが分からないと後から読めない
   * ので、評価した本文そのものも一緒に残す。
   */
  const feedbackAt = new Date().toISOString();
  try {
    await adminDb.doc(`documents/${params.documentId}`).set(
      {
        feedback,
        feedbackContent: content,
        feedbackAt,
        updatedAt: feedbackAt,
      },
      { merge: true },
    );
  } catch (err) {
    // 保存に失敗しても添削結果は返す（画面では見られる）
    console.error("[documents/review] feedback 保存失敗:", err);
  }

  return { feedback, feedbackAt };
}

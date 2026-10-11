import Anthropic from "@anthropic-ai/sdk";
import { FieldValue } from "firebase-admin/firestore";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  buildDocumentReviewPrompt,
  DOCUMENT_FILL_CAP,
  DOCUMENT_INCOMPLETE_FILL_RATE,
  DOCUMENT_SHORT_FILL_RATE,
} from "@/lib/ai/prompts/document";
import { DocumentReviewOutputSchema } from "@/lib/ai/schemas/document-review";
import type { DocumentFeedback } from "@/lib/types/document";
import { documentAssessesPlan } from "@/lib/documents/score-axes";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { loadStudentDocumentContext } from "@/lib/documents/student-context";
import {
  AI_PROMPT_VERSIONS,
  selectDocumentModel,
} from "@/lib/ai/prompt-versions";
import { judgeApMap } from "@/lib/documents/ap-map-judge";
import {
  judgeNaturalness,
  mergeNaturalness,
} from "@/lib/japanese/naturalness-judge";
import {
  buildProgress,
  collectPreviousIssues,
  judgeProgress,
} from "@/lib/documents/progress";

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

/**
 * 本文に完全一致しない引用は根拠として採らない（作られた引用を弾く）。
 * 表示は3件までなので、多く返ってきた分はここで切り詰める。
 */
function matchingEvidence(content: string, values: string[]): string[] {
  return values
    .filter((value) => value.length > 0 && content.includes(value))
    .slice(0, 3);
}

/**
 * 画面に出す件数。スキーマ側はモデルが返しうる幅を受け取れるよう緩めてあり
 * （超えると添削が丸ごと失敗するため）、絞り込みは保存時のここで行う。
 */
const DISPLAY_MAX_IMPROVEMENTS = 3;
const DISPLAY_MAX_CORRECTIONS = 5;
/** 本体の5件に自然さの点検を足した、赤ペン全体の上限 */
const MAX_LANGUAGE_CORRECTIONS = 16;

export class DocumentReviewError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "DocumentReviewError";
  }
}

export interface DocumentReviewResult {
  feedback: DocumentFeedback;
  feedbackAt: string;
  /** 添削した本文。指摘の印はこの本文に付ける */
  feedbackContent: string;
}

/** 添削の入力。Firestore から読んだものを渡す（評価スクリプトからも直接呼ぶ） */
export interface DocumentReviewInput {
  content: string;
  documentType?: string;
  universityName?: string;
  facultyName?: string;
  /** 整形済みの AP。無ければ空文字（大学との対応を採点しない） */
  admissionPolicy: string;
  selfAnalysis?: unknown;
  activities?: unknown[];
  targetWordCount?: number;
  /** 前回の添削。本文が変わっていれば、前回の指摘が直ったかを判定する */
  previous?: {
    feedback: Partial<DocumentFeedback>;
    feedbackContent: string;
    feedbackAt: string | null;
  } | null;
}

export interface DocumentReviewTelemetry {
  model: string;
  usage: unknown;
  durationMs: number;
}

/**
 * 字数の段階で点を確定する（サーバーで強制する。プロンプトの依頼だけだと
 * モデルが守らず、82/800字の書類に AP6・表現7 が付いて C になっていた）。
 */
function applyFillRateGate(
  scores: Record<"coherenceScore" | "insightScore" | "fitScore" | "planScore" | "readabilityScore", number | null>,
  fillRate: number | null
): { scores: typeof scores; incomplete: boolean } {
  if (fillRate === null) return { scores, incomplete: false };
  if (fillRate < DOCUMENT_INCOMPLETE_FILL_RATE) {
    return {
      scores: {
        coherenceScore: null,
        insightScore: null,
        fitScore: null,
        planScore: null,
        readabilityScore: null,
      },
      incomplete: true,
    };
  }
  if (fillRate < DOCUMENT_SHORT_FILL_RATE || fillRate > 100) {
    const cap = (v: number | null) =>
      v === null ? null : Math.min(v, DOCUMENT_FILL_CAP);
    return {
      scores: {
        coherenceScore: cap(scores.coherenceScore),
        insightScore: cap(scores.insightScore),
        fitScore: cap(scores.fitScore),
        planScore: cap(scores.planScore),
        readabilityScore: cap(scores.readabilityScore),
      },
      incomplete: false,
    };
  }
  return { scores, incomplete: false };
}

/**
 * 書類を添削する（Firestore には触らない）。保存は reviewDocumentCore が行う。
 */
export async function runDocumentReview(
  input: DocumentReviewInput,
  client: Anthropic = new Anthropic()
): Promise<{ feedback: DocumentFeedback; telemetry: DocumentReviewTelemetry }> {
  const { content, admissionPolicy } = input;
  const startedAt = Date.now();
  const hasAdmissionPolicy = admissionPolicy.length > 0;
  const reviewModel = selectDocumentModel(input.documentType);
  /**
   * 字数はサーバーで確定して渡す（モデルに数えさせると集計とずれる）。
   * 空白を除いた文字数で数える。小論文側の calculateFillRate と同じ考え方。
   */
  const wordCount = Array.from(content.replace(/\s/g, "")).length;
  const targetWordCount =
    typeof input.targetWordCount === "number" && input.targetWordCount > 0
      ? Math.round(input.targetWordCount)
      : undefined;
  const fillRate = targetWordCount
    ? Math.round((wordCount / targetWordCount) * 100)
    : null;

  const assessPlan = documentAssessesPlan(input.documentType);
  const systemPrompt = buildDocumentReviewPrompt({
    hasAdmissionPolicy,
    documentType: input.documentType,
    targetWordCount,
    fillRate,
  });
  const referenceData = {
    universityName: input.universityName ?? "未指定",
    facultyName: input.facultyName ?? "未指定",
    documentType: input.documentType ?? "出願書類",
    admissionPolicy: hasAdmissionPolicy ? admissionPolicy : null,
    selfAnalysis: input.selfAnalysis ?? null,
    activities:
      input.activities && input.activities.length > 0 ? input.activities : null,
  };

  /**
   * APとの対応表は別の呼び出しで、本体の添削と並列に走らせる（待ち時間を足さない）。
   * 失敗しても null が返るだけで、添削そのものは返す。書きかけには作らない。
   */
  const incompleteByLength =
    fillRate !== null && fillRate < DOCUMENT_INCOMPLETE_FILL_RATE;
  const apMapPromise =
    hasAdmissionPolicy && !incompleteByLength
      ? judgeApMap({
          client,
          model: reviewModel,
          admissionPolicy,
          content,
          documentType: input.documentType ?? "出願書類",
          universityName: input.universityName ?? "未指定",
          facultyName: input.facultyName ?? "未指定",
        })
      : Promise.resolve(null);

  /**
   * 日本語の自然さ（話し言葉・重言・ら抜き・決まり文句・語の組み合わせ）。
   * 本体の赤ペンは5件で、その枠を文法の誤りが先に使うため、不自然さが素通りしていた。
   */
  const naturalnessPromise = incompleteByLength
    ? Promise.resolve(null)
    : judgeNaturalness({ client, text: content, writer: "document" });

  /**
   * 前回の指摘が直ったか。前回の添削があり、本文が変わっているときだけ判定する。
   * これも並列に走らせ、失敗しても添削は返す（赤ペンの計算分だけ残る）。
   */
  const previousFeedback = input.previous?.feedback;
  const previousIssues =
    previousFeedback && input.previous!.feedbackContent !== content
      ? collectPreviousIssues(previousFeedback, content)
      : null;
  const progressPromise = previousIssues
    ? judgeProgress({
        client,
        model: reviewModel,
        issues: previousIssues.toJudge,
        newContent: content,
      })
    : Promise.resolve(null);

  /**
   * messages.parse は max_tokens を thinking と本文で共有する。
   *
   * 志望理由書は claude-sonnet-5 なので拡張思考が効く。effort 既定だと実測で
   * thinking だけ 8000〜12300 トークン使い、本文と合わせて 16000 の枠をほぼ
   * 使い切る。本文がわずかでも伸びると JSON が途中で切れ、parse が
   * 「Unterminated string」を投げて添削が丸ごと失敗していた。
   *
   * max_tokens をこれ以上増やす手は使えない。32000 にすると SDK が
   * 「10分を超える可能性があるのでストリーミングが必要」として送信前に弾く。
   *
   * そこで effort を medium に落とす。low まで落とすと採点が目に見えて甘くなる
   * （長すぎる一文や主述のねじれを見落とす）。
   */
  const response = await client.messages
    .parse({
      model: reviewModel,
      max_tokens: 16000,
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
        effort: "medium",
      },
    })
    /**
     * parse() は応答を組み立てる途中で投げる。下の stop_reason チェックまで
     * 到達しないので、ここで捕まえないと本番ログに素の JSON パースエラーしか
     * 残らず、何が起きたのか追えない（実際それで原因の特定が遅れた）。
     */
    .catch((err) => {
      console.error("[documents/review] 応答の組み立てに失敗", {
        model: reviewModel,
        documentType: input.documentType,
        wordCount,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new DocumentReviewError(
        "AI添削の結果を受け取れませんでした。もう一度実行してください",
        502
      );
    });

  /**
   * 失敗の理由をログに残す。以前は「検証に失敗」としか出ず、
   * max_tokens で切れたのかスキーマ不一致なのかを本番のログから判別できなかった。
   */
  if (response.stop_reason === "max_tokens") {
    console.error("[documents/review] max_tokens で途中終了", {
      model: reviewModel,
      documentType: input.documentType,
      wordCount,
      usage: response.usage,
    });
    throw new DocumentReviewError(
      "添削結果が長くなりすぎて途中で終了しました。時間をおいて再実行してください",
      502
    );
  }
  if (!response.parsed_output) {
    console.error("[documents/review] 構造化出力の検証に失敗", {
      model: reviewModel,
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
    throw new DocumentReviewError("AIレスポンスの検証に失敗しました", 502);
  }

  const parsed = response.parsed_output;
  const apMap = await apMapPromise;
  const progressJudged = await progressPromise;
  const naturalness = await naturalnessPromise;
  const progress =
    previousFeedback && previousIssues
      ? buildProgress({
          previous: previousFeedback,
          previousAt: input.previous!.feedbackAt,
          documentType: input.documentType,
          language: previousIssues.language,
          toJudge: previousIssues.toJudge,
          judged: progressJudged,
        })
      : null;
  if (hasAdmissionPolicy && parsed.fitScore === null) {
    throw new DocumentReviewError(
      "大学との対応の評価結果を検証できませんでした",
      502
    );
  }

  const gated = applyFillRateGate(
    {
      coherenceScore: parsed.coherenceScore,
      insightScore: parsed.insightScore,
      fitScore: hasAdmissionPolicy ? parsed.fitScore : null,
      // 採点しない書類種別でモデルが点を付けても捨てる（分母に入れない）
      planScore: assessPlan ? (parsed.planScore ?? null) : null,
      readabilityScore: parsed.readabilityScore,
    },
    fillRate
  );
  const improvements = parsed.improvements.slice(0, DISPLAY_MAX_IMPROVEMENTS);

  const feedback: DocumentFeedback = {
    ...gated.scores,
    incomplete: gated.incomplete,
    fillRate,
    priorityImprovement: parsed.priorityImprovement,
    /**
     * 改善点は構造化して保存する。あわせて1行にまとめたものも書く。
     * v7以前のデータを読む箇所（旧 feedback しか無い書類の表示）が
     * improvements: string[] を前提にしているため、両方を残す。
     */
    improvements: improvements.map((item) =>
      [item.location, item.problem, item.action].filter(Boolean).join(" / ")
    ),
    improvementDetails: improvements.map((item) => ({
      location: item.location,
      problem: item.problem,
      action: item.action,
      example: item.example ?? null,
    })),
    scoreEvidence: gated.incomplete
      ? { coherence: [], insight: [], fit: [], plan: [] }
      : {
          coherence: matchingEvidence(content, parsed.scoreEvidence.coherence),
          insight: matchingEvidence(content, parsed.scoreEvidence.insight),
          fit: hasAdmissionPolicy
            ? matchingEvidence(content, parsed.scoreEvidence.fit)
            : [],
          plan: assessPlan
            ? matchingEvidence(content, parsed.scoreEvidence.plan)
            : [],
        },
    /**
     * 赤ペンは本文に完全一致する原文だけを残す。作られた引用を弾くため。
     * 直し先が原文と同じものも落とす（直っていない指摘は役に立たない）。
     * 書きかけには出さない（文を直すより先に書き足す段階なので）。
     */
    languageCorrections: gated.incomplete
      ? []
      : mergeNaturalness(
          (parsed.languageCorrections ?? [])
            .filter(
              (c) =>
                c.original.length > 0 &&
                content.includes(c.original) &&
                c.original !== c.suggestion
            )
            .slice(0, DISPLAY_MAX_CORRECTIONS),
          naturalness,
          content,
          MAX_LANGUAGE_CORRECTIONS
        ),
    apMap,
    progress,
    progressMetadata: progressJudged
      ? { ...AI_PROMPT_VERSIONS.documentProgress, model: reviewModel }
      : null,
    // 面接の質問は添削した本文に対して作るので、本文が変われば作り直す
    interviewQuestions: [],
    interviewQuestionsMetadata: null,
    apMapMetadata: apMap
      ? { ...AI_PROMPT_VERSIONS.documentApMap, model: reviewModel }
      : null,
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.documentReview,
      model: reviewModel,
    },
  };

  return {
    feedback,
    telemetry: {
      model: reviewModel,
      usage: response.usage,
      durationMs: Date.now() - startedAt,
    },
  };
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

  const documentSnap = await adminDb
    .doc(`documents/${params.documentId}`)
    .get();
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

  // 志望校のAP。取れないときは大学との対応を採点しない（推測させない）
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
            (item: { id?: string }) => item.id === facultyId
          )
        : undefined;
      if (typeof faculty?.admissionPolicy === "string") {
        admissionPolicy = prepareAdmissionPolicy(faculty.admissionPolicy).text;
      }
    }
  }

  /**
   * 添削の材料。自己分析だけでなく活動実績も渡す。
   * 登録済みの実績と突き合わせられないと、書かれている経験が本人のものか
   * 判断できず、逆に強い実績を書き落としていても指摘できない。
   */
  const { selfAnalysis, activities } = await loadStudentDocumentContext(
    params.ownerUid
  );

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new DocumentReviewError("APIキーが設定されていません", 503);
  }

  const { feedback } = await runDocumentReview({
    content,
    documentType: documentData.type,
    universityName: documentData.universityName,
    facultyName: documentData.facultyName,
    admissionPolicy,
    selfAnalysis,
    activities,
    targetWordCount: documentData.targetWordCount,
    previous:
      documentData.feedback && typeof documentData.feedbackContent === "string"
        ? {
            feedback: documentData.feedback as Partial<DocumentFeedback>,
            feedbackContent: documentData.feedbackContent,
            feedbackAt:
              typeof documentData.feedbackAt === "string"
                ? documentData.feedbackAt
                : null,
          }
        : null,
  });

  /**
   * 添削結果を保存する。どの本文に対する評価かが分からないと後から読めない
   * ので、評価した本文そのものも一緒に残す。
   */
  const feedbackAt = new Date().toISOString();
  try {
    const docRef = adminDb.doc(`documents/${params.documentId}`);
    const batch = adminDb.batch();
    /**
     * feedback は update で丸ごと置き換える。set(merge) だと入れ子のマップが
     * 項目ごとに混ざり、v10 の添削に前回の旧軸の点（apAlignmentScore など）が
     * 残って、旧データとして読まれる
     */
    batch.update(docRef, {
      feedback,
      feedbackContent: content,
      feedbackAt,
      updatedAt: feedbackAt,
    });
    /**
     * 添削の履歴。書類直下の feedback は次の添削で上書きされるので、版ごとの添削を
     * バージョン履歴で読めるようにここへ積む。添削1件は数十KBあり、書類1件に
     * 積むと 1MB の上限に近づくためサブコレクションに分ける
     */
    batch.set(docRef.collection("reviews").doc(), {
      content,
      wordCount: content.length,
      feedback,
      feedbackAt,
    });
    // 自動保存は版を作らないので、添削した本文が版に無ければ積む（履歴から辿れるように）
    const versions = (documentData.versions ?? []) as { content?: string }[];
    if (!versions.some((v) => v.content === content)) {
      batch.update(docRef, {
        versions: FieldValue.arrayUnion({
          id: `v-${Date.now()}-reviewed`,
          content,
          wordCount: content.length,
          createdAt: feedbackAt,
          reason: "reviewed",
        }),
      });
    }
    await batch.commit();
  } catch (err) {
    // 保存に失敗しても添削結果は返す（画面では見られる）
    console.error("[documents/review] feedback 保存失敗:", err);
  }

  return { feedback, feedbackAt, feedbackContent: content };
}

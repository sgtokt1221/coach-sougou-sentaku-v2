import type { EssayInlineComment, LanguageCorrection } from "./essay";
import type { AiGenerationMetadata } from "@/lib/types/ai";

export type DocumentType =
  | "志望理由書"
  | "学業活動報告書"
  | "研究計画書"
  | "自己推薦書"
  | "学びの設計書";
export type DocumentStatus = "draft" | "in_review" | "reviewed" | "final";

/**
 * 管理者主導のレビュー状態（生徒の status とは別軸）。
 * approved=承認済み / revision_requested=差し戻し(要修正) / resubmitted=再確認待ち(差し戻し後に生徒が修正)
 */
export type DocumentReviewState =
  | "approved"
  | "revision_requested"
  | "resubmitted";

export interface DocumentReview {
  state: DocumentReviewState;
  /** 承認/差し戻しした管理者の uid・表示名（resubmitted は生徒編集起因のため省略可） */
  by?: string;
  byName?: string;
  at: string;
}

/**
 * レビューの操作履歴。review は最新状態しか持たないため、
 * 「いつ誰がどのコメントで承認/差し戻したか」を後から追えなかった。
 */
export interface DocumentReviewHistoryEntry {
  /** cleared = 承認/差し戻しの取り消し */
  action: DocumentReviewState | "cleared";
  by: string;
  byName: string;
  at: string;
  /** そのとき生徒へ送ったコメント本文（引用を含む） */
  comment?: string;
}

/** 未完了ウィザードの復元用進行状態。ウィザード完走後は completed:true。 */
export interface DocumentWizardState {
  /** 0-4（書類タイプ/志望校/フレームワーク/活動実績/下書き生成） */
  currentStep: number;
  frameworkType?: string;
  selectedActivityIds: string[];
  targetWordCount: number;
  /** true以降は編集画面が主。false=ウィザード再開対象 */
  completed: boolean;
  /** 下書きの各セクション本文。再開時に本文(見出しなし)から復元できないため、ここから復元する。 */
  sections?: { id: string; content: string }[];
}

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  title: string;
  content: string;
  wordCount: number;
  targetWordCount?: number;
  versions: DocumentVersion[];
  status: DocumentStatus;
  /** 個別性・テンプレ表現チェックの最新結果（後方互換のフィールド名）。 */
  aiLikeness?: DocumentAiLikeness;
  /** 管理者による承認/差し戻しレビュー状態 */
  review?: DocumentReview;
  /** レビュー操作の履歴（新しいものを末尾に積む） */
  reviewHistory?: DocumentReviewHistoryEntry[];
  /** 直近のAI添削結果。版と違い、添削するたびに上書きする */
  feedback?: DocumentFeedback;
  /** その添削が対象にした本文。今の本文と違えば古い評価と分かる */
  feedbackContent?: string;
  /** 添削した時刻 (ISO) */
  feedbackAt?: string;
  deadline?: string;
  linkedActivities: string[];
  createdAt: string;
  updatedAt: string;
  /** 未完了ウィザードの復元用。完走後は completed:true（または省略）。 */
  wizardState?: DocumentWizardState;
  /** 管理者/講師による範囲指定インラインコメント */
  inlineComments?: EssayInlineComment[];
}

export interface DocumentVersion {
  id: string;
  content: string;
  wordCount: number;
  createdAt: string;
  feedback?: DocumentFeedback;
}

/**
 * 書類の採点軸と配点。合計40点。
 *
 * 小論文の ESSAY_SCORE_WEIGHTS と同じ考え方で、換算をここ1か所に持つ。
 * 画面ごとに合計の出し方が散ると、同じ書類が場所によって違う点に見える。
 *
 * AP合致度を最も重くしているのは、出願書類が「その大学が求める人物像に
 * 合っているか」を示す書類だから。表現（日本語の正確さ）は内容ではないが、
 * 提出書類は読み直される前提の文章なので軽くはしない。
 */
export const DOCUMENT_SCORE_WEIGHTS = {
  apAlignment: 12,
  structure: 10,
  originality: 9,
  expression: 9,
} as const;

export type DocumentScoreAxis = keyof typeof DOCUMENT_SCORE_WEIGHTS;

export interface DocumentTotalScore {
  /** 加重合計（採点できた軸のみ） */
  total: number;
  /** 満点（採点できた軸のみ）。APを取得できない書類では28点になる */
  max: number;
  /** 満点に対する割合(%)。ランク判定に使う */
  percentage: number;
  /** 採点できなかった軸。画面で「AP未評価」等を出すため */
  missing: DocumentScoreAxis[];
}

/**
 * 総合点を出す。
 *
 * APを取得できなかった書類では apAlignmentScore が null になる。その場合は
 * 分母からも外す（0点として扱うと、大学未設定というだけで低評価になる）。
 * 旧データには expression が無いので、同じく分母から外す。
 */
export function calculateDocumentTotal(
  scores: Partial<Record<DocumentScoreAxis, number | null | undefined>>
): DocumentTotalScore {
  const axes = Object.keys(DOCUMENT_SCORE_WEIGHTS) as DocumentScoreAxis[];
  let total = 0;
  let max = 0;
  const missing: DocumentScoreAxis[] = [];

  for (const axis of axes) {
    const value = scores[axis];
    if (typeof value !== "number") {
      missing.push(axis);
      continue;
    }
    const weight = DOCUMENT_SCORE_WEIGHTS[axis];
    total += value * (weight / 10);
    max += weight;
  }

  return {
    total: Math.round(total),
    max,
    percentage: max > 0 ? Math.round((total / max) * 100) : 0,
    missing,
  };
}

/** 画面に出す軸のラベル */
export const DOCUMENT_SCORE_LABELS: Record<DocumentScoreAxis, string> = {
  apAlignment: "AP合致度",
  structure: "構成",
  originality: "独自性",
  expression: "表現",
};

/**
 * 改善点1件。どこを・何が問題で・どう直すか・直した文の例。
 * 以前は文字列1本で、「具体性を高めましょう」で終わる指摘が混ざっていた。
 */
export interface DocumentImprovement {
  location: string;
  problem: string;
  action: string;
  /** 直した文の例。削る・確認する類の指摘では無い場合がある */
  example?: string | null;
}

export interface DocumentFeedback {
  /** AP未取得時は採点せずnull。 */
  apAlignmentScore: number | null;
  apAlignmentAssessability: "assessable" | "insufficient_context";
  structureScore: number;
  originalityScore: number;
  /** 日本語の正確さと読みやすさ（v4 で追加。旧データには無い） */
  expressionScore?: number;
  overallFeedback: string;
  /**
   * 改善点（1行にまとめたもの）。v7以前のデータはこれしか無いので残す。
   * v8以降は improvementDetails から組み立てて両方保存する。
   */
  improvements: string[];
  /** 改善点の内訳（v8 で追加。旧データには無い） */
  improvementDetails?: DocumentImprovement[];
  apSpecificNotes: string;
  scoreEvidence?: {
    apAlignment: string[];
    structure: string[];
    originality: string[];
  };
  /** 日本語の直し（赤ペン）。v4 で追加。旧データには無い */
  languageCorrections?: LanguageCorrection[];
  aiMetadata?: AiGenerationMetadata;
}

export interface DocumentCreateRequest {
  type: DocumentType;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  targetWordCount?: number;
  deadline?: string;
  frameworkType?: string;
  templateId?: string;
  initialContent?: string;
  /** 早期作成時のウィザード進行状態 */
  wizardState?: DocumentWizardState;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  志望理由書: "志望理由書",
  学業活動報告書: "学業活動報告書",
  研究計画書: "研究計画書",
  自己推薦書: "自己推薦書",
  学びの設計書: "学びの設計書",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "下書き",
  in_review: "レビュー中",
  reviewed: "レビュー済み",
  final: "完成",
};

/** 2状態表示ラベル: draft→下書き / それ以外(in_review/reviewed/final)→完成。 */
export function documentStatusLabel2(status: DocumentStatus): string {
  return status === "draft" ? "下書き" : "完成";
}

/** 2状態判定: 完成（＝下書きでない）か。旧 in_review/reviewed も完成扱い。 */
export function isDocumentComplete(status: DocumentStatus): boolean {
  return status !== "draft";
}

export const DOCUMENT_REVIEW_LABELS: Record<DocumentReviewState, string> = {
  approved: "承認済み",
  revision_requested: "差し戻し（要修正）",
  resubmitted: "再確認待ち",
};

export type DocumentAiLikenessLevel = "low" | "medium" | "high";

/**
 * 下書きの個別性・テンプレ表現チェック結果（最新1件のみ保持）。
 * 後方互換のためフィールド名は aiLikeness のまま維持する。
 */
export interface DocumentAiLikeness {
  /** 0-100。高いほど抽象的・定型的で、本人固有の情報が不足している。 */
  score: number;
  /** low 0-39 / medium 40-69 / high 70-100 */
  level: DocumentAiLikenessLevel;
  /** 個別性が不足していると判断した根拠（生徒向けの平易な日本語） */
  reasons: string[];
  /** 人間らしくする具体的な直し方 */
  suggestions: string[];
  /** 判定実行時刻（ISO文字列） */
  checkedAt: string;
  /** 判定時の本文文字数。現在の wordCount と異なれば「再チェック推奨」を出す */
  checkedWordCount: number;
  aiMetadata?: AiGenerationMetadata;
}

/** score からテンプレ表現レベルを導出する。境界: 40, 70。 */
export function aiLikenessLevel(score: number): DocumentAiLikenessLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** 提出時に個別性の見直しを促すスコア閾値。 */
export const AI_LIKENESS_SUBMIT_THRESHOLD = 60;

export const AI_LIKENESS_LEVEL_LABELS: Record<DocumentAiLikenessLevel, string> =
  {
    low: "個別性あり",
    medium: "要具体化",
    high: "テンプレ表現が多い",
  };

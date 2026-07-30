import type { ChatReference } from "@/lib/types/feedback";

/**
 * ドラッグ範囲コメントを付けられる対象の登録表（正本）。
 *
 * 対象を追加するときはここだけを直す。API・通知・生徒側リンクはすべてこの表から
 * 導出するため、片方だけ足して沈黙失敗になることを防ぐ。
 *
 * 範囲コメントは「本文が1本のプレーンテキスト」であることが前提。
 * 論理ドリル（解答が主張・理由・修正文などの複数フィールド）と面接（対話ログ）は
 * 単一のテキストに落ちないため対象外。あれらに付けるならフィールド単位/発言単位の
 * 別UIが必要になる。
 */
export type InlineCommentTarget =
  | "essay"
  | "skillCheck"
  | "document"
  | "chocoReview"
  | "summaryDrill";

interface TargetConfig {
  /** 通知・見出しに出す対象名 */
  label: string;
  /**
   * Firestore のドキュメントパス。
   * studentScoped=true のものは users/{studentId}/... 配下にある。
   */
  path: (id: string, studentId: string) => string;
  /** 本文が入っているフィールド名 */
  textField: string;
  /** 生徒側の該当画面 */
  studentHref: (id: string, studentId: string) => string;
  /** 引用カードの種別 */
  referenceKind: ChatReference["kind"];
  /** 生徒宛フィードバックの type（既存の分類に合わせる） */
  feedbackType: string;
  /**
   * ドキュメント自身が userId を持つか。
   * true: グローバルコレクション。パスに studentId が不要で、userId 一致を検証する。
   * false: users/{studentId} 配下。パス組み立てに studentId が必要。
   */
  hasOwnUserId: boolean;
}

export const INLINE_COMMENT_TARGETS: Record<InlineCommentTarget, TargetConfig> = {
  essay: {
    label: "小論文",
    path: (id) => `essays/${id}`,
    textField: "ocrText",
    studentHref: (id) => `/student/essay/${id}`,
    referenceKind: "essay-comment",
    feedbackType: "essay",
    hasOwnUserId: true,
  },
  skillCheck: {
    label: "スキルチェック",
    path: (id, studentId) => `users/${studentId}/skillChecks/${id}`,
    textField: "essayText",
    studentHref: (id) => `/student/skill-check/${id}`,
    referenceKind: "essay-comment",
    feedbackType: "skill_check",
    hasOwnUserId: false,
  },
  document: {
    label: "出願書類",
    path: (id) => `documents/${id}`,
    textField: "content",
    studentHref: (id) => `/student/documents/${id}`,
    referenceKind: "essay-comment",
    feedbackType: "document",
    hasOwnUserId: true,
  },
  chocoReview: {
    label: "ちょこ添削",
    path: (id, studentId) => `users/${studentId}/chokoReviews/${id}`,
    textField: "studentText",
    studentHref: () => `/student/essay/choco`,
    referenceKind: "essay-comment",
    feedbackType: "essay",
    hasOwnUserId: false,
  },
  summaryDrill: {
    label: "要約ドリル",
    path: (id, studentId) => `users/${studentId}/summaryDrills/${id}`,
    textField: "summaryText",
    studentHref: () => `/student/essay/summary-drill`,
    referenceKind: "essay-comment",
    feedbackType: "essay",
    hasOwnUserId: false,
  },
};

export function isInlineCommentTarget(v: unknown): v is InlineCommentTarget {
  return typeof v === "string" && v in INLINE_COMMENT_TARGETS;
}

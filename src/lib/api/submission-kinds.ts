/**
 * 「まだ確認していない提出物」の対象登録表（正本）。
 *
 * 対象を足すときはここだけ直せば、未確認件数の集計・バッジ・既読記録がすべて
 * 追従する。片方だけ足して沈黙失敗になるのを防ぐ。
 *
 * 既読は管理者ごとに users/{adminUid}/viewedSubmissions/{kind}__{id} で持つ。
 * 「自分がまだ確認していない」を出すため、閲覧者ごとに分ける必要がある。
 */
export type SubmissionKind =
  | "essay"
  | "skillCheck"
  | "interviewSkillCheck"
  | "document"
  | "chocoReview"
  | "summaryDrill"
  | "logicDrill";

interface SubmissionKindConfig {
  label: string;
  /**
   * 生徒配下のサブコレクション名。essay / document はグローバルなので null。
   */
  subcollection: string | null;
  /** 提出時刻として使うフィールド */
  timestampField: string;
  /**
   * 対象として数える条件。添削中や下書きは「提出」ではないので除く。
   */
  countable?: (data: FirebaseFirestore.DocumentData) => boolean;
}

export const SUBMISSION_KINDS: Record<SubmissionKind, SubmissionKindConfig> = {
  essay: {
    label: "小論文",
    subcollection: null, // essays（グローバル。userId で絞る）
    timestampField: "submittedAt",
    countable: (d) => d.status === "reviewed",
  },
  skillCheck: {
    label: "スキルチェック",
    subcollection: "skillChecks",
    timestampField: "takenAt",
  },
  interviewSkillCheck: {
    label: "面接スキルチェック",
    subcollection: "interviewSkillChecks",
    timestampField: "takenAt",
  },
  document: {
    label: "出願書類",
    subcollection: null, // documents（グローバル。userId で絞る）
    timestampField: "updatedAt",
    // 下書きは提出ではない
    countable: (d) => d.status && d.status !== "draft",
  },
  chocoReview: {
    label: "ちょこ添削",
    subcollection: "chokoReviews",
    timestampField: "createdAt",
  },
  summaryDrill: {
    label: "要約ドリル",
    subcollection: "summaryDrills",
    timestampField: "completedAt",
  },
  logicDrill: {
    label: "論理ドリル",
    subcollection: "logicDrills",
    timestampField: "completedAt",
  },
};

export function isSubmissionKind(v: unknown): v is SubmissionKind {
  return typeof v === "string" && v in SUBMISSION_KINDS;
}

/** 既読ドキュメントのID。種別とIDの組で一意にする。 */
export function viewedDocId(kind: SubmissionKind, id: string): string {
  return `${kind}__${id}`;
}

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

export interface SubmissionKindConfig {
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

/**
 * バッジで数える提出物の対象期間（日）。
 *
 * これが無いと、機能を入れる前の履歴（数ヶ月分）が全部「未確認」になり、
 * 1件ずつ開かないと赤が消えない。バッジの目的は「新しく来た提出に気づく」
 * ことなので、古いものは対象外にする。
 */
export const UNVIEWED_MAX_AGE_DAYS = 30;

/** Firestore Timestamp / ISO文字列 / エポック数値のどれでも Date にする。 */
function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "object" && "toDate" in v) {
    const d = (v as { toDate: () => Date }).toDate();
    return isNaN(+d) ? null : d;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
}

/**
 * 対象期間内の提出かどうか。
 *
 * 日付が全く取れないものは true（隠すより見せる）。取りこぼしても
 * 「すべて既読にする」で消せる。
 */
export function isRecentSubmission(
  data: FirebaseFirestore.DocumentData,
  cfg: SubmissionKindConfig,
  now: Date = new Date(),
): boolean {
  const at =
    toDate(data[cfg.timestampField]) ??
    toDate(data.createdAt) ??
    toDate(data.updatedAt);
  if (!at) return true;
  return now.getTime() - at.getTime() <= UNVIEWED_MAX_AGE_DAYS * 86400_000;
}

/** 既読ドキュメントのID。種別とIDの組で一意にする。 */
export function viewedDocId(kind: SubmissionKind, id: string): string {
  return `${kind}__${id}`;
}

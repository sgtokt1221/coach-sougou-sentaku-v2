import type { Firestore } from "firebase-admin/firestore";

/**
 * 「最終活動」に数える取り組みの正本。
 *
 * 以前は生徒一覧が6種類、生徒詳細に至っては小論文と面接の2種類しか見て
 * おらず、書類を書いても、ちょこ添削や論理ドリルをやっても「最終活動」が
 * 更新されなかった。機能を足すたびに2箇所へ書き足す作りだったため、
 * 実際どちらも漏れていた。ここを1つの表にして両方から使う。
 */
export type LastActivityType =
  | "essay"
  | "interview"
  | "skillCheck"
  | "interviewSkillCheck"
  | "summaryDrill"
  | "logicDrill"
  | "chocoReview"
  | "interviewDrill"
  | "document"
  | "activity"
  | "selfAnalysis"
  | "homework";

/** 画面に出す名前。ここも正本にして、表示側で分岐を持たない */
export const LAST_ACTIVITY_LABELS: Record<LastActivityType, string> = {
  essay: "小論文添削",
  interview: "模擬面接",
  skillCheck: "スキルチェック",
  interviewSkillCheck: "面接スキルチェック",
  summaryDrill: "要約ドリル",
  logicDrill: "論理ドリル",
  chocoReview: "ちょこ添削",
  interviewDrill: "ちょこ面接",
  document: "出願書類",
  activity: "活動実績",
  selfAnalysis: "自己分析",
  homework: "宿題",
};

export interface LastActivity {
  type: LastActivityType;
  at: string;
}

/**
 * 生徒のサブコレクションを見る定義。
 * 日付フィールドの型がコレクションごとに違う（Timestamp / ISO文字列）ので、
 * 読む側で両対応にする（docs/CLAUDE.md の「日付フィールドの保存形式」参照）。
 */
const SUB_SOURCES: {
  name: string;
  field: string;
  type: LastActivityType;
}[] = [
  { name: "skillChecks", field: "takenAt", type: "skillCheck" },
  { name: "interviewSkillChecks", field: "takenAt", type: "interviewSkillCheck" },
  { name: "summaryDrills", field: "completedAt", type: "summaryDrill" },
  { name: "logicDrills", field: "completedAt", type: "logicDrill" },
  { name: "chokoReviews", field: "submittedAt", type: "chocoReview" },
  { name: "interviewDrills", field: "createdAt", type: "interviewDrill" },
  { name: "activities", field: "createdAt", type: "activity" },
  { name: "activityLogs", field: "createdAt", type: "activity" },
];

function toMillis(v: unknown): number | null {
  const withToDate = v as { toDate?: () => Date } | null | undefined;
  if (withToDate?.toDate) return withToDate.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return isNaN(t) ? null : t;
  }
  return null;
}

/**
 * その生徒が最後に何をしたかを返す。
 *
 * 1つのコレクションで失敗（インデックス欠落など）しても全体を落とさない。
 * 落ちた分だけ候補から抜ける。
 */
export async function resolveLastActivity(
  db: Firestore,
  uid: string,
): Promise<LastActivity | null> {
  const candidates: { type: LastActivityType; ts: number }[] = [];
  const add = (type: LastActivityType, ts: number | null | undefined) => {
    if (typeof ts === "number" && ts > 0) candidates.push({ type, ts });
  };

  const results = await Promise.allSettled([
    // グローバルコレクション（userId で絞る）
    db.collection("essays").where("userId", "==", uid).orderBy("submittedAt", "desc").limit(1).get(),
    db.collection("interviews").where("userId", "==", uid).get(),
    db.collection("documents").where("userId", "==", uid).orderBy("updatedAt", "desc").limit(1).get(),
    db.doc(`selfAnalysis/${uid}`).get(),
    // 生徒のサブコレクション
    ...SUB_SOURCES.map((s) =>
      db.collection(`users/${uid}/${s.name}`).orderBy(s.field, "desc").limit(1).get(),
    ),
    // 宿題は提出時刻を見る（未提出は活動ではない）
    db.collection(`users/${uid}/homeworkAssignments`).get(),
  ]);

  const [essays, interviews, documents, selfAnalysis, ...rest] = results;
  const subs = rest.slice(0, SUB_SOURCES.length);
  const homework = rest[SUB_SOURCES.length];

  if (essays.status === "fulfilled") {
    add("essay", toMillis(essays.value.docs[0]?.data()?.submittedAt));
  }
  if (interviews.status === "fulfilled") {
    // 完了した面接だけを活動とみなす（開始しただけのものは数えない）
    const times = interviews.value.docs
      .filter((d) => d.data().status === "completed")
      .map((d) => toMillis(d.data().completedAt ?? d.data().startedAt))
      .filter((t): t is number => t !== null);
    if (times.length > 0) add("interview", Math.max(...times));
  }
  if (documents.status === "fulfilled") {
    add("document", toMillis(documents.value.docs[0]?.data()?.updatedAt));
  }
  if (selfAnalysis.status === "fulfilled" && selfAnalysis.value.exists) {
    add("selfAnalysis", toMillis(selfAnalysis.value.data()?.updatedAt));
  }
  subs.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const src = SUB_SOURCES[i];
    add(src.type, toMillis(r.value.docs[0]?.data()?.[src.field]));
  });
  if (homework?.status === "fulfilled") {
    const times = homework.value.docs
      .map((d) => toMillis(d.data().submittedAt))
      .filter((t): t is number => t !== null);
    if (times.length > 0) add("homework", Math.max(...times));
  }

  const latest = candidates.sort((a, b) => b.ts - a.ts)[0];
  return latest ? { type: latest.type, at: new Date(latest.ts).toISOString() } : null;
}

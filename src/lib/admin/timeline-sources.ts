import type {
  DocumentData,
  Firestore,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { loadAiConversations } from "@/lib/admin/ai-conversations";
import type { TimelineItem, TimelineKind } from "@/lib/admin/timeline";
import { getThemeById } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";
import { calculateDocumentTotal, DOCUMENT_TYPE_LABELS } from "@/lib/types/document";
import type { DocumentType } from "@/lib/types/document";
import { HOMEWORK_STATUS_LABELS } from "@/lib/types/homework";
import type { HomeworkStatus } from "@/lib/types/homework";
import { INTERVIEW_MODE_LABELS, interviewTotalMax } from "@/lib/types/interview";
import type { InterviewMode } from "@/lib/types/interview";
import { LOGIC_DRILL_TYPE_LABELS } from "@/lib/types/logic-drill";
import type { LogicDrillType } from "@/lib/types/logic-drill";
import { SESSION_TYPE_LABELS } from "@/lib/types/session";
import type { SessionType } from "@/lib/types/session";

/**
 * 生徒詳細の「時系列」の読み込み。種類ごとに「before より古いものを新しい順に最大 limit 件」。
 * 合わせ方は src/lib/admin/timeline.ts の mergeTimeline。
 *
 * 日時の型はコレクションごとに違う（CLAUDE.md 6.5）。範囲条件の値を型に合わせないと
 * 一致0件の沈黙失敗になるので、種類ごとに Date / ISO 文字列を使い分ける。
 * 各関数は例外を投げてよい（API 側で種類ごとに受け止めて failedKinds に入れる）。
 */
export type SourceFn = (
  db: Firestore,
  uid: string,
  before: Date | null,
  limit: number,
) => Promise<TimelineItem[]>;

/** Timestamp / Date / 文字列のどれでも ISO にする。読めなければ null */
function toIso(v: unknown): string | null {
  const withToDate = v as { toDate?: () => Date } | null | undefined;
  if (withToDate?.toDate) return withToDate.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}

/** 日本時間の M/D */
function jstMonthDay(ms: number): string {
  const d = new Date(ms + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/**
 * 条件に合うものだけを残しながら limit 件そろうまで続きを読む。
 * 取った後で捨てる行がある種類（練習していない面接など）で、1回で取った分が
 * 全部捨てられて「もう無い」と誤って終わらないようにする。
 */
async function collectWhere(
  query: Query,
  limit: number,
  keep: (data: DocumentData) => boolean,
): Promise<QueryDocumentSnapshot[]> {
  const batchSize = Math.max(limit * 2, 10);
  const out: QueryDocumentSnapshot[] = [];
  let last: QueryDocumentSnapshot | null = null;
  for (;;) {
    const q: Query = last ? query.startAfter(last) : query;
    const snap = await q.limit(batchSize).get();
    for (const d of snap.docs) {
      if (keep(d.data())) out.push(d);
      if (out.length >= limit) return out;
    }
    if (snap.docs.length < batchSize) return out;
    last = snap.docs[snap.docs.length - 1];
  }
}

/** 出題元IDからテーマ名（topic を保存していなかった時期の答案用） */
function essayTitle(data: DocumentData): string {
  const saved = typeof data.topic === "string" ? data.topic.trim() : "";
  if (saved) return saved;
  const ctx = data.questionContext ?? data.retryContext ?? {};
  if (ctx.pastQuestionId) {
    const pq = getPastQuestionById(ctx.pastQuestionId);
    if (pq) return `${pq.universityName} ${pq.year}年 ${pq.theme}`;
  }
  if (ctx.themeId) {
    const t = getThemeById(ctx.themeId)?.title;
    if (t) return t;
  }
  return "お題なし";
}

// ---- 小論文（essays / submittedAt: Timestamp） ----
const essay: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection("essays").where("userId", "==", uid);
  if (before) q = q.where("submittedAt", "<", before);
  const snap = await q.orderBy("submittedAt", "desc").limit(limit).get();
  return snap.docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.submittedAt);
    if (!at) return [];
    const total = data.scores?.total;
    return [
      {
        kind: "essay",
        id: d.id,
        at,
        title: essayTitle(data),
        ...(typeof total === "number"
          ? { score: { value: total, max: data.feedback?.scoreMaximum ?? 50 } }
          : {}),
      },
    ];
  });
};

// ---- 面接（interviews / startedAt: Timestamp、completed かつ生徒が話したもの） ----
/** ランクの集計（src/lib/skill-check/aggregate.ts の isPracticed）と同じ基準 */
function isPracticedInterview(data: DocumentData): boolean {
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return messages.some((m: { role?: string }) => m?.role === "student");
}

const interview: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db
    .collection("interviews")
    .where("userId", "==", uid)
    .where("status", "==", "completed");
  if (before) q = q.where("startedAt", "<", before);
  const docs = await collectWhere(
    q.orderBy("startedAt", "desc"),
    limit,
    isPracticedInterview,
  );
  return docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.startedAt);
    if (!at) return [];
    const mode = (data.mode ?? "individual") as InterviewMode;
    const total = data.scores?.total;
    return [
      {
        kind: "interview",
        id: d.id,
        at,
        title: INTERVIEW_MODE_LABELS[mode] ?? "模擬面接",
        ...(typeof total === "number"
          ? { score: { value: total, max: interviewTotalMax(data.scores) } }
          : {}),
      },
    ];
  });
};

// ---- ちょこ添削（users/{uid}/chokoReviews / createdAt: ISO 文字列） ----
const chocoReview: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection(`users/${uid}/chokoReviews`);
  if (before) q = q.where("createdAt", "<", before.toISOString());
  const snap = await q.orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.createdAt);
    if (!at) return [];
    const blankIndex = typeof data.blankIndex === "number" ? data.blankIndex : 0;
    const total = data.scores?.total;
    return [
      {
        kind: "chocoReview",
        id: d.id,
        at,
        title: data.themeTitle || "ちょこ添削",
        subtitle: `${blankIndex + 1}段落目`,
        ...(typeof total === "number" ? { score: { value: total, max: 50 } } : {}),
      },
    ];
  });
};

// ---- 要約ドリル（users/{uid}/summaryDrills / completedAt: Timestamp） ----
const summaryDrill: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection(`users/${uid}/summaryDrills`);
  if (before) q = q.where("completedAt", "<", before);
  const snap = await q.orderBy("completedAt", "desc").limit(limit).get();
  return snap.docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.completedAt);
    if (!at) return [];
    return [
      {
        kind: "summaryDrill",
        id: d.id,
        at,
        title: data.passageTitle ?? "無題",
        score: { value: data.total ?? 0, max: 25 },
      },
    ];
  });
};

// ---- 論理ドリル（users/{uid}/logicDrills / completedAt: Timestamp） ----
const logicDrill: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection(`users/${uid}/logicDrills`);
  if (before) q = q.where("completedAt", "<", before);
  const snap = await q.orderBy("completedAt", "desc").limit(limit).get();
  return snap.docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.completedAt);
    if (!at) return [];
    const s = data.scores ?? {};
    const value =
      (Number(s.consistency) || 0) + (Number(s.validity) || 0) + (Number(s.structure) || 0);
    return [
      {
        kind: "logicDrill",
        id: d.id,
        at,
        title: LOGIC_DRILL_TYPE_LABELS[data.drillType as LogicDrillType] ?? "論理ドリル",
        score: { value, max: 15 },
      },
    ];
  });
};

// ---- テーマ別ドリル（users/{uid}/interviewDrills / createdAt: Timestamp） ----
const interviewDrill: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection(`users/${uid}/interviewDrills`);
  if (before) q = q.where("createdAt", "<", before);
  const snap = await q.orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.createdAt);
    if (!at) return [];
    const question = typeof data.question === "string" ? data.question.trim() : "";
    return [
      {
        kind: "interviewDrill",
        id: d.id,
        at,
        title: data.category || "テーマ別ドリル",
        ...(question ? { subtitle: question } : {}),
        score: { value: data.score ?? 0, max: 5 },
      },
    ];
  });
};

// ---- 出願書類（documents / updatedAt: ISO 文字列） ----
const document: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection("documents").where("userId", "==", uid);
  if (before) q = q.where("updatedAt", "<", before.toISOString());
  const snap = await q.orderBy("updatedAt", "desc").limit(limit).get();
  return snap.docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.updatedAt);
    if (!at) return [];
    // 添削結果は書類本体の feedback、無ければ最新版の feedback（管理者の書類一覧と同じ順）
    const latestVersion =
      Array.isArray(data.versions) && data.versions.length > 0
        ? data.versions[data.versions.length - 1]
        : null;
    const fb = data.feedback ?? latestVersion?.feedback;
    const total = fb
      ? calculateDocumentTotal({
          apAlignment: fb.apAlignmentScore,
          structure: fb.structureScore,
          originality: fb.originalityScore,
          expression: fb.expressionScore,
        })
      : null;
    const uni = [data.universityName, data.facultyName].filter(Boolean).join(" ");
    return [
      {
        kind: "document",
        id: d.id,
        at,
        title: DOCUMENT_TYPE_LABELS[data.type as DocumentType] ?? (data.type || "出願書類"),
        ...(uni ? { subtitle: uni } : {}),
        ...(total && total.max > 0
          ? { score: { value: total.total, max: total.max } }
          : {}),
      },
    ];
  });
};

// ---- 面談（sessions / scheduledAt: 文字列、studentId で絞る） ----
/**
 * scheduledAt は「日本時間の時刻をタイムゾーン無しで書いた文字列」で保存されている
 * （`${date}T${time}:00`、作成フォームの datetime-local は秒も無い）。UTC の ISO と
 * 文字列で比べると9時間ずれ、書式違いで境界の行が重複・欠落する。
 * そのため範囲条件は1日の余裕を持たせた粗い上限にとどめ、正確な比較は
 * 日本時間として読んだ時刻で行う。1人の生徒の面談は多くても数百件なので全件でよい。
 */
function parseSessionTime(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(v);
  const t = Date.parse(hasZone ? v : `${v}+09:00`);
  return Number.isNaN(t) ? null : t;
}

const session: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection("sessions").where("studentId", "==", uid);
  if (before) {
    const upper = new Date(before.getTime() + 86400000).toISOString().slice(0, 19);
    q = q.where("scheduledAt", "<", upper);
  }
  const snap = await q.orderBy("scheduledAt", "desc").get();
  const beforeMs = before?.getTime() ?? Infinity;
  return snap.docs
    .flatMap((d): (TimelineItem & { ms: number })[] => {
      const data = d.data();
      if (data.status === "cancelled") return [];
      const ms = parseSessionTime(data.scheduledAt);
      if (ms === null || ms >= beforeMs) return [];
      const notes =
        typeof data.debrief?.notes === "string" ? data.debrief.notes.trim() : "";
      const firstLine = notes.split("\n")[0]?.trim();
      return [
        {
          kind: "session",
          id: d.id,
          at: new Date(ms).toISOString(),
          ms,
          title: SESSION_TYPE_LABELS[data.type as SessionType] ?? "面談",
          ...(firstLine ? { subtitle: firstLine } : {}),
          href: `/admin/sessions/${d.id}`,
        },
      ];
    })
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit)
    .map(({ ms: _ms, ...item }) => item);
};

// ---- 宿題（users/{uid}/homeworkAssignments / assignedAt: Timestamp） ----
const homework: SourceFn = async (db, uid, before, limit) => {
  let q: Query = db.collection(`users/${uid}/homeworkAssignments`);
  if (before) q = q.where("assignedAt", "<", before);
  const snap = await q.orderBy("assignedAt", "desc").limit(limit).get();
  const now = Date.now();
  return snap.docs.flatMap((d): TimelineItem[] => {
    const data = d.data();
    const at = toIso(data.assignedAt);
    if (!at) return [];
    const status = (data.status ?? "assigned") as HomeworkStatus;
    const parts = [HOMEWORK_STATUS_LABELS[status] ?? status];
    const dueMs = typeof data.dueDate === "string" ? Date.parse(data.dueDate) : NaN;
    if (!Number.isNaN(dueMs)) {
      // 期限切れの判定は宿題の一覧（HomeworkStatusSection）と同じ: 未提出のまま期限を過ぎた
      parts.push(
        status === "assigned" && dueMs < now ? "期限切れ" : `期限 ${jstMonthDay(dueMs)}`,
      );
    }
    return [
      {
        kind: "homework",
        id: d.id,
        at,
        title: data.snapshot?.title || "宿題",
        subtitle: parts.join(" ・ "),
      },
    ];
  });
};

// ---- AI対話（機能をまたいで組み立てたもの / updatedAt: ISO） ----
const aiConversation: SourceFn = async (db, uid, before, limit) => {
  const beforeMs = before?.getTime() ?? Infinity;
  const all = await loadAiConversations(db, uid);
  return all
    .filter((c) => Date.parse(c.updatedAt) < beforeMs)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
    .map((c) => ({
      kind: "aiConversation" as const,
      id: c.id,
      at: c.updatedAt,
      title: c.title,
      ...(c.note ? { subtitle: c.note } : {}),
    }));
};

export const TIMELINE_SOURCES: Record<TimelineKind, SourceFn> = {
  essay,
  interview,
  chocoReview,
  summaryDrill,
  logicDrill,
  interviewDrill,
  document,
  session,
  homework,
  aiConversation,
};

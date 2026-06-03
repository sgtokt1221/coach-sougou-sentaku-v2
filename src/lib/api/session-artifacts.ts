import type { Session } from "@/lib/types/session";
import { getPreviousSession } from "@/lib/api/session-auth";
import { toDateSafe, toIsoString } from "@/lib/firebase/timestamp";
import { calculateRank } from "@/lib/skill-check/rank";
import { calculateInterviewRank } from "@/lib/interview-skill-check/rank";

/**
 * セッションの「前回〜今回」の期間に生徒が作成した成果物を集約する共通ロジック。
 * 表示API（生徒/講師）とAI台本生成の3か所で再利用する単一ソース。
 *
 * 期間: (前回セッション日時, 今回セッション日時]。前回が無ければ過去全部。
 * スコア変化: 当期間の平均 total と、その前の期間の平均 total の差分。
 */

export interface ArtifactItem {
  id: string;
  /** 並び替え・表示用の日時 (ISO) */
  at?: string;
  label: string;
  sub?: string;
  score?: number | null;
  rank?: string | null;
  status?: string | null;
  /** スキルチェックの種別（リンク先振り分け用） */
  skillKind?: "essay" | "interview";
}

export interface ScoreDelta {
  count: number;
  avg: number | null;
  prevAvg: number | null;
  delta: number | null;
}

export interface SessionPeriodArtifacts {
  window: { start: string | null; end: string };
  artifacts: {
    essays: ArtifactItem[];
    interviews: ArtifactItem[];
    documents: ArtifactItem[];
    activities: ArtifactItem[];
    skillChecks: ArtifactItem[];
    reports: ArtifactItem[];
  };
  scoreSummary: { essay: ScoreDelta; interview: ScoreDelta };
}

function ms(v: string | null): number | null {
  if (!v) return null;
  const d = toDateSafe(v);
  return d ? d.getTime() : null;
}

/** lowerExclusive < t <= upperInclusive（lower=null は下限なし） */
function inWindow(dateVal: unknown, lowerExclusive: number | null, upperInclusive: number): boolean {
  const d = toDateSafe(dateVal);
  if (!d) return false;
  const t = d.getTime();
  if (t > upperInclusive) return false;
  if (lowerExclusive !== null && t <= lowerExclusive) return false;
  return true;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export async function getSessionPeriodArtifacts(
  adminDb: FirebaseFirestore.Firestore,
  studentId: string,
  session: Session,
): Promise<SessionPeriodArtifacts> {
  const thisDate = session.scheduledAt;
  const prev = await getPreviousSession(adminDb, studentId, thisDate);
  const prevDate = prev?.scheduledAt ?? null;
  const prevPrev = prevDate
    ? await getPreviousSession(adminDb, studentId, prevDate)
    : null;
  const prevPrevDate = prevPrev?.scheduledAt ?? null;

  const upper = ms(thisDate) ?? Date.now();
  const lower = ms(prevDate); // null = 下限なし
  const prevUpper = ms(prevDate);
  const prevLower = ms(prevPrevDate);

  const [essaysSnap, interviewsSnap, docsSnap, actsSnap, skillSnap, ivSkillSnap, reportsSnap] =
    await Promise.all([
      adminDb.collection("essays").where("userId", "==", studentId).get().catch(() => null),
      adminDb.collection("interviews").where("userId", "==", studentId).get().catch(() => null),
      adminDb.collection(`users/${studentId}/documents`).get().catch(() => null),
      adminDb.collection(`users/${studentId}/activities`).get().catch(() => null),
      adminDb.collection(`users/${studentId}/skillChecks`).get().catch(() => null),
      adminDb.collection(`users/${studentId}/interviewSkillChecks`).get().catch(() => null),
      adminDb.collection(`users/${studentId}/growthReports`).get().catch(() => null),
    ]);

  // --- essays ---
  const essayDocs = (essaysSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .filter((e) => e.status === "reviewed");
  const essayWindow = essayDocs.filter((e) => inWindow(e.submittedAt, lower, upper));
  const essayPrevWindow =
    prevUpper !== null ? essayDocs.filter((e) => inWindow(e.submittedAt, prevLower, prevUpper)) : [];
  const essayTotal = (e: Record<string, unknown>): number | null => {
    const s = e.scores as { total?: number } | undefined;
    return typeof s?.total === "number" ? s.total : null;
  };
  const essays: ArtifactItem[] = essayWindow.map((e) => {
    const total = essayTotal(e);
    return {
      id: e.id as string,
      at: toIsoString(e.submittedAt),
      label: (e.theme as string) || (e.title as string) || "小論文",
      score: total,
      rank: total !== null ? calculateRank(total) : null,
    };
  });

  // --- interviews ---
  const ivDocs = (interviewsSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .filter((i) => i.status === "completed");
  const ivWindow = ivDocs.filter((i) => inWindow(i.startedAt, lower, upper));
  const ivPrevWindow =
    prevUpper !== null ? ivDocs.filter((i) => inWindow(i.startedAt, prevLower, prevUpper)) : [];
  const MODE_LABEL: Record<string, string> = {
    individual: "個人面接",
    group_discussion: "グループ討論",
    presentation: "プレゼン",
    oral_exam: "口頭試問",
  };
  const ivTotal = (i: Record<string, unknown>): number | null => {
    const s = i.scores as { total?: number } | undefined;
    return typeof s?.total === "number" ? s.total : null;
  };
  const interviews: ArtifactItem[] = ivWindow.map((i) => {
    const total = ivTotal(i);
    return {
      id: i.id as string,
      at: toIsoString(i.startedAt),
      label: MODE_LABEL[i.mode as string] || "模擬面接",
      score: total,
      rank: total !== null ? calculateInterviewRank(total) : null,
    };
  });

  // --- documents ---
  const documents: ArtifactItem[] = (docsSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .filter((d) => inWindow(d.updatedAt ?? d.createdAt, lower, upper))
    .map((d) => ({
      id: d.id as string,
      at: toIsoString(d.updatedAt ?? d.createdAt),
      label: (d.type as string) || "出願書類",
      status: (d.status as string) ?? null,
    }));

  // --- activities ---
  const activities: ArtifactItem[] = (actsSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .filter((a) => inWindow(a.createdAt ?? a.updatedAt, lower, upper))
    .map((a) => ({
      id: a.id as string,
      at: toIsoString(a.createdAt ?? a.updatedAt),
      label: (a.title as string) || "活動実績",
      sub: (a.category as string) ?? undefined,
    }));

  // --- skill checks (essay + interview) ---
  const skillItems = (
    snap: FirebaseFirestore.QuerySnapshot | null,
    kind: string,
    skillKind: "essay" | "interview",
  ): ArtifactItem[] =>
    (snap?.docs ?? [])
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((s) => inWindow(s.takenAt, lower, upper))
      .map((s) => ({
        id: s.id as string,
        at: toIsoString(s.takenAt),
        label: kind,
        skillKind,
        rank: (s.rank as string) ?? null,
        score: typeof (s.scores as { total?: number } | undefined)?.total === "number"
          ? (s.scores as { total: number }).total
          : null,
      }));
  const skillChecks: ArtifactItem[] = [
    ...skillItems(skillSnap, "小論文スキルチェック", "essay"),
    ...skillItems(ivSkillSnap, "面接スキルチェック", "interview"),
  ];

  // --- growth reports (shared only) ---
  const reports: ArtifactItem[] = (reportsSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .filter((r) => r.sharedWithStudent !== false && inWindow(r.generatedAt, lower, upper))
    .map((r) => ({
      id: r.id as string,
      at: toIsoString(r.generatedAt),
      label: r.period === "monthly" ? "月次レポート" : "週次レポート",
      sub: (r.overallAssessment as string)?.slice(0, 60) || undefined,
    }));

  const essayAvg = avg(essayWindow.map(essayTotal).filter((n): n is number => n !== null));
  const essayPrevAvg = avg(essayPrevWindow.map(essayTotal).filter((n): n is number => n !== null));
  const ivAvg = avg(ivWindow.map(ivTotal).filter((n): n is number => n !== null));
  const ivPrevAvg = avg(ivPrevWindow.map(ivTotal).filter((n): n is number => n !== null));

  return {
    window: { start: prevDate ? toIsoString(prevDate) ?? null : null, end: toIsoString(thisDate) ?? thisDate },
    artifacts: { essays, interviews, documents, activities, skillChecks, reports },
    scoreSummary: {
      essay: {
        count: essays.length,
        avg: essayAvg,
        prevAvg: essayPrevAvg,
        delta: essayAvg !== null && essayPrevAvg !== null ? Math.round((essayAvg - essayPrevAvg) * 10) / 10 : null,
      },
      interview: {
        count: interviews.length,
        avg: ivAvg,
        prevAvg: ivPrevAvg,
        delta: ivAvg !== null && ivPrevAvg !== null ? Math.round((ivAvg - ivPrevAvg) * 10) / 10 : null,
      },
    },
  };
}

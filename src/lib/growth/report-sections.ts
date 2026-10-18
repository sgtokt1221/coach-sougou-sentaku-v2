import { buildLessonObservationSummaryPrompt } from "@/lib/ai/prompts/lesson-summary";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";
import { documentScoreLayout, documentTotal } from "@/lib/documents/score-axes";
import type { DocumentFeedback } from "@/lib/types/document";
import type { GrowthReport } from "@/lib/types/growth-report";
import { parseScheduledAt, type SessionSummary } from "@/lib/types/session";
import {
  buildSessionSummaryDraft,
  isTrustedSummary,
  sessionWasHeld,
  type ReportSessionInput,
} from "./report";

/**
 * 成長レポートのうち、答案・面接の点以外の欄（授業・出願書類・ドリル）を組み立てる。
 * 個別生成（/api/admin/reports/generate）と一括生成（/batch）の両方から呼ぶ。
 * 以前は個別生成にだけ直書きされていて、一括生成のレポートには授業も書類も載らなかった。
 */

type Db = FirebaseFirestore.Firestore;

/**
 * 期間内のセッションを読む。新しい順。
 *
 * scheduledAt はタイムゾーン無しの日本時間（`2026-10-18T09:30`）なので、期間（UTC の Date）と
 * 文字列で比べると9時間ずれ、当日の朝の授業が抜ける。生徒1人分を読んで parseScheduledAt で比べる。
 */
async function fetchPeriodSessions(
  db: Db,
  studentId: string,
  start: Date,
  end: Date
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const from = start.getTime();
  const to = end.getTime();
  const all = await db
    .collection("sessions")
    .where("studentId", "==", studentId)
    .get();
  const at = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
    const v = d.data().scheduledAt;
    return typeof v === "string" ? parseScheduledAt(v) : NaN;
  };
  return all.docs
    .filter((d) => {
      const t = at(d);
      return !Number.isNaN(t) && t >= from && t <= to;
    })
    .sort((a, b) => at(b) - at(a));
}

/** 報告書から、生徒・保護者に見せてよい授業の観察を取り出す（AI を使わないとき用） */
function observationsFromSummaries(summaries: SessionSummary[]): string[] {
  return summaries
    .map((s) => s.overview?.split("。")[0]?.trim())
    .filter((s): s is string => Boolean(s))
    .map((s) => `${s.slice(0, 60)}。`);
}

/**
 * 授業の欄（sessionSummary・sessionDigest）。
 *
 * 講師の所見は、気づきメモ（debrief.notes）と報告書（summary）の概要・良かった点・改善点から作る。
 * 以前は気づきメモだけを見ていたが、録音した回は AI が報告書を下書きし、気づきメモは
 * 空のことが多いので、所見がほぼ出なかった。振り返りの「反省点・課題」は講師用
 * （授業の進め方の反省などが入る）なので、生徒も読むレポートには使わない。
 *
 * extractObservations が true なら AI で生徒向けの文に直す。一括生成は費用を抑えるため
 * false にし、報告書の概要の1文目を使う。
 */
export async function loadLessonSections(
  db: Db,
  studentId: string,
  start: Date,
  end: Date,
  opts: { studentName: string; extractObservations: boolean }
): Promise<{
  sessionSummary: GrowthReport["sessionSummary"];
  sessionDigest: GrowthReport["sessionDigest"];
}> {
  const docs = await fetchPeriodSessions(db, studentId, start, end);
  const sessions = docs.map((d) => d.data() as ReportSessionInput);
  const sessionSummary = buildSessionSummaryDraft(sessions);

  const held = sessions.filter((s) => sessionWasHeld(s));
  const summaries = held
    .map((s) => s.summary)
    .filter(
      (s): s is SessionSummary =>
        isTrustedSummary(s) && Boolean(s.overview?.trim())
    );
  const notes = held
    .map((s) => s.debrief?.notes?.trim())
    .filter((n): n is string => Boolean(n));

  const fromSummaries = observationsFromSummaries(summaries);
  if (fromSummaries.length > 0) {
    sessionSummary.teacherObservations = fromSummaries.slice(0, 3);
  }

  if (
    opts.extractObservations &&
    (summaries.length > 0 || notes.length > 0) &&
    process.env.ANTHROPIC_API_KEY
  ) {
    const material = [
      ...summaries.map((s) =>
        [
          s.overview,
          ...(s.strengths ?? []).map((x) => `良かった点: ${x}`),
          ...(s.improvements ?? []).map((x) => `改善点: ${x}`),
        ].join("\n")
      ),
      ...notes,
    ].join("\n---\n");
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic();
      const resp = await client.messages.create({
        model: AI_MODEL_SONNET,
        max_tokens: 500,
        system: buildLessonObservationSummaryPrompt(opts.studentName, material),
        messages: [{ role: "user", content: "JSON 配列を出力してください。" }],
      });
      const text = resp.content[0]?.type === "text" ? resp.content[0].text : "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          const items = parsed.filter((s) => typeof s === "string").slice(0, 3);
          if (items.length > 0) sessionSummary.teacherObservations = items;
        }
      }
    } catch (err) {
      console.warn("[report-sections] observation extraction failed:", err);
    }
  }

  // 回ごとの記録: 直近10件。内容のある回だけ
  const digestEntries = sessions
    .map((s) => ({
      date: s.scheduledAt ?? "",
      goal: s.prepPlan?.goal,
      // 古い自動生成の報告書（source 無し）は中身が作文のことがあるので使わない
      summaryPoints: isTrustedSummary(s.summary)
        ? (s.summary.topicsDiscussed ?? [])
        : [],
      actionItems: (isTrustedSummary(s.summary) ? s.summary.actionItems : [])
        .map((a) => a.task)
        .filter(
          (t): t is string => typeof t === "string" && t.trim().length > 0
        ),
      nextAgenda: s.debrief?.nextAgendaSeed,
    }))
    .filter(
      (e) =>
        !!e.goal ||
        e.summaryPoints.length > 0 ||
        e.actionItems.length > 0 ||
        !!e.nextAgenda
    )
    .slice(0, 10);

  return {
    sessionSummary: sessionSummary.totalCount > 0 ? sessionSummary : undefined,
    sessionDigest:
      digestEntries.length > 0
        ? { totalCount: digestEntries.length, sessions: digestEntries }
        : undefined,
  };
}

/**
 * 出願書類の欄。完成数・期限に加えて、添削済みの書類ごとの満点比（%）を出す。
 * 軸と満点は score-axes.ts を通す（書類の種類と版で軸が変わるため手書きしない）。
 */
export async function loadDocumentSummary(
  db: Db,
  studentId: string
): Promise<GrowthReport["documentSummary"]> {
  const snap = await db
    .collection("documents")
    .where("userId", "==", studentId)
    .get();
  const docs = snap.docs.map(
    (d) =>
      d.data() as {
        status?: string;
        title?: string;
        type?: string;
        deadline?: string;
        updatedAt?: string;
        feedback?: DocumentFeedback;
      }
  );
  const total = docs.length;
  if (total === 0) return undefined;
  const completed = docs.filter((d) => d.status === "final").length;
  const upcomingDeadlines = docs
    .filter(
      (d): d is typeof d & { deadline: string } =>
        d.status !== "final" &&
        typeof d.deadline === "string" &&
        d.deadline.length > 0
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3)
    .map((d) => ({ title: d.title ?? "", deadline: d.deadline }));
  // 新しく直した書類から
  const reviewed = [...docs]
    .sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
    )
    .filter((d) => d.feedback)
    .map((d) => {
      const t = documentTotal(documentScoreLayout(d.feedback, d.type));
      return { title: d.title ?? d.type ?? "", total: t };
    })
    // 書きかけ（採点しなかった）は点を出さない
    .filter((x) => !x.total.incomplete && x.total.max > 0)
    .map((x) => ({ title: x.title, percentage: x.total.percentage }))
    .slice(0, 5);
  return {
    total,
    completed,
    inProgress: total - completed,
    upcomingDeadlines,
    ...(reviewed.length > 0 ? { reviewed } : {}),
  };
}

/** Timestamp と ISO 文字列の両方を読む（コレクションで日付の型が違う。CLAUDE.md 6.5） */
function toMillis(v: unknown): number | null {
  if (!v) return null;
  const ts = (v as { toMillis?: () => number }).toMillis?.();
  if (typeof ts === "number") return ts;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * 期間内のドリルの回数。ちょこ添削は createdAt（ISO 文字列）、
 * 論理・要約・文のドリルは completedAt（Timestamp）。型が違うので JS で絞る。
 */
export async function loadPracticeSummary(
  db: Db,
  studentId: string,
  start: Date,
  end: Date
): Promise<GrowthReport["practiceSummary"]> {
  const from = start.getTime();
  const to = end.getTime();
  const count = async (sub: string, field: string) => {
    const snap = await db
      .collection(`users/${studentId}/${sub}`)
      .select(field)
      .get();
    return snap.docs.filter((d) => {
      const t = toMillis(d.get(field));
      return t !== null && t >= from && t <= to;
    }).length;
  };
  const [chokoReviews, logicDrills, summaryDrills, sentenceDrills] =
    await Promise.all([
      count("chokoReviews", "createdAt"),
      count("logicDrills", "completedAt"),
      count("summaryDrills", "completedAt"),
      count("sentenceDrills", "completedAt"),
    ]);
  if (chokoReviews + logicDrills + summaryDrills + sentenceDrills === 0) {
    return undefined;
  }
  return { chokoReviews, logicDrills, summaryDrills, sentenceDrills };
}

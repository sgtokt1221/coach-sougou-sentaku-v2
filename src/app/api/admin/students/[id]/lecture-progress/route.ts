import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { getAllLectures } from "@/data/essay-lectures";

/** 満点。lecture/submit の採点は EssayScores 5観点固定で、講座は AP 非依存なので 50 固定。 */
const SCORE_MAXIMUM = 50;
/** 「詰まっている」判定1: この回数以上提出して満点の6割未満なら詰まっているとみなす。 */
const STUCK_MIN_ATTEMPTS = 3;
/** 「詰まっている」判定の閾値割合。 */
const STUCK_SCORE_RATIO = 0.6;
/** 「詰まっている」判定2: 直前の講から何日手つかずなら詰まっているとみなすか。 */
const STUCK_IDLE_DAYS = 14;

export interface LectureProgressRow {
  lectureId: string;
  order: number;
  title: string;
  /** 提出回数（0なら未受講） */
  attempts: number;
  /** 最高得点。未受講は null */
  bestTotal: number | null;
  /** 最終提出日（ISO）。未受講は null */
  lastAt: string | null;
  /** 文のドリルの正答率(%)。未実施は null */
  drillRate: number | null;
  /**
   * 詰まっているか。次のどちらか:
   *   - 3回以上提出して最高得点が満点の6割未満
   *   - 直前の講まで進んでいるのに、この講だけ2週間以上手つかず
   */
  stuck: boolean;
}

/**
 * GET /api/admin/students/[id]/lecture-progress
 *
 * 小論文講座20講の進み具合。生徒がどこまで進み、どの講で詰まっているかを管理者に見せる。
 * 未受講の講も返す（「どこで止まったか」を見るのが目的なので、受講済みだけ返すと分からない）。
 *
 * データ元は essays（sourceType="lecture"）と users/{id}/sentenceDrills を1回ずつ引き、
 * 20講ぶんの集計は JS 側で行う（N+1 にしない）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json([]);
  }

  try {
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }
    const userData = userDoc.data()!;

    const orgDenied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(userData),
      },
      allowAssignedTeacher: true,
    });
    if (orgDenied) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } =
          await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(uid, id);
        if (!hasAccess) return orgDenied;
      } else {
        return orgDenied;
      }
    }

    const [essaysSnap, drillsSnap] = await Promise.all([
      adminDb.collection("essays").where("userId", "==", id).get(),
      adminDb.collection(`users/${id}/sentenceDrills`).get(),
    ]);

    // essays: lectureId ごとに attempts / bestTotal / lastAt を集計
    const essayStats = new Map<
      string,
      { attempts: number; bestTotal: number | null; lastAtMs: number | null }
    >();
    for (const doc of essaysSnap.docs) {
      const data = doc.data();
      if (data.sourceType !== "lecture" || !data.lectureId) continue;
      const lectureId = data.lectureId as string;
      const stat = essayStats.get(lectureId) ?? {
        attempts: 0,
        bestTotal: null,
        lastAtMs: null,
      };
      stat.attempts += 1;
      const total =
        typeof data.scores?.total === "number" ? data.scores.total : null;
      if (
        total !== null &&
        (stat.bestTotal === null || total > stat.bestTotal)
      ) {
        stat.bestTotal = total;
      }
      const submittedAtMs =
        data.submittedAt?.toDate?.()?.getTime?.() ??
        new Date(data.submittedAt ?? 0).getTime();
      if (
        Number.isFinite(submittedAtMs) &&
        (stat.lastAtMs === null || submittedAtMs > stat.lastAtMs)
      ) {
        stat.lastAtMs = submittedAtMs;
      }
      essayStats.set(lectureId, stat);
    }

    // sentenceDrills: lectureId ごとに correct/total を合計
    const drillStats = new Map<string, { correct: number; total: number }>();
    for (const doc of drillsSnap.docs) {
      const data = doc.data();
      const lectureId = data.lectureId as string | undefined;
      if (!lectureId) continue;
      const stat = drillStats.get(lectureId) ?? { correct: 0, total: 0 };
      stat.correct += Number(data.correct ?? 0);
      stat.total += Number(data.total ?? 0);
      drillStats.set(lectureId, stat);
    }

    const lectures = getAllLectures();
    const rows: LectureProgressRow[] = lectures.map((lecture) => {
      const essay = essayStats.get(lecture.id);
      const drill = drillStats.get(lecture.id);
      const attempts = essay?.attempts ?? 0;
      const bestTotal = essay?.bestTotal ?? null;
      const lastAt =
        essay?.lastAtMs != null ? new Date(essay.lastAtMs).toISOString() : null;
      const drillRate =
        drill && drill.total > 0
          ? Math.round((drill.correct / drill.total) * 100)
          : null;

      const lowScoreStuck =
        attempts >= STUCK_MIN_ATTEMPTS &&
        bestTotal !== null &&
        bestTotal < SCORE_MAXIMUM * STUCK_SCORE_RATIO;

      return {
        lectureId: lecture.id,
        order: lecture.order,
        title: lecture.title,
        attempts,
        bestTotal,
        lastAt,
        drillRate,
        stuck: lowScoreStuck,
      };
    });

    // 判定2: 直前の講まで進んでいるのに、この講だけ2週間以上手つかず
    for (let i = 1; i < rows.length; i++) {
      const cur = rows[i];
      const prev = rows[i - 1];
      if (cur.attempts === 0 && prev.attempts > 0 && prev.lastAt) {
        const idleDays =
          (Date.now() - new Date(prev.lastAt).getTime()) / 86400000;
        if (idleDays >= STUCK_IDLE_DAYS) cur.stuck = true;
      }
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[admin/lecture-progress] failed", err);
    return NextResponse.json([]);
  }
}

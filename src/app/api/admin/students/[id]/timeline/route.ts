import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import {
  TIMELINE_FILTERS,
  TIMELINE_KINDS,
  dailyActivity,
  mergeTimeline,
} from "@/lib/admin/timeline";
import type { TimelineItem, TimelineKind } from "@/lib/admin/timeline";
import { TIMELINE_SOURCES } from "@/lib/admin/timeline-sources";

/**
 * GET /api/admin/students/[id]/timeline?filter=&before=&limit=
 *
 * 生徒詳細の「時系列」。種類をまたいで新しい順に limit 件。
 * 続きは応答の nextBefore を before に渡して読む。
 * 読めなかった種類は failedKinds で返す（黙って欠かさない）。
 * 最初のページ（before なし）だけ、直近30日の活動量 activity を付ける。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore に接続できません" }, { status: 500 });
  }

  const userDoc = await adminDb.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
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
      const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
      const hasAccess = await hasActiveSessionAccess(uid, id);
      if (!hasAccess) {
        return orgDenied;
      }
    } else {
      return orgDenied;
    }
  }

  const url = new URL(request.url);
  const filterKey = url.searchParams.get("filter") ?? "all";
  const beforeParam = url.searchParams.get("before");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 50);
  const filter = TIMELINE_FILTERS.find((f) => f.key === filterKey) ?? TIMELINE_FILTERS[0];
  const before = beforeParam ? new Date(beforeParam) : null;
  if (before && Number.isNaN(before.getTime())) {
    return NextResponse.json({ error: "before が不正です" }, { status: 400 });
  }
  const db = adminDb;

  const perKind: Partial<Record<TimelineKind, TimelineItem[]>> = {};
  const failedKinds: TimelineKind[] = [];
  // 種類ごとに1件多く読む。ちょうど limit 件で止めると、1種類だけが limit 件
  // 返したときに「続きがあるか」を mergeTimeline が見分けられず nextBefore が
  // null になり、古い記録が読めなくなる（エミュレータで確認した）
  await Promise.all(
    filter.kinds.map(async (kind) => {
      try {
        perKind[kind] = await TIMELINE_SOURCES[kind](db, id, before, limit + 1);
      } catch (err) {
        console.warn(`[timeline] ${kind} failed:`, err);
        failedKinds.push(kind);
      }
    })
  );
  const page = mergeTimeline(perKind, limit, failedKinds);

  // 最初のページだけ活動量（直近30日）を返す。種類は絞り込みに関係なく全部で数える
  let activity: { date: string; count: number }[] | undefined;
  if (!before) {
    const since = new Date(Date.now() - 30 * 86400000);
    const recent: TimelineItem[] = [];
    await Promise.all(
      TIMELINE_KINDS.map(async (kind) => {
        try {
          const rows = await TIMELINE_SOURCES[kind](db, id, null, 200);
          recent.push(...rows.filter((r) => Date.parse(r.at) >= since.getTime()));
        } catch {
          // 活動量の欠けは failedKinds で既に知らせている種類と同じなので黙る
        }
      })
    );
    activity = dailyActivity(recent, 30);
  }

  return NextResponse.json({ ...page, activity });
}

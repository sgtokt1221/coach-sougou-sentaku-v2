import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import {
  TIMELINE_FILTERS,
  TIMELINE_KINDS,
  allowedTimelineKinds,
  dailyActivity,
  mergeTimeline,
} from "@/lib/admin/timeline";
import type { TimelineItem, TimelineKind } from "@/lib/admin/timeline";
import {
  TIMELINE_ACTIVITY_SOURCES,
  TIMELINE_SOURCES,
  createSourceContext,
} from "@/lib/admin/timeline-sources";

/**
 * GET /api/admin/students/[id]/timeline?filter=&before=&limit=
 *
 * 生徒詳細の「時系列」。種類をまたいで新しい順に limit 件。
 * 続きは応答の nextBefore を before に渡して読む。
 * 読めなかった種類は failedKinds で返す（黙って欠かさない）。
 * 「すべて」の最初のページ（before なし）だけ、直近30日の活動量 activity を付ける。
 * 面談の救済だけで通った講師には、開いた先の API も通る種類だけを返す。
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
  // 担当外で面談の救済（hasActiveSessionAccess）だけで通った講師には、開いた先の API も
  // 同じ救済を持つ種類だけを返す（lib/admin/timeline.ts の SESSION_ACCESS_KINDS を参照）
  let viaSessionAccess = false;
  if (orgDenied) {
    if (role === "teacher") {
      const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
      const hasAccess = await hasActiveSessionAccess(uid, id);
      if (!hasAccess) {
        return orgDenied;
      }
      viaSessionAccess = true;
    } else {
      return orgDenied;
    }
  }

  const url = new URL(request.url);
  const filterKey = url.searchParams.get("filter") ?? "all";
  const beforeParam = url.searchParams.get("before");
  const requested = Math.floor(Number(url.searchParams.get("limit") ?? 20)) || 20;
  const limit = Math.max(1, Math.min(requested, 50));
  const filter = TIMELINE_FILTERS.find((f) => f.key === filterKey) ?? TIMELINE_FILTERS[0];
  const before = beforeParam ? new Date(beforeParam) : null;
  if (before && Number.isNaN(before.getTime())) {
    return NextResponse.json({ error: "before が不正です" }, { status: 400 });
  }
  const db = adminDb;
  // AI対話は5か所を読むので、時系列の本体と活動量で1回の読み込みを分け合う
  const ctx = createSourceContext(db, id);
  // 絞り込みの種類のうち、この閲覧者に見せてよいもの。見せない種類は失敗扱いにせず省く
  const kinds = allowedTimelineKinds(filter.kinds, viaSessionAccess);

  const perKind: Partial<Record<TimelineKind, TimelineItem[]>> = {};
  const failedKinds: TimelineKind[] = [];
  // 種類ごとに1件多く読む。ちょうど limit 件で止めると、1種類だけが limit 件
  // 返したときに「続きがあるか」を mergeTimeline が見分けられず nextBefore が
  // null になり、古い記録が読めなくなる（エミュレータで確認した）
  // AI対話は読む場所ごとに新しい方から約30件までしか読まない（loadAiConversations）ため、
  // それより古い会話は続きを読んでも出てこない。
  const loadPage = Promise.all(
    kinds.map(async (kind) => {
      try {
        perKind[kind] = await TIMELINE_SOURCES[kind](db, id, before, limit + 1, ctx);
      } catch (err) {
        console.warn(`[timeline] ${kind} failed:`, err);
        failedKinds.push(kind);
      }
    })
  );

  // 活動量（直近30日）は「すべて」の最初のページだけ返す。絞り込み中や続きのページでは
  // 棒を出さないので読まない。数えるのは見せてよい種類すべて（「すべて」なので kinds と同じ）。
  // 活動量だけ読めなかった種類も failedKinds に入れる（「すべて」のときだけ計算するので、
  // 画面に出ていない種類の失敗が黙って混ざることは無い）。
  const activityFailed: TimelineKind[] = [];
  const loadActivity =
    filter.key === "all" && !before
      ? (async () => {
          const since = new Date(Date.now() - 30 * 86400000);
          const dates: { at: string }[] = [];
          await Promise.all(
            allowedTimelineKinds(TIMELINE_KINDS, viaSessionAccess).map(async (kind) => {
              try {
                const rows = await TIMELINE_ACTIVITY_SOURCES[kind](db, id, since, ctx);
                dates.push(...rows.map((at) => ({ at })));
              } catch (err) {
                console.warn(`[timeline] activity ${kind} failed:`, err);
                activityFailed.push(kind);
              }
            })
          );
          return dailyActivity(dates, 30);
        })()
      : Promise.resolve(undefined);

  const [, activity] = await Promise.all([loadPage, loadActivity]);
  const page = mergeTimeline(perKind, limit, failedKinds);
  const allFailed = [...new Set([...page.failedKinds, ...activityFailed])];

  return NextResponse.json({ ...page, failedKinds: allFailed, activity });
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildActivityHeatmapData,
  heatmapStartMs,
  toMillis,
  type HeatmapEvent,
} from "@/lib/utils/activity-heatmap";

/**
 * 生徒の「活動状況（直近30日）」を日本時間の日ごとに数えて返す。
 * GET /api/admin/students/[id]/activity-heatmap
 *
 * 日付フィールドの型はコレクションごとに違う（Timestamp / ISO文字列）ので、
 * 範囲条件はかけずに必要な項目だけ select で読み、JS で期間を絞る
 * （型を取り違えた範囲条件は一致ゼロの沈黙失敗になる）。
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  if (!adminDb) return NextResponse.json(buildActivityHeatmapData([]));
  const db = adminDb;

  const userDoc = await db.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = userDoc.data() ?? {};
  const denied = await scopeByOrganization({
    requesterUid: authResult.uid,
    requesterRole: authResult.role,
    studentUid: id,
    studentData: {
      managedBy: userData.managedBy as string | undefined,
      organizationId: userData.organizationId as string | undefined,
      assignedTeacherIds: getAssignedTeacherIds(userData),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

  const nowMs = Date.now();
  const startMs = heatmapStartMs(nowMs);
  const recent = (v: unknown) => {
    const ms = toMillis(v);
    return ms !== null && ms >= startMs;
  };
  const sub = (name: string) => db.collection(`users/${id}/${name}`);

  const sources: { label: string; load: () => Promise<HeatmapEvent[]> }[] = [
    {
      label: "essays",
      load: async () => {
        const snap = await db.collection("essays").where("userId", "==", id).select("submittedAt").get();
        return snap.docs.map((d) => ({ key: "essay", at: d.get("submittedAt") }));
      },
    },
    {
      label: "interviews",
      load: async () => {
        const snap = await db
          .collection("interviews")
          .where("userId", "==", id)
          .select("status", "completedAt", "startedAt")
          .get();
        // 採点まで終えた面接だけ。終わった日に数える
        return snap.docs
          .filter((d) => d.get("status") === "completed")
          .map((d) => ({ key: "interview", at: d.get("completedAt") ?? d.get("startedAt") }));
      },
    },
    {
      label: "documents",
      load: async () => {
        const snap = await db
          .collection("documents")
          .where("userId", "==", id)
          .select("createdAt", "updatedAt", "versions")
          .get();
        // 最後に保存した日だけでなく、版を残した日・作った日も「書いた日」に数える
        return snap.docs.flatMap((d) => {
          const versions = (d.get("versions") as { createdAt?: unknown }[] | undefined) ?? [];
          return [d.get("createdAt"), d.get("updatedAt"), ...versions.map((v) => v?.createdAt)].map(
            (at) => ({ key: "document" as const, at, group: d.id }),
          );
        });
      },
    },
    {
      label: "summaryDrills",
      load: async () => {
        const snap = await sub("summaryDrills").select("completedAt").get();
        return snap.docs.map((d) => ({ key: "drill", at: d.get("completedAt") }));
      },
    },
    {
      label: "logicDrills",
      load: async () => {
        const snap = await sub("logicDrills").select("completedAt").get();
        return snap.docs.map((d) => ({ key: "logicDrill", at: d.get("completedAt") }));
      },
    },
    {
      label: "chokoReviews",
      load: async () => {
        const snap = await sub("chokoReviews").select("submittedAt", "createdAt").get();
        return snap.docs.map((d) => ({ key: "choco", at: d.get("submittedAt") ?? d.get("createdAt") }));
      },
    },
    {
      // 面接ドリルは採点のたびに必ず保存される interviewDrills を数える
      // （activityLogs 側は応答後の書き込みで落ちることがあった）
      label: "interviewDrills",
      load: async () => {
        const snap = await sub("interviewDrills").select("createdAt").get();
        return snap.docs.map((d) => ({ key: "interviewDrill", at: d.get("createdAt") }));
      },
    },
    {
      label: "activities",
      load: async () => {
        const snap = await sub("activities").select("createdAt", "updatedAt").get();
        return snap.docs.flatMap((d) =>
          [d.get("createdAt"), d.get("updatedAt")].map((at) => ({
            key: "activity" as const,
            at,
            group: d.id,
          })),
        );
      },
    },
    {
      label: "activityLogs",
      load: async () => {
        const snap = await sub("activityLogs").select("type", "createdAt").get();
        return snap.docs.flatMap((d): HeatmapEvent[] => {
          const type = d.get("type");
          if (type === "topicInput" || type === "selfAnalysis") {
            return [{ key: type, at: d.get("createdAt") }];
          }
          return [];
        });
      },
    },
  ];

  // 1つ落ちても（インデックス欠落など）残りは出す
  const results = await Promise.allSettled(sources.map((s) => s.load()));
  const events: HeatmapEvent[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      events.push(...r.value.filter((e) => recent(e.at)));
    } else {
      console.warn(`[admin/activity-heatmap] ${sources[i].label} failed:`, r.reason);
    }
  });

  return NextResponse.json(buildActivityHeatmapData(events, nowMs));
}

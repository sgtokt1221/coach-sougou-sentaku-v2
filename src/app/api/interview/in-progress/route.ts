import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { InProgressInterview } from "@/lib/types/interview";

/**
 * GET /api/interview/in-progress
 * 未完了（status=in_progress かつ会話が1件以上ある）面接の一覧。再開用。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // 複合インデックス回避のため userId のみで取得し、status/件数はコード側で絞る
    const snap = await adminDb
      .collection("interviews")
      .where("userId", "==", uid)
      .get();

    const items: InProgressInterview[] = snap.docs
      .map((d) => {
        const data = d.data();
        const messageCount = Array.isArray(data.messages) ? data.messages.length : 0;
        return { d, data, messageCount };
      })
      .filter(({ data, messageCount }) => data.status === "in_progress" && messageCount >= 1)
      .map(({ d, data, messageCount }) => ({
        id: d.id,
        universityName: data.universityContext?.universityName ?? "",
        facultyName: data.universityContext?.facultyName ?? "",
        mode: data.mode ?? "individual",
        inputMode: data.inputMode ?? "text",
        startedAt:
          data.startedAt?.toDate?.()?.toISOString() ??
          (typeof data.startedAt === "string" ? data.startedAt : ""),
        lastActiveAt:
          data.lastActiveAt?.toDate?.()?.toISOString() ??
          (typeof data.lastActiveAt === "string" ? data.lastActiveAt : undefined),
        messageCount,
      }));

    // 最終更新（無ければ開始）降順
    items.sort((a, b) => {
      const at = new Date(a.lastActiveAt ?? a.startedAt).getTime();
      const bt = new Date(b.lastActiveAt ?? b.startedAt).getTime();
      return bt - at;
    });

    return NextResponse.json({ inProgress: items });
  } catch (error) {
    console.error("Interview in-progress GET error:", error);
    return NextResponse.json(
      { error: "進行中面接の取得に失敗しました" },
      { status: 500 }
    );
  }
}

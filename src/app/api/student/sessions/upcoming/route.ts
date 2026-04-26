import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { Session } from "@/lib/types/session";

/**
 * GET /api/student/sessions/upcoming
 * 認証中の生徒の「予定済みセッション」を時系列順で最大 3 件返す。
 *
 * 基準: studentId === uid, status in ["scheduled", "in_progress"],
 *       scheduledAt >= now-30min
 *
 * レスポンス:
 * - sessions: Session[]  ─ 最大 3 件 (ダッシュボードで「次回 + その次」を見せる用)
 * - session:  Session|null ─ 後方互換 (sessions[0] と同値)
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const now = Date.now();
    const floorIso = new Date(now - 30 * 60 * 1000).toISOString();
    const snap = await adminDb
      .collection("sessions")
      .where("studentId", "==", auth.uid)
      .where("scheduledAt", ">=", floorIso)
      .orderBy("scheduledAt", "asc")
      .limit(8)
      .get();

    const upcoming = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Session)
      .filter(
        (s) =>
          s.status === "scheduled" ||
          s.status === "in_progress",
      )
      .slice(0, 3);

    return NextResponse.json({
      sessions: upcoming,
      session: upcoming[0] ?? null, // 後方互換
    });
  } catch (err) {
    console.error("[student/sessions/upcoming] error:", err);
    return NextResponse.json(
      { error: "次回セッションの取得に失敗しました" },
      { status: 500 },
    );
  }
}

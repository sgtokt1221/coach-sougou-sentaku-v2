import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Session } from "@/lib/types/session";
import type { ResearchEvalResult } from "@/lib/ai/prompts/research";
import type { ResearchCurriculum, ResearchCurriculumUnit } from "@/lib/types/research";

interface ResearchSessionDoc {
  id: string;
  topic: string;
  feedback: ResearchEvalResult | null;
  nextItems: string[];
  sessionId: string | null;
  createdAt: string | null;
}

/**
 * GET /api/admin/sessions/[id]/research-evaluation
 * 講師画面の初期表示用。当該セッションの最新講評（current）と、
 * 別回も含む直近の「次回やること」（previousNextItems, 継続性のため）を返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid, role } = auth;
  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const sessionSnap = await adminDb.doc(`sessions/${id}`).get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }
    const session = sessionSnap.data() as Session;
    const studentId = session.studentId;
    if (!studentId) {
      return NextResponse.json({ current: null, previousNextItems: [] });
    }

    const studentSnap = await adminDb.doc(`users/${studentId}`).get();
    if (role !== "superadmin" && studentSnap.data()?.managedBy !== uid) {
      return NextResponse.json(
        { error: "この生徒のセッションを閲覧する権限がありません" },
        { status: 403 }
      );
    }

    const snap = await adminDb
      .collection("users")
      .doc(studentId)
      .collection("researchSessions")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const docs: ResearchSessionDoc[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        topic: data.topic ?? "",
        feedback: data.feedback ?? null,
        nextItems: data.nextItems ?? [],
        sessionId: data.sessionId ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    const current = docs.find((d) => d.sessionId === id) ?? null;
    // 当該セッション以外で最も新しい回の「次回やること」を継続性として渡す
    const prev = docs.find((d) => d.id !== current?.id);
    const previousNextItems = prev?.nextItems ?? [];

    // カリキュラムの「今回のユニット」(最初の未完了。既に当該セッションに紐付くものがあればそれ)
    let currentUnit: ResearchCurriculumUnit | null = null;
    let curriculumTheme: string | null = null;
    try {
      const curSnap = await adminDb
        .doc(`users/${studentId}/researchCurriculum/current`)
        .get();
      if (curSnap.exists) {
        const cur = curSnap.data() as ResearchCurriculum;
        curriculumTheme = cur.theme ?? null;
        currentUnit =
          cur.units?.find((u) => u.sessionId === id) ??
          cur.units?.find((u) => u.status !== "done") ??
          null;
      }
    } catch {
      /* カリキュラム未作成は無視 */
    }

    return NextResponse.json({ current, previousNextItems, currentUnit, curriculumTheme });
  } catch (error) {
    console.error("Admin research evaluation GET error:", error);
    return NextResponse.json(
      { error: "講評の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

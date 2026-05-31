import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { EssayInlineComment } from "@/lib/types/essay";

/**
 * POST /api/essay/[id]/comments/read
 * 生徒(本人)が小論文を開いた時、インラインコメントを既読にする。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const { id } = await params;
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const essayDoc = await adminDb.doc(`essays/${id}`).get();
    if (!essayDoc.exists) {
      return NextResponse.json({ error: "小論文が見つかりません" }, { status: 404 });
    }
    if (essayDoc.data()!.userId !== uid) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const list = (essayDoc.data()?.inlineComments ?? []) as EssayInlineComment[];
    const hasUnread = list.some((c) => !c.read);
    if (!hasUnread) return NextResponse.json({ success: true, marked: 0 });

    const next = list.map((c) => (c.read ? c : { ...c, read: true }));
    await adminDb.doc(`essays/${id}`).update({ inlineComments: next });

    return NextResponse.json({ success: true, marked: next.length });
  } catch (error) {
    console.error("Essay comment read error:", error);
    return NextResponse.json(
      { error: "既読処理に失敗しました" },
      { status: 500 }
    );
  }
}

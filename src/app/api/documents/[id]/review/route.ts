import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  DocumentReviewError,
  reviewDocumentCore,
} from "@/lib/documents/review-core";

/**
 * POST /api/documents/[id]/review — 生徒が自分の書類をAI添削する。
 *
 * 添削そのものは lib/documents/review-core.ts に集約している（管理者・講師も
 * 同じ採点を実行するため）。ここは認可と機能ゲートだけを担う。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { id } = await params;
    const documentSnap = await adminDb.doc(`documents/${id}`).get();
    if (!documentSnap.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }
    if (documentSnap.data()!.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { feedback, feedbackAt } = await reviewDocumentCore({
      documentId: id,
      ownerUid: auth.uid,
      content: typeof body.content === "string" ? body.content : undefined,
    });

    return NextResponse.json({ feedback, documentId: id, feedbackAt });
  } catch (error) {
    if (error instanceof DocumentReviewError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Document review error:", error);
    return NextResponse.json(
      { error: "添削処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { DocumentReviewError } from "@/lib/documents/review-core";
import { generateDocumentInterviewQuestions } from "@/lib/documents/interview-questions";

export const maxDuration = 120;

/**
 * POST /api/documents/[id]/interview-questions — 自分の書類から、面接で突っ込まれ
 * そうな箇所と質問を作る（添削した本文に対して）。中身は lib/documents/interview-questions.ts。
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
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
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

    const questions = await generateDocumentInterviewQuestions({
      documentId: id,
    });
    return NextResponse.json({ questions });
  } catch (error) {
    if (error instanceof DocumentReviewError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("[documents/interview-questions] failed:", error);
    return NextResponse.json(
      { error: "質問の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  DocumentFeedback,
  DocumentReviewRecord,
  DocumentVersion,
} from "@/lib/types/document";

/**
 * 書類の添削の履歴（新しい順）。バージョン履歴で、版の本文と一緒に出す。
 *
 * `documents/{id}/reviews` は 2026-10-11 から積んでいる。それより前の添削は
 * 書類直下の feedback（最後の1件）と、さらに古い versions[].feedback にしか
 * 無いので、それも1件ずつ足す。
 */
export async function GET(
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
    const docRef = adminDb.doc(`documents/${id}`);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }
    const data = docSnap.data()!;
    if (data.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const snap = await docRef
      .collection("reviews")
      .orderBy("feedbackAt", "desc")
      .get();
    const reviews: DocumentReviewRecord[] = snap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        content: r.content,
        feedback: r.feedback,
        feedbackAt: r.feedbackAt,
      };
    });

    if (
      data.feedback &&
      typeof data.feedbackContent === "string" &&
      typeof data.feedbackAt === "string" &&
      !reviews.some((r) => r.feedbackAt === data.feedbackAt)
    ) {
      reviews.push({
        id: "latest",
        content: data.feedbackContent,
        feedback: data.feedback as DocumentFeedback,
        feedbackAt: data.feedbackAt,
      });
    }
    for (const v of (data.versions ?? []) as DocumentVersion[]) {
      if (v.feedback && !reviews.some((r) => r.content === v.content)) {
        reviews.push({
          id: `version-${v.id}`,
          content: v.content,
          feedback: v.feedback,
          feedbackAt: v.createdAt,
        });
      }
    }
    reviews.sort((a, b) => b.feedbackAt.localeCompare(a.feedbackAt));

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Document reviews get error:", error);
    return NextResponse.json(
      { error: "添削の履歴の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

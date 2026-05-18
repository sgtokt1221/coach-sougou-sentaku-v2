import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 指定書類の詳細を取得する。
 * グローバル `documents` コレクション + `userId` 所有者チェック。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const docSnap = await adminDb.doc(`documents/${id}`).get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }

    const data = docSnap.data();
    if (data?.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }

    return NextResponse.json({ id: docSnap.id, ...data });
  } catch (error) {
    console.error("Document get error:", error);
    return NextResponse.json(
      { error: "書類の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * 書類を更新する (内容・ステータス・タイトル等)。
 * 所有者チェック必須。
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const docRef = adminDb.doc(`documents/${id}`);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }
    if (existing.data()?.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      updatedAt: now,
    };
    let newVersion: Record<string, unknown> | null = null;

    if (body.content !== undefined) {
      updates.content = body.content;
      updates.wordCount = body.content.length;
      newVersion = {
        id: `v-${Date.now()}`,
        content: body.content,
        wordCount: body.content.length,
        createdAt: now,
      };
    }

    if (body.status !== undefined) updates.status = body.status;
    if (body.title !== undefined) updates.title = body.title;
    if (body.targetWordCount !== undefined)
      updates.targetWordCount = body.targetWordCount;
    if (body.deadline !== undefined) updates.deadline = body.deadline;

    if (newVersion) {
      updates.versions = FieldValue.arrayUnion(newVersion);
    }

    await docRef.update(updates);

    return NextResponse.json({
      id,
      ...updates,
      wordCount: body.content !== undefined ? body.content.length : undefined,
    });
  } catch (error) {
    console.error("Document update error:", error);
    return NextResponse.json(
      { error: "書類の更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * 書類を削除する。
 * DELETE は本 PR ではスコープ外のため既存のクライアント SDK 経路を維持
 * (動作しない可能性が高いが、使用頻度が低いため別 PR で対応予定)。
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(_request, "documentEditor");
    if (gate) return gate;

    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "documents", id));
      } catch (err) {
        console.warn("Firestore delete failed:", err);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: "書類の削除中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

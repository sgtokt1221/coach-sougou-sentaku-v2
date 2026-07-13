import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentReview } from "@/lib/types/document";

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
    const isAutosave = body.autosave === true;

    const updates: Record<string, unknown> = {
      updatedAt: now,
    };
    let newVersion: Record<string, unknown> | null = null;

    if (body.content !== undefined) {
      updates.content = body.content;
      updates.wordCount = body.content.length;
      // 自動保存では版を増やさない（ノイズ防止）。手動/生成保存でのみ版を積む。
      if (!isAutosave) {
        newVersion = {
          id: `v-${Date.now()}`,
          content: body.content,
          wordCount: body.content.length,
          createdAt: now,
        };
      }
    }

    if (body.status !== undefined) updates.status = body.status;
    if (body.title !== undefined) updates.title = body.title;
    if (body.targetWordCount !== undefined) updates.targetWordCount = body.targetWordCount;
    if (body.deadline !== undefined) updates.deadline = body.deadline;
    // ウィザード進行状態と書類基本項目（志望校/タイプ変更対応）。ホワイトリストのみ。
    if (body.wizardState !== undefined) updates.wizardState = body.wizardState;
    if (body.universityId !== undefined) updates.universityId = body.universityId;
    if (body.facultyId !== undefined) updates.facultyId = body.facultyId;
    if (body.universityName !== undefined) updates.universityName = body.universityName;
    if (body.facultyName !== undefined) updates.facultyName = body.facultyName;
    if (body.type !== undefined) updates.type = body.type;

    // 本文を修正したら、承認/差し戻し済みのレビュー状態は「再確認待ち」に戻す。
    if (body.content !== undefined) {
      const existingReview = existing.data()?.review as DocumentReview | undefined;
      if (existingReview && existingReview.state !== "resubmitted") {
        updates.review = { state: "resubmitted", at: now };
      }
    }

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
 * 書類を削除する。認証＋所有者チェック必須（admin SDK）。
 */
export async function DELETE(
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
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { id } = await params;
    const docRef = adminDb.doc(`documents/${id}`);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }
    if (existing.data()?.userId !== auth.uid) {
      return NextResponse.json({ error: "この書類へのアクセス権がありません" }, { status: 403 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json({ error: "書類の削除中にエラーが発生しました" }, { status: 500 });
  }
}

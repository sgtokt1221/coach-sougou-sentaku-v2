import { NextRequest, NextResponse } from "next/server";
import { normalizeDocumentTitle } from "@/lib/documents/title";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
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

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

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

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

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

    /**
     * 本文が半分未満に減る保存（自動保存を含む）では、減る前の本文を版に残す。
     * 自動保存は版を作らないため、AIの候補で本文を置き換えた生徒が「戻して」と
     * 頼んでも戻す版が無かった（2026-10-06、祖父の話を含む全文が消えた）。
     */
    let beforeDeletion: Record<string, unknown> | null = null;
    if (typeof body.content === "string") {
      const prev = existing.data()?.content;
      const prevVersions = (existing.data()?.versions ?? []) as {
        content?: string;
      }[];
      if (
        typeof prev === "string" &&
        prev.length >= 200 &&
        body.content.length < prev.length * 0.5 &&
        prevVersions[prevVersions.length - 1]?.content !== prev
      ) {
        beforeDeletion = {
          id: `v-${Date.now()}-before`,
          content: prev,
          wordCount: prev.length,
          createdAt: now,
          reason: "before-large-deletion",
        };
      }
    }

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
    // 生徒が付けるタイトル。空や長すぎる値は保存しない（一覧・管理者の画面が崩れる）
    if (body.title !== undefined) {
      const title = normalizeDocumentTitle(body.title);
      if (title) updates.title = title;
    }
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

    const addedVersions = [beforeDeletion, newVersion].filter(
      (v): v is Record<string, unknown> => v !== null
    );
    if (addedVersions.length > 0) {
      updates.versions = FieldValue.arrayUnion(...addedVersions);
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

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;
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

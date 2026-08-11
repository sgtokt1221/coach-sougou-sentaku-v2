import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 下書きは本人の users/{uid}/drafts にしか触らないため、役割を絞る必要がない。
 * 生徒限定にしていたせいで、管理者のFB・レビューコメントがクラウドに退避できず
 * 「クラウド同期に失敗」と出ていた（端末にだけ残る状態）。
 */
const DRAFT_ROLES = ["student", "teacher", "admin", "superadmin"];

const MAX_DRAFT_BYTES = 500_000;
const KEY_PATTERN = /^[a-zA-Z0-9:_-]{1,160}$/;

function getDraftKey(request: NextRequest, body?: unknown): string | null {
  const fromQuery = new URL(request.url).searchParams.get("key");
  const fromBody =
    body &&
    typeof body === "object" &&
    typeof (body as { key?: unknown }).key === "string"
      ? (body as { key: string }).key
      : null;
  const key = fromBody ?? fromQuery;
  return key && KEY_PATTERN.test(key) ? key : null;
}

function draftRef(uid: string, key: string) {
  const id = createHash("sha256").update(key).digest("hex");
  return adminDb?.doc(`users/${uid}/drafts/${id}`) ?? null;
}

/** GET /api/student/drafts?key=... - 現在の生徒の汎用途中保存を取得する。 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, DRAFT_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const key = getDraftKey(request);
  if (!key) {
    return NextResponse.json(
      { error: "下書きキーが不正です" },
      { status: 400 }
    );
  }
  const ref = draftRef(authResult.uid, key);
  if (!ref) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ draft: null });
    const data = snapshot.data()!;
    return NextResponse.json({
      draft: {
        data: data.payload ?? null,
        version: typeof data.version === "number" ? data.version : 1,
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() ??
          (typeof data.updatedAt === "string" ? data.updatedAt : null),
      },
    });
  } catch (error) {
    console.error("Student draft GET error:", error);
    return NextResponse.json(
      { error: "下書きの取得に失敗しました" },
      { status: 500 }
    );
  }
}

/** PUT /api/student/drafts - 現在の生徒の汎用途中保存を上書きする。 */
export async function PUT(request: NextRequest) {
  const authResult = await requireRole(request, DRAFT_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_DRAFT_BYTES) {
      return NextResponse.json(
        { error: "下書きが大きすぎます" },
        { status: 413 }
      );
    }
    const body = (await request.json()) as {
      key?: unknown;
      data?: unknown;
      version?: unknown;
    };
    const key = getDraftKey(request, body);
    if (!key || !("data" in body)) {
      return NextResponse.json(
        { error: "下書きキーまたは内容が不正です" },
        { status: 400 }
      );
    }
    if (
      Buffer.byteLength(JSON.stringify(body.data), "utf8") > MAX_DRAFT_BYTES
    ) {
      return NextResponse.json(
        { error: "下書きが大きすぎます" },
        { status: 413 }
      );
    }
    const ref = draftRef(authResult.uid, key);
    if (!ref) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    await ref.set(
      {
        key,
        payload: body.data,
        version: typeof body.version === "number" ? body.version : 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Student draft PUT error:", error);
    return NextResponse.json(
      { error: "下書きの保存に失敗しました" },
      { status: 500 }
    );
  }
}

/** DELETE /api/student/drafts?key=... - 完了・破棄した途中保存を削除する。 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(request, DRAFT_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const key = getDraftKey(request);
  if (!key) {
    return NextResponse.json(
      { error: "下書きキーが不正です" },
      { status: 400 }
    );
  }
  const ref = draftRef(authResult.uid, key);
  if (!ref) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Student draft DELETE error:", error);
    return NextResponse.json(
      { error: "下書きの削除に失敗しました" },
      { status: 500 }
    );
  }
}

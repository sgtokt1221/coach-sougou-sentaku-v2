import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { SessionMaster } from "@/lib/types/teacher-shift";

/**
 * GET /api/admin/sessions/master?month=2026-04
 * セッションマスター一覧取得（月別）
 */
export async function GET(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const url = new URL(request.url);
  const month = url.searchParams.get("month");

  if (!month) {
    return NextResponse.json({ error: "monthパラメータが必要です" }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
  }

  try {
    const snapshot = await adminDb
      .collection("sessionMasters")
      .where("month", "==", month)
      .orderBy("updatedAt", "desc")
      .get();

    const masters: SessionMaster[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SessionMaster[];

    return NextResponse.json(masters);
  } catch (error) {
    console.error("セッションマスター取得エラー:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/**
 * POST /api/admin/sessions/master
 * セッションマスター作成/更新
 */
export async function POST(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...masterData } = body;

    const now = new Date().toISOString();

    if (id) {
      // 更新
      const docRef = adminDb.collection("sessionMasters").doc(id);
      await docRef.update({
        ...masterData,
        updatedAt: now,
      });

      const updatedDoc = await docRef.get();
      const result = { id: updatedDoc.id, ...updatedDoc.data() } as SessionMaster;

      return NextResponse.json(result);
    } else {
      // 新規作成
      const docRef = await adminDb.collection("sessionMasters").add({
        ...masterData,
        createdAt: now,
        updatedAt: now,
      });

      const newDoc = await docRef.get();
      const result = { id: newDoc.id, ...newDoc.data() } as SessionMaster;

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("セッションマスター保存エラー:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/sessions/master?id=masterId
 * セッションマスター削除
 */
export async function DELETE(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "idパラメータが必要です" }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
  }

  try {
    await adminDb.collection("sessionMasters").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("セッションマスター削除エラー:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
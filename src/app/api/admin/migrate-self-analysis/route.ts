/**
 * selfAnalysis/me に保存された自己分析データを、
 * userIdフィールドの値に基づいて正しいドキュメントパスにコピーする一回限りのマイグレーション。
 * 実行後は削除してOK。
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  // マイグレーション用の一時的なシークレットキーで認証（デプロイ後に削除）
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== "migrate-sa-2026") {
    const authResult = await requireRole(request, ["admin", "superadmin"]);
    if (authResult instanceof NextResponse) return authResult;
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const meDoc = await adminDb.doc("selfAnalysis/me").get();
  if (!meDoc.exists) {
    return NextResponse.json({ message: "selfAnalysis/me は存在しません", migrated: 0 });
  }

  const data = meDoc.data()!;

  // meドキュメントにuserIdが保存されていない場合、全usersからselfAnalysisIdを探す
  // もしくはリクエストbodyでターゲットUIDを指定
  const body = await request.json().catch(() => ({}));
  const targetUid = body.targetUid || data.userId;

  if (!targetUid || targetUid === "me") {
    // userIdが"me"のままの場合、全生徒を走査してselfAnalysisを持っていない人を探す
    const usersSnap = await adminDb.collection("users").where("role", "==", "student").get();
    const candidates: string[] = [];
    for (const userDoc of usersSnap.docs) {
      const existing = await adminDb.doc(`selfAnalysis/${userDoc.id}`).get();
      if (!existing.exists) {
        candidates.push(userDoc.id);
      }
    }

    if (candidates.length === 1) {
      // 自己分析データがない生徒が1人だけなら自動マイグレーション
      const uid = candidates[0];
      await adminDb.doc(`selfAnalysis/${uid}`).set({ ...data, userId: uid });
      return NextResponse.json({ message: `selfAnalysis/me を ${uid} に移行しました`, migrated: 1, uid });
    }

    return NextResponse.json({
      message: "targetUidを指定してください",
      candidates,
      meData: { completedSteps: data.completedSteps, userId: data.userId },
    });
  }

  // 指定されたUIDにコピー
  await adminDb.doc(`selfAnalysis/${targetUid}`).set({ ...data, userId: targetUid });
  return NextResponse.json({ message: `selfAnalysis/me を ${targetUid} に移行しました`, migrated: 1, uid: targetUid });
}

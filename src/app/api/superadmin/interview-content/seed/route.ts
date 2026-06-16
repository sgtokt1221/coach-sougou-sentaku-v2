import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { INTERVIEW_CONTENT_SEED } from "@/data/interview-content";

const COLLECTION = "interviewContent";

/**
 * POST: 静的 seed (INTERVIEW_CONTENT_SEED) を Firestore に投入 (superadmin 限定)。
 * `{merge:true}` で冪等。これを実行すると全項目が Firestore 化され、以降 UI で
 * 完全な CRUD が可能になる（大学データの「既存データ移行」相当）。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const db = adminDb;
  let written = 0;
  // バッチ書き込み（500件上限。seed は数十件なので1バッチで足りる）
  const batch = db.batch();
  for (const item of INTERVIEW_CONTENT_SEED) {
    batch.set(db.doc(`${COLLECTION}/${item.id}`), item, { merge: true });
    written++;
  }
  await batch.commit();

  return NextResponse.json({ ok: true, written });
}

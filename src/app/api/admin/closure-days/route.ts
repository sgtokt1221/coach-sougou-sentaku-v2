import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/** 呼び出し元 admin の所属組織 ID（未所属なら null）。 */
async function callerOrg(uid: string): Promise<string | null> {
  const d = (await adminDb!.doc(`users/${uid}`).get()).data();
  return (d?.organizationId as string | undefined) ?? null;
}

/**
 * 対象休校日が呼び出し元の org（or 自分作成）のものか確認する。
 * 所有していれば true、それ以外は false。
 */
function ownsClosure(
  data: FirebaseFirestore.DocumentData,
  uid: string,
  orgId: string | null,
): boolean {
  if (orgId && data.organizationId === orgId) return true;
  return data.createdByAdminId === uid;
}

/** GET `?month=YYYY-MM`（任意）: 自 org の休校日一覧。 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const orgId = await callerOrg(auth.uid);
  const snap = orgId
    ? await adminDb
        .collection("closureDays")
        .where("organizationId", "==", orgId)
        .get()
    : await adminDb
        .collection("closureDays")
        .where("createdByAdminId", "==", auth.uid)
        .get();

  let days = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as {
    id: string;
    date: string;
    [k: string]: unknown;
  });
  if (month) {
    // "YYYY-MM" 前方一致（date は "YYYY-MM-DD"）
    days = days.filter((d) => typeof d.date === "string" && d.date.startsWith(`${month}-`));
  }
  days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return NextResponse.json(days);
}

/** POST `{ date, note? }`: 休校日を登録（同 org+date が既にあれば既存を返す）。 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const b = await request.json().catch(() => null);
  if (!b?.date || typeof b.date !== "string") {
    return NextResponse.json({ error: "日付が必要です" }, { status: 400 });
  }

  const orgId = await callerOrg(auth.uid);

  // 重複チェック（同一 org+date、org 未所属時は自分作成+date）
  const existingSnap = orgId
    ? await adminDb
        .collection("closureDays")
        .where("organizationId", "==", orgId)
        .where("date", "==", b.date)
        .get()
    : await adminDb
        .collection("closureDays")
        .where("createdByAdminId", "==", auth.uid)
        .where("date", "==", b.date)
        .get();
  if (!existingSnap.empty) {
    const d = existingSnap.docs[0];
    return NextResponse.json({ id: d.id, ...d.data() });
  }

  const now = new Date().toISOString();
  const ref = adminDb.collection("closureDays").doc();
  const doc = {
    id: ref.id,
    organizationId: orgId ?? undefined,
    date: b.date,
    note: b.note ?? undefined,
    createdByAdminId: auth.uid,
    createdAt: now,
  };
  await ref.set(doc);
  return NextResponse.json(doc, { status: 201 });
}

/** DELETE `?id=`: 自 org の休校日を削除。 */
export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  }

  const ref = adminDb.collection("closureDays").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  const orgId = await callerOrg(auth.uid);
  if (!ownsClosure(snap.data()!, auth.uid, orgId)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}

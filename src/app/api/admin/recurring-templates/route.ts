import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { ONE_ON_ONE_TYPES } from "@/lib/types/recurring-class";

/** 呼び出し元 admin の所属組織 ID（未所属なら null）。 */
async function callerOrg(uid: string): Promise<string | null> {
  const d = (await adminDb!.doc(`users/${uid}`).get()).data();
  return (d?.organizationId as string | undefined) ?? null;
}

/**
 * 対象テンプレが呼び出し元の org（or 自分作成）のものか確認する。
 * 所有していれば true、それ以外は false。
 */
function ownsTemplate(
  data: FirebaseFirestore.DocumentData,
  uid: string,
  orgId: string | null,
): boolean {
  if (orgId && data.organizationId === orgId) return true;
  return data.createdByAdminId === uid;
}

/** GET: 自 org の定期授業テンプレ一覧。 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const orgId = await callerOrg(auth.uid);
  const snap = orgId
    ? await adminDb
        .collection("recurringClassTemplates")
        .where("organizationId", "==", orgId)
        .get()
    : await adminDb
        .collection("recurringClassTemplates")
        .where("createdByAdminId", "==", auth.uid)
        .get();

  return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

/** POST: 定期授業テンプレを新規作成。 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const b = await request.json().catch(() => null);
  if (
    !b?.studentId ||
    !b?.teacherId ||
    typeof b?.weekday !== "number" ||
    !b?.startTime ||
    !b?.type
  ) {
    return NextResponse.json(
      { error: "必須項目が不足しています" },
      { status: 400 },
    );
  }
  if (!ONE_ON_ONE_TYPES.includes(b.type)) {
    return NextResponse.json(
      { error: "1:1の種別のみ登録できます" },
      { status: 400 },
    );
  }

  const orgId = await callerOrg(auth.uid);
  const now = new Date().toISOString();
  const ref = adminDb.collection("recurringClassTemplates").doc();
  const doc = {
    id: ref.id,
    studentId: b.studentId,
    studentName: b.studentName ?? "",
    teacherId: b.teacherId,
    teacherName: b.teacherName ?? "",
    type: b.type,
    weekday: b.weekday,
    startTime: b.startTime,
    duration: b.duration ?? null,
    format: b.format === "online" ? "online" : "offline",
    active: b.active !== false,
    createdByAdminId: auth.uid,
    organizationId: orgId ?? undefined,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return NextResponse.json(doc, { status: 201 });
}

/** PATCH `?id=`: 自 org のテンプレを更新（active 切替・各フィールド）。 */
export async function PATCH(request: NextRequest) {
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

  const ref = adminDb.collection("recurringClassTemplates").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  const orgId = await callerOrg(auth.uid);
  if (!ownsTemplate(snap.data()!, auth.uid, orgId)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }
  if (b.type !== undefined && !ONE_ON_ONE_TYPES.includes(b.type)) {
    return NextResponse.json(
      { error: "1:1の種別のみ登録できます" },
      { status: 400 },
    );
  }

  // 更新を許可するフィールドのみ取り込む（org/作成者/id は不変）
  const allowed = [
    "studentId",
    "studentName",
    "teacherId",
    "teacherName",
    "type",
    "weekday",
    "startTime",
    "duration",
    "format",
    "active",
  ] as const;
  const update: FirebaseFirestore.DocumentData = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (b[key] !== undefined) update[key] = b[key];
  }
  await ref.update(update);
  const after = await ref.get();
  return NextResponse.json({ id: after.id, ...after.data() });
}

/** DELETE `?id=`: 自 org のテンプレを削除。 */
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

  const ref = adminDb.collection("recurringClassTemplates").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  const orgId = await callerOrg(auth.uid);
  if (!ownsTemplate(snap.data()!, auth.uid, orgId)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}

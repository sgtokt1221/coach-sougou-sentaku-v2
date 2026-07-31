import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { email, displayName, password } = await request.json();

  if (!email || !displayName || !password) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上必要です" }, { status: 400 });
  }

  if (!adminAuth || !adminDb) {
    return NextResponse.json({
      uid: "mock_teacher",
      email,
      displayName,
      role: "teacher",
    });
  }

  try {
    // 招待した管理者の塾を引き継ぐ。これが無いと講師が所属不明になり、
    // 組織で絞る一覧（/api/admin/teachers）から消える。
    const inviterOrgId = (await adminDb.doc(`users/${authResult.uid}`).get()).data()
      ?.organizationId as string | undefined;

    const userRecord = await adminAuth.createUser({ email, password, displayName });

    await adminDb.doc(`users/${userRecord.uid}`).set({
      email,
      displayName,
      role: "teacher",
      ...(inviterOrgId ? { organizationId: inviterOrgId } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      displayName,
      role: "teacher",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

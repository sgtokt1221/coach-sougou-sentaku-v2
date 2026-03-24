import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { code, email, password, displayName } = body as {
    code: string;
    email: string;
    password: string;
    displayName: string;
  };

  // Input validation
  if (!code || !/^[a-f0-9]{8}$/.test(code)) {
    return NextResponse.json({ error: "無効なコード形式です" }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "無効なメールアドレスです" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "パスワードは8文字以上で入力してください" }, { status: 400 });
  }
  if (!displayName || displayName.trim().length === 0) {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
  }

  if (!adminAuth || !adminDb) {
    // mock response
    return NextResponse.json({
      uid: "mock_invited_admin",
      email,
      displayName,
      role: "admin",
    });
  }

  // 1. Validate invitation code
  const invRef = adminDb.doc(`invitations/${code}`);
  const invDoc = await invRef.get();

  if (!invDoc.exists) {
    return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 400 });
  }

  const invData = invDoc.data()!;

  if (invData.status !== "pending") {
    return NextResponse.json({ error: "この招待コードは既に使用されています" }, { status: 400 });
  }

  const expiresAt = invData.expiresAt?.toDate?.() ?? new Date(0);
  if (expiresAt < new Date()) {
    return NextResponse.json({ error: "この招待コードは有効期限切れです" }, { status: 400 });
  }

  // 2. Create Firebase Auth user
  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });
    uid = userRecord.uid;
  } catch (err) {
    const message = err instanceof Error ? err.message : "ユーザー作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 3. Create Firestore profile + update invitation (with rollback on failure)
  try {
    await adminDb.doc(`users/${uid}`).set({
      email,
      displayName,
      role: invData.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await invRef.update({
      status: "used",
      usedBy: uid,
      usedAt: new Date(),
      usedEmail: email,
    });
  } catch (err) {
    // Rollback: delete the Auth user
    try {
      await adminAuth.deleteUser(uid);
    } catch {
      // best effort rollback
    }
    const message = err instanceof Error ? err.message : "プロフィール作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    uid,
    email,
    displayName,
    role: invData.role,
  });
}

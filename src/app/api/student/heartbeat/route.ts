import { NextRequest, NextResponse } from "next/server";

/**
 * users/{uid}.lastSeenAt を更新するライトウェイトなハートビート。
 * ログイン直後 + 定期的にクライアントから呼ばれる。
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      }
    } catch {}
  }
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) return NextResponse.json({ ok: false, reason: "no_db" });
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.doc(`users/${userId}`).set(
      { lastSeenAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[heartbeat] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

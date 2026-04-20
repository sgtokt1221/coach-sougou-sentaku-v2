import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = ["topicInput", "interviewDrill"] as const;
type ActivityLogType = typeof ALLOWED_TYPES[number];

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
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { type?: string; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONパース失敗" }, { status: 400 });
  }

  const type = body.type as ActivityLogType;
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "無効な type" }, { status: 400 });
  }

  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) return NextResponse.json({ ok: false, reason: "no_db" });
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.collection(`users/${userId}/activityLogs`).add({
      type,
      createdAt: FieldValue.serverTimestamp(),
      metadata: body.metadata ?? {},
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[activity-log] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

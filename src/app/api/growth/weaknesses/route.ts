import { NextRequest, NextResponse } from "next/server";
import { getRemindableWeaknesses } from "@/lib/growth/analyze";
import type { WeaknessRecord } from "@/lib/types/growth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let userId = searchParams.get("userId");
  const context = (searchParams.get("context") ?? "dashboard") as
    | "dashboard"
    | "essay_new"
    | "essay_result";

  // トークンからuserIdを取得
  if (!userId) {
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
    // dev mode fallback
    if (!userId && process.env.NODE_ENV === "development") {
      const devRole = request.headers.get("X-Dev-Role");
      if (devRole) userId = "dev-user";
    }
  }

  if (!userId) {
    return NextResponse.json({ weaknesses: [] });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ weaknesses: [] });
  }

  try {
    const snapshot = await adminDb.collection(`users/${userId}/weaknesses`).get();
    const weaknesses: WeaknessRecord[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        area: data.area,
        count: data.count,
        firstOccurred: data.firstOccurred?.toDate() ?? new Date(),
        lastOccurred: data.lastOccurred?.toDate() ?? new Date(),
        improving: data.improving ?? false,
        resolved: data.resolved ?? false,
        source: data.source ?? "essay",
        reminderDismissedAt: data.reminderDismissedAt?.toDate() ?? null,
      } satisfies WeaknessRecord;
    });

    const remindable = getRemindableWeaknesses(weaknesses, context);
    return NextResponse.json({ weaknesses: remindable });
  } catch (err) {
    console.warn("Failed to fetch weaknesses:", err);
    return NextResponse.json({ weaknesses: [] });
  }
}

export async function POST(request: NextRequest) {
  const body: { userId: string; area: string } = await request.json();
  const { userId, area } = body;

  if (!userId || !area) {
    return NextResponse.json({ error: "userId and area are required" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ success: false, reason: "Firebase not configured" });
  }

  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.doc(`users/${userId}/weaknesses/${area}`).update({
      reminderDismissedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Failed to update reminderDismissedAt:", err);
    return NextResponse.json({ success: false, reason: "Update failed" }, { status: 500 });
  }
}

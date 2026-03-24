import { NextRequest, NextResponse } from "next/server";
import { getRemindableWeaknesses } from "@/lib/growth/analyze";
import type { WeaknessRecord } from "@/lib/types/growth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const context = (searchParams.get("context") ?? "dashboard") as
    | "dashboard"
    | "essay_new"
    | "essay_result";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { db } = await import("@/lib/firebase/config");
  if (!db) {
    return NextResponse.json({ weaknesses: [] });
  }

  try {
    const { collection, getDocs } = await import("firebase/firestore");
    const snapshot = await getDocs(collection(db, "users", userId, "weaknesses"));
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

  const { db } = await import("@/lib/firebase/config");
  if (!db) {
    return NextResponse.json({ success: false, reason: "Firebase not configured" });
  }

  try {
    const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", userId, "weaknesses", area), {
      reminderDismissedAt: serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Failed to update reminderDismissedAt:", err);
    return NextResponse.json({ success: false, reason: "Update failed" }, { status: 500 });
  }
}

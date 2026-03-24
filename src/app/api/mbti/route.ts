import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return NextResponse.json({
          mbtiType: data.mbtiType ?? null,
          updatedAt: data.mbtiUpdatedAt ?? null,
        });
      }
    } catch {
      // fall through to mock
    }
  }

  return NextResponse.json({ mbtiType: null, updatedAt: null });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, mbtiType } = body;

  if (!userId || !mbtiType) {
    return NextResponse.json(
      { error: "userId and mbtiType are required" },
      { status: 400 }
    );
  }

  if (!/^[EI][SN][TF][JP]$/.test(mbtiType)) {
    return NextResponse.json(
      { error: "Invalid MBTI type format" },
      { status: 400 }
    );
  }

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { doc, updateDoc, serverTimestamp } = await import(
        "firebase/firestore"
      );
      await updateDoc(doc(db, "users", userId), {
        mbtiType,
        mbtiUpdatedAt: serverTimestamp(),
      });
      return NextResponse.json({ success: true, mbtiType });
    } catch {
      // fall through to mock response
    }
  }

  return NextResponse.json({ success: true, mbtiType });
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const docRef = doc(db, "universities", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
        }
      } catch {
        // fall through to mock data
      }
    }

    const university = MOCK_UNIVERSITIES.find((u) => u.id === id);
    if (!university) {
      return NextResponse.json({ error: "大学が見つかりません" }, { status: 404 });
    }
    return NextResponse.json(university);
  } catch (error) {
    console.error("Admin university GET error:", error);
    return NextResponse.json(
      { error: "大学データの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<University>;

    if (!body.name || !body.shortName) {
      return NextResponse.json(
        { error: "name と shortName は必須です" },
        { status: 400 }
      );
    }

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({ id, ...body });
    }

    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const docRef = doc(db, "universities", id);
    await setDoc(docRef, { ...body, updatedAt: serverTimestamp() }, { merge: true });

    return NextResponse.json({ id, ...body });
  } catch (error) {
    console.error("Admin university PUT error:", error);
    return NextResponse.json(
      { error: "大学データの更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

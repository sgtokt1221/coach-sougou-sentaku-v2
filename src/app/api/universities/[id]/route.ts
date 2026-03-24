import { NextRequest, NextResponse } from "next/server";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let university: University | null =
    MOCK_UNIVERSITIES.find((u) => u.id === id) ?? null;

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "universities", id));
      if (snap.exists()) {
        university = { id: snap.id, ...snap.data() } as University;
      }
    } catch {
      // fall through to mock data
    }
  }

  if (!university) {
    return NextResponse.json({ error: "University not found" }, { status: 404 });
  }

  return NextResponse.json(university);
}

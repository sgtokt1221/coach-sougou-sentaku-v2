import { NextRequest, NextResponse } from "next/server";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");

  let universities: University[] = MOCK_UNIVERSITIES;

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      const ref = collection(db, "universities");
      const q = group ? query(ref, where("group", "==", group)) : ref;
      const snap = await getDocs(q);
      if (!snap.empty) {
        universities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
      }
    } catch {
      // fall through to mock data
    }
  }

  if (group) {
    universities = universities.filter((u) => u.group === group);
  }

  return NextResponse.json({ universities });
}

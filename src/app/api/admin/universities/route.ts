import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let universities: University[] = MOCK_UNIVERSITIES;

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { collection, query, getDocs, orderBy } = await import(
          "firebase/firestore"
        );
        const universitiesQuery = query(
          collection(db, "universities"),
          orderBy("name", "asc")
        );
        const snapshot = await getDocs(universitiesQuery);
        if (!snapshot.empty) {
          universities = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<University, "id">),
          }));
        }
      } catch {
        // fall through to mock data
      }
    }

    if (search) {
      const q = search.toLowerCase();
      universities = universities.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.shortName.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ universities });
  } catch (error) {
    console.error("Admin universities list error:", error);
    return NextResponse.json(
      { error: "大学一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

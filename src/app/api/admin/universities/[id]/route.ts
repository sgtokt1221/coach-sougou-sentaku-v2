import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import { UniversitySchema } from "@/lib/types/university-schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    if (adminDb) {
      try {
        const docSnap = await adminDb.doc(`universities/${id}`).get();
        if (docSnap.exists) {
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
    const body = await request.json();

    const parsed = UniversitySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid university data",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    if (!data.name || !data.shortName) {
      return NextResponse.json(
        { error: "name と shortName は必須です" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json({ id, ...data });
    }

    const docRef = adminDb.doc(`universities/${id}`);
    await docRef.set({ ...data, updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ id, ...data });
  } catch (error) {
    console.error("Admin university PUT error:", error);
    return NextResponse.json(
      { error: "大学データの更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

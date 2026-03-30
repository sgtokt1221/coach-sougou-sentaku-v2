import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { ExamResult, ExamResultInput } from "@/lib/types/exam-result";

const MOCK_RESULTS: ExamResult[] = [
  {
    id: "er_001",
    userId: "mock_student_001",
    universityId: "univ_tokyo",
    universityName: "東京大学",
    facultyId: "law",
    facultyName: "法学部",
    status: "passed",
    examDate: "2026-02-25",
    resultDate: "2026-03-10",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-03-10"),
  },
  {
    id: "er_002",
    userId: "mock_student_001",
    universityId: "univ_kyoto",
    universityName: "京都大学",
    facultyId: "economics",
    facultyName: "経済学部",
    status: "applied",
    examDate: "2026-03-15",
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
  },
];

/**
 * GET /api/admin/students/[id]/exam-results
 * 指定生徒の全受験結果を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json(
        MOCK_RESULTS.map((r) => ({ ...r, userId: id }))
      );
    }

    const {
      doc,
      getDoc,
      collection,
      query,
      orderBy,
      getDocs,
    } = await import("firebase/firestore");

    // managedByスコーピング
    const userDoc = await getDoc(doc(db, "users", id));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const snap = await getDocs(
      query(
        collection(db, "users", id, "examResults"),
        orderBy("createdAt", "desc")
      )
    );

    const results: ExamResult[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: id,
        universityId: data.universityId ?? "",
        universityName: data.universityName ?? "",
        facultyId: data.facultyId ?? "",
        facultyName: data.facultyName ?? "",
        status: data.status ?? "applied",
        examDate: data.examDate ?? undefined,
        resultDate: data.resultDate ?? undefined,
        notes: data.notes ?? undefined,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Exam results GET error:", error);
    return NextResponse.json(
      { error: "受験結果の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/students/[id]/exam-results
 * 受験結果を新規追加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body: ExamResultInput = await request.json();

    // バリデーション
    if (!body.universityName || !body.facultyName || !body.status) {
      return NextResponse.json(
        { error: "大学名、学部名、ステータスは必須です" },
        { status: 400 }
      );
    }

    const validStatuses = ["applied", "passed", "failed", "withdrawn"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "無効なステータスです" },
        { status: 400 }
      );
    }

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      const newResult: ExamResult = {
        id: `er_${Date.now()}`,
        userId: id,
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return NextResponse.json(newResult, { status: 201 });
    }

    const { doc, getDoc, collection, addDoc, serverTimestamp } = await import(
      "firebase/firestore"
    );

    // managedByスコーピング
    const userDoc = await getDoc(doc(db, "users", id));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const docRef = await addDoc(collection(db, "users", id, "examResults"), {
      universityId: body.universityId,
      universityName: body.universityName,
      facultyId: body.facultyId,
      facultyName: body.facultyName,
      status: body.status,
      examDate: body.examDate ?? null,
      resultDate: body.resultDate ?? null,
      notes: body.notes ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newResult: ExamResult = {
      id: docRef.id,
      userId: id,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json(newResult, { status: 201 });
  } catch (error) {
    console.error("Exam results POST error:", error);
    return NextResponse.json(
      { error: "受験結果の追加中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

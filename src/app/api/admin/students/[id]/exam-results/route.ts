import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { ExamResult, ExamResultInput } from "@/lib/types/exam-result";

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

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // managedByスコーピング
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    if (role !== "superadmin" && userData?.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const snap = await adminDb
      .collection("users")
      .doc(id)
      .collection("examResults")
      .orderBy("createdAt", "desc")
      .get();

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

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // managedByスコーピング
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    if (role !== "superadmin" && userData?.managedBy !== effectiveUid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const docRef = await adminDb
      .collection("users")
      .doc(id)
      .collection("examResults")
      .add({
        universityId: body.universityId,
        universityName: body.universityName,
        facultyId: body.facultyId,
        facultyName: body.facultyName,
        status: body.status,
        examDate: body.examDate ?? null,
        resultDate: body.resultDate ?? null,
        notes: body.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
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

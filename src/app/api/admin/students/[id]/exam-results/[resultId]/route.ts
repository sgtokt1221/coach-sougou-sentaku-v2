import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { ExamResult, ExamResultInput } from "@/lib/types/exam-result";

/**
 * PUT /api/admin/students/[id]/exam-results/[resultId]
 * 受験結果を更新（ステータス変更等）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id, resultId } = await params;
    const body: Partial<ExamResultInput> = await request.json();

    if (body.status) {
      const validStatuses = ["applied", "passed", "failed", "withdrawn"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "無効なステータスです" },
          { status: 400 }
        );
      }
    }

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      const mockResult: ExamResult = {
        id: resultId,
        userId: id,
        universityId: body.universityId ?? "univ_tokyo",
        universityName: body.universityName ?? "東京大学",
        facultyId: body.facultyId ?? "law",
        facultyName: body.facultyName ?? "法学部",
        status: body.status ?? "applied",
        examDate: body.examDate,
        resultDate: body.resultDate,
        notes: body.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return NextResponse.json(mockResult);
    }

    const { doc, getDoc, updateDoc, serverTimestamp } = await import(
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

    const resultRef = doc(db, "users", id, "examResults", resultId);
    const resultDoc = await getDoc(resultRef);
    if (!resultDoc.exists()) {
      return NextResponse.json(
        { error: "受験結果が見つかりません" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (body.universityId !== undefined)
      updateData.universityId = body.universityId;
    if (body.universityName !== undefined)
      updateData.universityName = body.universityName;
    if (body.facultyId !== undefined) updateData.facultyId = body.facultyId;
    if (body.facultyName !== undefined)
      updateData.facultyName = body.facultyName;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.examDate !== undefined) updateData.examDate = body.examDate;
    if (body.resultDate !== undefined) updateData.resultDate = body.resultDate;
    if (body.notes !== undefined) updateData.notes = body.notes;

    await updateDoc(resultRef, updateData);

    const updated = await getDoc(resultRef);
    const data = updated.data()!;

    const result: ExamResult = {
      id: resultId,
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Exam result PUT error:", error);
    return NextResponse.json(
      { error: "受験結果の更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/students/[id]/exam-results/[resultId]
 * 受験結果を削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id, resultId } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({ success: true });
    }

    const { doc, getDoc, deleteDoc } = await import("firebase/firestore");

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

    const resultRef = doc(db, "users", id, "examResults", resultId);
    const resultDoc = await getDoc(resultRef);
    if (!resultDoc.exists()) {
      return NextResponse.json(
        { error: "受験結果が見つかりません" },
        { status: 404 }
      );
    }

    await deleteDoc(resultRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Exam result DELETE error:", error);
    return NextResponse.json(
      { error: "受験結果の削除中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

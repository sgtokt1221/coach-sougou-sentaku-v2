import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  recordAdmissionResults,
  validateAdmission,
  type AdmissionPayload,
} from "@/lib/api/admission-result";
import type { ExamResult } from "@/lib/types/exam-result";

/**
 * GET /api/student/exam-results
 * 自分の受験結果一覧（新しい順）。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snap = await adminDb
      .collection(`users/${uid}/examResults`)
      .orderBy("createdAt", "desc")
      .get();
    const results: ExamResult[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: uid,
        universityId: data.universityId ?? "",
        universityName: data.universityName ?? "",
        facultyId: data.facultyId ?? "",
        facultyName: data.facultyName ?? "",
        status: data.status ?? "applied",
        enrolled: data.enrolled === true,
        examDate: data.examDate ?? undefined,
        resultDate: data.resultDate ?? undefined,
        notes: data.notes ?? undefined,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
      };
    });
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[student/exam-results] GET error:", err);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/**
 * POST /api/student/exam-results
 * 自分の進路（進学先＋合格校 or 進学しない理由）を登録する。卒業生催促を停止。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const body = (await request.json()) as AdmissionPayload;
  const error = validateAdmission(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    await recordAdmissionResults(adminDb, uid, body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[student/exam-results] POST error:", err);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

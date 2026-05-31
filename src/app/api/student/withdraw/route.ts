import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  recordAdmissionResults,
  validateAdmission,
  type AdmissionPayload,
} from "@/lib/api/admission-result";

/**
 * POST /api/student/withdraw
 * 退会（論理削除）。合格大学（進学先 or 進学しない理由）の入力が必須。
 * 進路を examResults/profile に記録した上で role:"disabled" + withdrawnAt を設定する。
 * データは保持（高校→進学先 集計のため）。superadmin で復帰可能。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const body = (await request.json()) as AdmissionPayload;
  const error = validateAdmission(body);
  if (error) {
    return NextResponse.json(
      { error: `退会には合格大学の入力が必要です。${error}` },
      { status: 400 },
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    await recordAdmissionResults(adminDb, uid, body);
    await adminDb.doc(`users/${uid}`).set(
      {
        role: "disabled",
        withdrawnAt: new Date().toISOString(),
        updatedAt: new Date(),
      },
      { merge: true },
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[student/withdraw] error:", err);
    return NextResponse.json({ error: "退会処理に失敗しました" }, { status: 500 });
  }
}

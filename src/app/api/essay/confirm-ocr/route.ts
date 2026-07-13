import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { diffSpans } from "@/lib/ocr/text";

/**
 * OCR結果の確定を受け付ける。
 *
 * 認証済みユーザー（student/teacher/admin/superadmin）のみ許可し、
 * 書き込みは全て admin SDK に統一する。
 * - `essays/{essayId}`: 後方互換のため finalText(=ocrText) と status を merge 更新。
 * - `ocrRecords/{essayId}`: Task 9 で recordId=essayId として作成済みの前提。
 *   所有者（studentId === 認証uid）の場合のみ finalText と correctedSpans を記録し、
 *   他人のレコード改変を防ぐ。
 *
 * @param request essayId と ocrText を含む POST リクエスト
 * @returns 成功時 { success: true }、失敗時はエラーレスポンス
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["student", "teacher", "admin", "superadmin"]);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { essayId, ocrText } = body;
    if (!essayId || !ocrText) {
      return NextResponse.json({ error: "essayId と ocrText は必須です" }, { status: 400 });
    }

    // 既存 essays 更新（後方互換, クライアントSDK経路は廃し admin SDK に統一）
    if (adminDb) {
      const essayRef = adminDb.doc(`essays/${essayId}`);
      const essaySnap = await essayRef.get();
      // 所有者チェック（IDOR防止）: 本人 or 職員(teacher/admin/superadmin)のみ更新可
      const isStaff = ["teacher", "admin", "superadmin"].includes(auth.role);
      if (essaySnap.exists && essaySnap.data()?.userId !== auth.uid && !isStaff) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
      await essayRef.set(
        { ocrText, status: "ocr_confirmed", updatedAt: Timestamp.now() },
        { merge: true }
      );

      // ocrRecords 側: recordId=essayId で作られている前提。あれば correctedSpans を記録
      const recRef = adminDb.doc(`ocrRecords/${essayId}`);
      const rec = await recRef.get();
      if (rec.exists && rec.data()?.studentId === auth.uid) {
        const proposed = rec.data()?.proposedText ?? "";
        await recRef.set(
          { finalText: ocrText, correctedSpans: diffSpans(proposed, ocrText), status: "ocr_confirmed", updatedAt: Timestamp.now() },
          { merge: true }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OCR confirm error:", error);
    return NextResponse.json({ error: "OCR確認処理中にエラーが発生しました" }, { status: 500 });
  }
}

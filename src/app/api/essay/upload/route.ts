import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { serverQualityCheck } from "@/lib/ocr/quality";
import { detectTemplate } from "@/lib/ocr/detect";
import { normalizeByCorners, deskewByAngle } from "@/lib/ocr/geometry";
import { runOcr } from "@/lib/ocr/orchestrator";
import { saveOcrImages, upsertOcrRecord } from "@/lib/ocr/record";

/**
 * 補正後画像に既存の仕上げ前処理（グレースケール/シャープ/リサイズ）を適用。
 */
async function finishPreprocess(base64Data: string): Promise<string> {
  try {
    const out = await sharp(Buffer.from(base64Data, "base64"))
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.0 })
      .jpeg({ quality: 92 })
      .toBuffer();
    return out.toString("base64");
  } catch {
    return base64Data;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証: uid を信頼源にする（IDOR防止）
    const auth = await requireRole(request, ["student", "teacher", "admin", "superadmin"]);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { imageBase64, universityId, facultyId, essaySubmissionId, consent } = body;
    if (!imageBase64 || !universityId || !facultyId) {
      return NextResponse.json({ error: "imageBase64, universityId, facultyId は必須です" }, { status: 400 });
    }

    const studentId = auth.uid;
    // orgId をユーザードキュメントから解決
    let orgId = "";
    if (adminDb) {
      const userSnap = await adminDb.doc(`users/${studentId}`).get();
      orgId = userSnap.data()?.organizationId ?? "";
    }

    const essayId = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const original = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // 1. 権威的QCゲート（ハード閾値割れ → 撮り直し）
    const qc = await serverQualityCheck(original);
    if (!qc.passed) {
      return NextResponse.json({ error: `画像品質が不足しています: ${qc.reason}。撮り直してください`, qcReason: qc.reason }, { status: 422 });
    }

    // 同意有無: 非同意なら保存しない（メモリ内処理のみ）
    const consented = consent === true;

    // 2. 検出
    const template = await detectTemplate(original);

    // 3. 幾何補正（原稿用紙=四隅ワープ / 普通紙=回転 / 失敗=無補正）
    let corrected = original;
    if (template.kind === "genko" && template.corners) {
      corrected = (await normalizeByCorners(original, template.corners)) ?? original;
    } else if (template.skewAngle) {
      corrected = await deskewByAngle(original, template.skewAngle);
    }

    // 4. 仕上げ前処理
    const normalized = await finishPreprocess(corrected);

    // 5. OCR
    const { engines, proposedText } = await runOcr(normalized, template);
    if (!proposedText.trim()) {
      return NextResponse.json({ error: "画像からテキストを読み取れませんでした" }, { status: 422 });
    }

    // 6. 画像URL（後方互換: 従来は essays/{id}.jpg の signed URL を返す）
    let imageUrl = "";
    let images = { originalPath: "", normalizedPath: null as string | null };
    if (consented && adminDb) {
      const recordId = essayId;
      images = await saveOcrImages({ orgId, studentId, recordId, originalBase64: original, normalizedBase64: normalized });
      await upsertOcrRecord({
        orgId, studentId, essaySubmissionId: essaySubmissionId ?? null,
        qc, template, engines, proposedText, images, status: "ocr_proposed",
      });
      // 表示用 signed URL（原画像）
      try {
        const { getStorage } = await import("firebase-admin/storage");
        const [url] = await getStorage().bucket().file(images.originalPath).getSignedUrl({ action: "read", expires: "2030-01-01" });
        imageUrl = url;
      } catch { /* 表示URLは任意 */ }
    }

    return NextResponse.json({
      essayId,
      ocrText: proposedText,
      imageUrl,
      ocrWords: [],
      pageWidth: 0,
      pageHeight: 0,
    });
  } catch (error) {
    console.error("Essay upload error:", error);
    return NextResponse.json({ error: "アップロード処理中にエラーが発生しました" }, { status: 500 });
  }
}

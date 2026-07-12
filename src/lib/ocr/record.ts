import { adminDb } from "@/lib/firebase/admin";
import { getStorage } from "firebase-admin/storage";
import { Timestamp } from "firebase-admin/firestore";
import type { OcrRecord, OcrQuality, TemplateInfo, OcrEngineRecord } from "@/lib/types/ocr";

/** 現在の同意文言バージョン */
export const CONSENT_VERSION = "ocr-consent-v1";
/** 保持日数（既定365日） */
const RETENTION_DAYS = Number(process.env.OCR_RETENTION_DAYS ?? "365");

/**
 * 原画像/正規化画像を essayOcr 配下に保存し、パスを返す。
 * @returns { originalPath, normalizedPath }
 */
export async function saveOcrImages(opts: {
  orgId: string; studentId: string; recordId: string;
  originalBase64: string; normalizedBase64: string | null;
}): Promise<{ originalPath: string; normalizedPath: string | null }> {
  const bucket = getStorage().bucket();
  const dir = `essayOcr/${opts.orgId}/${opts.studentId}/${opts.recordId}`;
  const originalPath = `${dir}/original.jpg`;
  await bucket.file(originalPath).save(Buffer.from(opts.originalBase64, "base64"), { contentType: "image/jpeg" });
  let normalizedPath: string | null = null;
  if (opts.normalizedBase64) {
    normalizedPath = `${dir}/normalized.jpg`;
    await bucket.file(normalizedPath).save(Buffer.from(opts.normalizedBase64, "base64"), { contentType: "image/jpeg" });
  }
  return { originalPath, normalizedPath };
}

/**
 * ocrRecords を作成 or 更新（essaySubmissionId をキーに冪等）。
 * 同一提出の再アップロードは既存 record を上書きし増殖を防ぐ。
 * @returns 保存された recordId
 */
export async function upsertOcrRecord(opts: {
  orgId: string; studentId: string; essaySubmissionId: string | null;
  qc: OcrQuality; template: TemplateInfo; engines: OcrEngineRecord[];
  proposedText: string; images: { originalPath: string; normalizedPath: string | null };
  status: OcrRecord["status"];
}): Promise<string> {
  if (!adminDb) throw new Error("adminDb not configured");
  const col = adminDb.collection("ocrRecords");

  // 冪等: 既存を検索
  let ref = col.doc();
  if (opts.essaySubmissionId) {
    const existing = await col
      .where("essaySubmissionId", "==", opts.essaySubmissionId)
      .where("studentId", "==", opts.studentId)
      .limit(1)
      .get();
    if (!existing.empty) ref = existing.docs[0].ref;
  }

  const now = Timestamp.now();
  const retentionExpiresAt = Timestamp.fromMillis(now.toMillis() + RETENTION_DAYS * 86400_000);
  const data: Partial<OcrRecord> = {
    id: ref.id,
    orgId: opts.orgId,
    studentId: opts.studentId,
    essaySubmissionId: opts.essaySubmissionId,
    status: opts.status,
    consent: { version: CONSENT_VERSION, agreedAt: now },
    retentionExpiresAt,
    images: opts.images,
    qc: opts.qc,
    template: opts.template,
    engines: opts.engines,
    proposedText: opts.proposedText,
    finalText: null,
    correctedSpans: null,
    updatedAt: now,
  };
  // createdAt は新規時のみ
  await ref.set({ ...data, createdAt: now }, { merge: true });
  return ref.id;
}

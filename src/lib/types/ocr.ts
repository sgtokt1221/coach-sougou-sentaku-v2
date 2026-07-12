import type { Timestamp } from "firebase-admin/firestore";

/** 原稿用紙のマス1つの認識結果 */
export interface OcrCell {
  row: number;
  col: number;
  /** 認識文字。空マスは ""、判読不能は "■" */
  char: string;
  /** モデルが自信なしと申告したか（校正されていないため不一致検出用途） */
  uncertain: boolean;
  /** 代替候補（confidence用途、無ければ空配列） */
  alternatives: string[];
}

/** 用紙の種別 */
export type OcrTemplateKind = "genko" | "plain";
/** 用紙の向き */
export type OcrOrientation = "vertical" | "horizontal" | "unknown";

/** テンプレート＋向き＋四隅検出の結果 */
export interface TemplateInfo {
  kind: OcrTemplateKind;
  orientation: OcrOrientation;
  rows: number | null;
  cols: number | null;
  /** 四隅ピクセル座標 [左上,右上,右下,左下]（正規化前）。信頼できなければ null */
  corners: [number, number][] | null;
  /** 傾き角(度)。普通紙の回転deskew用。不明は null */
  skewAngle: number | null;
  /** 検出に失敗しフォールバックが発火したか */
  detectFailed: boolean;
}

/** 単一エンジンのOCR結果 */
export interface OcrEngineResult {
  text: string;
  cells?: OcrCell[];
  confidence: number | null;
  latencyMs: number;
  costUsd: number | null;
  error?: string;
}

/** エンジンID */
export type OcrEngineId = "claude-grid" | "gcv" | "claude-plain";

/** 差し替え可能なOCRエンジンIF */
export interface OcrEngine {
  id: OcrEngineId;
  model: string;
  promptVersion: string;
  run(input: { base64: string; template: TemplateInfo }): Promise<OcrEngineResult>;
}

/** Firestore に保存する1レコード分（engines は結果＋メタ） */
export interface OcrEngineRecord extends OcrEngineResult {
  engineId: OcrEngineId;
  model: string;
  promptVersion: string;
}

/** QCゲート結果 */
export interface OcrQuality {
  sharpness: number;
  brightness: number;
  width: number;
  height: number;
  passed: boolean;
  reason?: string;
}

/** 生徒が直した箇所 */
export interface OcrCorrectedSpan {
  index: number;
  from: string;
  to: string;
}

/** ocrRecords/{recordId} のドキュメント */
export interface OcrRecord {
  id: string;
  orgId: string;
  studentId: string;
  essaySubmissionId: string | null;
  status: "received" | "rejected_quality" | "ocr_proposed" | "ocr_confirmed";
  consent: { version: string; agreedAt: Timestamp };
  retentionExpiresAt: Timestamp;
  images: { originalPath: string; normalizedPath: string | null };
  qc: OcrQuality;
  template: TemplateInfo;
  engines: OcrEngineRecord[];
  proposedText: string;
  finalText: string | null;
  correctedSpans: OcrCorrectedSpan[] | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

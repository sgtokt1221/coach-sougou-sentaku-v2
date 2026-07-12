import sharp from "sharp";
import type { OcrQuality } from "@/lib/types/ocr";

/** QC 暫定閾値（較正前）。評価セットで見直す。 */
export const QC_THRESHOLDS = {
  minShortSide: 800,
  minBrightness: 30,
  maxBrightness: 240,
  minSharpness: 50, // ブラウザ閾値(100)の半分
};

/**
 * ラプラシアン畳み込み後の分散を鮮鋭度指標として算出し、輝度・解像度と併せて品質判定する。
 * ハード閾値割れは passed=false（呼び出し側で 422 撮り直し）。
 * @param inputBase64 入力画像base64
 * @returns QC結果
 */
export async function serverQualityCheck(inputBase64: string): Promise<OcrQuality> {
  const input = Buffer.from(inputBase64, "base64");
  const base = sharp(input).rotate().grayscale();
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // 輝度: グレースケール平均
  const stats = await sharp(input).rotate().grayscale().stats();
  const brightness = stats.channels[0]?.mean ?? 0;

  // 鮮鋭度: ラプラシアン畳み込み → stdev^2
  const lap = await sharp(input)
    .rotate()
    .grayscale()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .stats();
  const sharpness = Math.pow(lap.channels[0]?.stdev ?? 0, 2);

  const shortSide = Math.min(width, height);
  let reason: string | undefined;
  if (shortSide < QC_THRESHOLDS.minShortSide) reason = "解像度が低すぎます";
  else if (brightness < QC_THRESHOLDS.minBrightness) reason = "画像が暗すぎます";
  else if (brightness > QC_THRESHOLDS.maxBrightness) reason = "白飛びしています";
  else if (sharpness < QC_THRESHOLDS.minSharpness) reason = "ピントがぼけています";

  return { sharpness, brightness, width, height, passed: !reason, reason };
}

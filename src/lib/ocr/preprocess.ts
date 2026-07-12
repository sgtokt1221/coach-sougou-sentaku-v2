import sharp from "sharp";

/**
 * 幾何補正後の仕上げ前処理（EXIF回転/2000px以内リサイズ/グレースケール/正規化/シャープ/JPEG再エンコード）。
 * 失敗時は入力base64をそのまま返す（縮退）。
 * @param base64Data 入力画像base64
 * @returns 前処理後base64
 */
export async function finishPreprocess(base64Data: string): Promise<string> {
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

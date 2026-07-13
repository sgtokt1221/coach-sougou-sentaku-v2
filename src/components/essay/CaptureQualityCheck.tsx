"use client";

/** ブラウザ内QCの暫定閾値（較正前） */
export const CLIENT_QC = { minBlurVar: 100, minBrightness: 40, maxBrightness: 230, minShortSide: 1000 };

export interface ClientQcResult {
  ok: boolean;
  reason?: string;
  blurVar: number;
  brightness: number;
  width: number;
  height: number;
}

/**
 * DataURL画像をcanvasに描画し、ブレ(Laplacian分散)/明るさ/解像度を判定する。
 * @param dataUrl 画像DataURL
 * @returns QC結果（ok=false時 reason入り）
 */
export async function checkImageQuality(dataUrl: string): Promise<ClientQcResult> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, 800 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // グレースケール配列
  const gray = new Float64Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g; sum += g;
  }
  const brightness = sum / (w * h);

  // ラプラシアン分散
  let lapSum = 0, lapSqSum = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
      lapSum += lap; lapSqSum += lap * lap; cnt++;
    }
  }
  const mean = lapSum / cnt;
  const blurVar = lapSqSum / cnt - mean * mean;

  const shortSide = Math.min(img.width, img.height);
  let reason: string | undefined;
  if (shortSide < CLIENT_QC.minShortSide) reason = "解像度が低いです。もっと大きく写してください";
  else if (brightness < CLIENT_QC.minBrightness) reason = "暗いです。明るい場所で撮り直してください";
  else if (brightness > CLIENT_QC.maxBrightness) reason = "白飛びしています。照明を調整してください";
  else if (blurVar < CLIENT_QC.minBlurVar) reason = "ピントがぼけています。撮り直してください";

  return { ok: !reason, reason, blurVar, brightness, width: img.width, height: img.height };
}

/**
 * DataURL/URLから画像を読み込む。
 * @param src 画像ソース
 * @returns 読み込み完了したHTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

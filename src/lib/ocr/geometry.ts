import sharp from "sharp";

/** 3x3 ホモグラフィ行列（行優先9要素） */
export type Homography = number[];

/**
 * 8x8 線形方程式をガウス消去で解く（部分ピボット選択）。
 * @param A 8x8 係数行列（行優先の配列の配列）
 * @param b 右辺 長さ8
 * @returns 解 長さ8。特異なら null
 */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-9) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * 4点対応 (src->dst) からホモグラフィ行列 H を計算する（h33=1固定）。
 * @param src 元画像の4点 [[x,y]*4]
 * @param dst 出力の4点 [[x,y]*4]（通常は矩形の四隅）
 * @returns 3x3 行優先の H。特異なら null
 */
export function computeHomography(
  src: [number, number][],
  dst: [number, number][]
): Homography | null {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solveLinear(A, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/**
 * 逆写像用に H の逆行列を求める（出力座標→入力座標）。
 * @param H 3x3 行優先
 * @returns 逆行列 3x3 行優先。特異なら null
 */
function invert3x3(H: Homography): Homography | null {
  const [a, b, c, d, e, f, g, h, i] = H;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = [
    e * i - f * h, c * h - b * i, b * f - c * e,
    f * g - d * i, a * i - c * g, c * d - a * f,
    d * h - e * g, b * g - a * h, a * e - b * d,
  ].map((v) => v / det);
  return inv;
}

/**
 * グレースケール raw バッファを、四隅→正対矩形へ透視ワープする（逆写像＋バイリニア）。
 * @param gray 入力グレースケール画素（1ch, 長さ=w*h）
 * @param w 入力幅
 * @param h 入力高さ
 * @param corners 入力の四隅 [左上,右上,右下,左下]
 * @param outW 出力幅
 * @param outH 出力高さ
 * @returns 出力グレースケール画素（1ch, 長さ=outW*outH）。失敗時は null
 */
export function warpToRect(
  gray: Uint8Array,
  w: number,
  h: number,
  corners: [number, number][],
  outW: number,
  outH: number
): Uint8Array | null {
  const dst: [number, number][] = [
    [0, 0], [outW - 1, 0], [outW - 1, outH - 1], [0, outH - 1],
  ];
  const H = computeHomography(corners, dst);
  if (!H) return null;
  const Hinv = invert3x3(H);
  if (!Hinv) return null;
  const out = new Uint8Array(outW * outH);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const denom = Hinv[6] * x + Hinv[7] * y + Hinv[8];
      const sx = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / denom;
      const sy = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / denom;
      let val = 255; // 範囲外は白
      if (sx >= 0 && sx < w - 1 && sy >= 0 && sy < h - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const fx = sx - x0;
        const fy = sy - y0;
        const p00 = gray[y0 * w + x0];
        const p10 = gray[y0 * w + x0 + 1];
        const p01 = gray[(y0 + 1) * w + x0];
        const p11 = gray[(y0 + 1) * w + x0 + 1];
        val =
          p00 * (1 - fx) * (1 - fy) +
          p10 * fx * (1 - fy) +
          p01 * (1 - fx) * fy +
          p11 * fx * fy;
      }
      out[y * outW + x] = Math.round(val);
    }
  }
  return out;
}

/**
 * 原稿用紙: 四隅から正対化した JPEG(グレースケール) を返す。四隅が無効なら null。
 * @param inputBase64 入力画像base64
 * @param corners 四隅
 * @returns 正対化後のbase64。失敗時 null（呼び出し側で回転deskewや無補正へフォールバック）
 */
export async function normalizeByCorners(
  inputBase64: string,
  corners: [number, number][]
): Promise<string | null> {
  try {
    const input = Buffer.from(inputBase64, "base64");
    const gsImage = sharp(input).rotate().grayscale();
    const { data, info } = await gsImage.raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    // 出力サイズは四隅の外接矩形の辺長から推定（上下辺・左右辺の平均）
    const dist = (a: [number, number], b: [number, number]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1]);
    const outW = Math.round((dist(corners[0], corners[1]) + dist(corners[3], corners[2])) / 2);
    const outH = Math.round((dist(corners[0], corners[3]) + dist(corners[1], corners[2])) / 2);
    if (outW < 100 || outH < 100 || outW > 5000 || outH > 5000) return null;
    const warped = warpToRect(new Uint8Array(data), w, h, corners, outW, outH);
    if (!warped) return null;
    const jpeg = await sharp(Buffer.from(warped), { raw: { width: outW, height: outH, channels: 1 } })
      .jpeg({ quality: 92 })
      .toBuffer();
    return jpeg.toString("base64");
  } catch (err) {
    console.warn("[geometry] normalizeByCorners failed:", err);
    return null;
  }
}

/**
 * 普通紙: skewAngle(度) で回転して傾きを補正した base64 を返す。
 * @param inputBase64 入力base64
 * @param skewAngle 度（時計回り正）。0や不明時はそのまま返す
 * @returns 回転後base64（失敗時は入力をそのまま）
 */
export async function deskewByAngle(inputBase64: string, skewAngle: number): Promise<string> {
  if (!skewAngle || Math.abs(skewAngle) < 0.5) return inputBase64;
  try {
    const input = Buffer.from(inputBase64, "base64");
    const out = await sharp(input)
      .rotate(-skewAngle, { background: "#ffffff" })
      .jpeg({ quality: 92 })
      .toBuffer();
    return out.toString("base64");
  } catch (err) {
    console.warn("[geometry] deskewByAngle failed:", err);
    return inputBase64;
  }
}

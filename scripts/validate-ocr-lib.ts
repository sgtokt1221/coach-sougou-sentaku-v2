import assert from "node:assert/strict";
import sharp from "sharp";
import {
  levenshtein,
  characterErrorRate,
  flattenCells,
  diffSpans,
} from "@/lib/ocr/text";
import { computeHomography, warpToRect } from "@/lib/ocr/geometry";
import { serverQualityCheck } from "@/lib/ocr/quality";
import type { OcrCell } from "@/lib/types/ocr";

function testText() {
  assert.equal(levenshtein("kitten", "sitting"), 3);
  assert.equal(levenshtein("", "abc"), 3);
  assert.equal(levenshtein("同じ", "同じ"), 0);

  assert.equal(characterErrorRate("あいう", "あいう"), 0);
  assert.equal(characterErrorRate("あいう", "あいえ"), 1 / 3);
  assert.equal(characterErrorRate("", ""), 0);

  // 縦書き: 右列(col=1)が先、その中で上(row=0)から
  const v: OcrCell[] = [
    { row: 0, col: 0, char: "C", uncertain: false, alternatives: [] },
    { row: 1, col: 1, char: "B", uncertain: false, alternatives: [] },
    { row: 0, col: 1, char: "A", uncertain: false, alternatives: [] },
    { row: 1, col: 0, char: "D", uncertain: false, alternatives: [] },
  ];
  assert.equal(flattenCells(v, "vertical"), "ABCD");
  // 横書き: 上行から左→右（row昇順→col昇順）。row0=C(col0),A(col1) row1=D(col0),B(col1）
  assert.equal(flattenCells(v, "horizontal"), "CADB");
  // 空セルはスキップ... ではなく "" を連結（"" は join で消えるので実質スキップ相当）
  const withBlank: OcrCell[] = [
    { row: 0, col: 0, char: "X", uncertain: false, alternatives: [] },
    { row: 0, col: 1, char: "", uncertain: false, alternatives: [] },
    { row: 0, col: 2, char: "Y", uncertain: false, alternatives: [] },
  ];
  assert.equal(flattenCells(withBlank, "horizontal"), "XY");

  const spans = diffSpans("あいう", "あいえ");
  assert.deepEqual(spans, [{ index: 2, from: "う", to: "え" }]);
  assert.equal(diffSpans("同じ", "同じ").length, 0);

  console.log("[validate-ocr-lib] text: OK");
}

function testGeometry() {
  // 恒等: src==dst なら H は単位行列に比例（h[0]≈h[4]≈1, オフ対角≈0）
  const unit = computeHomography(
    [[0, 0], [10, 0], [10, 10], [0, 10]],
    [[0, 0], [10, 0], [10, 10], [0, 10]]
  );
  assert.ok(unit, "homography should solve");
  if (!unit) return;
  assert.ok(Math.abs(unit[0] - 1) < 1e-6 && Math.abs(unit[4] - 1) < 1e-6);
  assert.ok(Math.abs(unit[1]) < 1e-6 && Math.abs(unit[3]) < 1e-6);

  // 恒等ワープ: 縦グラデーション画像を同サイズへ正対化 → ほぼ不変
  const w = 8, h = 8;
  const gray = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) gray[y * w + x] = y * 30;
  const out = warpToRect(gray, w, h, [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], w, h);
  assert.ok(out, "warp should produce output");
  if (!out) return;
  // 中央付近の値が入力とほぼ一致
  assert.ok(Math.abs(out[3 * w + 3] - gray[3 * w + 3]) <= 1);

  console.log("[validate-ocr-lib] geometry: OK");
}

async function testQuality() {
  // 真っ黒画像 → 暗すぎで不合格
  const black = (await sharp({ create: { width: 1000, height: 1200, channels: 3, background: "#000000" } }).jpeg().toBuffer()).toString("base64");
  const q1 = await serverQualityCheck(black);
  assert.equal(q1.passed, false);
  assert.equal(q1.reason, "画像が暗すぎます");

  // 小さすぎ画像 → 解像度で不合格
  const small = (await sharp({ create: { width: 300, height: 300, channels: 3, background: "#808080" } }).jpeg().toBuffer()).toString("base64");
  const q2 = await serverQualityCheck(small);
  assert.equal(q2.passed, false);
  assert.equal(q2.reason, "解像度が低すぎます");

  console.log("[validate-ocr-lib] quality: OK");
}

async function main() {
  testText();
  testGeometry();
  await testQuality();
}

main();

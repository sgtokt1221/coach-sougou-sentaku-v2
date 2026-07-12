import assert from "node:assert/strict";
import {
  levenshtein,
  characterErrorRate,
  flattenCells,
  diffSpans,
} from "@/lib/ocr/text";
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

testText();

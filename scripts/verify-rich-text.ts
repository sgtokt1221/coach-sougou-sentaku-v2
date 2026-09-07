import assert from "node:assert/strict";
import {
  parseRichText,
  stripRichText,
  wrapRichText,
} from "@/lib/chat/rich-text";

// 装飾なし
assert.deepEqual(parseRichText("ふつうの文"), [{ text: "ふつうの文" }]);

// 部分的に色
const a = parseRichText("ここは[[c=red]]大事[[/]]です");
assert.equal(a.length, 3);
assert.equal(a[0].text, "ここは");
assert.equal(a[1].text, "大事");
assert.equal(a[1].color, "red");
assert.equal(a[2].text, "です");

// 色と大きさの併用
const b = parseRichText("[[c=blue;s=xl]]見出し[[/]]");
assert.equal(b[0].color, "blue");
assert.equal(b[0].size, "xl");

// 未知の値は無視して素の文字として描く（記法は残さない）
const c = parseRichText("[[c=неизвестный;s=huge]]文字[[/]]");
assert.equal(c[0].text, "文字");
assert.equal(c[0].color, undefined);
assert.equal(c[0].size, undefined);

// プレビュー用に記法を外す
assert.equal(stripRichText("ここは[[c=red]]大事[[/]]です"), "ここは大事です");
assert.equal(stripRichText("装飾なし"), "装飾なし");

// 選択範囲を囲む
assert.equal(
  wrapRichText("ここは大事です", 3, 5, { color: "red" }),
  "ここは[[c=red]]大事[[/]]です"
);
// 何も指定しなければ変えない
assert.equal(wrapRichText("あいう", 0, 2, {}), "あいう");
// 空の選択は変えない
assert.equal(wrapRichText("あいう", 1, 1, { color: "red" }), "あいう");

// 記法を含む文をそのまま送っても、描く側が知らない属性は落ちるだけで
// 任意のスタイルは入らない
const d = parseRichText("[[onclick=alert(1)]]悪意[[/]]");
assert.equal(d[0].color, undefined);
assert.equal(d[0].size, undefined);

console.log("[verify-rich-text] OK");

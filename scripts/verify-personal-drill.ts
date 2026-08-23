import assert from "node:assert";
import {
  correctionKey,
  pickPersonalItems,
  type RawCorrection,
} from "../src/lib/sentence-drill/personal";

const base: RawCorrection[] = [
  {
    original: "この制度はとても良いと思います。",
    suggestion: "この制度は有効である。",
    type: "expression",
    reason: "話し言葉",
    essayId: "e1",
    submittedAt: 3,
  },
  {
    original: "利用することができる。",
    suggestion: "利用できる。",
    type: "redundancy",
    reason: "冗長",
    essayId: "e1",
    submittedAt: 3,
  },
  {
    original: "私の夢は医師になりたい。",
    suggestion: "私の夢は医師になることである。",
    type: "grammar",
    reason: "主述",
    essayId: "e2",
    submittedAt: 2,
  },
  {
    original: "しかし、また、さらに。",
    suggestion: "さらに。",
    type: "connector",
    reason: "接続過多",
    essayId: "e2",
    submittedAt: 2,
  },
];

// キーは元の文から決まる（同じ文は同じキー）
assert.equal(
  correctionKey(base[0]),
  correctionKey({ ...base[0], essayId: "other" })
);
assert.notEqual(correctionKey(base[0]), correctionKey(base[1]));

// 新しい答案のものから順に、指定件数だけ取る
const picked = pickPersonalItems(base, new Set(), 3);
assert.equal(picked.length, 3);
assert.equal(picked[0].original, base[0].original, "新しい順になっていない");

// 出題済みは除く
const used = new Set([correctionKey(base[0]), correctionKey(base[1])]);
assert.deepEqual(
  pickPersonalItems(base, used, 3).map((i) => i.original),
  [base[2].original, base[3].original]
);

// typo（誤字）は書き直し練習に向かないので除く
const withTypo: RawCorrection[] = [
  {
    original: "貴学を志望しす。",
    suggestion: "貴学を志望します。",
    type: "typo",
    reason: "脱字",
    essayId: "e3",
    submittedAt: 9,
  },
  ...base,
];
assert.ok(
  pickPersonalItems(withTypo, new Set(), 4).every((i) => i.type !== "typo"),
  "typo を除いていない"
);

// 同じ文が複数の答案に出ても1回だけ
const dup = [...base, { ...base[0], essayId: "e9", submittedAt: 9 }];
const keys = pickPersonalItems(dup, new Set(), 10).map(correctionKey);
assert.equal(new Set(keys).size, keys.length, "重複を除いていない");

// 素材が足りなければ空を返す（呼び出し側でラウンドごと省く）
assert.deepEqual(pickPersonalItems([], new Set(), 3), []);

console.log("personal drill OK");

# 手書き答案OCR 精度改善 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手書き答案OCRに「撮影QC＋幾何補正」「修正データ・画像の同意付き保存」「CER評価CLI」を追加し、精度を測定可能な形で改善する。

**Architecture:** 純ロジック層（`src/lib/ocr/`）に QC・幾何補正・エンジンIF・オーケストレータ・永続化を切り出し、`essay/upload/route.ts` と `essay/confirm-ocr/route.ts` がそれを束ねる。台形補正は依存追加ゼロの自前ホモグラフィ（純JS）。原稿用紙は Claude構造化OCR＋GCV併走、失敗時は現行の平文経路へ安全に縮退。評価CLIは本番と同じロジック層をオフラインで回す。

**Tech Stack:** Next.js 16 App Router / TypeScript / sharp 0.34 / `@anthropic-ai/sdk` / Google Cloud Vision(REST+JWT) / firebase-admin / tsx（検証スクリプト）

**設計書:** `docs/superpowers/specs/2026-07-12-ocr-accuracy-design.md`

**前提（コードベース確認済み）:**
- `essay/upload/route.ts` はクライアントから `authFetch` 経由で呼ばれる（`src/app/student/essay/new/page.tsx:562,597`）。**Firebaseトークンは request に載っているが現状未使用**。→ `requireRole` を追加すれば信頼できる uid が取れる（クライアント改修不要）。
- 既存OCR: sharp前処理 → GCV(REST/JWT, creds=`FIREBASE_ADMIN_CLIENT_EMAIL`/`FIREBASE_ADMIN_PRIVATE_KEY`) → Claude Haiku本文抽出 → `detectTemplate`(Haiku YES/NO) → Claude `claude-sonnet-4-6` マス目OCR。画像は admin SDK で `essays/{essayId}.jpg` に保存。
- 認証ヘルパー: `requireRole(request, roles)` / `scopeByOrganization({...})`（`src/lib/api/auth.ts`）、`verifyAuthToken` / `adminDb`（`src/lib/firebase/admin.ts`）。
- テストランナーなし。検証は `tsx scripts/*.ts`＋`npx tsc --noEmit`＋`npx eslint`。
- `firestore.indexes.json` / `storage.rules` は既存。Storage は admin SDK 書き込み（ルール非依存）、ルールはクライアント read 用。

**命名・規約:** JSDocコメント必須（CLAUDE.md）。絵文字禁止。既存スタイルに合わせる。触るのは必要な箇所だけ。

---

## File Structure

| ファイル | 責務 | 種別 |
|----------|------|------|
| `src/lib/types/ocr.ts` | `OcrRecord`/`OcrCell`/`TemplateInfo`/`OcrEngineResult`/`OcrEngine` 型 | 新規 |
| `src/lib/ocr/text.ts` | levenshtein / CER / セル→本文 / 差分spans | 新規 |
| `src/lib/ocr/geometry.ts` | ホモグラフィ解＋透視ワープ＋回転deskew | 新規 |
| `src/lib/ocr/quality.ts` | サーバ権威的QC（鮮鋭度/輝度/解像度） | 新規 |
| `src/lib/ocr/detect.ts` | テンプレート＋向き＋四隅検出（Haiku JSON） | 新規 |
| `src/lib/ocr/engines/gcv.ts` | Google Cloud Vision エンジン（現行から抽出） | 新規 |
| `src/lib/ocr/engines/claude-grid.ts` | 原稿用紙 構造化OCR エンジン | 新規 |
| `src/lib/ocr/engines/claude-plain.ts` | 普通紙 抽出エンジン（現行 extractEssayBody 相当） | 新規 |
| `src/lib/ocr/orchestrator.ts` | primary/secondary併走・engines[]構築・proposedText | 新規 |
| `src/lib/ocr/record.ts` | Storage保存＋ocrRecords作成/更新＋保持期限 | 新規 |
| `src/app/api/essay/upload/route.ts` | 上記を束ねる（QC→検出→幾何補正→前処理→OCR→保存） | 変更 |
| `src/app/api/essay/confirm-ocr/route.ts` | finalText/correctedSpans算出・保存 | 変更 |
| `src/components/essay/CaptureQualityCheck.tsx` | ブラウザ内QC | 新規 |
| `src/app/student/essay/new/page.tsx` | QCコンポーネント配線 | 変更 |
| `scripts/eval-ocr.ts` | 評価CLI（CER等） | 新規 |
| `scripts/validate-ocr-lib.ts` | 純ロジック層の検証（CI/手動） | 新規 |
| `firestore.indexes.json` | `ocrRecords` 複合インデックス | 変更 |
| `storage.rules` | `essayOcr/**` read ルール | 変更 |
| `.gitignore` | `evalset/` 除外 | 変更 |

**進め方:** 純ロジック（Task 1–4）を先に確定し tsx で単体検証 → 検出/エンジン/オーケストレータ（5–7）→ 永続化（8）→ ルート結線（9–10）→ クライアントQC（11）→ 設定（12）→ 評価CLI（13）。各タスクは独立にコミット可能。

---

## Task 1: OCR型定義

**Files:**
- Create: `src/lib/types/ocr.ts`

- [ ] **Step 1: 型を定義**

```ts
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
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS（`firebase-admin/firestore` の `Timestamp` 型が解決）

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/ocr.ts
git commit -m "feat(ocr): add OCR pipeline type definitions"
```

---

## Task 2: テキストユーティリティ（CER・セル→本文・差分）

**Files:**
- Create: `src/lib/ocr/text.ts`
- Create: `scripts/validate-ocr-lib.ts`（本タスクで新規、以降のタスクで追記）

- [ ] **Step 1: 実装を書く**

```ts
import type { OcrCell, OcrOrientation, OcrCorrectedSpan } from "@/lib/types/ocr";

/**
 * レーベンシュタイン距離（挿入/削除/置換=各1）。
 * @param a 文字列A
 * @param b 文字列B
 * @returns 編集距離
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * CER（文字誤り率）= 編集距離 / 正解長。正解が空なら候補長>0 で 1、共に空で 0。
 * @param truth 正解テキスト
 * @param hyp 認識テキスト
 * @returns 0以上の実数
 */
export function characterErrorRate(truth: string, hyp: string): number {
  if (truth.length === 0) return hyp.length === 0 ? 0 : 1;
  return levenshtein(truth, hyp) / truth.length;
}

/**
 * 構造化セルを向き別の読み順で本文へ平文化する。
 * 縦書き: 列(大→小=右→左)優先、列内は行(小→大=上→下)。
 * 横書き: 行(小→大)優先、行内は列(小→大)。
 * 空セル("")はスキップ。判読不能("■")はそのまま残す。
 * @param cells マスの配列
 * @param orientation 用紙の向き
 * @returns 本文テキスト
 */
export function flattenCells(cells: OcrCell[], orientation: OcrOrientation): string {
  const sorted = [...cells].sort((p, q) => {
    if (orientation === "vertical") {
      if (q.col !== p.col) return q.col - p.col; // 右→左
      return p.row - q.row; // 上→下
    }
    // horizontal / unknown は横書き扱い
    if (p.row !== q.row) return p.row - q.row;
    return p.col - q.col;
  });
  return sorted.map((c) => c.char).join("");
}

/**
 * proposed と final を文字単位で比較し、置換された箇所を span 列で返す。
 * 位置ずれ（挿入/削除）は同一 index の from/to 差として近似記録する（評価用の粗い差分）。
 * @param proposed 提示テキスト
 * @param finalText 生徒確定テキスト
 * @returns 変更 span 配列
 */
export function diffSpans(proposed: string, finalText: string): OcrCorrectedSpan[] {
  const spans: OcrCorrectedSpan[] = [];
  const len = Math.max(proposed.length, finalText.length);
  for (let i = 0; i < len; i++) {
    const from = proposed[i] ?? "";
    const to = finalText[i] ?? "";
    if (from !== to) spans.push({ index: i, from, to });
  }
  return spans;
}
```

- [ ] **Step 2: 検証スクリプトを書く**

`scripts/validate-ocr-lib.ts`（新規。assert失敗で `process.exit(1)`）:

```ts
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
  // 横書き: 上行から左→右
  assert.equal(flattenCells(v, "horizontal"), "ACBD");
  // 空セルはスキップ
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
```

- [ ] **Step 3: 検証を実行**

Run: `npx tsx scripts/validate-ocr-lib.ts`
Expected: `[validate-ocr-lib] text: OK`（tsx が `@/` エイリアスを解決できない場合は `tsconfig-paths` 併用: `npx tsx -r tsconfig-paths/register scripts/validate-ocr-lib.ts`。既存 validate スクリプトが `@/` を使っていれば同方式に合わせる）

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocr/text.ts scripts/validate-ocr-lib.ts
git commit -m "feat(ocr): add CER/flatten/diff text utilities with validation"
```

---

## Task 3: 幾何補正（ホモグラフィ＋透視ワープ＋回転deskew）

**Files:**
- Create: `src/lib/ocr/geometry.ts`
- Modify: `scripts/validate-ocr-lib.ts`（幾何検証を追記）

- [ ] **Step 1: 実装を書く**

```ts
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
```

- [ ] **Step 2: 幾何検証を追記**

`scripts/validate-ocr-lib.ts` に追記（`testText()` の後、末尾の呼び出し前）:

```ts
import { computeHomography, warpToRect } from "@/lib/ocr/geometry";

function testGeometry() {
  // 恒等: src==dst なら H は単位行列に比例（h[0]≈h[4]≈1, オフ対角≈0）
  const unit = computeHomography(
    [[0, 0], [10, 0], [10, 10], [0, 10]],
    [[0, 0], [10, 0], [10, 10], [0, 10]]
  );
  assert.ok(unit, "homography should solve");
  assert.ok(Math.abs(unit![0] - 1) < 1e-6 && Math.abs(unit![4] - 1) < 1e-6);
  assert.ok(Math.abs(unit![1]) < 1e-6 && Math.abs(unit![3]) < 1e-6);

  // 恒等ワープ: 縦グラデーション画像を同サイズへ正対化 → ほぼ不変
  const w = 8, h = 8;
  const gray = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) gray[y * w + x] = y * 30;
  const out = warpToRect(gray, w, h, [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], w, h);
  assert.ok(out, "warp should produce output");
  // 中央付近の値が入力とほぼ一致
  assert.ok(Math.abs(out![3 * w + 3] - gray[3 * w + 3]) <= 1);

  console.log("[validate-ocr-lib] geometry: OK");
}

testGeometry();
```

（`import` はファイル冒頭にまとめる。`testText()` と `testGeometry()` を両方呼ぶ）

- [ ] **Step 3: 検証を実行**

Run: `npx tsx scripts/validate-ocr-lib.ts`
Expected: `text: OK` と `geometry: OK` の両方

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocr/geometry.ts scripts/validate-ocr-lib.ts
git commit -m "feat(ocr): add homography warp and rotation deskew with validation"
```

---

## Task 4: サーバ権威的QCゲート

**Files:**
- Create: `src/lib/ocr/quality.ts`
- Modify: `scripts/validate-ocr-lib.ts`

- [ ] **Step 1: 実装を書く**

```ts
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
```

- [ ] **Step 2: 検証を追記**

`scripts/validate-ocr-lib.ts` に非同期テストを追記（トップレベル `await` は tsx で可）:

```ts
import sharp from "sharp";
import { serverQualityCheck } from "@/lib/ocr/quality";

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

await testQuality();
```

- [ ] **Step 3: 検証を実行**

Run: `npx tsx scripts/validate-ocr-lib.ts`
Expected: `quality: OK` を含む全OK

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocr/quality.ts scripts/validate-ocr-lib.ts
git commit -m "feat(ocr): add server-side quality gate with validation"
```

---

## Task 5: テンプレート＋向き＋四隅検出

**Files:**
- Create: `src/lib/ocr/detect.ts`

- [ ] **Step 1: 実装を書く**

現行 `detectTemplate`（YES/NO）を、1回のJSON応答で `TemplateInfo` を返すよう昇格する。

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { TemplateInfo } from "@/lib/types/ocr";

/** 検出プロンプトのバージョン（変更時に更新して記録に残す） */
export const DETECT_PROMPT_VERSION = "detect-v1";

const FALLBACK: TemplateInfo = {
  kind: "plain",
  orientation: "unknown",
  rows: null,
  cols: null,
  corners: null,
  skewAngle: null,
  detectFailed: true,
};

/**
 * 画像から用紙種別・向き・四隅・傾きを1回のClaude呼び出しで推定する。
 * 失敗時は plain/detectFailed=true を返し、呼び出し側は安全経路へ縮退する。
 * @param base64Data 前処理前の画像base64
 * @returns TemplateInfo
 */
export async function detectTemplate(base64Data: string): Promise<TemplateInfo> {
  if (!process.env.ANTHROPIC_API_KEY) return FALLBACK;
  if (process.env.ESSAY_TEMPLATE_OCR_ENABLED === "false") return FALLBACK;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } },
            {
              type: "text",
              text: `この画像の答案用紙を分析し、次のJSONのみを出力してください（前後に文章を付けない）。
{
  "kind": "genko" | "plain",            // 四隅にL字マーカーがあるマス目原稿用紙なら genko、それ以外は plain
  "orientation": "vertical" | "horizontal" | "unknown",  // 文字の書字方向
  "rows": 数値 | null,                   // マス目の行数（genkoのみ, 例:20）
  "cols": 数値 | null,                   // マス目の列数（genkoのみ, 例:20）
  "corners": [[x,y],[x,y],[x,y],[x,y]] | null,  // 本文グリッドの四隅[左上,右上,右下,左下]のピクセル座標。genkoで明確な時のみ
  "skewAngle": 数値 | null               // 用紙の傾き角(度, 時計回り正)。plainで推定できる時のみ
}`,
            },
          ],
        },
      ],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return FALLBACK;
    const parsed = JSON.parse(match[0]);
    const kind = parsed.kind === "genko" ? "genko" : "plain";
    const corners = Array.isArray(parsed.corners) && parsed.corners.length === 4
      ? (parsed.corners as [number, number][])
      : null;
    return {
      kind,
      orientation: ["vertical", "horizontal"].includes(parsed.orientation) ? parsed.orientation : "unknown",
      rows: typeof parsed.rows === "number" ? parsed.rows : null,
      cols: typeof parsed.cols === "number" ? parsed.cols : null,
      corners,
      skewAngle: typeof parsed.skewAngle === "number" ? parsed.skewAngle : null,
      detectFailed: false,
    };
  } catch (err) {
    console.warn("[detect] failed:", err);
    return FALLBACK;
  }
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 手動スモーク（任意・API課金）**

`.env.local` がある環境で、既知の原稿用紙画像1枚を base64 化し `detectTemplate` を呼ぶ一時スクリプトで `{kind:"genko", corners:[...]}` が返ることを目視確認。（自動テスト対象外＝APIとプロンプト依存）

- [ ] **Step 4: Commit**

```bash
git add src/lib/ocr/detect.ts
git commit -m "feat(ocr): detect template/orientation/corners in one JSON call"
```

---

## Task 6: OCRエンジン（gcv / claude-grid / claude-plain）

**Files:**
- Create: `src/lib/ocr/engines/gcv.ts`
- Create: `src/lib/ocr/engines/claude-grid.ts`
- Create: `src/lib/ocr/engines/claude-plain.ts`

- [ ] **Step 1: GCVエンジン（現行から抽出）**

`src/lib/ocr/engines/gcv.ts` — 現行 `route.ts` の `createJwt`/`getAccessToken`/`ocrWithGoogleVision` を移設し `OcrEngine` 化。

```ts
import * as crypto from "crypto";
import type { OcrEngine, OcrEngineResult } from "@/lib/types/ocr";

function createJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-vision",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })).toString("base64url");
  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  return `${signInput}.${sign.sign(privateKey, "base64url")}`;
}

async function getAccessToken(): Promise<string | null> {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${createJwt(clientEmail, privateKey)}`,
  });
  if (!res.ok) return null;
  return (await res.json()).access_token ?? null;
}

/** Google Cloud Vision DOCUMENT_TEXT_DETECTION エンジン */
export const gcvEngine: OcrEngine = {
  id: "gcv",
  model: "gcv-document-text",
  promptVersion: "gcv-v1",
  async run({ base64 }): Promise<OcrEngineResult> {
    const start = Date.now();
    try {
      const token = await getAccessToken();
      if (!token) return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: "no-token" };
      const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ image: { content: base64 }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }], imageContext: { languageHints: ["ja"] } }],
        }),
      });
      if (!res.ok) return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: `http-${res.status}` };
      const data = await res.json();
      const text = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
      return { text, confidence: null, latencyMs: Date.now() - start, costUsd: 0.0015 };
    } catch (err) {
      return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: String(err) };
    }
  },
};
```

- [ ] **Step 2: claude-grid エンジン（構造化マス目OCR）**

`src/lib/ocr/engines/claude-grid.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { OcrEngine, OcrEngineResult, OcrCell } from "@/lib/types/ocr";
import { flattenCells } from "@/lib/ocr/text";

export const CLAUDE_GRID_PROMPT_VERSION = "grid-v1";

/** 原稿用紙をマス構造(row/col/char/uncertain)で読み取るエンジン */
export const claudeGridEngine: OcrEngine = {
  id: "claude-grid",
  model: "claude-sonnet-4-6",
  promptVersion: CLAUDE_GRID_PROMPT_VERSION,
  async run({ base64, template }): Promise<OcrEngineResult> {
    const start = Date.now();
    try {
      const client = new Anthropic();
      const rows = template.rows ?? 20;
      const cols = template.cols ?? 20;
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              {
                type: "text",
                text: `${rows}行×${cols}列の原稿用紙（向き:${template.orientation}）です。マスごとに読み取り、次のJSONのみ出力してください。
{"cells":[{"row":0,"col":0,"char":"私","uncertain":false,"alternatives":[]}, ...]}
規則:
- 1マス=1文字。空白マスは char="" として座標付きで含める
- 判読不能は推測せず char="■"
- 文字を訂正・言い換えしない（原文に忠実）
- 訂正線で消された文字は含めない。マス外・欄外・印刷文字は無視
- 自信がないマスは uncertain=true、代替候補があれば alternatives に入れる
- JSON以外の文章は一切出力しない`,
              },
            ],
          },
        ],
      });
      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      const match = raw.match(/\{[\s\S]*\}/);
      const truncated = response.stop_reason === "max_tokens";
      if (!match) return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: truncated ? "truncated" : "no-json" };
      const parsed = JSON.parse(match[0]);
      const cells = (parsed.cells ?? []) as OcrCell[];
      const text = flattenCells(cells, template.orientation);
      return { text, cells, confidence: null, latencyMs: Date.now() - start, costUsd: 0.03, error: truncated ? "truncated" : undefined };
    } catch (err) {
      return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: String(err) };
    }
  },
};
```

- [ ] **Step 3: claude-plain エンジン（普通紙抽出）**

`src/lib/ocr/engines/claude-plain.ts` — 現行 `ocrWithClaude`（平文本文起こし）を移設。

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { OcrEngine, OcrEngineResult } from "@/lib/types/ocr";

export const CLAUDE_PLAIN_PROMPT_VERSION = "plain-v1";

/** 普通紙/フォールバック用の平文本文起こしエンジン */
export const claudePlainEngine: OcrEngine = {
  id: "claude-plain",
  model: "claude-sonnet-4-6",
  promptVersion: CLAUDE_PLAIN_PROMPT_VERSION,
  async run({ base64 }): Promise<OcrEngineResult> {
    const start = Date.now();
    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              {
                type: "text",
                text: `この画像は日本語の手書き小論文です。手書き本文のみを左上から右下に書き起こしてください。
- 欄外・印刷文字（タイトル欄・氏名欄・受験番号・問題文・注意書き）は一切無視
- 一字一句、原文に忠実。要約・省略・言い換えは絶対にしない
- 読めない文字は ■。誤字脱字はそのまま。改行は原文の段落に従う
テキスト以外の説明は不要。本文のみを出力。`,
              },
            ],
          },
        ],
      });
      const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      return { text, confidence: null, latencyMs: Date.now() - start, costUsd: 0.02 };
    } catch (err) {
      return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: String(err) };
    }
  },
};
```

- [ ] **Step 4: 型チェック＋lint**

Run: `npx tsc --noEmit && npx eslint src/lib/ocr/engines`
Expected: PASS（未使用 import 無し）

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocr/engines
git commit -m "feat(ocr): add pluggable gcv/claude-grid/claude-plain engines"
```

---

## Task 7: オーケストレータ

**Files:**
- Create: `src/lib/ocr/orchestrator.ts`

- [ ] **Step 1: 実装を書く**

```ts
import type { TemplateInfo, OcrEngineRecord } from "@/lib/types/ocr";
import { gcvEngine } from "@/lib/ocr/engines/gcv";
import { claudeGridEngine } from "@/lib/ocr/engines/claude-grid";
import { claudePlainEngine } from "@/lib/ocr/engines/claude-plain";

export interface OrchestratorResult {
  engines: OcrEngineRecord[];
  proposedText: string;
  primaryId: string;
}

/** secondary(GCV)併走を有効にするか（コスト予算で停止可能） */
const SECONDARY_ENABLED = process.env.OCR_SECONDARY_ENABLED !== "false";

/**
 * template.kind で primary を決め、原稿用紙なら GCV を併走させて全結果を保存する。
 * proposedText は primary から生成。primary が空文字なら claude-plain へ縮退。
 * @param base64 正規化済み画像base64
 * @param template 検出結果
 * @returns エンジン結果配列と proposedText
 */
export async function runOcr(base64: string, template: TemplateInfo): Promise<OrchestratorResult> {
  const toRecord = (e: { id: string; model: string; promptVersion: string }, r: Awaited<ReturnType<typeof gcvEngine.run>>): OcrEngineRecord => ({
    engineId: e.id as OcrEngineRecord["engineId"],
    model: e.model,
    promptVersion: e.promptVersion,
    ...r,
  });

  const primaryEngine = template.kind === "genko" ? claudeGridEngine : claudePlainEngine;
  const tasks: Promise<OcrEngineRecord>[] = [
    primaryEngine.run({ base64, template }).then((r) => toRecord(primaryEngine, r)),
  ];
  if (template.kind === "genko" && SECONDARY_ENABLED) {
    tasks.push(gcvEngine.run({ base64, template }).then((r) => toRecord(gcvEngine, r)));
  }
  const engines = await Promise.all(tasks);

  let proposedText = engines.find((e) => e.engineId === primaryEngine.id)?.text ?? "";
  // primary が空 → claude-plain へ縮退（既に plain が primary の場合は GCV, さらに空なら空のまま）
  if (!proposedText.trim()) {
    const fallback = await claudePlainEngine.run({ base64, template });
    const rec = toRecord(claudePlainEngine, fallback);
    if (!engines.some((e) => e.engineId === "claude-plain")) engines.push(rec);
    proposedText = fallback.text;
  }
  return { engines, proposedText, primaryId: primaryEngine.id };
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/ocr/orchestrator.ts
git commit -m "feat(ocr): add orchestrator with primary/secondary and fallback"
```

---

## Task 8: 永続化（Storage＋ocrRecords＋保持期限）

**Files:**
- Create: `src/lib/ocr/record.ts`

- [ ] **Step 1: 実装を書く**

```ts
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
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/ocr/record.ts
git commit -m "feat(ocr): add image storage and idempotent ocrRecords persistence"
```

---

## Task 9: upload ルートの結線

**Files:**
- Modify: `src/app/api/essay/upload/route.ts`（全面書き換え）

- [ ] **Step 1: ルートを書き換え**

現行の関数群は Task 5/6 に移設済み。新ハンドラは「認証→QC→保存(原画像)→検出→幾何補正→前処理→OCR→保存(正規化+record)→返却」。**返却契約 `{ essayId, ocrText, imageUrl, ocrWords, pageWidth, pageHeight }` は維持**（クライアント互換）。

```ts
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { serverQualityCheck } from "@/lib/ocr/quality";
import { detectTemplate } from "@/lib/ocr/detect";
import { normalizeByCorners, deskewByAngle } from "@/lib/ocr/geometry";
import { runOcr } from "@/lib/ocr/orchestrator";
import { saveOcrImages, upsertOcrRecord } from "@/lib/ocr/record";

/**
 * 補正後画像に既存の仕上げ前処理（グレースケール/シャープ/リサイズ）を適用。
 */
async function finishPreprocess(base64Data: string): Promise<string> {
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

export async function POST(request: NextRequest) {
  try {
    // 認証: uid を信頼源にする（IDOR防止）
    const auth = await requireRole(request, ["student", "teacher", "admin", "superadmin"]);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { imageBase64, universityId, facultyId, essaySubmissionId, consent } = body;
    if (!imageBase64 || !universityId || !facultyId) {
      return NextResponse.json({ error: "imageBase64, universityId, facultyId は必須です" }, { status: 400 });
    }

    const studentId = auth.uid;
    // orgId をユーザードキュメントから解決
    let orgId = "";
    if (adminDb) {
      const userSnap = await adminDb.doc(`users/${studentId}`).get();
      orgId = userSnap.data()?.organizationId ?? "";
    }

    const essayId = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const original = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // 1. 権威的QCゲート（ハード閾値割れ → 撮り直し）
    const qc = await serverQualityCheck(original);
    if (!qc.passed) {
      return NextResponse.json({ error: `画像品質が不足しています: ${qc.reason}。撮り直してください`, qcReason: qc.reason }, { status: 422 });
    }

    // 同意有無: 非同意なら保存しない（メモリ内処理のみ）
    const consented = consent === true;

    // 2. 検出
    const template = await detectTemplate(original);

    // 3. 幾何補正（原稿用紙=四隅ワープ / 普通紙=回転 / 失敗=無補正）
    let corrected = original;
    if (template.kind === "genko" && template.corners) {
      corrected = (await normalizeByCorners(original, template.corners)) ?? original;
    } else if (template.skewAngle) {
      corrected = await deskewByAngle(original, template.skewAngle);
    }

    // 4. 仕上げ前処理
    const normalized = await finishPreprocess(corrected);

    // 5. OCR
    const { engines, proposedText } = await runOcr(normalized, template);
    if (!proposedText.trim()) {
      return NextResponse.json({ error: "画像からテキストを読み取れませんでした" }, { status: 422 });
    }

    // 6. 画像URL（後方互換: 従来は essays/{id}.jpg の signed URL を返す）
    let imageUrl = "";
    let images = { originalPath: "", normalizedPath: null as string | null };
    if (consented && adminDb) {
      const recordId = essayId;
      images = await saveOcrImages({ orgId, studentId, recordId, originalBase64: original, normalizedBase64: normalized });
      await upsertOcrRecord({
        orgId, studentId, essaySubmissionId: essaySubmissionId ?? null,
        qc, template, engines, proposedText, images, status: "ocr_proposed",
      });
      // 表示用 signed URL（原画像）
      try {
        const { getStorage } = await import("firebase-admin/storage");
        const [url] = await getStorage().bucket().file(images.originalPath).getSignedUrl({ action: "read", expires: "2030-01-01" });
        imageUrl = url;
      } catch { /* 表示URLは任意 */ }
    }

    return NextResponse.json({
      essayId,
      ocrText: proposedText,
      imageUrl,
      ocrWords: [],
      pageWidth: 0,
      pageHeight: 0,
    });
  } catch (error) {
    console.error("Essay upload error:", error);
    return NextResponse.json({ error: "アップロード処理中にエラーが発生しました" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 型チェック＋lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/essay/upload/route.ts`
Expected: PASS（旧関数の残骸・未使用importが無いこと）

- [ ] **Step 3: 手動スモーク**

`npm run dev` で `student/essay/new` から画像アップロード → `ocrText` が返り、コンソールにQC/検出のログが出ることを確認。非同意時に record が作られないことも確認（`consent` 未送信で Firestore に ocrRecords が増えない）。

- [ ] **Step 4: Commit**

```bash
git add src/app/api/essay/upload/route.ts
git commit -m "feat(ocr): wire upload route to QC/geometry/orchestrator/persistence with auth"
```

---

## Task 10: confirm-ocr ルート（finalText/correctedSpans）

**Files:**
- Modify: `src/app/api/essay/confirm-ocr/route.ts`

- [ ] **Step 1: ルートを書き換え**

認証を追加し、`ocrRecords` を（あれば）更新して `correctedSpans` を蓄積。既存 `essays/{essayId}` 更新は互換維持。

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { diffSpans } from "@/lib/ocr/text";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["student", "teacher", "admin", "superadmin"]);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { essayId, ocrText } = body;
    if (!essayId || !ocrText) {
      return NextResponse.json({ error: "essayId と ocrText は必須です" }, { status: 400 });
    }

    // 既存 essays 更新（後方互換, クライアントSDK経路は廃し admin SDK に統一）
    if (adminDb) {
      await adminDb.doc(`essays/${essayId}`).set(
        { ocrText, status: "ocr_confirmed", updatedAt: Timestamp.now() },
        { merge: true }
      );

      // ocrRecords 側: recordId=essayId で作られている前提。あれば correctedSpans を記録
      const recRef = adminDb.doc(`ocrRecords/${essayId}`);
      const rec = await recRef.get();
      if (rec.exists && rec.data()?.studentId === auth.uid) {
        const proposed = rec.data()?.proposedText ?? "";
        await recRef.set(
          { finalText: ocrText, correctedSpans: diffSpans(proposed, ocrText), status: "ocr_confirmed", updatedAt: Timestamp.now() },
          { merge: true }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OCR confirm error:", error);
    return NextResponse.json({ error: "OCR確認処理中にエラーが発生しました" }, { status: 500 });
  }
}
```

注: Task 9 で `recordId = essayId` としているため confirm 側は `ocrRecords/{essayId}` を直接参照できる。所有者チェック（`studentId === auth.uid`）で他人の record 改変を防ぐ。

- [ ] **Step 2: 型チェック＋lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/essay/confirm-ocr/route.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/essay/confirm-ocr/route.ts
git commit -m "feat(ocr): record finalText/correctedSpans on confirm with auth"
```

---

## Task 11: ブラウザ内QCコンポーネント

**Files:**
- Create: `src/components/essay/CaptureQualityCheck.tsx`
- Modify: `src/app/student/essay/new/page.tsx`（アップロード前にQCを挟む）

- [ ] **Step 1: QCユーティリティ＋フックを書く**

`CaptureQualityCheck.tsx`（画像ファイル/DataURLを受け、QC結果を返す純関数＋任意のバッジUI）:

```tsx
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
  const ctx = canvas.getContext("2d")!;
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
```

- [ ] **Step 2: new ページで配線**

`src/app/student/essay/new/page.tsx` のアップロード処理（`authFetch("/api/essay/upload"...)` の直前, 562/597付近）で、選択画像の DataURL に対し `checkImageQuality` を呼び、`!ok` ならトースト表示して return（アップロードしない）。OKなら従来どおり送信し、body に `consent: true`（同意取得済みの場合）と `essaySubmissionId`（あれば）を追加。

具体差分（該当箇所に挿入するガード）:

```tsx
import { checkImageQuality } from "@/components/essay/CaptureQualityCheck";
// ...アップロード関数内、fetch直前:
const qc = await checkImageQuality(previewDataUrl); // previewDataUrl は既存のプレビュー用DataURL
if (!qc.ok) {
  toast.error(qc.reason ?? "画像品質が不足しています");
  return;
}
```

（既存の変数名 `previewDataUrl` / トースト API は現行コードに合わせて置換する。存在しなければ選択直後の DataURL を保持する状態を1つ追加）

- [ ] **Step 3: 型チェック＋lint＋UI確認**

Run: `npx tsc --noEmit && npx eslint src/components/essay/CaptureQualityCheck.tsx src/app/student/essay/new/page.tsx`
Expected: PASS。`npm run dev` でボケ/暗い画像を選ぶと送信前に警告が出ることを目視確認。

- [ ] **Step 4: Commit**

```bash
git add src/components/essay/CaptureQualityCheck.tsx src/app/student/essay/new/page.tsx
git commit -m "feat(ocr): add client-side capture quality check before upload"
```

---

## Task 12: インデックス・ルール・gitignore

**Files:**
- Modify: `firestore.indexes.json`
- Modify: `storage.rules`
- Modify: `.gitignore`

- [ ] **Step 1: 複合インデックスを追加**

`firestore.indexes.json` の `indexes` 配列に追加（org横断の評価集計 `orgId + status + createdAt`、冪等検索 `essaySubmissionId + studentId`）:

```json
{
  "collectionGroup": "ocrRecords",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orgId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ocrRecords",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "essaySubmissionId", "order": "ASCENDING" },
    { "fieldPath": "studentId", "order": "ASCENDING" }
  ]
}
```

- [ ] **Step 2: Storageルールを追加**

`storage.rules` の `match /b/{bucket}/o {` 内に、既存 `essays/` ルールに倣って追記（read=本人 or admin、write=サーバのみ＝クライアント不可）:

```
    // Essay OCR images: 本人と同一orgのadminのみ read。書き込みはサーバ(admin SDK)のみ
    match /essayOcr/{orgId}/{userId}/{allPaths=**} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if false;
    }
```

- [ ] **Step 3: gitignore に評価セットを追加**

`.gitignore` に追記:

```
# OCR評価セット（答案画像・正解データ＝PII, リポジトリに含めない）
/evalset/
```

- [ ] **Step 4: 検証**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8')); console.log('indexes JSON OK')"`
Expected: `indexes JSON OK`

- [ ] **Step 5: Commit（デプロイは別途・確認の上で）**

```bash
git add firestore.indexes.json storage.rules .gitignore
git commit -m "chore(ocr): add ocrRecords indexes, essayOcr storage rule, evalset gitignore"
```

> **デプロイ注意（CLAUDE.md）:** インデックスは `firebase deploy --only firestore:indexes`、ルールは `firebase deploy --only storage` を**マージ後・確認の上で**実行。欠落インデックスは沈黙失敗（空表示）になるため、org横断クエリを使う前に必ずデプロイ。

---

## Task 13: 評価CLI

**Files:**
- Create: `scripts/eval-ocr.ts`

- [ ] **Step 1: 実装を書く**

本番と同じロジック層をオフラインで回し、CER等を出力。入力は `evalset/images/*.jpg` ＋ `evalset/groundtruth.json`。

```ts
/**
 * OCR精度評価CLI（手動実行, 実APIを叩く）。
 * 使い方: npx tsx scripts/eval-ocr.ts
 * 入力: evalset/images/<name>.jpg, evalset/groundtruth.json = { "<name>.jpg": { "text": "...", "expectedKind": "genko"|"plain" } }
 * 出力: コンソール表 ＋ evalset/report.json
 */
import fs from "node:fs";
import path from "node:path";
import { serverQualityCheck } from "@/lib/ocr/quality";
import { detectTemplate } from "@/lib/ocr/detect";
import { normalizeByCorners, deskewByAngle } from "@/lib/ocr/geometry";
import { runOcr } from "@/lib/ocr/orchestrator";
import { characterErrorRate } from "@/lib/ocr/text";

const ROOT = path.resolve("evalset");
const IMAGES = path.join(ROOT, "images");
const GT = path.join(ROOT, "groundtruth.json");

async function main() {
  if (!fs.existsSync(GT)) { console.error(`正解ファイルがありません: ${GT}`); process.exit(1); }
  const gt: Record<string, { text: string; expectedKind?: string }> = JSON.parse(fs.readFileSync(GT, "utf8"));
  const rows: Array<Record<string, unknown>> = [];
  let sumCer = 0, n = 0, templateMiss = 0;

  for (const [file, truth] of Object.entries(gt)) {
    const buf = fs.readFileSync(path.join(IMAGES, file));
    const base64 = buf.toString("base64");
    const qc = await serverQualityCheck(base64);
    const template = await detectTemplate(base64);
    let corrected = base64;
    if (template.kind === "genko" && template.corners) corrected = (await normalizeByCorners(base64, template.corners)) ?? base64;
    else if (template.skewAngle) corrected = await deskewByAngle(base64, template.skewAngle);
    const { engines, proposedText } = await runOcr(corrected, template);
    const cer = characterErrorRate(truth.text, proposedText);
    sumCer += cer; n++;
    if (truth.expectedKind && truth.expectedKind !== template.kind) templateMiss++;
    const latency = Math.max(...engines.map((e) => e.latencyMs));
    const cost = engines.reduce((s, e) => s + (e.costUsd ?? 0), 0);
    rows.push({ file, kind: template.kind, cer: cer.toFixed(3), qcPassed: qc.passed, latencyMs: latency, costUsd: cost.toFixed(4) });
    console.log(`${file}\tkind=${template.kind}\tCER=${cer.toFixed(3)}\tlat=${latency}ms`);
  }

  const summary = {
    count: n,
    meanCER: n ? sumCer / n : 0,
    templateMissRate: n ? templateMiss / n : 0,
  };
  console.log("\n=== SUMMARY ===");
  console.log(`件数: ${summary.count}  平均CER: ${summary.meanCER.toFixed(3)}  テンプレ誤判定率: ${(summary.templateMissRate * 100).toFixed(1)}%`);
  fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify({ summary, rows }, null, 2));
  console.log(`レポート: ${path.join(ROOT, "report.json")}`);
}

main();
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: スモーク（正解データが揃ってから・手動）**

`evalset/images/` に手書き答案数枚と `evalset/groundtruth.json` を用意して `npx tsx scripts/eval-ocr.ts` を実行し、CERとレポートが出力されることを確認。（正解データはユーザー用意。②③稼働後は `ocrRecords.correctedSpans` から半自動生成可能）

- [ ] **Step 4: Commit**

```bash
git add scripts/eval-ocr.ts
git commit -m "feat(ocr): add offline CER evaluation CLI"
```

---

## Self-Review（計画者チェック）

**Spec coverage:**
- §2 撮影QC＋幾何補正 → Task 4(サーバQC)/11(ブラウザQC)/3(幾何)/5(検出/向き)。✓
- §2 修正データ＋画像保存 → Task 8(保存)/10(correctedSpans)/1(型)。✓
- §2 評価セット計測基盤 → Task 13(CLI)/2(CER)。✓
- §5 エンジンIF/併走/proposedText平文化 → Task 6/7/2(flattenCells)。✓
- §6 同意/非同意/保持 → Task 8(consent/retention)/9(非同意時skip)。✓
- §6 セキュリティ(uid信頼/scope) → Task 9/10(requireRole, 所有者チェック)/12(storage.rules)。✓
- §6 フォールバック → Task 9(四隅無効→回転→無補正, primary空→plain縮退)。✓
- §2 冪等性 → Task 8(essaySubmissionId検索 upsert)。✓

**Placeholder scan:** 各コード step は実コードを記載。TBD/「適切に」等なし。閾値は暫定値を明示（設計の未解決点＝較正は別作業）。

**Type consistency:** `OcrEngineRecord`(engineId+model+promptVersion+result), `TemplateInfo`(kind/orientation/corners/skewAngle/detectFailed), `flattenCells(cells, orientation)`, `characterErrorRate(truth, hyp)`, `runOcr(base64, template)`, `upsertOcrRecord(...)` を全タスクで統一使用。recordId=essayId を Task9/10 で一致。✓

**未解決（実装時に現地確認）:**
- `student/essay/new/page.tsx` の既存プレビュー変数名・トーストAPI（Task 11 で現行に合わせて置換）。
- 同意UIの取得箇所（`consent` を body に載せる導線。既存の利用規約同意フローに接続、無ければ最小の同意チェックを追加）。
- `ocrRecords` の TTL 自動削除（Firestore TTLポリシー設定 vs バッチ関数）は別タスク。

---

## Execution Handoff

計画を `docs/superpowers/plans/2026-07-12-ocr-accuracy.md` に保存しました。実行方法は2択:

1. **Subagent-Driven（推奨）** — タスクごとに新規サブエージェント＋二段レビュー（spec準拠→コード品質）、タスク間で確認。
2. **Inline Execution** — このセッションでバッチ実行、チェックポイントで確認。

どちらで進めますか？

# ちょこ添削 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 800字の完成本文のうち1段落だけを生徒が穴埋めして添削を受ける軽量練習「ちょこ添削」を追加する。

**Architecture:** 要約ドリル(summary-drill)を下敷きに、静的な本文バンク＋ランダム欠落段落＋3軸採点＋定性フィードバックを実装。結果は `users/{uid}/chokoReviews` に保存し、スキルランク(重み0.5)・弱点DB(等倍)・BigQuery(`essay_type:"choco"`)へ連動。記入画面は2カラムで左に穴あき本文をsticky固定。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Firestore(Admin SDK) / Anthropic SDK / Recharts / Tailwind。テスト基盤は無いため、純粋ロジックは `tsx` 検証スクリプト、UI/APIは `npm run build` ＋ dev 目視で検証。

**設計書:** `docs/superpowers/specs/2026-07-05-choco-tensaku-design.md`

---

## File Structure

新規:
- `src/lib/types/choco.ts` — ちょこ添削の全型（Passage/Review/Scores/Feedback）
- `src/lib/choco/score.ts` — `computeChocoTotal()`（3軸→0-50純関数）
- `src/lib/choco/blend.ts` — `blendPracticeScores()`（本添削×1.0＋ちょこ×0.5の重み付き平均・純関数）
- `src/lib/choco/apply-weakness.ts` — `applyChocoWeaknesses()`（弱点DB反映。review route のパターンを共通化）
- `src/lib/ai/prompts/choco.ts` — `buildChocoReviewPrompt()`
- `src/lib/essay/choco-core.ts` — `reviewChocoParagraph()`（AI呼び出し＋jsonrepair）
- `src/data/choco-passages/index.ts` — バンク集約・`getChocoPassagesByFaculty`/`getChocoPassageById`
- `src/data/choco-passages/{education,nursing,economics,humanities,engineering,pharmacy,sociology}.ts` — 各2本
- `src/app/api/essay/choco-review/route.ts` — API
- `src/app/student/essay/choco/page.tsx` — 3ステップUI
- `src/components/essay/ChocoPassagePanel.tsx` — 穴あき本文（sticky）
- `src/components/essay/ChocoResultView.tsx` — 結果（レーダー＋赤ペン＋模範）
- `scripts/verify-choco-logic.ts` — 純ロジックの assert 検証
- `scripts/validate-choco-passages.ts` — バンクのデータ検証

変更:
- `src/lib/skill-check/aggregate.ts` — `computeEssayAggregate` に choco を重み付き合流
- `src/components/layout/Sidebar.tsx` / `BottomNav.tsx` / `MobileMenuContent.tsx` / `Header.tsx` — 導線
- `package.json` — `verify:choco` / `validate:choco` script 追加

---

## Task 1: 作業ブランチ作成

- [ ] **Step 1: main から実装ブランチを切る**

```bash
cd ~/Projects/coach-sougou-sentaku-v2
git checkout main
git checkout -b feat/choco-tensaku
```
Expected: `Switched to a new branch 'feat/choco-tensaku'`

> 注: 別作業の未コミット変更（firestore.rules, essay/* 等）が作業ツリーに残っている場合がある。ちょこ添削に無関係なファイルはステージしないこと。

---

## Task 2: 型定義 `src/lib/types/choco.ts`

**Files:** Create `src/lib/types/choco.ts`

- [ ] **Step 1: 型を作成**

```ts
import type { LanguageCorrection } from "@/lib/types/essay";

/** 段落の役割 */
export type ChocoRole = "intro" | "claim" | "reason" | "counter" | "conclusion";

export const CHOCO_ROLE_LABELS: Record<ChocoRole, string> = {
  intro: "序論",
  claim: "主張",
  reason: "根拠",
  counter: "反論・譲歩",
  conclusion: "結論",
};

/** バンクの1段落（伏せたときはこの text が模範） */
export interface ChocoParagraph {
  text: string;
  role: ChocoRole;
  /** 背景知識・押さえどころ（結果画面で開示） */
  keyPoints: string[];
}

/** 本文バンクの1本 */
export interface ChocoPassage {
  id: string;
  /** 系統キー（summary-passages の facultyId と同体系: education/nursing/economics/humanities/engineering/pharmacy/sociology ...） */
  facultyKey: string;
  themeTitle: string;
  difficulty: 1 | 2 | 3;
  wordCount: number;
  paragraphs: ChocoParagraph[]; // 4〜5段落
}

export interface ChocoScores {
  logic: number; // 論理 0-10
  coherence: number; // つながり(前後文脈適合) 0-10
  expression: number; // 表現 0-10
  total: number; // 0-50換算（ランク用）
}

export interface ChocoFeedback {
  overall: string;
  goodPoints: string[];
  improvements: string[];
  languageCorrections: LanguageCorrection[];
  /** 弱点DB反映用のタグ */
  weaknessTags: string[];
  nextTip: string;
}

/** AI が返す生の評価（total はサーバーで算出するので含めない） */
export interface ChocoEvaluation {
  scores: Omit<ChocoScores, "total">;
  feedback: ChocoFeedback;
}

/** 保存する1件（users/{uid}/chokoReviews/{id}） */
export interface ChocoReview {
  id: string;
  userId: string;
  passageId: string;
  facultyKey: string;
  themeTitle: string;
  blankIndex: number;
  role: ChocoRole;
  studentText: string;
  modelText: string;
  keyPoints: string[];
  scores: ChocoScores;
  feedback: ChocoFeedback;
  wordCount: number;
  submittedAt: string; // ISO（ランク集計の直近30日判定に使用）
  createdAt: string;
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep "types/choco.ts" || echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/choco.ts
git commit -m "feat(choco): add core types"
```

---

## Task 3: スコア合計の純関数 `src/lib/choco/score.ts`

**Files:** Create `src/lib/choco/score.ts`, `scripts/verify-choco-logic.ts`; Modify `package.json`

- [ ] **Step 1: 実装**

```ts
import type { ChocoScores } from "@/lib/types/choco";

/**
 * 3軸(各0-10)を本添削と同じ 0-50 スケールへ換算。
 * total = round((logic + coherence + expression) / 30 * 50)
 */
export function computeChocoTotal(
  s: Pick<ChocoScores, "logic" | "coherence" | "expression">,
): number {
  const clamp = (n: number) => Math.max(0, Math.min(10, n));
  const sum = clamp(s.logic) + clamp(s.coherence) + clamp(s.expression);
  return Math.round((sum / 30) * 50);
}
```

- [ ] **Step 2: 検証スクリプトを書く（失敗する状態）**

`scripts/verify-choco-logic.ts`:
```ts
import assert from "node:assert";
import { computeChocoTotal } from "../src/lib/choco/score";
import { blendPracticeScores } from "../src/lib/choco/blend";

// computeChocoTotal
assert.equal(computeChocoTotal({ logic: 10, coherence: 10, expression: 10 }), 50);
assert.equal(computeChocoTotal({ logic: 0, coherence: 0, expression: 0 }), 0);
assert.equal(computeChocoTotal({ logic: 6, coherence: 6, expression: 6 }), 30); // 18/30*50=30
assert.equal(computeChocoTotal({ logic: 15, coherence: 5, expression: 5 }), Math.round((20 / 30) * 50)); // clamp 15->10 => 20/30*50=33

// blendPracticeScores (Task 4 で実装)
assert.deepEqual(blendPracticeScores([], [], 0.5), { avg: null, count: 0 });
assert.equal(blendPracticeScores([40], [], 0.5).avg, 40);
assert.equal(blendPracticeScores([], [30], 0.5).avg, 30);
// essay 40 (w1) + choco 20 (w0.5): (40*1 + 20*0.5)/(1 + 0.5) = 50/1.5 = 33.33...
assert.ok(Math.abs(blendPracticeScores([40], [20], 0.5).avg! - 33.3333) < 0.01);
assert.equal(blendPracticeScores([40], [20], 0.5).count, 2);

console.log("choco logic OK");
```

- [ ] **Step 3: package.json に script 追加**

`"scripts"` に追記:
```json
"verify:choco": "tsx scripts/verify-choco-logic.ts",
"validate:choco": "tsx scripts/validate-choco-passages.ts",
```

- [ ] **Step 4: 実行して失敗を確認（blend 未実装）**

Run: `npm run verify:choco`
Expected: FAIL（`Cannot find module '../src/lib/choco/blend'`）→ Task 4 で解消

---

## Task 4: 重み付き平均の純関数 `src/lib/choco/blend.ts`

**Files:** Create `src/lib/choco/blend.ts`

- [ ] **Step 1: 実装**

```ts
/**
 * 本添削(重み1.0)とちょこ添削(重み chocoWeight)の練習スコアを重み付き平均する。
 * count はモード判定用の生の件数(essay + choco)。
 */
export function blendPracticeScores(
  essayTotals: number[],
  chocoTotals: number[],
  chocoWeight: number,
): { avg: number | null; count: number } {
  const wSum =
    essayTotals.reduce((a, b) => a + b, 0) +
    chocoTotals.reduce((a, b) => a + b, 0) * chocoWeight;
  const wCount = essayTotals.length + chocoTotals.length * chocoWeight;
  return {
    avg: wCount > 0 ? wSum / wCount : null,
    count: essayTotals.length + chocoTotals.length,
  };
}
```

- [ ] **Step 2: 検証スクリプト実行（全て通る）**

Run: `npm run verify:choco`
Expected: `choco logic OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/choco/score.ts src/lib/choco/blend.ts scripts/verify-choco-logic.ts package.json
git commit -m "feat(choco): add score total + weighted blend pure helpers with tsx verification"
```

---

## Task 5: 本文バンク（データ構造＋索引＋検証）

**Files:** Create `src/data/choco-passages/index.ts`, `scripts/validate-choco-passages.ts`, 7 分野ファイル

- [ ] **Step 1: 索引 `src/data/choco-passages/index.ts`**

```ts
import type { ChocoPassage } from "@/lib/types/choco";
import { EDUCATION_CHOCO } from "./education";
import { NURSING_CHOCO } from "./nursing";
import { ECONOMICS_CHOCO } from "./economics";
import { HUMANITIES_CHOCO } from "./humanities";
import { ENGINEERING_CHOCO } from "./engineering";
import { PHARMACY_CHOCO } from "./pharmacy";
import { SOCIOLOGY_CHOCO } from "./sociology";

export const ALL_CHOCO_PASSAGES: ChocoPassage[] = [
  ...EDUCATION_CHOCO,
  ...NURSING_CHOCO,
  ...ECONOMICS_CHOCO,
  ...HUMANITIES_CHOCO,
  ...ENGINEERING_CHOCO,
  ...PHARMACY_CHOCO,
  ...SOCIOLOGY_CHOCO,
];

/** 系統キーで絞る（無ければ空配列 → 呼び出し側で全体フォールバック） */
export function getChocoPassagesByFaculty(facultyKey: string): ChocoPassage[] {
  return ALL_CHOCO_PASSAGES.filter((p) => p.facultyKey === facultyKey);
}

export function getChocoPassageById(id: string): ChocoPassage | undefined {
  return ALL_CHOCO_PASSAGES.find((p) => p.id === id);
}

/** 系統キー一覧（UIの選択メニュー用。ラベルは registry と別に持たず日本語併記） */
export const CHOCO_FACULTIES: { key: string; label: string }[] = [
  { key: "education", label: "教育" },
  { key: "nursing", label: "看護・医療" },
  { key: "economics", label: "経済・経営" },
  { key: "humanities", label: "人文" },
  { key: "engineering", label: "理工" },
  { key: "pharmacy", label: "薬学" },
  { key: "sociology", label: "現代社会学" },
];
```

- [ ] **Step 2: 1分野ファイルの exemplar `src/data/choco-passages/education.ts`（残り13本の雛形）**

各段落は `text`(模範) / `role` / `keyPoints`。本文合計800字前後、4〜5段落。**この1本を完全形で書き、他は同構造で執筆する。**
```ts
import type { ChocoPassage } from "@/lib/types/choco";

export const EDUCATION_CHOCO: ChocoPassage[] = [
  {
    id: "choco-education-01",
    facultyKey: "education",
    themeTitle: "個別最適な学びと協働的な学び",
    difficulty: 2,
    wordCount: 800,
    paragraphs: [
      {
        role: "intro",
        text: "近年の学校教育では、一人ひとりの理解度や関心に応じた「個別最適な学び」と、他者と学び合う「協働的な学び」を一体的に充実させることが求められている。GIGAスクール構想で一人一台端末が整い、この二つをどう両立させるかが問われている。",
        keyPoints: ["個別最適な学びと協働的な学びの一体的充実", "GIGAスクール構想・一人一台端末"],
      },
      {
        role: "claim",
        text: "私は、個別最適な学びと協働的な学びは対立せず、互いを支え合う関係にあると考える。個に応じて理解を深めた子ども同士が対話することで、学びはより豊かになる。",
        keyPoints: ["両者は対立でなく相互補完という立場提示"],
      },
      {
        role: "reason",
        text: "なぜなら、理解度に差があるまま一斉に進めると、分からない子は取り残され、できる子は退屈する。端末を使えば各自のペースで学べ、つまずきを早期に把握できる。その上で考えを持ち寄れば、多様な視点が交わり深い学びが生まれるからだ。",
        keyPoints: ["一斉授業の限界(取り残し・退屈)", "ICTで個のペース学習と学習状況の把握", "多様な視点の交流が深い学びを生む"],
      },
      {
        role: "counter",
        text: "もちろん、個別化が行き過ぎれば学びが孤立し、協働の力が育たないという懸念もある。しかし、それは個別と協働を切り離して考えるから生じる問題であり、両者を往還させる授業設計によって乗り越えられる。",
        keyPoints: ["個別化の行き過ぎ=孤立への懸念と反論", "個と協働を往還させる授業設計"],
      },
      {
        role: "conclusion",
        text: "教育を学ぶ者として、私は一人ひとりの学びを保障しつつ、子ども同士が学び合える教室をつくりたい。個別最適と協働的な学びを往還させることこそ、これからの教師に求められる専門性だと考える。",
        keyPoints: ["教育を学ぶ立場での結び", "個別最適と協働の往還=教師の専門性"],
      },
    ],
  },
  // choco-education-02 も同構造で1本追加（テーマ例: いじめ・不登校と居場所づくり）
];
```

- [ ] **Step 3: 残り6分野×各2本＋education 2本目を執筆**

各分野の facultyKey とテーマ例（各2本、800字前後・4〜5段落・全段落に role と keyPoints）:
- `education`（教育）: 個別最適な学び / いじめ・不登校と居場所
- `nursing`（看護・医療）: 患者中心のケアとインフォームド・コンセント / 地域包括ケアと多職種連携
- `economics`（経済・経営）: 少子高齢化と労働生産性 / 格差と再分配
- `humanities`（人文）: 読書と情報化社会 / 多文化共生と言語
- `engineering`（理工）: AIと社会実装の倫理 / 再生可能エネルギーと持続可能性
- `pharmacy`（薬学）: 薬剤耐性(AMR)とセルフメディケーション / 医薬品の安全性とリスクコミュニケーション
- `sociology`（現代社会学）: SNSと世論形成 / 少子高齢社会とコミュニティ

- [ ] **Step 4: データ検証スクリプト `scripts/validate-choco-passages.ts`**

```ts
import { ALL_CHOCO_PASSAGES } from "../src/data/choco-passages";
import { CHOCO_ROLE_LABELS } from "../src/lib/types/choco";

let errors = 0;
const seen = new Set<string>();
for (const p of ALL_CHOCO_PASSAGES) {
  const where = `${p.id}`;
  if (seen.has(p.id)) { console.error(`[dup id] ${where}`); errors++; }
  seen.add(p.id);
  if (p.paragraphs.length < 4 || p.paragraphs.length > 5) {
    console.error(`[paragraphs ${p.paragraphs.length}] ${where} は4〜5段落にする`); errors++;
  }
  const total = p.paragraphs.reduce((n, g) => n + g.text.length, 0);
  if (total < 650 || total > 1000) {
    console.error(`[wordCount ${total}] ${where} は本文合計650〜1000字目安`); errors++;
  }
  for (const [i, g] of p.paragraphs.entries()) {
    if (!(g.role in CHOCO_ROLE_LABELS)) { console.error(`[role ${g.role}] ${where}#${i}`); errors++; }
    if (!g.keyPoints || g.keyPoints.length === 0) { console.error(`[empty keyPoints] ${where}#${i}`); errors++; }
    if (!g.text || g.text.length < 30) { console.error(`[short text] ${where}#${i}`); errors++; }
  }
}
if (errors > 0) { console.error(`\n${errors} 件のエラー`); process.exit(1); }
console.log(`OK: ${ALL_CHOCO_PASSAGES.length} passages, ${seen.size} unique`);
```

- [ ] **Step 5: 検証実行**

Run: `npm run validate:choco`
Expected: `OK: 14 passages, 14 unique`

- [ ] **Step 6: Commit**

```bash
git add src/data/choco-passages scripts/validate-choco-passages.ts
git commit -m "feat(choco): add passage bank (7 faculties x 2) + data validation"
```

---

## Task 6: プロンプト `src/lib/ai/prompts/choco.ts`

**Files:** Create `src/lib/ai/prompts/choco.ts`

- [ ] **Step 1: 実装**

```ts
import type { ChocoParagraph } from "@/lib/types/choco";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";

/**
 * 本文全体（伏せ段落は位置を明示）＋伏せた段落の役割・キーポイント・模範＋生徒回答
 * を渡し、段落単位の定性フィードバック(JSON)を求めるプロンプト。
 */
export function buildChocoReviewPrompt(
  paragraphs: ChocoParagraph[],
  blankIndex: number,
  studentText: string,
): string {
  const target = paragraphs[blankIndex];
  const roleLabel = CHOCO_ROLE_LABELS[target.role];
  const body = paragraphs
    .map((g, i) =>
      i === blankIndex
        ? `【${i + 1}段落＝ここが生徒の担当（役割: ${roleLabel}）】\n${studentText}`
        : `【${i + 1}段落（役割: ${CHOCO_ROLE_LABELS[g.role]}）】\n${g.text}`,
    )
    .join("\n\n");

  return `あなたは小論文の丁寧な添削者です。ある完成した小論文のうち「${blankIndex + 1}段落目（役割: ${roleLabel}）」だけを生徒が書きました。前後の段落は完成済みのお手本です。生徒の段落を、前後の文脈とのつながりを重視して評価してください。相手は「1段落だけなら書ける」という、まだ自信のない生徒です。まず良い点を認め、具体的に励ましてください。

## 小論文全体（${blankIndex + 1}段落目が生徒の回答）
${body}

## この段落で本来押さえたい背景知識・要点
${target.keyPoints.map((k, i) => `${i + 1}. ${k}`).join("\n")}

## 模範段落（この段落の理想例。生徒には後で開示する）
${target.text}

## 採点（各0〜10の整数）
- logic（論理）: 主張と理由がつながり、段落の役割(${roleLabel})を果たしているか
- coherence（つながり）: 前後の段落と自然につながり、話の流れを壊していないか
- expression（表現）: 日本語が正しく、読みやすいか

## 出力（JSON のみ。前後に説明文を書かない）
{
  "scores": { "logic": 0-10, "coherence": 0-10, "expression": 0-10 },
  "feedback": {
    "overall": "全体講評（2〜3文、まず良い点を認める）",
    "goodPoints": ["良かった点1", "良かった点2"],
    "improvements": ["もう一歩1", "もう一歩2"],
    "languageCorrections": [
      { "location": "該当箇所の短い引用", "original": "誤/改善前", "suggestion": "改善案", "type": "typo|grammar|connector|expression|redundancy", "reason": "理由" }
    ],
    "weaknessTags": ["弱点タグ(例: 論理の飛躍, 主張が曖昧, 接続の不足)"],
    "nextTip": "次に気をつけること1つ"
  }
}`;
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep "prompts/choco.ts" || echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/choco.ts
git commit -m "feat(choco): add review prompt builder"
```

---

## Task 7: 添削コア `src/lib/essay/choco-core.ts`

**Files:** Create `src/lib/essay/choco-core.ts`

- [ ] **Step 1: 実装（review-core の jsonrepair パターンを踏襲）**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import type { ChocoParagraph, ChocoEvaluation } from "@/lib/types/choco";
import { buildChocoReviewPrompt } from "@/lib/ai/prompts/choco";

export class ChocoParseError extends Error {
  constructor(message: string, public readonly rawText: string) {
    super(message);
    this.name = "ChocoParseError";
  }
}

/** 生徒の1段落を評価。AI呼び出し＋堅牢JSONパースのみ（Firestore I/Oは含まない）。 */
export async function reviewChocoParagraph(input: {
  paragraphs: ChocoParagraph[];
  blankIndex: number;
  studentText: string;
}): Promise<ChocoEvaluation> {
  const prompt = buildChocoReviewPrompt(
    input.paragraphs,
    input.blankIndex,
    input.studentText,
  );
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) ?? rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new ChocoParseError("JSONブロックが見つかりません", rawText);

  let parsed: ChocoEvaluation;
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch {
    parsed = JSON.parse(jsonrepair(jsonMatch[1]));
  }
  // 欠損に強くする最低限の正規化
  parsed.feedback.languageCorrections ??= [];
  parsed.feedback.goodPoints ??= [];
  parsed.feedback.improvements ??= [];
  parsed.feedback.weaknessTags ??= [];
  return parsed;
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep "choco-core.ts" || echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/essay/choco-core.ts
git commit -m "feat(choco): add AI review core"
```

---

## Task 8: 弱点DB反映ヘルパー `src/lib/choco/apply-weakness.ts`

**Files:** Create `src/lib/choco/apply-weakness.ts`

- [ ] **Step 1: 実装（review route 171-350 のパターンを踏襲）**

```ts
import type { WeaknessRecord } from "@/lib/types/growth";
import { updateWeaknessRecords } from "@/lib/growth/analyze";

/** ちょこ添削の弱点タグを users/{uid}/weaknesses に等倍反映（review route と同じ経路）。 */
export async function applyChocoWeaknesses(
  uid: string,
  weaknessTags: string[],
): Promise<void> {
  if (weaknessTags.length === 0) return;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;

  const col = adminDb.collection(`users/${uid}/weaknesses`);
  const snap = await col.get();
  const existing: WeaknessRecord[] = snap.docs
    .map((d) => d.data() as WeaknessRecord)
    .filter((w) => !w.resolved && !w.archivedAt);

  const updated = updateWeaknessRecords(existing, weaknessTags, "essay");

  const batch = adminDb.batch();
  for (const w of updated) {
    batch.set(col.doc(w.area), w, { merge: true });
  }
  await batch.commit();
}
```

> `WeaknessRecord` の import 元は `src/lib/types/growth.ts`（review route と同じ）。フィールド名（`resolved`/`archivedAt`/`area`）は review route:171-200 に一致させる。実装時にそのファイルで確認すること。

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep "apply-weakness.ts" || echo OK`
Expected: `OK`（型不一致が出たら review route の実際の WeaknessRecord 取得形に合わせる）

- [ ] **Step 3: Commit**

```bash
git add src/lib/choco/apply-weakness.ts
git commit -m "feat(choco): add weakness DB apply helper"
```

---

## Task 9: ランク集計に choco を合流 `src/lib/skill-check/aggregate.ts`

**Files:** Modify `src/lib/skill-check/aggregate.ts`

- [ ] **Step 1: 定数と import を追加**

ファイル冒頭の import 群の下に:
```ts
import { blendPracticeScores } from "@/lib/choco/blend";

/** ちょこ添削1回 = 本添削0.5回分 */
export const CHOCO_WEIGHT = 0.5;
```

- [ ] **Step 2: `computeEssayAggregate` を書き換え**

現行（205-242行）の本文を、essays に加え chokoReviews も集計する形へ:
```ts
export async function computeEssayAggregate(
  userId: string,
  scTotal: number | null,
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return blend(scTotal, null, 0, calculateRank);

  try {
    const cutoff = daysAgo(SKILL_CHECK_REFRESH_DAYS);

    const essayRecent = await adminDb
      .collection("essays")
      .where("userId", "==", userId)
      .where("submittedAt", ">=", cutoff)
      .get();
    let essayTotals = essayRecent.docs
      .map((d) => d.data()?.scores?.total)
      .filter((s): s is number => typeof s === "number");

    const chocoRecent = await adminDb
      .collection(`users/${userId}/chokoReviews`)
      .where("submittedAt", ">=", cutoff.toISOString())
      .get();
    let chocoTotals = chocoRecent.docs
      .map((d) => d.data()?.scores?.total)
      .filter((s): s is number => typeof s === "number");

    // fallback: 直近30日に両方とも無ければ、全期間の直近 N 件（essay 優先、無ければ choco）
    if (essayTotals.length === 0 && chocoTotals.length === 0) {
      const fb = await adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .orderBy("submittedAt", "desc")
        .limit(FALLBACK_RECENT_LIMIT)
        .get();
      essayTotals = fb.docs
        .map((d) => d.data()?.scores?.total)
        .filter((s): s is number => typeof s === "number");
      if (essayTotals.length === 0) {
        const cfb = await adminDb
          .collection(`users/${userId}/chokoReviews`)
          .orderBy("submittedAt", "desc")
          .limit(FALLBACK_RECENT_LIMIT)
          .get();
        chocoTotals = cfb.docs
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number");
      }
    }

    const { avg, count } = blendPracticeScores(essayTotals, chocoTotals, CHOCO_WEIGHT);
    return blend(scTotal, avg, count, calculateRank);
  } catch (err) {
    console.warn("essay aggregate failed:", err);
    return blend(scTotal, null, 0, calculateRank);
  }
}
```
> 注: `essays.submittedAt` は Firestore Timestamp（`>= cutoff`(Date)）だが、`chokoReviews.submittedAt` は ISO 文字列で保存する（Task 2 の型）。文字列比較でも ISO は辞書順＝時刻順なので `>= cutoff.toISOString()` で正しく機能する。orderBy も同様。

- [ ] **Step 3: ビルドで型/参照を確認**

Run: `npm run build`
Expected: コンパイル成功（`Compiled successfully`）。失敗時はエラー箇所を修正。

- [ ] **Step 4: Commit**

```bash
git add src/lib/skill-check/aggregate.ts
git commit -m "feat(choco): fold choco reviews into essay rank aggregate (weight 0.5)"
```

---

## Task 10: API ルート `src/app/api/essay/choco-review/route.ts`

**Files:** Create `src/app/api/essay/choco-review/route.ts`

- [ ] **Step 1: 実装**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getChocoPassageById } from "@/data/choco-passages";
import { reviewChocoParagraph } from "@/lib/essay/choco-core";
import { computeChocoTotal } from "@/lib/choco/score";
import { applyChocoWeaknesses } from "@/lib/choco/apply-weakness";
import type { ChocoReview } from "@/lib/types/choco";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const { passageId, blankIndex, studentText } = await request.json();
  if (typeof passageId !== "string" || typeof blankIndex !== "number" || !studentText?.trim()) {
    return NextResponse.json({ error: "passageId / blankIndex / studentText が必要です" }, { status: 400 });
  }

  const passage = getChocoPassageById(passageId);
  if (!passage || blankIndex < 0 || blankIndex >= passage.paragraphs.length) {
    return NextResponse.json({ error: "本文が見つかりません" }, { status: 400 });
  }
  const target = passage.paragraphs[blankIndex];

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEYが設定されていません" }, { status: 503 });
  }

  let evaluation;
  try {
    evaluation = await reviewChocoParagraph({
      paragraphs: passage.paragraphs,
      blankIndex,
      studentText,
    });
  } catch (err) {
    console.error("[choco-review] AI failed:", err);
    return NextResponse.json({ error: "添削に失敗しました。もう一度お試しください。" }, { status: 500 });
  }

  const scores = { ...evaluation.scores, total: computeChocoTotal(evaluation.scores) };
  const now = new Date().toISOString();

  const { adminDb } = await import("@/lib/firebase/admin");
  let reviewId = "local";
  if (adminDb) {
    const ref = adminDb.collection(`users/${uid}/chokoReviews`).doc();
    reviewId = ref.id;
    const doc: ChocoReview = {
      id: reviewId,
      userId: uid,
      passageId: passage.id,
      facultyKey: passage.facultyKey,
      themeTitle: passage.themeTitle,
      blankIndex,
      role: target.role,
      studentText,
      modelText: target.text,
      keyPoints: target.keyPoints,
      scores,
      feedback: evaluation.feedback,
      wordCount: studentText.length,
      submittedAt: now,
      createdAt: now,
    };
    await ref.set(doc);

    // 連動（fire-and-forget、失敗しても結果は返す）
    void applyChocoWeaknesses(uid, evaluation.feedback.weaknessTags).catch((e) =>
      console.warn("[choco-review] weakness apply failed:", e),
    );
    void import("@/lib/skill-check/aggregate")
      .then(({ refreshEssayAggregateCache }) => refreshEssayAggregateCache(uid))
      .catch((e) => console.warn("[choco-review] aggregate refresh failed:", e));
    void import("@/lib/bigquery/logger")
      .then(({ logEssaySubmission }) =>
        logEssaySubmission({
          essay_id: reviewId,
          user_id: uid,
          university_id: "",
          faculty_id: passage.facultyKey,
          submitted_at: now,
          score_structure: evaluation.scores.coherence,
          score_logic: evaluation.scores.logic,
          score_expression: evaluation.scores.expression,
          score_ap_alignment: 0,
          score_originality: 0,
          score_total: scores.total,
          word_count: studentText.length,
          topic: passage.themeTitle,
          weakness_tags: evaluation.feedback.weaknessTags,
          improvement_tags: evaluation.feedback.improvements,
          essay_type: "choco",
        }),
      )
      .catch((e) => console.warn("[choco-review] BQ log failed:", e));
  }

  return NextResponse.json({
    id: reviewId,
    scores,
    feedback: evaluation.feedback,
    modelText: target.text,
    keyPoints: target.keyPoints,
    role: target.role,
    blankIndex,
  });
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: `Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/essay/choco-review/route.ts
git commit -m "feat(choco): add choco-review API (save + rank/weakness/BigQuery linkage)"
```

---

## Task 11: 穴あき本文パネル `src/components/essay/ChocoPassagePanel.tsx`

**Files:** Create `src/components/essay/ChocoPassagePanel.tsx`

- [ ] **Step 1: 実装（記入中は sticky で左に固定。伏せ段落は枠＋役割ラベル）**

```tsx
"use client";

import type { ChocoParagraph } from "@/lib/types/choco";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";

/**
 * 穴あき本文。blankIndex の段落は「ここを書く」枠として表示（本文は隠す）。
 * 記入ステップでは sticky にして、右の入力欄と並べても常に見えるようにする。
 */
export function ChocoPassagePanel({
  paragraphs,
  blankIndex,
  sticky = false,
}: {
  paragraphs: ChocoParagraph[];
  blankIndex: number;
  sticky?: boolean;
}) {
  return (
    <div className={sticky ? "lg:sticky lg:top-4" : ""}>
      <div className="rounded-xl border bg-card p-4 space-y-3 text-sm leading-relaxed max-h-[70vh] overflow-y-auto">
        {paragraphs.map((g, i) =>
          i === blankIndex ? (
            <div
              key={i}
              className="rounded-lg border-2 border-dashed border-teal-400 bg-teal-50/60 dark:bg-teal-950/20 p-3"
            >
              <div className="text-xs font-medium text-teal-700 dark:text-teal-300">
                ここを書く（{CHOCO_ROLE_LABELS[g.role]}）
              </div>
              <div className="mt-1 text-muted-foreground">
                前後の段落を手がかりに、この段落を右で書いてみよう。
              </div>
            </div>
          ) : (
            <p key={i} className="text-foreground/90">
              {g.text}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep "ChocoPassagePanel" || echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/components/essay/ChocoPassagePanel.tsx
git commit -m "feat(choco): add passage panel with blank slot"
```

---

## Task 12: 結果ビュー `src/components/essay/ChocoResultView.tsx`

**Files:** Create `src/components/essay/ChocoResultView.tsx`

- [ ] **Step 1: 実装（3軸レーダー＋講評＋赤ペン＋模範＋背景知識）**

`RedPenText` は既存 `src/app/student/essay/[id]/page.tsx` 内のローカル定義の可能性があるため、実装時に共有可能かを確認。共有できなければ本ビュー内で `LanguageCorrection[]` を素朴なリスト表示にする（下記は素朴表示版）。
```tsx
"use client";

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import type { ChocoScores, ChocoFeedback, ChocoRole } from "@/lib/types/choco";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";

export function ChocoResultView({
  scores, feedback, modelText, keyPoints, role,
}: {
  scores: ChocoScores;
  feedback: ChocoFeedback;
  modelText: string;
  keyPoints: string[];
  role: ChocoRole;
}) {
  const radarData = [
    { subject: "論理", value: scores.logic },
    { subject: "つながり", value: scores.coherence },
    { subject: "表現", value: scores.expression },
  ];
  return (
    <div className="space-y-6">
      {/* スコア + レーダー */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{scores.total}</span>
          <span className="text-muted-foreground text-sm">/ 50</span>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="80%">
              <PolarGrid gridType="polygon" stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} />
              <Radar name="スコア" dataKey="value" stroke="#2563eb" fill="#0ea5e9" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 講評 */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm leading-relaxed">{feedback.overall}</p>
        <List title="よかった点" items={feedback.goodPoints} color="text-emerald-600" />
        <List title="もう一歩" items={feedback.improvements} color="text-amber-600" />
        <p className="text-sm"><span className="font-medium">次の一手：</span>{feedback.nextTip}</p>
      </div>

      {/* 赤ペン */}
      {feedback.languageCorrections.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="text-sm font-medium">赤ペン</h3>
          {feedback.languageCorrections.map((c, i) => (
            <div key={i} className="text-sm">
              <span className="line-through text-rose-600">{c.original}</span>
              {" → "}
              <span className="text-emerald-600">{c.suggestion}</span>
              <span className="text-muted-foreground">（{c.reason}）</span>
            </div>
          ))}
        </div>
      )}

      {/* 模範段落 + 背景知識 */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-sm font-medium">模範（{CHOCO_ROLE_LABELS[role]}の段落）</h3>
        <p className="text-sm leading-relaxed">{modelText}</p>
        <h4 className="text-xs font-medium pt-2">この段落で押さえたい背景知識</h4>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {keyPoints.map((k, i) => <li key={i}>{k}</li>)}
        </ul>
      </div>
    </div>
  );
}

function List({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className={`text-sm font-medium ${color}`}>{title}</h3>
      <ul className="list-disc pl-5 text-sm">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep "ChocoResultView" || echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/components/essay/ChocoResultView.tsx
git commit -m "feat(choco): add result view (radar + feedback + model)"
```

---

## Task 13: 生徒ページ `src/app/student/essay/choco/page.tsx`

**Files:** Create `src/app/student/essay/choco/page.tsx`

- [ ] **Step 1: 実装（3ステップ: 選択→記入(2カラム)→結果）**

```tsx
"use client";

import { useMemo, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { ManuscriptEditor } from "@/components/essay/ManuscriptEditor";
import { ChocoPassagePanel } from "@/components/essay/ChocoPassagePanel";
import { ChocoResultView } from "@/components/essay/ChocoResultView";
import { CHOCO_FACULTIES, getChocoPassagesByFaculty, ALL_CHOCO_PASSAGES } from "@/data/choco-passages";
import type { ChocoPassage, ChocoScores, ChocoFeedback, ChocoRole } from "@/lib/types/choco";

type Result = {
  scores: ChocoScores;
  feedback: ChocoFeedback;
  modelText: string;
  keyPoints: string[];
  role: ChocoRole;
  blankIndex: number;
};

// 決定的でない乱数は import 時ではなくハンドラ内で使用（SSR回避）
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function ChocoPage() {
  const [facultyKey, setFacultyKey] = useState(CHOCO_FACULTIES[0].key);
  const [passage, setPassage] = useState<ChocoPassage | null>(null);
  const [blankIndex, setBlankIndex] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const byFaculty = getChocoPassagesByFaculty(facultyKey);
    return byFaculty.length > 0 ? byFaculty : ALL_CHOCO_PASSAGES;
  }, [facultyKey]);

  function startNew() {
    const p = pickRandom(candidates);
    setPassage(p);
    setBlankIndex(Math.floor(Math.random() * p.paragraphs.length));
    setText("");
    setResult(null);
    setError(null);
  }

  async function submit() {
    if (!passage) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/essay/choco-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId: passage.id, blankIndex, studentText: text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "添削に失敗しました");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "添削に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // 結果
  if (result && passage) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-lg font-bold">ちょこ添削の結果</h1>
        <ChocoResultView {...result} />
        <div className="flex gap-2">
          <Button onClick={startNew}>もう一問やる</Button>
        </div>
      </div>
    );
  }

  // 記入（2カラム: 左=穴あき本文 sticky / 右=入力）
  if (passage) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="lg:grid lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-6 lg:items-start">
          <ChocoPassagePanel paragraphs={passage.paragraphs} blankIndex={blankIndex} sticky />
          <div className="lg:min-w-0 space-y-3 mt-4 lg:mt-0">
            <p className="text-sm text-muted-foreground">
              左の本文の空欄（{passage.paragraphs.length}段落中 {blankIndex + 1}段落目）を書いてみよう。
            </p>
            <ManuscriptEditor value={text} onChange={setText} maxLength={300} placeholder="この段落を書いてみよう..." />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={submit} disabled={loading || text.trim().length < 20}>
                {loading ? "添削中..." : "添削してもらう"}
              </Button>
              <Button variant="outline" onClick={startNew} disabled={loading}>別の本文にする</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 開始（系統選択）
  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-lg font-bold">ちょこ添削</h1>
      <p className="text-sm text-muted-foreground">
        完成した小論文のうち、1段落だけを書いてみる練習です。前後の文章がお手本になります。
      </p>
      <div>
        <label className="text-sm font-medium">分野</label>
        <select
          className="mt-1 w-full rounded-lg border p-2 text-sm bg-background"
          value={facultyKey}
          onChange={(e) => setFacultyKey(e.target.value)}
        >
          {CHOCO_FACULTIES.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>
      <Button onClick={startNew}>はじめる</Button>
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: `Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/student/essay/choco/page.tsx
git commit -m "feat(choco): add student choco page (select -> fill -> result)"
```

---

## Task 14: 導線（ナビ）

**Files:** Modify `src/components/layout/Sidebar.tsx`, `BottomNav.tsx`, `MobileMenuContent.tsx`, `Header.tsx`

- [ ] **Step 1: Sidebar — 要約ドリルの直後に追加**

`src/components/layout/Sidebar.tsx` の `小論文添削` の `children` 配列、`要約ドリル` 行の直後に:
```tsx
{ label: "ちょこ添削", href: "/student/essay/choco", icon: ClipboardList },
```
（`ClipboardList` は既に import 済み。別アイコンにしたい場合は import に追加）

- [ ] **Step 2: BottomNav — 要約ドリルの直後に追加**

`src/components/layout/BottomNav.tsx` の `要約ドリル` エントリの直後に、同形式で:
```tsx
{ label: "ちょこ添削", href: "/student/essay/choco", icon: ClipboardList, iconBg: "bg-teal-100 dark:bg-teal-950/40", iconColor: "text-teal-700 dark:text-teal-300" },
```

- [ ] **Step 3: MobileMenuContent — 2箇所に追加**

`src/components/layout/MobileMenuContent.tsx`:
- グループ children（`要約ドリル` の直後）に `{ label: "ちょこ添削", href: "/student/essay/choco", icon: ClipboardList }`
- フラットな検索用リスト（同じ `要約ドリル` 行の直後）に同じ行

- [ ] **Step 4: Header — 専用タイトル（任意）**

`src/components/layout/Header.tsx` の `if (pathname.startsWith("/student/essay/new"))` の**上**に:
```ts
if (pathname.startsWith("/student/essay/choco")) return "小論文 / ちょこ添削";
```

- [ ] **Step 5: ビルド確認**

Run: `npm run build`
Expected: `Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/BottomNav.tsx src/components/layout/MobileMenuContent.tsx src/components/layout/Header.tsx
git commit -m "feat(choco): add navigation entries next to summary drill"
```

---

## Task 15: 最終検証（build + dev 目視）

- [ ] **Step 1: 全検証スクリプト＋ビルド**

Run:
```bash
npm run verify:choco && npm run validate:choco && npm run build
```
Expected: `choco logic OK` / `OK: 14 passages...` / `Compiled successfully`

- [ ] **Step 2: dev 目視チェック（ANTHROPIC_API_KEY 設定時）**

Run: `npm run dev` → ブラウザで生徒ログイン → サイドバー「ちょこ添削」
確認:
- 分野選択→はじめる→本文が出て1段落が「ここを書く」枠になっている。
- 左の本文がスクロールしても sticky で見え続ける（lg 幅）。
- 段落を書いて「添削してもらう」→ レーダー(3軸)＋点数(/50)＋講評＋赤ペン＋模範＋背景知識が出る。
- 「もう一問やる」で別の本文/別段落になる。
- （管理側）ダッシュボードのスキルランクが choco 実施後に更新される。BQ 未設定環境では `[BQ Mock] logEssaySubmission ... "essay_type":"choco"` がログに出る。

- [ ] **Step 3: 最終コミット（あれば）**

```bash
git add -A && git commit -m "chore(choco): final verification adjustments" || echo "nothing to commit"
```

---

## Self-Review 結果（プラン作成者チェック）
- **Spec 網羅**: §4(UX3ステップ=Task13) / §5(型=Task2, バンク=Task5, 保存=Task10) / §6(API=Task10, プロンプト=Task6) / §7.1(ランク=Task9) / §7.2(弱点=Task8,10) / §7.3(BigQuery=Task10) / §8(UI=Task11-13, レーダー=Task12, sticky=Task11,13) / §9(導線=Task14) / §10(エラー=Task7,10) / §11(検証=Task3,4,5,15) / §12(初期バンク7分野=Task5) — 全て対応。
- **Placeholder**: 純ロジック・API・型・プロンプト・集計・導線は完全コード。**本文14本の中身**のみ Task5 で「1本 exemplar＋テーマ指定」による執筆タスク（内容生成のため妥当）。`RedPenText` 共有可否は Task12 で確認事項として明記。
- **型整合**: `computeChocoTotal`(Task3)・`blendPracticeScores`(Task4)・`ChocoEvaluation`/`ChocoReview`(Task2)・`reviewChocoParagraph`(Task7)・API 出力(Task10)・`ChocoResultView` props(Task12) の名称・引数を一致確認済み。
- **既知の実装時確認事項**: (a) `WeaknessRecord` の実フィールド名(Task8) (b) `RedPenText` の共有可否(Task12) (c) `chokoReviews.submittedAt` を ISO 文字列で保存し集計側も文字列比較にする(Task9) — いずれもタスク本文に注記済み。

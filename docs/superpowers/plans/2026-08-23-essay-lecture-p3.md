# 小論文講座リニューアル P3 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 講座を20講まで伸ばし、設問タイプ別の型4つ（テーマ型・課題文型・資料型・解決策提示型）でフル答案を書かせ、本番の時間配分まで到達させる。

**Architecture:** 型の変形は**データで持つ**（`src/lib/types/essay-form.ts`）。6ブロックの並びは変えず、ラベルの置き換えと追加の段だけで4つの型を表現する。既存の添削コア（`reviewEssayCore`）は `questionType` / `sourceText` / `chartDataSummary` を既に受け取れるので、講義データが宣言した値を submit ルートが渡すだけにする。新しい見せ方は図解シーン（diagram）1つ。

**Tech Stack:** Next.js 16 / React 19 / TypeScript strict / Tailwind v4 / framer-motion 12 / 検証は `tsx` スクリプト＋`node:assert`

**設計書:** `docs/superpowers/specs/2026-08-23-essay-lecture-curriculum-design.md`
**前提:** P1・P2a は実装・push 済み（講座は15講、ドリル6種102問）

---

## 現在の状態（P2a 完了時点）

| order | id | title | 状態 |
|---|---|---|---|
| 1〜8 | | 導入・型を組む | アニメ＋ドリル |
| 9〜11 | essay-basics-12/13/14 | 中身の質 | アニメ＋ドリル |
| 12〜14 | essay-basics-03/02/15 | 読む・分析 | アニメ＋ドリル |
| 15 | essay-basics-08 | 推敲と原稿用紙ルール | 旧テキスト |

## P3 完了時の状態

| order | id | title | 作業 |
|---|---|---|---|
| 1〜14 | （変更なし） | | |
| 15 | essay-basics-16（新） | テーマ型 | 新規・フル答案600字 |
| 16 | essay-basics-17（新） | 課題文型 | 新規・フル答案800字 |
| 17 | essay-basics-18（新） | 資料型 | 新規・フル答案800字 |
| 18 | essay-basics-19（新） | 解決策提示型 | 新規・フル答案800字 |
| 19 | essay-basics-08 | 推敲と減点潰し | アニメ化（order 15→19） |
| 20 | essay-basics-20（新） | 本番の時間配分 | 新規・時間制限つき800字 |

**id は変えない。** 新規は連番。

---

### Task 1: 設問タイプ別の型をデータで持つ

**Files:**
- Create: `src/lib/types/essay-form.ts`
- Create: `scripts/verify-essay-forms.ts`
- Modify: `docs/superpowers/specs/2026-08-23-essay-lecture-curriculum-design.md`（4.2の字数配分を実装に合わせる）

- [ ] **Step 1: 検証スクリプトを書く**

`scripts/verify-essay-forms.ts`:

```ts
import assert from "node:assert";
import {
  ESSAY_FORMS,
  ESSAY_FORM_IDS,
  getEssayForm,
  formStepsOf,
} from "../src/lib/types/essay-form";
import { ESSAY_BLOCK_IDS } from "../src/lib/types/essay-block";

assert.deepEqual(ESSAY_FORM_IDS, ["theme", "passage", "data", "solution"]);
assert.equal(ESSAY_FORMS.length, 4);

for (const form of ESSAY_FORMS) {
  // 6ブロックすべてに字数の目安がある（0字のブロックを作らない）
  for (const b of ESSAY_BLOCK_IDS) {
    assert.ok(form.allocation[b] > 0, `${form.id}: allocation missing ${b}`);
  }
  // 800字ちょうどに配分する。合計が合わないと講義で示す配分が嘘になる
  const total =
    ESSAY_BLOCK_IDS.reduce((s, b) => s + form.allocation[b], 0) +
    (form.extraSteps ?? []).reduce((s, e) => s + e.chars, 0);
  assert.equal(total, 800, `${form.id}: 合計 ${total}字`);

  assert.ok(form.trigger.length > 0, `${form.id}: trigger`);
  assert.ok(form.pitfall.length > 0, `${form.id}: pitfall`);
}

// 書く順番は「6ブロックの並び ＋ 追加の段を差し込んだもの」
const dataSteps = formStepsOf("data");
assert.equal(dataSteps[0].label, "読み取り（事実）");
assert.equal(dataSteps[1].label, "解釈");
assert.equal(dataSteps.length, ESSAY_BLOCK_IDS.length + 1);

// 解決策提示型はラベルを置き換える（並びは変えない）
const solution = getEssayForm("solution")!;
assert.equal(solution.labelOverrides?.reason, "原因");
assert.equal(getEssayForm("unknown"), undefined);

console.log("essay forms OK");
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx scripts/verify-essay-forms.ts`
Expected: FAIL — `Cannot find module '../src/lib/types/essay-form'`

- [ ] **Step 3: 実装する**

`src/lib/types/essay-form.ts`:

```ts
import {
  ESSAY_BLOCKS,
  ESSAY_BLOCK_IDS,
  ESSAY_BLOCK_LABELS,
  type EssayBlockId,
} from "@/lib/types/essay-block";
import type { EssayQuestionType } from "@/lib/types/essay";

/**
 * 設問タイプ別の答案の型。
 *
 * 新しい型を4つ覚えさせるのではなく、基本型6ブロックの「変形」として教える。
 * そのため、どの型でもブロックの並びは変えない。変えるのは3つだけ:
 *   1. ラベルの置き換え（解決策提示型では③理由が「原因」になる）
 *   2. 追加の段（資料型では②立場の前に「読み取り」「解釈」が入る）
 *   3. 字数の配分
 * 並びまで変えると、8講までに体で覚えた順番が使えなくなる。
 */
export interface EssayFormExtraStep {
  label: string;
  /** このブロックの直前に入る */
  beforeBlock: EssayBlockId;
  /** 800字での目安 */
  chars: number;
}

export interface EssayForm {
  id: EssayFormId;
  name: string;
  /** 設問文の見分け方 */
  trigger: string;
  /** 800字での字数配分（6ブロック分。合計＋extraSteps で800になる） */
  allocation: Record<EssayBlockId, number>;
  /** ブロック名の置き換え */
  labelOverrides?: Partial<Record<EssayBlockId, string>>;
  /** 6ブロックに収まらない段 */
  extraSteps?: EssayFormExtraStep[];
  /** この型で一番効く一言 */
  focus: string;
  /** この型でよくある失敗 */
  pitfall: string;
  /** AI添削へ渡す設問タイプ。省略時は資料なしの設問として採点される */
  questionType?: EssayQuestionType;
}

export type EssayFormId = "theme" | "passage" | "data" | "solution";

export const ESSAY_FORMS: EssayForm[] = [
  {
    id: "theme",
    name: "テーマ型",
    trigger: "「〜について論じなさい」のように、テーマだけが与えられる",
    allocation: {
      question: 120,
      position: 60,
      reason: 160,
      evidence: 240,
      concession: 140,
      conclusion: 80,
    },
    focus: "テーマのままでは大きすぎる。自分で論点を一つに切る",
    pitfall: "論点を立てずに、一般論を並べて終わる",
  },
  {
    id: "passage",
    name: "課題文型",
    trigger: "「筆者の主張を踏まえて」のように、読む文章が与えられる",
    allocation: {
      question: 160,
      position: 60,
      reason: 140,
      evidence: 220,
      concession: 140,
      conclusion: 80,
    },
    labelOverrides: { question: "筆者の主張の要約" },
    focus: "①を要約にあてる。要約と自分の意見を混ぜない",
    pitfall: "要約が長くなり、③④の自分の論が痩せる",
    questionType: "report",
  },
  {
    id: "data",
    name: "資料型",
    trigger: "「グラフ（表）から読み取れることを踏まえて」のように、数値が与えられる",
    allocation: {
      question: 160,
      position: 60,
      reason: 120,
      evidence: 180,
      concession: 100,
      conclusion: 60,
    },
    labelOverrides: { question: "読み取り（事実）" },
    extraSteps: [{ label: "解釈", beforeBlock: "position", chars: 120 }],
    focus: "読み取り（事実）と解釈（そこから言えること）を分ける",
    pitfall: "同時に増えているだけの2つを、原因と結果として書いてしまう",
    questionType: "data-analysis",
  },
  {
    id: "solution",
    name: "解決策提示型",
    trigger: "「課題と解決策を述べなさい」のように、打ち手まで求められる",
    allocation: {
      question: 120,
      position: 60,
      reason: 160,
      evidence: 220,
      concession: 100,
      conclusion: 60,
    },
    labelOverrides: {
      reason: "原因",
      evidence: "解決策と実現可能性",
      concession: "副作用とコスト",
    },
    extraSteps: [{ label: "現状", beforeBlock: "reason", chars: 80 }],
    focus: "原因に対応した解決策を出す。原因と無関係な打ち手は評価されない",
    pitfall: "解決策を並べるだけで、実現できるかに触れない",
  },
];

export const ESSAY_FORM_IDS: EssayFormId[] = ESSAY_FORMS.map((f) => f.id);

/** id から1つ取得（未知のIDは undefined）。 */
export function getEssayForm(id: string): EssayForm | undefined {
  return ESSAY_FORMS.find((f) => f.id === id);
}

/** その型でのブロック名（置き換えがあればそれを返す）。 */
export function formBlockLabel(form: EssayForm, block: EssayBlockId): string {
  return form.labelOverrides?.[block] ?? ESSAY_BLOCK_LABELS[block];
}

export interface EssayFormStep {
  label: string;
  chars: number;
  /** 追加の段は blockId を持たない */
  blockId?: EssayBlockId;
}

/**
 * 書く順番に並べた段の一覧。講義の図解と課題のガイドはこれを使う。
 * 6ブロックの並びに、extraSteps を指定位置へ差し込んだもの。
 */
export function formStepsOf(id: EssayFormId): EssayFormStep[] {
  const form = getEssayForm(id);
  if (!form) return [];
  const steps: EssayFormStep[] = [];
  for (const block of ESSAY_BLOCK_IDS) {
    for (const extra of form.extraSteps ?? []) {
      if (extra.beforeBlock === block) {
        steps.push({ label: extra.label, chars: extra.chars });
      }
    }
    steps.push({
      label: formBlockLabel(form, block),
      chars: form.allocation[block],
      blockId: block,
    });
  }
  return steps;
}

/** ESSAY_BLOCKS を参照していることを型で保証する（未使用 import を防ぐ） */
export const ESSAY_FORM_BLOCK_COUNT = ESSAY_BLOCKS.length;
```

- [ ] **Step 4: 通す**

Run: `npx tsx scripts/verify-essay-forms.ts`
Expected: PASS — `essay forms OK`

- [ ] **Step 5: 設計書の字数配分を実装に合わせる**

`docs/superpowers/specs/2026-08-23-essay-lecture-curriculum-design.md` の 4.2 の表を、
上の `allocation` と同じ数字にする。設計書は「資料型は読取160/解釈120/②60/③120/④180/⑤100/⑥60」、
「解決策提示型は①120/現状120/原因160/解決策240/⑤100/⑥60」と書いてあるが、
解決策提示型は②立場が抜けていて合計も800にならない。実装（①120/②60/現状80/原因160/解決策220/⑤100/⑥60）に合わせる。

- [ ] **Step 6: コミット**

```bash
git add src/lib/types/essay-form.ts scripts/verify-essay-forms.ts docs/superpowers/specs/2026-08-23-essay-lecture-curriculum-design.md
git commit -m "feat(essay): 設問タイプ別の型4つをデータで定義する"
```

---

### Task 2: 図解シーン（diagram）

字数配分と時間配分を帯で見せる。17講（資料型）と20講（時間配分）で使う。

**Files:**
- Modify: `src/data/essay-lectures/types.ts`
- Create: `src/components/essay/lecture/DiagramScene.tsx`
- Modify: `src/components/essay/lecture/LectureAnimation.tsx`
- Modify: `src/data/essay-lectures/index.ts`
- Modify: `scripts/validate-essay-lectures.ts`

- [ ] **Step 1: 型を足す**

`src/data/essay-lectures/types.ts`:

```ts
/**
 * 帯で割合を見せる図。字数配分（800字の内訳）と時間配分（60分の使い方）に使う。
 * グラフのライブラリは入れない。帯の幅を割合で出すだけで足りる。
 */
export interface SceneDiagram {
  /** 単位。帯の下に「800字」「60分」のように出す */
  unit: "字" | "分";
  items: { label: string; value: number; note?: string }[];
}
```

`LectureScene` の `visual` に `"diagram"` を足し、`diagram?: SceneDiagram;` を足す。

- [ ] **Step 2: 描画を書く**

`src/components/essay/lecture/DiagramScene.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { SceneDiagram } from "@/data/essay-lectures";

/** 帯の色。6段まで。7段目以降は先頭に戻る */
const BAR_COLORS = [
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-violet-400",
  "bg-rose-400",
  "bg-teal-400",
];

/**
 * 割合を帯で見せる。数字だけ並べても「どこに一番使うのか」が伝わらない。
 * 帯の幅が実際の配分なので、④根拠が一番太いことが目で分かる。
 */
export function DiagramScene({ diagram }: { diagram: SceneDiagram }) {
  const total = diagram.items.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {diagram.items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ width: 0 }}
            animate={{ width: `${(item.value / total) * 100}%` }}
            transition={{ delay: i * 0.2, duration: 0.4 }}
            className={`${BAR_COLORS[i % BAR_COLORS.length]} h-full`}
          />
        ))}
      </div>

      <ul className="space-y-1 text-xs">
        {diagram.items.map((item, i) => (
          <motion.li
            key={item.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.2 + 0.2 }}
            className="flex items-center gap-2"
          >
            <span
              className={`${BAR_COLORS[i % BAR_COLORS.length]} size-2.5 shrink-0 rounded-sm`}
            />
            <span className="font-medium">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {item.value}
              {diagram.unit}
            </span>
            {item.note && (
              <span className="text-muted-foreground">— {item.note}</span>
            )}
          </motion.li>
        ))}
      </ul>

      <p className="text-right text-[11px] text-muted-foreground">
        合計 {total}
        {diagram.unit}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: 再生側に分岐を足す**

`LectureAnimation.tsx` の compare の下に:

```tsx
        {scene.visual === "diagram" && scene.diagram && (
          <DiagramScene key={scene.id} diagram={scene.diagram} />
        )}
```

import と、`index.ts` の型 export（`SceneDiagram`）も足す。

- [ ] **Step 4: 検証を足す**

`scripts/validate-essay-lectures.ts` のシーン検査に:

```ts
    if (s.visual === "diagram") {
      if (!s.diagram?.items.length) {
        fail(`diagram scene without items: ${l.id}/${s.id}`);
      } else {
        for (const item of s.diagram.items) {
          if (item.value <= 0) fail(`diagram item value <= 0: ${l.id}/${s.id}/${item.label}`);
        }
      }
    }
```

- [ ] **Step 5: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsc --noEmit`
Expected: `[essay-lectures] OK (15 lectures)` とエラーなし

- [ ] **Step 6: コミット**

```bash
git add src/data/essay-lectures/types.ts src/data/essay-lectures/index.ts src/components/essay/lecture/DiagramScene.tsx src/components/essay/lecture/LectureAnimation.tsx scripts/validate-essay-lectures.ts
git commit -m "feat(essay): 図解シーン（帯グラフ）を足す"
```

---

### Task 3: 課題に設問タイプの設定を持たせ、添削へ渡す

いまの講座の課題は、どれも「資料なしの設問」として採点されている。課題文型・資料型を
そのまま出すと、読み違いがあっても減点されない。講義データが宣言した設定を submit ルートが渡す。

**Files:**
- Modify: `src/data/essay-lectures/types.ts`
- Modify: `src/app/api/essay/lecture/submit/route.ts`
- Modify: `scripts/validate-essay-lectures.ts`

- [ ] **Step 1: 型を足す**

`LectureExercise` に足す:

```ts
export interface LectureExercise {
  prompt: string;
  wordLimit: number;
  minLength?: number;
  focusPoints: string[];
  /** 型のどのブロックを書かせるか。フル答案なら null */
  blockId?: EssayBlockId | null;
  /** 設問タイプ別の型。フル答案の講（15〜18講）で使う */
  formId?: EssayFormId;
  /** 課題文型の課題文。AI添削へそのまま渡す */
  sourceText?: string;
  /** 資料型の資料（数値の要約）。AI添削へそのまま渡す */
  chartDataSummary?: string;
  /** 制限時間（分）。20講だけ使う */
  timeLimitMin?: number;
}
```

import に `import type { EssayFormId } from "@/lib/types/essay-form";` を足す。

- [ ] **Step 2: submit ルートで渡す**

`src/app/api/essay/lecture/submit/route.ts` の `blockInfo` の下に足す:

```ts
    // 設問タイプ別の型。書く順番と字数配分をそのまま AI へ伝える。
    // 型を伝えないと、資料型の「読み取り→解釈」の2段が構成の乱れに見える。
    const form = lecture.exercise.formId
      ? getEssayForm(lecture.exercise.formId)
      : null;
    const formInfo = form
      ? `この課題は「${form.name}」の答案である。書く順番と字数の目安: ${formStepsOf(form.id)
          .map((s) => `${s.label}${s.chars}字`)
          .join(" → ")}。この型で特に見るところ: ${form.focus}。よくある失敗: ${form.pitfall}。`
      : "";
```

`lectureInfo` の組み立てに `${formInfo}` を挟む:

```ts
    const lectureInfo = `講義「${lecture.title}」の関連問題。${blockInfo}${formInfo}重点的に評価する観点: ${lecture.exercise.focusPoints.join("、")}。設問: ${lecture.exercise.prompt}`;
```

`reviewEssayCore` の呼び出しに3つ足す:

```ts
      const coreResult = await reviewEssayCore({
        ocrText: answerText,
        topic,
        // 型が questionType を指定していればそれを使う（資料型は数値の読み違いを減点する）
        questionType: form?.questionType ?? "lecture",
        sourceText: lecture.exercise.sourceText,
        chartDataSummary: lecture.exercise.chartDataSummary,
        lectureInfo,
        wordLimit: lecture.exercise.wordLimit,
        admissionPolicy: "",
        weaknessList,
        essaySelfAnalysis,
      });
```

import に足す:

```ts
import { getEssayForm, formStepsOf } from "@/lib/types/essay-form";
```

`essays` ドキュメントの `retryContext` にも型を残す（再提出時に同じ条件で採点するため）:

```ts
      retryContext: {
        questionType: form?.questionType ?? "lecture",
        lectureInfo,
        wordLimit: lecture.exercise.wordLimit,
        ...(lecture.exercise.sourceText
          ? { sourceText: lecture.exercise.sourceText }
          : {}),
        ...(lecture.exercise.chartDataSummary
          ? { chartDataSummary: lecture.exercise.chartDataSummary }
          : {}),
      },
```

- [ ] **Step 3: 検証を足す**

`scripts/validate-essay-lectures.ts` に:

```ts
  const ex = l.exercise;
  if (ex.formId) {
    if (!getEssayForm(ex.formId)) fail(`unknown formId: ${l.id}/${ex.formId}`);
    // 型を使う課題はフル答案。ブロック1つだけを書かせる課題と混ぜない
    if (ex.blockId) fail(`formId with blockId: ${l.id}`);
    if (ex.wordLimit < 400) fail(`formId with short wordLimit: ${l.id}`);
  }
  // 課題文・資料は、それを使う型のときだけ持たせる
  if (ex.sourceText && ex.formId !== "passage") {
    fail(`sourceText without passage form: ${l.id}`);
  }
  if (ex.chartDataSummary && ex.formId !== "data") {
    fail(`chartDataSummary without data form: ${l.id}`);
  }
```

import に `import { getEssayForm } from "../src/lib/types/essay-form";` を足す。

- [ ] **Step 4: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsc --noEmit && npm run build`
Expected: すべて成功

- [ ] **Step 5: コミット**

```bash
git add src/data/essay-lectures/types.ts src/app/api/essay/lecture/submit/route.ts scripts/validate-essay-lectures.ts
git commit -m "feat(essay): 課題の設問タイプを添削へ渡す"
```

---

### Task 4: 時間制限つきの課題

20講だけ。**時間切れでも自動提出はしない。** 書いたものが消えると学習にならないので、
残り時間を出して「ここまでで提出しよう」と促すに留める。

**Files:**
- Create: `src/components/essay/lecture/ExerciseTimer.tsx`
- Modify: `src/app/student/essay/lectures/[id]/page.tsx`

- [ ] **Step 1: タイマーを書く**

`src/components/essay/lecture/ExerciseTimer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/**
 * 課題の残り時間。本番の時間感覚をつかむために出す。
 *
 * 0 になっても自動提出しない。書いたものが消えるほうが学習の損失が大きく、
 * 「時間内に書き切れなかった」こと自体を本人が見るのが目的だから。
 */
export function ExerciseTimer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const mm = Math.floor(Math.max(0, left) / 60);
  const ss = Math.max(0, left) % 60;
  const over = left <= 0;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        over
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : left < 300
            ? "border-amber-300 bg-amber-50 text-amber-800"
            : "bg-card"
      }`}
    >
      <Timer className="size-4 shrink-0" />
      {over ? (
        <span>時間です。ここまでで提出しましょう。</span>
      ) : (
        <>
          <span className="tabular-nums font-semibold">
            残り {mm}:{String(ss).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground text-xs">
            本番は{minutes}分。書き切れなくても、時間内に手を止める練習をする
          </span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 課題画面に出す**

`src/app/student/essay/lectures/[id]/page.tsx` の `step === "exercise"` の中、
`{lecture.exercise.blockId && (...)}` の書き出し例の下に:

```tsx
        {lecture.exercise.timeLimitMin && (
          <ExerciseTimer minutes={lecture.exercise.timeLimitMin} />
        )}
```

import を足す:

```tsx
import { ExerciseTimer } from "@/components/essay/lecture/ExerciseTimer";
```

- [ ] **Step 3: 型の書き出し例を、型のある課題にも出す**

同じ場所の書き出し例のブロックを差し替える（フル答案では型の段を並べて出す）:

```tsx
        {lecture.exercise.blockId && (
          <p className="text-muted-foreground bg-muted/60 rounded-lg p-3 text-xs">
            書き出しの例: {getEssayBlock(lecture.exercise.blockId)?.starter}
          </p>
        )}

        {lecture.exercise.formId && (
          <div className="bg-muted/60 rounded-lg p-3 text-xs">
            <p className="font-medium">
              {getEssayForm(lecture.exercise.formId)?.name}の順番
            </p>
            <p className="text-muted-foreground mt-1">
              {formStepsOf(lecture.exercise.formId)
                .map((s) => `${s.label}${s.chars}字`)
                .join(" → ")}
            </p>
          </div>
        )}
```

import に `import { getEssayForm, formStepsOf } from "@/lib/types/essay-form";` を足す。

- [ ] **Step 4: 検証**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 5: コミット**

```bash
git add src/components/essay/lecture/ExerciseTimer.tsx "src/app/student/essay/lectures/[id]/page.tsx"
git commit -m "feat(essay): 型のガイドと制限時間を課題画面に出す"
```

---

### Task 5: 15・16講（テーマ型・課題文型）

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`

ここからフル答案。`blockId` は持たせず、`formId` を使う。

- [ ] **Step 1: 15講「テーマ型」（id: essay-basics-16、order: 15）**

`level: "実践"` / `drill: { kind: "particle" }` / `durationMin: 14`
`exercise`: `formId: "theme"` / `wordLimit: 600` / `minLength: 300`
prompt: 「『地域社会における高校生の役割』について、あなたの考えを600字以内で論じなさい。」
`focusPoints: ["論点の設定", "型の6ブロックの充足"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | manuscript | テーマだけ与えられた設問を1行。「これだけでは何を書くか決まらない」 |
| s2 | compare | before「地域社会について論じる。地域は大切である。」→ after「本問が問うているのは、高校生が地域の担い手になりうるかである。」/ note「テーマを、答えられる問いに切った」 |
| s3 | manuscript | 論点の切り方3例（担い手／居場所／世代間のつながり）を3行 |
| s4 | diagram | テーマ型の字数配分（①120②60③160④240⑤140⑥80、unit "字"） |
| s5 | compare | before（一般論だけの④）→ after（自分の見聞きした事実を入れた④）/ note「一般論をやめた」 |
| s6 | blocks | 6ブロック全部。テーマ型は並びをそのまま使うと示す |
| s7 | manuscript | 600字で書くときの配分（800字から比例で減らす）を2行 |

- [ ] **Step 2: 16講「課題文型」（id: essay-basics-17、order: 16）**

`level: "実践"` / `drill: { kind: "subject_predicate" }` / `durationMin: 15`
`exercise`: `formId: "passage"` / `wordLimit: 800` / `minLength: 400` / `sourceText` に課題文（250〜350字）を入れる
prompt: 「次の文章を読み、筆者の主張を踏まえたうえで、あなたの考えを800字以内で述べなさい。」
`focusPoints: ["筆者の主張の正確な把握", "要約と自論の分離"]`

`sourceText` は**自分で書く**。テーマは「地域の図書館の役割」など、賛否が割れるもの。
実在の著者・書名を出さないこと（架空の引用元を作らない。出典を書かず本文だけ置く）。

| シーン | visual | 中身 |
|---|---|---|
| s1 | manuscript | 課題文型の設問文と、①が要約になることを2行 |
| s2 | compare | before（要約に自分の意見が混ざった①）→ after（筆者の主張だけの①）/ note「自分の考えを外した」 |
| s3 | diagram | 課題文型の字数配分（①160②60③140④220⑤140⑥80） |
| s4 | compare | before（要約が400字を超えた答案の構成説明）→ after（160字に収めた要約）/ note「要約は①の中に収める」 |
| s5 | manuscript | 引用の書き方（「筆者は〜と述べる」）と、丸写しとの違いを2行 |
| s6 | blocks | question をハイライト。課題文型は①が要約になると示す |

- [ ] **Step 3: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsx scripts/verify-lecture-types.ts`
Expected: 17 lectures / order 連番（この時点で旧 08 の order を17にずらす）

- [ ] **Step 4: コミット**

```bash
git add src/data/essay-lectures/lessons.ts
git commit -m "feat(essay): 15・16講（テーマ型・課題文型）を足す"
```

---

### Task 6: 17・18講（資料型・解決策提示型）

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`

- [ ] **Step 1: 17講「資料型」（id: essay-basics-18、order: 17）**

`level: "実践"` / `drill: { kind: "sentence_length" }` / `durationMin: 15`
`exercise`: `formId: "data"` / `wordLimit: 800` / `minLength: 400` / `chartDataSummary` に資料を入れる
prompt: 「次の資料から読み取れることを踏まえ、あなたの考えを800字以内で述べなさい。」
`focusPoints: ["事実の正確な読み取り", "相関と因果の区別"]`

`chartDataSummary` は**練習用の架空データ**を使い、先頭に `【練習用の資料】` と明示する
（14講と同じ扱い。実在の統計と誤読されないため）。

| シーン | visual | 中身 |
|---|---|---|
| s1 | diagram | 資料型の字数配分（読み取り160／解釈120／②60／③120／④180／⑤100／⑥60、unit "字"） |
| s2 | manuscript | 「読み取り」と「解釈」の違いを2行（読み取り＝資料に書いてある／解釈＝そこから言えること） |
| s3 | compare | before「この資料から、Aが原因でBが起きていると分かる。」→ after「AとBは同じ時期に増えている。どちらが原因かは資料からは分からない。」/ note「相関を因果と書かない」 |
| s4 | compare | before（資料に無い数字を持ち出した文）→ after（資料の範囲で言い切った文）/ note「資料に無いことは書かない」 |
| s5 | manuscript | 割合と実数で結論が変わる例を2行 |
| s6 | blocks | 資料型では①が「読み取り」に変わり、②の前に「解釈」が入ると示す |

- [ ] **Step 2: 18講「解決策提示型」（id: essay-basics-19、order: 18）**

`level: "実践"` / `drill: { kind: "redundancy" }` / `durationMin: 15`
`exercise`: `formId: "solution"` / `wordLimit: 800` / `minLength: 400`
prompt: 「地域の公共交通の維持について、課題と解決策を800字以内で述べなさい。」
`focusPoints: ["原因と解決策の対応", "実現可能性への言及"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | diagram | 解決策提示型の字数配分（①120②60現状80原因160解決策220⑤100⑥60） |
| s2 | compare | before「バスの本数を増やすべきだ。」→ after「利用者が少ない時間帯を乗合タクシーに切り替え、朝夕の便を残すべきだ。」/ note「打ち手を、実行できる大きさにした」 |
| s3 | manuscript | 原因と解決策が対応していない例（原因＝運転手不足なのに解決策＝運賃値下げ）を2行 |
| s4 | compare | before（実現可能性に触れない解決策）→ after（費用と担い手に触れた解決策）/ note「誰がいくらで、を書いた」 |
| s5 | manuscript | ⑤で副作用・コストに触れると評価が上がることを2行 |
| s6 | blocks | ③が「原因」、④が「解決策と実現可能性」に変わると示す |

- [ ] **Step 3: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsx scripts/verify-lecture-types.ts`
Expected: 19 lectures / order 連番

- [ ] **Step 4: コミット**

```bash
git add src/data/essay-lectures/lessons.ts
git commit -m "feat(essay): 17・18講（資料型・解決策提示型）を足す"
```

---

### Task 7: 19・20講（推敲・本番の時間配分）

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`

- [ ] **Step 1: 19講「推敲と減点潰し」（id: essay-basics-08、order: 19）をアニメ化**

既存の旧テキスト講。`sections` は残し、`scenes` / `drill` / `exercise` を更新する。
`drill: { kind: "style" }` / `durationMin: 12`
`exercise`: `wordLimit: 400` / `blockId: null` / prompt「これまでに書いた答案から一つ選び、下の順序で見直して書き直しなさい。」
`focusPoints: ["表記の正確さ", "見直しの網羅"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | manuscript | 見直しの順序（1.設問に答えているか 2.型の段が揃っているか 3.一文の長さ 4.表記）を4行 |
| s2 | compare | before（話し言葉・誤字を含む文）→ after（直した文）/ note「文末と表記をそろえた」 |
| s3 | manuscript | 原稿用紙のルール（段落の一字下げ、句読点、数字の書き方）を3行 |
| s4 | compare | before（「い」抜き・ら抜き）→ after（直した文）/ note「話し言葉を書き言葉に」 |
| s5 | manuscript | 減点されやすい表記（感嘆符、記号、略語）を3行 |
| s6 | blocks | 6ブロック全部。最後に段が揃っているかを確かめると示す |

- [ ] **Step 2: 20講「本番の時間配分」（id: essay-basics-20、order: 20）**

`level: "実践"` / `drill` なし（本番想定なので課題に集中させる） / `durationMin: 12`
`exercise`: `formId: "theme"` / `wordLimit: 800` / `minLength: 400` / `timeLimitMin: 60`
prompt: 「『これからの社会で求められる学び方』について、60分で800字以内の答案を書きなさい。」
`focusPoints: ["時間内での完成", "型の6ブロックの充足"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | diagram | 60分の使い方（構想20／執筆30／見直し10、unit "分"） |
| s2 | manuscript | 構想20分で何をするか（設問分析→論点→型の段に一言ずつメモ）を3行 |
| s3 | manuscript | 書き始めてから構成を迷わないための下書きメモの例を4行 |
| s4 | compare | before（時間切れで⑥が無い答案の終わり方）→ after（⑤を削って⑥を残した終わり方）/ note「結論を先に確保した」 |
| s5 | diagram | 字数の配分（800字、テーマ型と同じ） |
| s6 | manuscript | 書き切れないときの優先順位（②⑥＞③④＞⑤）を3行 |

- [ ] **Step 3: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsx scripts/verify-lecture-types.ts && npm run build`
Expected: `[essay-lectures] OK (20 lectures)` / order 1..20 / build 成功

- [ ] **Step 4: コミット**

```bash
git add src/data/essay-lectures/lessons.ts
git commit -m "feat(essay): 19・20講（推敲・本番の時間配分）を足す"
```

---

### Task 8: 一覧の Phase を完成させる

**Files:**
- Modify: `src/app/student/essay/lectures/page.tsx`

- [ ] **Step 1: PHASES を差し替える**

```tsx
const PHASES: { key: string; label: string; orders: number[] }[] = [
  { key: "intro", label: "導入", orders: [1] },
  { key: "form", label: "型を組む", orders: [2, 3, 4, 5, 6, 7, 8] },
  { key: "content", label: "中身の質", orders: [9, 10, 11] },
  { key: "read", label: "読む・分析", orders: [12, 13, 14] },
  { key: "apply", label: "型を変形する", orders: [15, 16, 17, 18] },
  { key: "finish", label: "仕上げる", orders: [19, 20] },
];
```

- [ ] **Step 2: ビルド**

Run: `npm run build`

- [ ] **Step 3: コミット**

```bash
git add "src/app/student/essay/lectures/page.tsx"
git commit -m "feat(essay): 講座一覧のPhaseを6段階にする"
```

---

### Task 9: エミュレータで通しで確認する

- [ ] **Step 1: 起動**

```bash
npm run emu
npm run seed:emu
npm run dev:emu
```

- [ ] **Step 2: 確認項目**

- [ ] 一覧が6つの Phase に分かれ、全20講になっている
- [ ] 第15講（テーマ型）で**図解シーン**の帯が表示され、幅が字数配分どおりになっている
- [ ] 第15講の課題画面に「テーマ型の順番」が出る（①問い120字 → ②立場60字 → …）
- [ ] 第17講（資料型）の課題に資料が出て、順番に「読み取り」「解釈」が含まれる
- [ ] 第20講の課題画面にタイマーが出て、カウントダウンする
- [ ] 第20講のタイマーが0になっても**自動提出されない**
- [ ] 第16講（課題文型）を提出し、AI添削が課題文を踏まえた講評になる（実APIを叩く）
- [ ] 第19講（推敲）がアニメになっている

- [ ] **Step 3: 全検証**

```bash
npm run validate:data && npm run build
npx tsx scripts/verify-essay-blocks.ts
npx tsx scripts/verify-essay-forms.ts
npx tsx scripts/verify-sentence-drill.ts
npx tsx scripts/verify-lecture-types.ts
```

- [ ] **Step 4: push**

```bash
git push
```

---

## 完了の定義

- 講座が20講になり、すべてアニメ＋（20講以外は）ドリル付きで動く
- 15〜18講が設問タイプ別の型でフル答案を書かせ、型の順番が課題画面と添削プロンプトの両方に渡る
- 資料型の課題が `data-analysis` として採点される（数値の読み違いが logic で減点される）
- 20講にタイマーが出て、時間切れでも書いたものが消えない
- `npm run validate:data` / `npm run build` / verify スクリプト4本がすべて通る

## P3 に入れないもの

- 書き直し式ドリルと本人の赤ペン履歴からの出題（P2b）
- 要約ドリル・論理ドリルへのリンク導線（P2b）
- 管理者向けの「どの講で詰まっているか」画面（P2b）
- 講座の修了証・進捗バッジ

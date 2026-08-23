# 小論文講座リニューアル P2a 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小論文講座を 9〜14講まで伸ばし、文のドリルを6種に増やす。P1 で作った器（シーン再生・ドリル・ブロック課題）はそのまま使う。

**Architecture:** 新しい仕組みは「ビフォー／アフター対比シーン」1つだけ。あとは P1 の型に content を足す作業。ドリルは P1 と同じく**全問4択で AI を呼ばない**。本人の赤ペン履歴からの出題と書き直し式ドリルは P2b（別計画）。

**Tech Stack:** Next.js 16 / React 19 / TypeScript strict / Tailwind v4 / framer-motion 12 / 検証は `tsx` スクリプト＋`node:assert`

**設計書:** `docs/superpowers/specs/2026-08-23-essay-lecture-curriculum-design.md`
**前提:** `docs/superpowers/plans/2026-08-23-essay-lecture-p1.md` は実装・push 済み

---

## 現在の状態（P1 完了時点）

| order | id | title | scenes | drill | exercise.blockId |
|---|---|---|---|---|---|
| 1 | essay-basics-01 | 小論文とは何か | 6 | なし | null |
| 2 | essay-basics-04 | 型の全体像 | 6 | subject_predicate | evidence |
| 3 | essay-basics-05 | 立場を決める | 6 | subject_predicate | position |
| 4 | essay-basics-06 | 理由を書く | 6 | sentence_length | reason |
| 5 | essay-basics-09 | 根拠・具体例 | 6 | particle | evidence |
| 6 | essay-basics-07 | 譲歩と反論 | 6 | particle | concession |
| 7 | essay-basics-10 | 結論 | 6 | sentence_length | conclusion |
| 8 | essay-basics-11 | ブロックをつなぐ | 6 | particle | null |
| 9 | essay-basics-02 | 課題文の読み方 | 0（旧テキスト） | なし | — |
| 10 | essay-basics-03 | 設問分析 | 0（旧テキスト） | なし | — |
| 11 | essay-basics-08 | 推敲と原稿用紙ルール | 0（旧テキスト） | なし | — |

## P2a 完了時の状態

| order | id | title | 作業 |
|---|---|---|---|
| 1〜8 | （変更なし） | | |
| 9 | essay-basics-12（新） | 事実と意見を分ける | 新規 |
| 10 | essay-basics-13（新） | 抽象語を具体に落とす | 新規 |
| 11 | essay-basics-14（新） | 自分の経験の使い方 | 新規 |
| 12 | essay-basics-03 | 設問分析 | アニメ化（id 据え置き） |
| 13 | essay-basics-02 | 課題文の読み方 | アニメ化（id 据え置き） |
| 14 | essay-basics-15（新） | 資料・データの読み取り | 新規 |
| 15 | essay-basics-08 | 推敲と原稿用紙ルール | order 変更のみ（P3 で19講・アニメ化） |

**id は絶対に変えない。** 提出済み答案が `lectureId` で紐づいており、変えると受講記録が切れる。
新規講は `essay-basics-12` 以降の連番で足す。

## ドリルの割り当て

P1 の3種に3種を足して6種。9〜14講に1種ずつ割り当て、P1 の3種は9〜14講でも再登場させない
（同じ種類が続くと飽きるため、新しい3種を先に一巡させる）。

| order | 講 | drill |
|---|---|---|
| 9 | 事実と意見を分ける | style（文末・語彙） |
| 10 | 抽象語を具体に落とす | redundancy（冗長） |
| 11 | 自分の経験の使い方 | modifier（係り受け・指示語） |
| 12 | 設問分析 | style |
| 13 | 課題文の読み方 | modifier |
| 14 | 資料・データの読み取り | redundancy |

---

### Task 1: 対比シーン（compare）の型と描画

悪い文と直した文を左右に並べ、直した箇所だけ色を変えて見せるシーン。9〜11講の主役になる。

**Files:**
- Modify: `src/data/essay-lectures/types.ts`
- Create: `src/components/essay/lecture/CompareScene.tsx`
- Modify: `src/components/essay/lecture/LectureAnimation.tsx`
- Modify: `scripts/validate-essay-lectures.ts`

- [ ] **Step 1: 型に compare を足す**

`src/data/essay-lectures/types.ts` の `LectureScene` を差し替える:

```ts
/**
 * 講義アニメの1シーン。1シーン＝1メッセージ。
 * P2a で compare（悪い文と直した文の対比）を追加。diagram は P3。
 */
export interface LectureScene {
  id: string;
  /** 画面下に出る説明文 */
  caption: string;
  visual: "manuscript" | "blocks" | "compare";
  /** visual === "manuscript" のとき必須 */
  manuscript?: { lines: ManuscriptLine[] };
  /** visual === "blocks" のとき必須。filled が積まれ、missing は欠けて見える */
  blocks?: { filled: EssayBlockId[]; missing?: EssayBlockId[] };
  /** visual === "compare" のとき必須 */
  compare?: SceneCompare;
  /** 強調する型のブロック */
  highlightBlock?: EssayBlockId;
}

/**
 * 悪い文 → 直した文の対比。
 * `highlight` に入れた語は、直した側で色が変わる。どこが変わったのかを
 * 目で追えるようにするため（文全体を読み比べさせない）。
 */
export interface SceneCompare {
  before: string;
  after: string;
  /** after の中で色を変える語。before には無い語を入れる */
  highlight: string[];
  /** 何が変わったのかの一言。caption より短く、対比の真横に出る */
  note: string;
}
```

- [ ] **Step 2: 描画コンポーネントを書く**

`src/components/essay/lecture/CompareScene.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { SceneCompare } from "@/data/essay-lectures";

/**
 * 悪い文と直した文の対比。直した側の変わった語だけ色を変える。
 * 文全体を読み比べさせると「何が変わったのか」を探す作業になり、
 * 直し方そのものが頭に残らない。
 */
export function CompareScene({ compare }: { compare: SceneCompare }) {
  return (
    <div className="space-y-3">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm leading-relaxed text-rose-900"
      >
        {compare.before}
      </motion.p>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ArrowDown className="size-4" />
        {compare.note}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm leading-relaxed text-emerald-900"
      >
        {splitByHighlight(compare.after, compare.highlight).map((part, i) =>
          part.hit ? (
            <mark
              key={i}
              className="rounded bg-emerald-200/70 px-0.5 font-semibold text-emerald-900"
            >
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </motion.p>
    </div>
  );
}

/** after を highlight 語で分割する。語が見つからなければそのまま1片で返す。 */
function splitByHighlight(
  after: string,
  highlight: string[]
): { text: string; hit: boolean }[] {
  let parts: { text: string; hit: boolean }[] = [{ text: after, hit: false }];
  for (const word of highlight) {
    if (!word) continue;
    parts = parts.flatMap((part) => {
      if (part.hit || !part.text.includes(word)) return [part];
      const pieces = part.text.split(word);
      const out: { text: string; hit: boolean }[] = [];
      pieces.forEach((piece, i) => {
        if (piece) out.push({ text: piece, hit: false });
        if (i < pieces.length - 1) out.push({ text: word, hit: true });
      });
      return out;
    });
  }
  return parts;
}
```

- [ ] **Step 3: 再生側に分岐を足す**

`src/components/essay/lecture/LectureAnimation.tsx` の `<div className="min-h-56">` の中、
`blocks` の分岐の下に足す:

```tsx
        {scene.visual === "compare" && scene.compare && (
          <CompareScene key={scene.id} compare={scene.compare} />
        )}
```

import も足す:

```tsx
import { CompareScene } from "./CompareScene";
```

`src/data/essay-lectures/index.ts` の型 export に `SceneCompare` を足す:

```ts
export type { LectureScene, ManuscriptLine, LectureDrill, SceneCompare } from "./types";
```

- [ ] **Step 4: 検証を足す**

`scripts/validate-essay-lectures.ts` のシーン検査ループに足す:

```ts
    if (s.visual === "compare") {
      if (!s.compare) fail(`compare scene without compare: ${l.id}/${s.id}`);
      else {
        if (s.compare.before === s.compare.after) {
          fail(`compare before/after identical: ${l.id}/${s.id}`);
        }
        // highlight は after にだけある語。before にもあると「変わった箇所」にならない
        for (const w of s.compare.highlight) {
          if (!s.compare.after.includes(w)) {
            fail(`highlight not in after: ${l.id}/${s.id}/${w}`);
          }
          if (s.compare.before.includes(w)) {
            fail(`highlight also in before: ${l.id}/${s.id}/${w}`);
          }
        }
        if (s.compare.note.trim().length < 4) {
          fail(`short compare note: ${l.id}/${s.id}`);
        }
      }
    }
```

- [ ] **Step 5: 検証とビルド**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsc --noEmit`
Expected: `[essay-lectures] OK (11 lectures)` とエラーなし

- [ ] **Step 6: コミット**

```bash
git add src/data/essay-lectures/types.ts src/data/essay-lectures/index.ts src/components/essay/lecture/CompareScene.tsx src/components/essay/lecture/LectureAnimation.tsx scripts/validate-essay-lectures.ts
git commit -m "feat(essay): ビフォー／アフター対比シーンを足す"
```

---

### Task 2: ドリル3種を足す（型とラベル）

**Files:**
- Modify: `src/lib/types/sentence-drill.ts`
- Modify: `scripts/verify-sentence-drill.ts`

- [ ] **Step 1: 検証を先に直す**

`scripts/verify-sentence-drill.ts` の先頭の assert を差し替える:

```ts
// P2a で6種
assert.deepEqual(SENTENCE_DRILL_KINDS, [
  "particle",
  "subject_predicate",
  "sentence_length",
  "modifier",
  "style",
  "redundancy",
]);
assert.equal(SENTENCE_DRILL_LABELS.particle, "てにをは");
assert.equal(SENTENCE_DRILL_LABELS.modifier, "係り受け・指示語");
```

Run: `npx tsx scripts/verify-sentence-drill.ts`
Expected: FAIL（3種しかない）

- [ ] **Step 2: 型に3種足す**

`src/lib/types/sentence-drill.ts`:

```ts
export const SENTENCE_DRILL_KINDS = [
  "particle",
  "subject_predicate",
  "sentence_length",
  "modifier",
  "style",
  "redundancy",
] as const;
```

```ts
export const SENTENCE_DRILL_LABELS: Record<SentenceDrillKind, string> = {
  particle: "てにをは",
  subject_predicate: "主述の一致",
  sentence_length: "一文を切る",
  modifier: "係り受け・指示語",
  style: "文末・語彙",
  redundancy: "冗長",
};

export const SENTENCE_DRILL_DESCRIPTIONS: Record<SentenceDrillKind, string> = {
  particle: "助詞の選び方。「は」と「が」、助詞の重複を直す",
  subject_predicate: "主語と述語のねじれを直す",
  sentence_length: "長い一文を切って読みやすくする",
  modifier: "修飾語のかかり方と、指示語が指す先をはっきりさせる",
  style: "話し言葉を書き言葉に直し、文末を常体にそろえる",
  redundancy: "回りくどい言い方を短く言い切る",
};
```

- [ ] **Step 3: 通す**

Run: `npx tsx scripts/verify-sentence-drill.ts`
Expected: Task 3 の問題バンクを作るまで FAIL（`kind modifier has 0 items`）。Task 3 で通す。

- [ ] **Step 4: コミット**

```bash
git add src/lib/types/sentence-drill.ts scripts/verify-sentence-drill.ts
git commit -m "feat(essay): 文のドリルを6種に増やす"
```

---

### Task 3: ドリル3種の問題バンク（各17問）

**Files:**
- Create: `src/data/sentence-drills/modifier.ts`
- Create: `src/data/sentence-drills/style.ts`
- Create: `src/data/sentence-drills/redundancy.ts`
- Modify: `src/data/sentence-drills/index.ts`

**共通ルール（P1 と同じ。`scripts/validate-sentence-drills.ts` が検査する）:**
- 各種 17問。id は `md-001` / `st-001` / `rd-001` の連番
- `choices` は4つ、重複なし。`answerIndex` は4つの位置に散らす（0に偏らせない）
- `explanation` は10文字以上。高校生が読んで分かる説明にする
- 題材は小論文で出るテーマ（教育・医療・地域・環境・情報・労働）
- **誤答が実は正しくないことを1問ずつ確認する**（P1 で「は/が」の設問がこれで差し替えになった）

- [ ] **Step 1: modifier（係り受け・指示語）を書く**

出題の内訳: 修飾語の位置 6問 / 指示語が指す先 6問 / 二つの読み方ができる文 5問。

```ts
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

/**
 * 係り受け・指示語。修飾語がどこにかかるか、指示語が何を指すかを一つに定める。
 * 誤答は「かかり先が変わっていない」「指示語のまま」「語順だけ入れ替えて意味が変わった」。
 */
export const MODIFIER_ITEMS: SentenceDrillItem[] = [
  {
    id: "md-001",
    kind: "modifier",
    sentence: "私は熱心に活動する生徒会の顧問の先生に話を聞いた。",
    choices: [
      "私は、熱心に活動する生徒会の顧問の先生に話を聞いた。",
      "私は生徒会の顧問の先生に、熱心に活動する様子について話を聞いた。",
      "熱心に活動する生徒会の、顧問の先生に私は話を聞いた。",
      "私は熱心に、活動する生徒会の顧問の先生に話を聞いた。",
    ],
    answerIndex: 2,
    explanation:
      "「熱心に活動する」のが生徒会なのか先生なのか、元の文では決まらない。生徒会にかけるなら、読点で切って生徒会の直前に置く。",
  },
  {
    id: "md-002",
    kind: "modifier",
    sentence:
      "地域の高齢者を支援する制度が十分に知られていないことが問題である。それを解決するには、まず窓口を増やす必要がある。",
    choices: [
      "地域の高齢者を支援する制度が十分に知られていないことが問題である。これを解決するには、まず窓口を増やす必要がある。",
      "地域の高齢者を支援する制度が十分に知られていないことが問題である。この周知不足を解決するには、まず窓口を増やす必要がある。",
      "地域の高齢者を支援する制度が十分に知られていないことが問題である。それらを解決するには、まず窓口を増やす必要がある。",
      "地域の高齢者を支援する制度が十分に知られていないことが問題である。解決するには、まず窓口を増やす必要がある。",
    ],
    answerIndex: 1,
    explanation:
      "「それ」が制度を指すのか周知不足を指すのか読み取れない。指示語を使わず「この周知不足を」と名指しすれば一つに決まる。",
  },
  // md-003 〜 md-017 を同じ形式で作る
];
```

- [ ] **Step 2: style（文末・語彙）を書く**

出題の内訳: 話し言葉→書き言葉 6問 / 文末の常体統一 5問 / 「〜と思う」の乱用 3問 / ぼかし表現（〜的な、〜みたいな）3問。

```ts
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

/**
 * 文末・語彙。話し言葉を書き言葉に直し、文末を常体にそろえる。
 * 誤答は「敬体のまま」「話し言葉が残っている」「言い切りを避けている」。
 */
export const STYLE_ITEMS: SentenceDrillItem[] = [
  {
    id: "st-001",
    kind: "style",
    sentence: "この制度はすごく良いと思うので、もっと広めた方がいいと思います。",
    choices: [
      "この制度はとても良いと思うので、もっと広めた方がいいと思う。",
      "この制度は有効であり、対象を広げるべきである。",
      "この制度はすごく良いので、もっと広めるべきだと思います。",
      "この制度はかなり良いと思うから、もっと広めた方がいい。",
    ],
    answerIndex: 1,
    explanation:
      "「すごく」は話し言葉、「〜と思う」の重複は主張を弱める。程度を表す語を書き言葉にし、文末を「〜べきである」で言い切る。",
  },
  // st-002 〜 st-017 を同じ形式で作る
];
```

- [ ] **Step 3: redundancy（冗長）を書く**

出題の内訳: 「〜することができる」→「〜できる」5問 / 二重表現（頭痛が痛い型）4問 /
「〜という」の削れる用法 4問 / 同語反復 4問。

```ts
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

/**
 * 冗長。同じ内容を短く言い切る。
 * 誤答は「短くなったが意味が変わった」「別の冗長表現に置き換えただけ」「短くなっていない」。
 */
export const REDUNDANCY_ITEMS: SentenceDrillItem[] = [
  {
    id: "rd-001",
    kind: "redundancy",
    sentence:
      "この方法を用いることによって、誰もが情報にアクセスすることができるようになるということが期待される。",
    choices: [
      "この方法を用いることで、誰もが情報にアクセスすることができるようになると期待される。",
      "この方法を用いれば、誰もが情報にアクセスできるようになると期待される。",
      "この方法によって、誰もが情報にアクセスすることが可能になるということが期待される。",
      "この方法を用いれば、誰もが情報にアクセスできる。",
    ],
    answerIndex: 1,
    explanation:
      "「〜することができる」は「〜できる」、「〜ということが」は「〜と」で足りる。4は「期待される」が消えて、書き手の見通しが事実の断定に変わってしまう。",
  },
  // rd-002 〜 rd-017 を同じ形式で作る
];
```

- [ ] **Step 4: index に足す**

`src/data/sentence-drills/index.ts`:

```ts
import { PARTICLE_ITEMS } from "./particle";
import { SUBJECT_PREDICATE_ITEMS } from "./subject-predicate";
import { SENTENCE_LENGTH_ITEMS } from "./sentence-length";
import { MODIFIER_ITEMS } from "./modifier";
import { STYLE_ITEMS } from "./style";
import { REDUNDANCY_ITEMS } from "./redundancy";
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

export const ALL_SENTENCE_DRILL_ITEMS: SentenceDrillItem[] = [
  ...PARTICLE_ITEMS,
  ...SUBJECT_PREDICATE_ITEMS,
  ...SENTENCE_LENGTH_ITEMS,
  ...MODIFIER_ITEMS,
  ...STYLE_ITEMS,
  ...REDUNDANCY_ITEMS,
];
```

- [ ] **Step 5: 検証を通す**

Run: `npx tsx scripts/validate-sentence-drills.ts && npx tsx scripts/verify-sentence-drill.ts`
Expected: `[sentence-drills] OK (102 items)` と `sentence drill OK`

`sentence_length` 用の90字チェックは他の種類には効かない（`it.kind === "sentence_length"` の分岐）ので、
新しい3種の文が短くても落ちない。落ちる場合は選択肢の重複か explanation の短さを疑う。

- [ ] **Step 6: コミット**

```bash
git add src/data/sentence-drills
git commit -m "feat(essay): ドリル問題バンクに係り受け・文末語彙・冗長を足す"
```

---

### Task 4: 9〜11講（中身の質）を書く

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`

3講とも新規。`sections`（旧テキスト）は新規講にも書く（管理者が内容を確認するのに使うため）。
シーンは6〜8個。**compare シーンを主役にする**（この3講は「書き換え」を教える講だから）。

- [ ] **Step 1: 9講「事実と意見を分ける」（id: essay-basics-12）**

`order: 9` / `level: "実践"` / `drill: { kind: "style" }` / `durationMin: 10`
`exercise`: 事実・推測・意見が混ざった文を3つに分けて書き直す 200字 / `blockId: "evidence"`
`focusPoints: ["事実と意見の区別", "断定の適切さ"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | compare | before「若者の投票率が低いのは、政治に関心がないからだ。」→ after「若者の投票率は他の年代より低い。その理由の一つとして、政治との接点の少なさが指摘されている。」/ note「断定を事実と推測に分けた」 |
| s2 | manuscript | 「事実（確かめられる）／推測（たぶんそうだ）／意見（こうすべきだ）」の3行を並べる |
| s3 | compare | before「SNSは人間関係を壊している。」→ after「SNSの利用時間が長い人ほど対面での交流が減るという調査がある。」/ note「印象を、確かめられる形にした」 |
| s4 | manuscript | 事実と意見を続けて書いた良い例（bad→good ではなく good のみ）。blockId は evidence |
| s5 | compare | before「この制度は失敗だった。」→ after「この制度は利用率が想定の三割にとどまった。目的を達したとは言いがたい。」/ note「評価の前に事実を置いた」 |
| s6 | manuscript | 「事実だけ」「意見だけ」の答案がどう読まれるかを2行で対比 |
| s7 | blocks | evidence をハイライトし、④は事実、②③は意見の場所だと示す |

- [ ] **Step 2: 10講「抽象語を具体に落とす」（id: essay-basics-13）**

`order: 10` / `level: "実践"` / `drill: { kind: "redundancy" }` / `durationMin: 10`
`exercise`: 「多様性」「地域活性化」などの抽象語を1つ選び、扱える大きさに切って200字 / `blockId: "question"`
`focusPoints: ["抽象語の具体化", "論点の大きさ"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | manuscript | 「社会問題について論じなさい」に対し、抽象語のまま書いた答案（bad） |
| s2 | compare | before「多様性を尊重する社会が必要だ。」→ after「外国籍の子どもが母語で学べる環境を整える必要がある。」/ note「誰の何の話かまで下ろした」 |
| s3 | compare | before「地域活性化に取り組むべきだ。」→ after「商店街の空き店舗を、高校生が使える学習スペースに変えるべきだ。」/ note「取り組みの中身を一つに絞った」 |
| s4 | manuscript | 抽象語のはしご（社会問題 → 教育格差 → 通塾費用の差 → 自宅で学べる仕組み）を4行 |
| s5 | compare | before「情報化社会の課題は大きい。」→ after「検索結果の上位だけを読んで判断してしまう習慣が課題である。」/ note「大きい・重要だ、で終わらせない」 |
| s6 | blocks | question をハイライト。①問いを小さく切れば②〜⑥が書きやすくなる |

- [ ] **Step 3: 11講「自分の経験の使い方」（id: essay-basics-14）**

`order: 11` / `level: "実践"` / `drill: { kind: "modifier" }` / `durationMin: 12`
`exercise`: 自分の経験を④根拠として200字 / `blockId: "evidence"`
`focusPoints: ["経験と主張の結びつき", "具体性"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | compare | before「部活動を通して協調性を学びました。とても良い経験でした。」→ after「合奏の練習方針で部員の意見が二つに割れたとき、私は両者の主張を紙に書き出して共通点を探した。」/ note「感想を、起きたことに変えた」 |
| s2 | manuscript | 「経験→学び」で終わる答案と、「経験→主張の根拠」になっている答案の2行 |
| s3 | compare | before「この経験から成長できました。」→ after「この経験は、対立を減らすには判断の材料を共有することが有効だという私の主張を裏づけている。」/ note「経験が何を支えるのかを言い切った」 |
| s4 | manuscript | 独自性（配点5）は「珍しい経験」ではなく「自分にしか書けない観察」だと2行で示す |
| s5 | compare | before「私は責任感が強い人間です。」→ after「私は当日の朝に欠席が出たとき、代役を自分で引き受けて進行表を書き直した。」/ note「性格の主張を、行動の記述に変えた」 |
| s6 | blocks | evidence をハイライト。経験は④に置く。②立場や⑥結論には置かない |

- [ ] **Step 4: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsx scripts/verify-lecture-types.ts`
Expected: `[essay-lectures] OK (14 lectures)` と `lecture types OK`

（この時点で旧 essay-basics-02/03/08 の order は 12/13/14 にずらす必要がある。
Task 5 でアニメ化するときに一緒に振り直すのではなく、**ここで先に order だけ振り直す**こと。
order が飛ぶと `verify-lecture-types.ts` が落ちる。）

- [ ] **Step 5: コミット**

```bash
git add src/data/essay-lectures/lessons.ts
git commit -m "feat(essay): 9〜11講（中身の質）を足す"
```

---

### Task 5: 12・13講（設問分析・課題文の読み方）をアニメ化

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`

既存の `essay-basics-03`（設問分析）と `essay-basics-02`（課題文の読み方）に `scenes` / `drill` /
`exercise.blockId` を足す。**id と `sections` は残す。**

- [ ] **Step 1: 12講「設問分析」（id: essay-basics-03、order: 12）**

`drill: { kind: "style" }` / `exercise`: 設問から書くべき要素を列挙して200字 / `blockId: "question"`
`focusPoints: ["設問要求の把握", "条件の網羅"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | manuscript | 設問文を1行置き、条件（字数・観点・比較の指定）に印を付けていく |
| s2 | compare | before（設問「AとBを比較して論じよ」に対しAだけ書いた答案の冒頭）→ after（両方に触れた冒頭）/ note「比較の指定を拾った」 |
| s3 | manuscript | 「論じなさい」「説明しなさい」「あなたの考えを述べなさい」の求めるものの違いを3行 |
| s4 | compare | before「〜について論じる。」だけの①→ after 問いを言い換えた① / note「設問を写さず、自分の言葉にした」 |
| s5 | manuscript | 条件の取りこぼしチェック（字数・観点・具体例の有無）を3行 |
| s6 | blocks | question をハイライト。設問分析は①を作る作業だと示す |

- [ ] **Step 2: 13講「課題文の読み方」（id: essay-basics-02、order: 13）**

`drill: { kind: "modifier" }` / `exercise`: 短い課題文を150字で要約 / `blockId: "question"`
`focusPoints: ["筆者の主張の正確な把握", "要約と意見の分離"]`

| シーン | visual | 中身 |
|---|---|---|
| s1 | manuscript | 短い課題文（4〜5行）を置き、主張の1文だけ tone: "good" にする |
| s2 | manuscript | 「つまり」「したがって」の後ろに主張が来やすいことを2行で示す |
| s3 | compare | before（要約に自分の意見が混ざった文）→ after（筆者の主張だけの要約）/ note「自分の考えを外した」 |
| s4 | compare | before（課題文の言葉をそのまま並べた要約）→ after（自分の言葉でまとめた要約）/ note「写経をやめた」 |
| s5 | manuscript | 要約→自分の立場、の順に並べた①②の2行 |
| s6 | blocks | question と position を並べ、課題文型では①が要約になると示す |

要約ドリルへの導線として、`keyTakeaways` に「要約ドリルで練習できる」と一言入れること
（リンクは P3。ここでは文言だけ）。

- [ ] **Step 3: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsc --noEmit`
Expected: `[essay-lectures] OK (14 lectures)`

- [ ] **Step 4: コミット**

```bash
git add src/data/essay-lectures/lessons.ts
git commit -m "feat(essay): 12・13講をアニメ講義に書き換える"
```

---

### Task 6: 14講（資料・データの読み取り）を書く

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`

新規 `id: essay-basics-15` / `order: 14` / `level: "実践"` / `drill: { kind: "redundancy" }` / `durationMin: 12`
`exercise`: 数値を示した短い資料を読み、読み取りと解釈を200字 / `blockId: "evidence"`
`focusPoints: ["事実の正確な読み取り", "相関と因果の区別"]`

**図解シーン（diagram）は P3 なので、数値は manuscript の行として並べる。**
グラフの絵は出さず、「調査Aでは〜%」という数字を文で見せる。

- [ ] **Step 1: シーンを書く**

| シーン | visual | 中身 |
|---|---|---|
| s1 | manuscript | 資料の数値を3行（例: 2015年 32% / 2020年 41% / 2025年 55%） |
| s2 | compare | before「この数値から、制度が効果を上げていることが分かる。」→ after「この数値は割合の増加を示している。増加の理由は資料からは読み取れない。」/ note「読み取りと解釈を分けた」 |
| s3 | compare | before「AとBには関係があるので、AがBの原因である。」→ after「AとBは同時に増えている。ただし、どちらが原因かはこの資料では判断できない。」/ note「相関を因果と書かない」 |
| s4 | manuscript | 「割合」と「実数」の違いで結論が変わる例を2行 |
| s5 | manuscript | 資料型の型（読み取り→解釈→②立場→③理由…）を7行で並べる |
| s6 | blocks | evidence をハイライト。資料は④の材料になる |
| s7 | compare | before（資料に無い数字を持ち出した文）→ after（資料の範囲で言い切った文）/ note「資料に無いことは書かない」 |

- [ ] **Step 2: 推敲講の order を15にする**

`essay-basics-08`（推敲と原稿用紙ルール）の `order` を 15 にする。他は変えない。

- [ ] **Step 3: 検証**

Run: `npx tsx scripts/validate-essay-lectures.ts && npx tsx scripts/verify-lecture-types.ts`
Expected: `[essay-lectures] OK (15 lectures)` と `lecture types OK`（order 1..15 の連番）

- [ ] **Step 4: コミット**

```bash
git add src/data/essay-lectures/lessons.ts
git commit -m "feat(essay): 14講（資料・データの読み取り）を足す"
```

---

### Task 7: 一覧の Phase を更新する

**Files:**
- Modify: `src/app/student/essay/lectures/page.tsx`

- [ ] **Step 1: PHASES を差し替える**

```tsx
const PHASES: { key: string; label: string; orders: number[] }[] = [
  { key: "intro", label: "導入", orders: [1] },
  { key: "form", label: "型を組む", orders: [2, 3, 4, 5, 6, 7, 8] },
  { key: "content", label: "中身の質", orders: [9, 10, 11] },
  { key: "read", label: "読む・分析", orders: [12, 13, 14] },
  { key: "finish", label: "仕上げる", orders: [15] },
];
```

- [ ] **Step 2: ビルド**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: コミット**

```bash
git add src/app/student/essay/lectures/page.tsx
git commit -m "feat(essay): 講座一覧のPhaseを4段階に増やす"
```

---

### Task 8: エミュレータで通しで確認する

- [ ] **Step 1: 起動**

```bash
npm run emu
npm run seed:emu
npm run dev:emu
```

- [ ] **Step 2: 確認項目**

`student@example.com` / `password` でログインし、`/student/essay/lectures` を開く。

- [ ] 一覧が5つの Phase（導入／型を組む／中身の質／読む・分析／仕上げる）に分かれている
- [ ] 第9講「事実と意見を分ける」で**対比シーン**が表示され、直した側の語だけ色が変わっている
- [ ] 第9講のドリルが「文末・語彙」になっている
- [ ] 第11講のドリルが「係り受け・指示語」になっている
- [ ] 第13講「課題文の読み方」がアニメになっている（旧テキストが出ない）
- [ ] 第15講「推敲と原稿用紙ルール」が旧テキストのまま動く
- [ ] 9講の課題を提出して採点結果が出る（AI添削は実APIを叩く）

- [ ] **Step 3: 全検証とビルド**

```bash
npm run validate:data && npm run build
npx tsx scripts/verify-essay-blocks.ts
npx tsx scripts/verify-sentence-drill.ts
npx tsx scripts/verify-lecture-types.ts
```

- [ ] **Step 4: push**

```bash
git push
```

---

## 完了の定義

- 講座が15講になり、1〜14講がアニメ＋ドリル、15講が旧テキストで動く
- 文のドリルが6種・102問になり、9〜14講で新しい3種が使われている
- 対比シーンが9〜14講で表示され、変わった語だけ色が付く
- `npm run validate:data` / `npm run build` / verify スクリプト3本がすべて通る

## P2a に入れないもの（P2b）

- 書き直し式ドリル（自分で直して AI が判定する）
- 本人の赤ペン履歴（`languageCorrections`）からの出題
- 要約ドリル・論理ドリルへの導線（リンク）
- 管理者向けの「どの講で詰まっているか」画面

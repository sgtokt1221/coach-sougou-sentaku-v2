# 小論文講座リニューアル P1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の小論文講座（テキスト8講）を、アニメ講義 → 文のドリル → 型のブロック課題 → AI添削 の4ステップに作り替え、Phase 0-1（全8講）を通しで動かす。

**Architecture:** 講義データ（`src/data/essay-lectures`）に「シーン」「ドリル」「型のブロックID」を足し、講義ページを4ステップの状態機械にする。アニメは framer-motion のステップ再生（原稿用紙タイプ／ブロック積み上げの2パターン）。文のドリルは**全問選択式**にして AI を呼ばずに採点する。課題の採点は既存の `/api/essay/lecture/submit` をそのまま使い、`lectureInfo` に型のブロック名を足すだけにする。

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript strict / Tailwind v4 / framer-motion 12 / Firestore (Admin SDK) / 検証は `tsx` スクリプト＋`node:assert`

**設計書:** `docs/superpowers/specs/2026-08-23-essay-lecture-curriculum-design.md`

---

## 前提知識（この repo 固有）

- **テストフレームワークは無い。** 既存の検証は2種類。
  - `scripts/verify-*.ts` … ロジックの検証。`node:assert` で書き、最後に `console.log("... OK")`。例: `scripts/verify-choco-logic.ts`
  - `scripts/validate-*.ts` … 静的データの検証。`fail()` でエラーを数え、`process.exit(errors ? 1 : 0)`。例: `scripts/validate-logic-drills.ts`
  - `validate-*` は `package.json` の `validate:data` に連結されており、`npm run build` が必ず通す。
- **実行方法:** `npx tsx scripts/xxx.ts`
- **UI の確認:** `npm run emu` → `npm run seed:emu` → `npm run dev:emu` で `student@example.com` / `password`。詳細は CLAUDE.md 6章。
- **日付フィールド:** `users/*/logicDrills` などのドリル系は `completedAt` が **Firestore Timestamp**。新しく作る `sentenceDrills` も Timestamp に揃える（CLAUDE.md 6.5）。
- **コミット:** 作業が終わったら確認なしで main へ push してよい（CLAUDE.md 5.5）。ただし本計画では**タスクごとにコミット、push はまとめて最後**にする。

---

### Task 1: 型の6ブロックを定義する

型のブロック名を1か所で持つ。講義・課題・添削フィードバックが同じ語彙を使うための土台。

**Files:**
- Create: `src/lib/types/essay-block.ts`
- Create: `scripts/verify-essay-blocks.ts`

- [ ] **Step 1: 検証スクリプトを書く（先に失敗させる）**

`scripts/verify-essay-blocks.ts`:

```ts
import assert from "node:assert";
import {
  ESSAY_BLOCKS,
  ESSAY_BLOCK_LABELS,
  ESSAY_BLOCK_IDS,
  getEssayBlock,
} from "../src/lib/types/essay-block";

// 6ブロック。順番が答案を書く順そのものなので、並びも固定する
assert.deepEqual(ESSAY_BLOCK_IDS, [
  "question",
  "position",
  "reason",
  "evidence",
  "concession",
  "conclusion",
]);
assert.equal(ESSAY_BLOCKS.length, 6);

// ラベルは全ブロック分そろっている
for (const id of ESSAY_BLOCK_IDS) {
  assert.ok(ESSAY_BLOCK_LABELS[id], `label missing: ${id}`);
}
assert.equal(ESSAY_BLOCK_LABELS.position, "立場");

// 書き出しの例は各ブロックに必ずある（講義とエディタの両方で出す）
for (const b of ESSAY_BLOCKS) {
  assert.ok(b.starter.length > 0, `starter missing: ${b.id}`);
}

// 未知のIDは undefined を返す（呼び出し側で分岐できるようにする）
assert.equal(getEssayBlock("position")?.label, "立場");
assert.equal(getEssayBlock("unknown"), undefined);

console.log("essay blocks OK");
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx scripts/verify-essay-blocks.ts`
Expected: FAIL — `Cannot find module '../src/lib/types/essay-block'`

- [ ] **Step 3: 実装する**

`src/lib/types/essay-block.ts`:

```ts
/**
 * 小論文の基本型（6ブロック）。
 *
 * 講義・課題・AI添削のフィードバック・弱点DBで、この名前だけを使う。
 * 呼び名がばらつくと「構成が弱い」という指摘が、生徒の中で講義とつながらない。
 * 設問タイプ別の型（テーマ型・課題文型・資料型・解決策提示型）は、この6ブロックの
 * どれが置き換わるかで説明する（Phase 4 で追加）。
 */
export const ESSAY_BLOCKS = [
  {
    id: "question",
    label: "問い",
    role: "何を論じるかを自分の言葉で確定する",
    starter: "本問が問うているのは〜である",
  },
  {
    id: "position",
    label: "立場",
    role: "問いに直接答える。一つに決める",
    starter: "私は〜と考える",
  },
  {
    id: "reason",
    label: "理由",
    role: "なぜその立場を取るのか",
    starter: "なぜなら〜だからである",
  },
  {
    id: "evidence",
    label: "根拠・具体例",
    role: "理由を支える事実・経験・データ",
    starter: "実際、〜",
  },
  {
    id: "concession",
    label: "譲歩と反論",
    role: "想定反論を受け止めてから切り返す",
    starter: "確かに〜。しかし〜",
  },
  {
    id: "conclusion",
    label: "結論",
    role: "立場を言い直して閉じる",
    starter: "したがって〜",
  },
] as const;

export type EssayBlockId = (typeof ESSAY_BLOCKS)[number]["id"];

export const ESSAY_BLOCK_IDS: EssayBlockId[] = ESSAY_BLOCKS.map((b) => b.id);

export const ESSAY_BLOCK_LABELS: Record<EssayBlockId, string> =
  Object.fromEntries(ESSAY_BLOCKS.map((b) => [b.id, b.label])) as Record<
    EssayBlockId,
    string
  >;

/** id から1ブロック取得（未知のIDは undefined）。 */
export function getEssayBlock(
  id: string
): (typeof ESSAY_BLOCKS)[number] | undefined {
  return ESSAY_BLOCKS.find((b) => b.id === id);
}
```

- [ ] **Step 4: 通ることを確認する**

Run: `npx tsx scripts/verify-essay-blocks.ts`
Expected: PASS — `essay blocks OK`

- [ ] **Step 5: コミット**

```bash
git add src/lib/types/essay-block.ts scripts/verify-essay-blocks.ts
git commit -m "feat(essay): 小論文の基本型6ブロックを定義する"
```

---

### Task 2: 講義データ型にシーン・ドリル・ブロックIDを足す

既存の `sections`（テキスト解説）は消さずに残す。移行が済むまで両方描けるようにするため。

**Files:**
- Modify: `src/data/essay-lectures/types.ts`
- Modify: `src/data/essay-lectures/index.ts`
- Create: `scripts/verify-lecture-types.ts`

- [ ] **Step 1: 検証スクリプトを書く**

`scripts/verify-lecture-types.ts`:

```ts
import assert from "node:assert";
import { getAllLectures, getLectureById, hasScenes } from "../src/data/essay-lectures";

const all = getAllLectures();
assert.ok(all.length >= 8, `lectures: ${all.length}`);

// order は 1 始まりの連番
all.forEach((l, i) => assert.equal(l.order, i + 1, `order broken at ${l.id}`));

// 既存8講は sections を持ったまま（移行前でも講座が壊れない）
const first = getLectureById("essay-basics-01");
assert.ok(first, "essay-basics-01 not found");
assert.ok(first!.sections.length > 0 || hasScenes(first!), "no content");

// scenes を持つ講は hasScenes が true
for (const l of all) {
  assert.equal(hasScenes(l), (l.scenes?.length ?? 0) > 0, `hasScenes: ${l.id}`);
}

console.log("lecture types OK");
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx scripts/verify-lecture-types.ts`
Expected: FAIL — `hasScenes` が `src/data/essay-lectures` から export されていない

- [ ] **Step 3: 型を広げる**

`src/data/essay-lectures/types.ts` の末尾に追記し、`EssayLecture` を差し替える:

```ts
import type { EssayBlockId } from "@/lib/types/essay-block";
import type { SentenceDrillKind } from "@/lib/types/sentence-drill";

/** 原稿用紙タイプのシーンで、1行ずつ書かれていく文。 */
export interface ManuscriptLine {
  text: string;
  /** その文が型のどのブロックか（左側に表示する） */
  blockId?: EssayBlockId;
  /** 悪い例は赤、直した例は緑で見せる */
  tone?: "normal" | "bad" | "good";
}

/**
 * 講義アニメの1シーン。1シーン＝1メッセージ。
 * P1 では manuscript（原稿用紙に文が積まれる）と blocks（型のカードが積まれる）の
 * 2パターンだけ。compare / diagram は P2 以降で足す。
 */
export interface LectureScene {
  id: string;
  /** 画面下に出る説明文 */
  caption: string;
  visual: "manuscript" | "blocks";
  /** visual === "manuscript" のとき必須 */
  manuscript?: { lines: ManuscriptLine[] };
  /** visual === "blocks" のとき必須。filled が積まれ、missing は欠けて見える */
  blocks?: { filled: EssayBlockId[]; missing?: EssayBlockId[] };
  /** 強調する型のブロック */
  highlightBlock?: EssayBlockId;
}

/** 講義に埋め込む文のドリル。全問選択式（AIを呼ばない）。 */
export interface LectureDrill {
  kind: SentenceDrillKind;
  /** 出題数。既定5問 */
  count?: number;
}
```

同ファイルの `EssayLecture` に3つ足す:

```ts
export interface EssayLecture {
  id: string;
  order: number;
  level: LectureLevel;
  title: string;
  summary: string;
  durationMin: number;
  /** 旧テキスト解説。scenes へ移行済みの講でも残す（管理者の内容確認用） */
  sections: LectureSection[];
  /** アニメ講義。ある講はこちらを再生する */
  scenes?: LectureScene[];
  /** 講義の直後に出す文のドリル */
  drill?: LectureDrill;
  keyTakeaways: string[];
  exercise: LectureExercise;
}
```

`LectureExercise` に2つ足す:

```ts
export interface LectureExercise {
  prompt: string;
  wordLimit: number;
  minLength?: number;
  focusPoints: string[];
  /** 型のどのブロックを書かせるか。フル答案なら null */
  blockId?: EssayBlockId | null;
}
```

- [ ] **Step 4: `hasScenes` を公開する**

`src/data/essay-lectures/index.ts` に追記:

```ts
export type { LectureScene, ManuscriptLine, LectureDrill } from "./types";

/** アニメ版のシーンを持っているか（旧テキスト講との描き分けに使う）。 */
export function hasScenes(lecture: EssayLecture): boolean {
  return (lecture.scenes?.length ?? 0) > 0;
}
```

- [ ] **Step 5: 通ることを確認する**

Run: `npx tsx scripts/verify-lecture-types.ts`
Expected: PASS — `lecture types OK`

（`src/lib/types/sentence-drill` は Task 3 で作る。この時点では型エラーになるので、Task 3 まで通してから `npx tsc --noEmit` を回すこと。）

- [ ] **Step 6: コミット**

```bash
git add src/data/essay-lectures/types.ts src/data/essay-lectures/index.ts scripts/verify-lecture-types.ts
git commit -m "feat(essay): 講義データにシーン・ドリル・型ブロックを足す"
```

---

### Task 3: 文のドリルの型と採点ロジック

**全問選択式**にする。書き直し形式は AI 呼び出しが要り、反復させると課金が増えるため P1 では作らない（P2 で足す）。

**Files:**
- Create: `src/lib/types/sentence-drill.ts`
- Create: `src/lib/sentence-drill/pick.ts`
- Create: `scripts/verify-sentence-drill.ts`

- [ ] **Step 1: 検証スクリプトを書く**

`scripts/verify-sentence-drill.ts`:

```ts
import assert from "node:assert";
import { SENTENCE_DRILL_KINDS, SENTENCE_DRILL_LABELS } from "../src/lib/types/sentence-drill";
import { pickDrillItems, gradeDrill } from "../src/lib/sentence-drill/pick";
import { ALL_SENTENCE_DRILL_ITEMS } from "../src/data/sentence-drills";

// P1 は3種
assert.deepEqual(SENTENCE_DRILL_KINDS, ["particle", "subject_predicate", "sentence_length"]);
assert.equal(SENTENCE_DRILL_LABELS.particle, "てにをは");

// 同じ講義IDなら毎回同じ5問（リロードで問題が入れ替わらない）
const a = pickDrillItems("particle", "essay-basics-03", 5);
const b = pickDrillItems("particle", "essay-basics-03", 5);
assert.deepEqual(a.map((i) => i.id), b.map((i) => i.id));
assert.equal(a.length, 5);

// 講義が違えば出題も違う（8講で同じ5問が続かない）
const c = pickDrillItems("particle", "essay-basics-05", 5);
assert.notDeepEqual(a.map((i) => i.id), c.map((i) => i.id));

// 在庫より多く要求しても在庫数で止まる（重複を出さない）
const many = pickDrillItems("particle", "essay-basics-03", 999);
assert.equal(many.length, ALL_SENTENCE_DRILL_ITEMS.filter((i) => i.kind === "particle").length);
assert.equal(new Set(many.map((i) => i.id)).size, many.length);

// 採点は選んだ番号と正解番号の一致だけ
const graded = gradeDrill(a, [a[0].answerIndex, -1, a[2].answerIndex, -1, -1]);
assert.equal(graded.correct, 2);
assert.equal(graded.total, 5);
assert.deepEqual(graded.results.slice(0, 3).map((r) => r.correct), [true, false, true]);

console.log("sentence drill OK");
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx scripts/verify-sentence-drill.ts`
Expected: FAIL — `Cannot find module '../src/lib/types/sentence-drill'`

- [ ] **Step 3: 型を書く**

`src/lib/types/sentence-drill.ts`:

```ts
/**
 * 文の精度を鍛えるドリル。講義の中に埋め込んで、アニメの直後に出す。
 *
 * 全問4択にしてある。書き直し形式は AI 判定が要り、反復させるほど課金が増える。
 * ここは「反復しないと直らない」種類の訓練なので、コスト0で何度でも回せる形にする。
 * 書き直し形式は P2 で、本人の答案（本添削の languageCorrections）から出題する。
 */
export const SENTENCE_DRILL_KINDS = [
  "particle",
  "subject_predicate",
  "sentence_length",
] as const;

export type SentenceDrillKind = (typeof SENTENCE_DRILL_KINDS)[number];

export const SENTENCE_DRILL_LABELS: Record<SentenceDrillKind, string> = {
  particle: "てにをは",
  subject_predicate: "主述の一致",
  sentence_length: "一文を切る",
};

export const SENTENCE_DRILL_DESCRIPTIONS: Record<SentenceDrillKind, string> = {
  particle: "助詞の選び方。「は」と「が」、助詞の重複を直す",
  subject_predicate: "主語と述語のねじれを直す",
  sentence_length: "長い一文を切って読みやすくする",
};

export interface SentenceDrillItem {
  id: string;
  kind: SentenceDrillKind;
  /** 問題文。particle は空欄を ＿ で示す */
  sentence: string;
  /** 4択 */
  choices: string[];
  answerIndex: number;
  /** なぜそれが正しいか。外した直後に必ず出す */
  explanation: string;
}

export interface SentenceDrillResult {
  itemId: string;
  selectedIndex: number;
  correct: boolean;
}

export interface SentenceDrillGrade {
  correct: number;
  total: number;
  results: SentenceDrillResult[];
}
```

- [ ] **Step 4: 出題と採点を書く**

`src/lib/sentence-drill/pick.ts`:

```ts
import { ALL_SENTENCE_DRILL_ITEMS } from "@/data/sentence-drills";
import type {
  SentenceDrillGrade,
  SentenceDrillItem,
  SentenceDrillKind,
} from "@/lib/types/sentence-drill";

/** 文字列から安定したハッシュを作る（講義IDごとに出題位置をずらすため）。 */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * 講義IDを種にして、その講で出す問題を決定的に選ぶ。
 * 乱数にするとリロードのたびに問題が変わり、解き直しができない。
 */
export function pickDrillItems(
  kind: SentenceDrillKind,
  seed: string,
  count = 5
): SentenceDrillItem[] {
  const bank = ALL_SENTENCE_DRILL_ITEMS.filter((i) => i.kind === kind);
  if (bank.length === 0) return [];
  const take = Math.min(count, bank.length);
  const start = hash(seed) % bank.length;
  return Array.from({ length: take }, (_, i) => bank[(start + i) % bank.length]);
}

/** 選んだ番号を突き合わせて採点する。未回答は -1 を渡す。 */
export function gradeDrill(
  items: SentenceDrillItem[],
  selected: number[]
): SentenceDrillGrade {
  const results = items.map((item, i) => ({
    itemId: item.id,
    selectedIndex: selected[i] ?? -1,
    correct: (selected[i] ?? -1) === item.answerIndex,
  }));
  return {
    correct: results.filter((r) => r.correct).length,
    total: items.length,
    results,
  };
}
```

- [ ] **Step 5: 通ることを確認する**

Run: `npx tsx scripts/verify-sentence-drill.ts`
Expected: Task 4 の問題バンクを作るまでは FAIL（`Cannot find module '@/data/sentence-drills'`）。Task 4 の Step 4 で PASS を確認する。

- [ ] **Step 6: コミット**

```bash
git add src/lib/types/sentence-drill.ts src/lib/sentence-drill/pick.ts scripts/verify-sentence-drill.ts
git commit -m "feat(essay): 文のドリルの型と出題・採点ロジック"
```

---

### Task 4: 文のドリル問題バンク（3種×15問）

**Files:**
- Create: `src/data/sentence-drills/particle.ts`
- Create: `src/data/sentence-drills/subject-predicate.ts`
- Create: `src/data/sentence-drills/sentence-length.ts`
- Create: `src/data/sentence-drills/index.ts`
- Create: `scripts/validate-sentence-drills.ts`
- Modify: `package.json`（`validate:data` に連結）

- [ ] **Step 1: 検証スクリプトを書く**

`scripts/validate-sentence-drills.ts`:

```ts
// scripts/validate-sentence-drills.ts
import { ALL_SENTENCE_DRILL_ITEMS } from "../src/data/sentence-drills";
import { SENTENCE_DRILL_KINDS } from "../src/lib/types/sentence-drill";

let errors = 0;
const fail = (msg: string) => {
  console.error(`[sentence-drills] ${msg}`);
  errors++;
};

const seen = new Set<string>();
for (const it of ALL_SENTENCE_DRILL_ITEMS) {
  if (seen.has(it.id)) fail(`dup id: ${it.id}`);
  seen.add(it.id);
  if (it.choices.length !== 4) fail(`choices must be 4: ${it.id}`);
  if (new Set(it.choices).size !== it.choices.length) fail(`dup choice: ${it.id}`);
  if (it.answerIndex < 0 || it.answerIndex > 3) fail(`bad answerIndex: ${it.id}`);
  if (it.explanation.trim().length < 10) fail(`short explanation: ${it.id}`);
  // particle は空欄がちょうど1つ
  if (it.kind === "particle" && (it.sentence.match(/＿/g) ?? []).length !== 1) {
    fail(`particle needs exactly one ＿: ${it.id}`);
  }
  // 一文を切るドリルは、切る価値のある長さ（90字超）の文を出す
  if (it.kind === "sentence_length" && it.sentence.length <= 90) {
    fail(`sentence_length item too short (${it.sentence.length}): ${it.id}`);
  }
}

// 1講あたり5問×8講で使い回しても飽きない最低量
for (const kind of SENTENCE_DRILL_KINDS) {
  const n = ALL_SENTENCE_DRILL_ITEMS.filter((i) => i.kind === kind).length;
  if (n < 15) fail(`kind ${kind} has ${n} items (need >=15)`);
}

if (errors > 0) {
  console.error(`[sentence-drills] ${errors} error(s)`);
  process.exit(1);
}
console.log(`[sentence-drills] OK (${ALL_SENTENCE_DRILL_ITEMS.length} items)`);
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx scripts/validate-sentence-drills.ts`
Expected: FAIL — `Cannot find module '../src/data/sentence-drills'`

- [ ] **Step 3: 問題バンクを書く**

`src/data/sentence-drills/particle.ts`（15問。最初の3問を示す。残り12問も同じ形式で、
「は/が の使い分け」「を/に の取り違え」「の の連続」「へ/に」「で/に」を各2〜3問ずつ作る）:

```ts
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

/** てにをは。空欄は ＿ ひとつ。選択肢は助詞のみ。 */
export const PARTICLE_ITEMS: SentenceDrillItem[] = [
  {
    id: "pt-001",
    kind: "particle",
    sentence: "この問題＿解決するには、地域全体の協力が欠かせない。",
    choices: ["を", "が", "は", "に"],
    answerIndex: 0,
    explanation:
      "「解決する」は目的語をとる他動詞なので「問題を解決する」。「問題が解決する」は自動詞「解決する」の形で、誰かが解決した意味にならない。",
  },
  {
    id: "pt-002",
    kind: "particle",
    sentence: "私＿考えるのは、制度そのものを見直すべきだということである。",
    choices: ["が", "は", "を", "に"],
    answerIndex: 0,
    explanation:
      "従属節の中の主語は「が」で受ける。「私は考えるのは」は「は」が二重になり、主文の主語が消える。",
  },
  {
    id: "pt-003",
    kind: "particle",
    sentence: "高齢化＿進む地域では、医療の担い手が足りない。",
    choices: ["が", "は", "を", "も"],
    answerIndex: 0,
    explanation:
      "連体修飾節（「〜地域」を修飾する部分）の主語は「が」。「高齢化は進む地域」とすると、主題の「は」が文全体にかかって係り先が壊れる。",
  },
  // ... pt-004 〜 pt-015
];
```

`src/data/sentence-drills/subject-predicate.ts`（15問。ねじれ文を提示し、直した文を4択から選ぶ）:

```ts
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

/** 主述の一致。ねじれた文を、正しく直した文に置き換える。 */
export const SUBJECT_PREDICATE_ITEMS: SentenceDrillItem[] = [
  {
    id: "sp-001",
    kind: "subject_predicate",
    sentence: "私の将来の夢は、地域医療を支える医師になりたい。",
    choices: [
      "私の将来の夢は、地域医療を支える医師になることである。",
      "私の将来の夢は、地域医療を支える医師になりたいです。",
      "私の将来の夢が、地域医療を支える医師になりたい。",
      "私の将来の夢は、地域医療を支える医師になりたいと思う。",
    ],
    answerIndex: 0,
    explanation:
      "主語「夢は」に対して述語が「なりたい」では対応しない（夢がなりたがっていることになる）。「〜ことである」で受ける。",
  },
  {
    id: "sp-002",
    kind: "subject_predicate",
    sentence:
      "この施策の目的は、若い世代の流出を止め、地域の産業を維持していく。",
    choices: [
      "この施策の目的は、若い世代の流出を止め、地域の産業を維持することにある。",
      "この施策の目的は、若い世代の流出を止め、地域の産業を維持していきたい。",
      "この施策の目的が、若い世代の流出を止め、地域の産業を維持していく。",
      "この施策は目的として、若い世代の流出を止め、地域の産業を維持していく。",
    ],
    answerIndex: 0,
    explanation:
      "「目的は」を受ける述語は「〜ことにある」。動詞で閉じると主語と述語が噛み合わない。",
  },
  // ... sp-003 〜 sp-015
];
```

`src/data/sentence-drills/sentence-length.ts`（15問。90字超の一文を、切り方の4択から選ぶ）:

```ts
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

/**
 * 一文を切る。選択肢は「どこで切ったか」が違う4案。
 * 正解は、主語と述語が近く、接続の関係が変わらない切り方。
 */
export const SENTENCE_LENGTH_ITEMS: SentenceDrillItem[] = [
  {
    id: "sl-001",
    kind: "sentence_length",
    sentence:
      "オンライン教育は場所や時間を問わず受講できるという利点がある一方で、通信環境や機器の性能によって受けられる教育の質に差が生まれてしまうため、誰もが等しく学べるとは限らないという課題も同時に抱えている。",
    choices: [
      "オンライン教育は場所や時間を問わず受講できるという利点がある。一方で、通信環境や機器の性能によって教育の質に差が生まれる。そのため、誰もが等しく学べるとは限らない。",
      "オンライン教育は場所や時間を問わず受講できるという利点があるが、通信環境や機器の性能によって教育の質に差が生まれてしまうため、誰もが等しく学べるとは限らないという課題も抱えている。",
      "オンライン教育は。場所や時間を問わず受講できるという利点がある一方で、通信環境や機器の性能によって教育の質に差が生まれる課題も抱えている。",
      "オンライン教育は場所や時間を問わず受講できる。という利点がある一方で通信環境や機器の性能によって教育の質に差が生まれてしまう。誰もが等しく学べるとは限らない課題も抱えている。",
    ],
    answerIndex: 0,
    explanation:
      "3文に割り、各文で主語と述語を近づけている。2は1文のままで長さが変わらない。3・4は文の途中で切っており、意味の切れ目と一致していない。",
  },
  // ... sl-002 〜 sl-015
];
```

`src/data/sentence-drills/index.ts`:

```ts
import { PARTICLE_ITEMS } from "./particle";
import { SUBJECT_PREDICATE_ITEMS } from "./subject-predicate";
import { SENTENCE_LENGTH_ITEMS } from "./sentence-length";
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";

export const ALL_SENTENCE_DRILL_ITEMS: SentenceDrillItem[] = [
  ...PARTICLE_ITEMS,
  ...SUBJECT_PREDICATE_ITEMS,
  ...SENTENCE_LENGTH_ITEMS,
];
```

- [ ] **Step 4: 両方の検証を通す**

Run: `npx tsx scripts/validate-sentence-drills.ts && npx tsx scripts/verify-sentence-drill.ts`
Expected: PASS — `[sentence-drills] OK (45 items)` と `sentence drill OK`

- [ ] **Step 5: build の検証に連結する**

`package.json` の `validate:data` の末尾に足す:

```
"validate:data": "tsx scripts/validate-university-data.ts && tsx scripts/validate-logic-drills.ts && tsx scripts/validate-logical-tour.ts && tsx scripts/validate-recurring-class.ts && tsx scripts/validate-report-materials.ts && tsx scripts/validate-sentence-drills.ts",
```

Run: `npm run validate:data`
Expected: 最後に `[sentence-drills] OK (45 items)`

- [ ] **Step 6: コミット**

```bash
git add src/data/sentence-drills scripts/validate-sentence-drills.ts package.json
git commit -m "feat(essay): 文のドリル問題バンク（てにをは・主述・一文を切る）"
```

---

### Task 5: 原稿用紙シーンのコンポーネント

**Files:**
- Create: `src/components/essay/lecture/ManuscriptScene.tsx`

- [ ] **Step 1: 実装する**

```tsx
"use client";

import { motion } from "framer-motion";
import { ESSAY_BLOCK_LABELS } from "@/lib/types/essay-block";
import type { ManuscriptLine } from "@/data/essay-lectures";

/**
 * 原稿用紙に文が1行ずつ書かれていくシーン。
 * 左に「いま書かれた文が型のどのブロックか」を出す。文章と型を同時に見せないと、
 * 型がただの用語として素通りする。
 */
export function ManuscriptScene({
  lines,
  highlightBlock,
}: {
  lines: ManuscriptLine[];
  highlightBlock?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
      <ul className="hidden flex-col gap-1 text-xs sm:flex">
        {lines.map((l, i) =>
          l.blockId ? (
            <motion.li
              key={`${l.blockId}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.35 }}
              className={
                l.blockId === highlightBlock
                  ? "rounded bg-primary/10 px-2 py-1 font-semibold text-primary"
                  : "px-2 py-1 text-muted-foreground"
              }
            >
              {ESSAY_BLOCK_LABELS[l.blockId]}
            </motion.li>
          ) : null
        )}
      </ul>

      <div className="rounded-lg border bg-card p-4 leading-8">
        {lines.map((l, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.35, duration: 0.3 }}
            className={
              l.tone === "bad"
                ? "text-rose-600 line-through decoration-rose-300"
                : l.tone === "good"
                  ? "text-emerald-700"
                  : "text-foreground"
            }
          >
            {l.text}
          </motion.p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型が通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/essay/lecture/ManuscriptScene.tsx
git commit -m "feat(essay): 原稿用紙シーンのアニメ"
```

---

### Task 6: ブロック積み上げシーンのコンポーネント

**Files:**
- Create: `src/components/essay/lecture/BlocksScene.tsx`

- [ ] **Step 1: 実装する**

```tsx
"use client";

import { motion } from "framer-motion";
import { ESSAY_BLOCKS, ESSAY_BLOCK_LABELS } from "@/lib/types/essay-block";
import type { EssayBlockId } from "@/lib/types/essay-block";

/**
 * 型の6ブロックがカードとして積み上がるシーン。
 * missing に入れたブロックは点線の空枠で見せる。「④根拠が無い答案」のように、
 * 欠けを目で見せるために使う。
 */
export function BlocksScene({
  filled,
  missing = [],
  highlightBlock,
}: {
  filled: EssayBlockId[];
  missing?: EssayBlockId[];
  highlightBlock?: EssayBlockId;
}) {
  const shown = ESSAY_BLOCKS.filter(
    (b) => filled.includes(b.id) || missing.includes(b.id)
  );

  return (
    <ul className="space-y-2">
      {shown.map((b, i) => {
        const isMissing = missing.includes(b.id);
        return (
          <motion.li
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.25 }}
            className={[
              "rounded-lg border px-3 py-2 text-sm",
              isMissing
                ? "border-dashed border-rose-300 bg-rose-50/50 text-rose-500"
                : "bg-card",
              b.id === highlightBlock ? "ring-2 ring-primary" : "",
            ].join(" ")}
          >
            <span className="font-semibold">{ESSAY_BLOCK_LABELS[b.id]}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {isMissing ? "ここが抜けている" : b.role}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: 型が通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/essay/lecture/BlocksScene.tsx
git commit -m "feat(essay): 型のブロック積み上げシーンのアニメ"
```

---

### Task 7: シーン送りの再生コンポーネント

**Files:**
- Create: `src/components/essay/lecture/LectureAnimation.tsx`

- [ ] **Step 1: 実装する**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ManuscriptScene } from "./ManuscriptScene";
import { BlocksScene } from "./BlocksScene";
import type { LectureScene } from "@/data/essay-lectures";

/** 1シーンの自動送り間隔(ms)。手で進める場合は無関係。 */
const AUTOPLAY_MS = 6000;

/**
 * 講義アニメの再生。1シーン＝1メッセージで、自動送りと手動送りの両方を持つ。
 * 自動だけだと読み終わる前に進み、手動だけだと最後まで進まない生徒が出る。
 */
export function LectureAnimation({
  scenes,
  onFinish,
}: {
  scenes: LectureScene[];
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scene = scenes[index];
  const isLast = index === scenes.length - 1;

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, scenes.length - 1));
  }, [scenes.length]);

  useEffect(() => {
    if (!playing || isLast) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, isLast, index, next]);

  if (!scene) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          シーン {index + 1} / {scenes.length}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {playing ? "自動再生を止める" : "自動再生"}
        </button>
      </div>

      <div className="min-h-56">
        {scene.visual === "manuscript" && scene.manuscript && (
          <ManuscriptScene
            key={scene.id}
            lines={scene.manuscript.lines}
            highlightBlock={scene.highlightBlock}
          />
        )}
        {scene.visual === "blocks" && scene.blocks && (
          <BlocksScene
            key={scene.id}
            filled={scene.blocks.filled}
            missing={scene.blocks.missing}
            highlightBlock={scene.highlightBlock}
          />
        )}
      </div>

      <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
        {scene.caption}
      </p>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="mr-1 size-4" />
          戻る
        </Button>
        {isLast ? (
          <Button size="sm" onClick={onFinish}>
            ドリルへ進む
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={next}>
            進む
            <ChevronRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型が通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/essay/lecture/LectureAnimation.tsx
git commit -m "feat(essay): 講義アニメのシーン送り"
```

---

### Task 8: 文のドリルのコンポーネント

**Files:**
- Create: `src/components/essay/lecture/SentenceDrillView.tsx`

- [ ] **Step 1: 実装する**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { SentenceDrillItem } from "@/lib/types/sentence-drill";
import { SENTENCE_DRILL_DESCRIPTIONS, SENTENCE_DRILL_LABELS } from "@/lib/types/sentence-drill";

/**
 * 文のドリル。1問ずつ出し、選んだ瞬間に正誤と解説を出す。
 * まとめて採点にすると、外した問題の解説を読まずに閉じてしまう。
 */
export function SentenceDrillView({
  items,
  onFinish,
}: {
  items: SentenceDrillItem[];
  onFinish: (selected: number[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [answered, setAnswered] = useState<number | null>(null);

  const item = items[index];
  if (!item) return null;
  const isLast = index === items.length - 1;

  function choose(i: number) {
    if (answered !== null) return;
    setAnswered(i);
    setSelected((prev) => [...prev, i]);
  }

  function goNext() {
    if (isLast) {
      onFinish(selected);
      return;
    }
    setIndex((n) => n + 1);
    setAnswered(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">
          {SENTENCE_DRILL_LABELS[item.kind]}
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {index + 1} / {items.length}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">
          {SENTENCE_DRILL_DESCRIPTIONS[item.kind]}
        </p>
      </div>

      <p className="rounded-lg border bg-card p-3 text-sm leading-relaxed">
        {item.sentence}
      </p>

      <ul className="space-y-2">
        {item.choices.map((c, i) => {
          const isAnswer = i === item.answerIndex;
          const picked = answered === i;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={answered !== null}
                className={[
                  "flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                  answered === null ? "hover:bg-muted/60" : "",
                  answered !== null && isAnswer
                    ? "border-emerald-400 bg-emerald-50"
                    : "",
                  picked && !isAnswer ? "border-rose-400 bg-rose-50" : "",
                ].join(" ")}
              >
                {answered !== null && isAnswer && (
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                )}
                {picked && !isAnswer && (
                  <X className="mt-0.5 size-4 shrink-0 text-rose-600" />
                )}
                <span>{c}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {answered !== null && (
        <div className="space-y-3">
          <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
            {item.explanation}
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={goNext}>
              {isLast ? "課題へ進む" : "次の問題"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 型が通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/essay/lecture/SentenceDrillView.tsx
git commit -m "feat(essay): 文のドリルUI（即時採点＋解説）"
```

---

### Task 9: ドリル結果を保存する API

**Files:**
- Create: `src/app/api/essay/lecture/drill/route.ts`

- [ ] **Step 1: 実装する**

```ts
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getLectureById } from "@/data/essay-lectures";
import { gradeDrill, pickDrillItems } from "@/lib/sentence-drill/pick";

/**
 * POST /api/essay/lecture/drill
 *
 * 講義に埋め込んだ文のドリルの結果を保存する。
 * 採点はサーバ側でやり直す（クライアントの正誤をそのまま信じない）。
 * completedAt は Timestamp。他のドリル（logicDrills / summaryDrills）と型を揃える
 * （CLAUDE.md 6.5。混在すると範囲クエリから黙って外れる）。
 */
interface DrillSubmitBody {
  lectureId: string;
  /** 出題順に選んだ選択肢の番号。未回答は -1 */
  selected: number[];
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore に接続できません" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as DrillSubmitBody | null;
  if (!body?.lectureId || !Array.isArray(body.selected)) {
    return NextResponse.json(
      { error: "lectureId と selected は必須です" },
      { status: 400 }
    );
  }

  const lecture = getLectureById(body.lectureId);
  if (!lecture?.drill) {
    return NextResponse.json({ error: "ドリルが見つかりません" }, { status: 404 });
  }

  const items = pickDrillItems(
    lecture.drill.kind,
    lecture.id,
    lecture.drill.count ?? 5
  );
  const grade = gradeDrill(items, body.selected);

  await adminDb.collection(`users/${uid}/sentenceDrills`).add({
    userId: uid,
    lectureId: lecture.id,
    kind: lecture.drill.kind,
    correct: grade.correct,
    total: grade.total,
    results: grade.results,
    completedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json(grade);
}
```

- [ ] **Step 2: 型が通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/app/api/essay/lecture/drill/route.ts
git commit -m "feat(essay): 文のドリル結果を保存するAPI"
```

---

### Task 10: 課題の採点に型のブロックを渡す

**Files:**
- Modify: `src/app/api/essay/lecture/submit/route.ts:135-140`（`lectureInfo` の組み立て）

- [ ] **Step 1: `lectureInfo` にブロック名を足す**

`const lectureInfo = ...` の行を次に置き換える:

```ts
    const block = lecture.exercise.blockId
      ? getEssayBlock(lecture.exercise.blockId)
      : null;
    // 型のどのブロックを書かせたかを AI に伝える。ブロック1つだけの課題を
    // 完成答案として採点すると、構成が「途中で終わっている」と減点される。
    const blockInfo = block
      ? `この回答は答案全体ではなく、型の「${block.label}」ブロックだけを書く課題である（役割: ${block.role}）。完成答案として不足がある点は減点せず、このブロックとしての出来を見ること。`
      : "この回答は答案全体である。";
    const lectureInfo = `講義「${lecture.title}」の関連問題。${blockInfo}重点的に評価する観点: ${lecture.exercise.focusPoints.join("、")}。設問: ${lecture.exercise.prompt}`;
```

ファイル冒頭の import に足す:

```ts
import { getEssayBlock } from "@/lib/types/essay-block";
```

- [ ] **Step 2: 型が通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/app/api/essay/lecture/submit/route.ts
git commit -m "feat(essay): ブロック課題であることを添削AIに伝える"
```

---

### Task 11: 講義ページを4ステップにする

**Files:**
- Modify: `src/app/student/essay/lectures/[id]/page.tsx`

- [ ] **Step 1: ステップを4つに広げる**

`type Step = "lecture" | "exercise" | "result";` を置き換える:

```ts
type Step = "lecture" | "drill" | "exercise" | "result";
```

- [ ] **Step 2: 講義パートをアニメと旧テキストで描き分ける**

`step === "lecture"` の描画部分を次に置き換える。旧テキスト講（`scenes` 無し）も
そのまま動かすため、両方を残す:

```tsx
{step === "lecture" && (
  hasScenes(lecture) ? (
    <LectureAnimation
      scenes={lecture.scenes!}
      onFinish={() => setStep(lecture.drill ? "drill" : "exercise")}
    />
  ) : (
    <div className="space-y-4">
      {lecture.sections.map((s) => (
        <div key={s.id} className="space-y-1">
          <h3 className="text-sm font-semibold">{s.heading}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {s.body}
          </p>
        </div>
      ))}
      <Button onClick={() => setStep(lecture.drill ? "drill" : "exercise")}>
        {lecture.drill ? "ドリルへ進む" : "課題へ進む"}
      </Button>
    </div>
  )
)}
```

- [ ] **Step 3: ドリルのステップを足す**

`step === "drill"` の描画を足す:

```tsx
{step === "drill" && lecture.drill && (
  <SentenceDrillView
    items={pickDrillItems(lecture.drill.kind, lecture.id, lecture.drill.count ?? 5)}
    onFinish={async (selected) => {
      // 保存に失敗しても課題へは進ませる（ドリルは本体ではない）
      try {
        await authFetch("/api/essay/lecture/drill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lectureId: lecture.id, selected }),
        });
      } catch {
        toast.error("ドリルの結果を保存できませんでした");
      }
      setStep("exercise");
    }}
  />
)}
```

必要な import を足す:

```tsx
import { hasScenes } from "@/data/essay-lectures";
import { LectureAnimation } from "@/components/essay/lecture/LectureAnimation";
import { SentenceDrillView } from "@/components/essay/lecture/SentenceDrillView";
import { pickDrillItems } from "@/lib/sentence-drill/pick";
```

- [ ] **Step 4: 課題に型の書き出し例を出す**

`step === "exercise"` の設問表示の下に足す:

```tsx
{lecture.exercise.blockId && (
  <p className="text-muted-foreground rounded-lg bg-muted/60 p-3 text-xs">
    書き出しの例: {getEssayBlock(lecture.exercise.blockId)?.starter}
  </p>
)}
```

import に足す:

```tsx
import { getEssayBlock } from "@/lib/types/essay-block";
```

- [ ] **Step 5: ビルドを通す**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: コミット**

```bash
git add src/app/student/essay/lectures/[id]/page.tsx
git commit -m "feat(essay): 講義ページをアニメ→ドリル→課題の4ステップにする"
```

---

### Task 12: 1〜4講のコンテンツを書く

既存の `sections` は残したまま `scenes` / `drill` / `exercise.blockId` を足す。

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`
- Create: `scripts/validate-essay-lectures.ts`
- Modify: `package.json`（`validate:data` に連結）

- [ ] **Step 1: 検証スクリプトを書く**

`scripts/validate-essay-lectures.ts`:

```ts
// scripts/validate-essay-lectures.ts
import { getAllLectures } from "../src/data/essay-lectures";
import { ESSAY_BLOCK_IDS } from "../src/lib/types/essay-block";
import { SENTENCE_DRILL_KINDS } from "../src/lib/types/sentence-drill";

let errors = 0;
const fail = (msg: string) => {
  console.error(`[essay-lectures] ${msg}`);
  errors++;
};

const lectures = getAllLectures();
const seen = new Set<string>();

for (const l of lectures) {
  if (seen.has(l.id)) fail(`dup id: ${l.id}`);
  seen.add(l.id);

  for (const s of l.scenes ?? []) {
    if (s.caption.trim().length < 10) fail(`short caption: ${l.id}/${s.id}`);
    if (s.visual === "manuscript" && !s.manuscript?.lines.length) {
      fail(`manuscript scene without lines: ${l.id}/${s.id}`);
    }
    if (s.visual === "blocks" && !s.blocks?.filled.length && !s.blocks?.missing?.length) {
      fail(`blocks scene without blocks: ${l.id}/${s.id}`);
    }
    for (const b of s.blocks?.filled ?? []) {
      if (!ESSAY_BLOCK_IDS.includes(b)) fail(`unknown block: ${l.id}/${s.id}/${b}`);
    }
    if (s.highlightBlock && !ESSAY_BLOCK_IDS.includes(s.highlightBlock)) {
      fail(`unknown highlightBlock: ${l.id}/${s.id}`);
    }
  }

  // アニメ講は6〜10シーン（少ないと講義にならず、多いと最後まで進まない）
  if (l.scenes && (l.scenes.length < 6 || l.scenes.length > 10)) {
    fail(`scene count ${l.scenes.length} out of range: ${l.id}`);
  }

  if (l.drill && !SENTENCE_DRILL_KINDS.includes(l.drill.kind)) {
    fail(`unknown drill kind: ${l.id}`);
  }

  const bid = l.exercise.blockId;
  if (bid && !ESSAY_BLOCK_IDS.includes(bid)) fail(`unknown exercise blockId: ${l.id}`);
}

if (errors > 0) {
  console.error(`[essay-lectures] ${errors} error(s)`);
  process.exit(1);
}
console.log(`[essay-lectures] OK (${lectures.length} lectures)`);
```

`package.json` の `validate:data` の末尾に `&& tsx scripts/validate-essay-lectures.ts` を足す。

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx scripts/validate-essay-lectures.ts`
Expected: PASS（まだ scenes が無いので検査対象ゼロ。この時点では通ってよい）

- [ ] **Step 3: 1講のコンテンツを書く**

`essay-basics-01`（小論文とは何か）に足す。既存の `sections` は触らない:

```ts
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "作文はできごとと気持ちを書く。小論文は問いに答えて、その理由を示す文章だ。まず違いを見る。",
        manuscript: {
          lines: [
            { text: "私は昨日、地域のボランティアに参加して楽しかった。", tone: "bad" },
          ],
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "同じ題材でも、小論文はこう書く。「楽しかった」ではなく、問いへの答えから始まる。",
        manuscript: {
          lines: [
            { text: "地域活動に高校生が参加する意義はどこにあるか。", blockId: "question" },
            { text: "私は、担い手不足を補う点にあると考える。", blockId: "position", tone: "good" },
          ],
        },
        highlightBlock: "position",
      },
      {
        id: "s3",
        visual: "blocks",
        caption:
          "小論文は6つのブロックでできている。この講座では、この6つを1つずつ書けるようにしていく。",
        blocks: { filled: ["question", "position", "reason", "evidence", "concession", "conclusion"] },
      },
      {
        id: "s4",
        visual: "blocks",
        caption:
          "採点は5つの観点で行われる。構成と論証はブロックの並びで決まり、表現力は文そのものの精度で決まる。",
        blocks: { filled: ["question", "position", "reason"] },
        highlightBlock: "reason",
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "配点が一番大きいのは構成と論証（各12点）。次が表現力（11点）。この講座はこの3つを順に埋めていく。",
        manuscript: {
          lines: [
            { text: "構成12点：ブロックの並び", tone: "normal" },
            { text: "論証12点：理由と根拠のつながり", tone: "normal" },
            { text: "表現力11点：てにをは・主述・一文の長さ", tone: "normal" },
          ],
        },
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "まずは今の力を見る。次の課題を200字で書いてみよう。うまく書けなくてよい。ここが出発点になる。",
        manuscript: {
          lines: [{ text: "（課題へ）", tone: "normal" }],
        },
      },
    ],
    // 1講はドリルを置かない。まず現状把握に集中させる
    exercise: {
      prompt:
        "高校生が地域活動に参加する意義について、あなたの考えを200字以内で述べなさい。",
      wordLimit: 200,
      focusPoints: ["主張の明確さ", "説明の論理性"],
      blockId: null,
    },
```

- [ ] **Step 4: 2講のコンテンツを書く**

`essay-basics-04`（構成の型 → 新2講）を差し替える。`order` は 2 に、`title` は「型の全体像」に変更:

```ts
    order: 2,
    title: "型の全体像",
    summary: "6つのブロックの並びと役割を知る",
    scenes: [
      {
        id: "s1",
        visual: "blocks",
        caption: "答案は6ブロックの積み木でできている。上から順に置いていけば形になる。",
        blocks: { filled: ["question", "position", "reason", "evidence", "concession", "conclusion"] },
      },
      {
        id: "s2",
        visual: "blocks",
        caption: "よくある失敗は、④根拠が抜けること。理由だけで具体例が無いと、感想と変わらない。",
        blocks: { filled: ["question", "position", "reason", "conclusion"], missing: ["evidence"] },
        highlightBlock: "evidence",
      },
      {
        id: "s3",
        visual: "blocks",
        caption: "⑤譲歩と反論が抜けるのも多い。反対意見に触れない主張は、一方的に見える。",
        blocks: { filled: ["question", "position", "reason", "evidence", "conclusion"], missing: ["concession"] },
        highlightBlock: "concession",
      },
      {
        id: "s4",
        visual: "manuscript",
        caption: "6ブロックを実際の文にするとこうなる。ブロック名が左に出る。",
        manuscript: {
          lines: [
            { text: "問われているのは、オンライン教育を進めるべきかである。", blockId: "question" },
            { text: "私は進めるべきだと考える。", blockId: "position" },
            { text: "なぜなら、通学が難しい生徒にも学ぶ機会を開くからである。", blockId: "reason" },
            { text: "実際、私の高校では休校中に授業が続けられた。", blockId: "evidence" },
            { text: "確かに通信環境の差は残る。しかし機器の貸与で縮められる。", blockId: "concession" },
            { text: "したがって、条件を整えたうえで進めるべきである。", blockId: "conclusion" },
          ],
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption: "800字ならこの配分が目安。④根拠に一番字数を使う。ここが薄いと点が伸びない。",
        manuscript: {
          lines: [
            { text: "①問い120字 ②立場60字 ③理由160字", tone: "normal" },
            { text: "④根拠240字 ⑤譲歩140字 ⑥結論80字", tone: "good" },
          ],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s6",
        visual: "blocks",
        caption: "次の講から、このブロックを1つずつ書く練習をしていく。まずは並びを覚えよう。",
        blocks: { filled: ["question", "position", "reason", "evidence", "concession", "conclusion"] },
      },
    ],
    drill: { kind: "subject_predicate" },

    exercise: {
      prompt:
        "次の答案を読み、6つのブロックのうちどれが欠けているかを指摘し、欠けているブロックを100字で書き足しなさい。\n\n「私はオンライン教育を進めるべきだと考える。なぜなら、場所を問わず学べるからだ。したがって進めるべきである。」",
      wordLimit: 150,
      focusPoints: ["型のブロックの理解", "根拠の具体性"],
      blockId: "evidence",
    },
```

- [ ] **Step 5: 3講・4講のコンテンツを書く**

`essay-basics-05`（主張の立て方 → 新3講「立場を決める」）:

```ts
    order: 3,
    title: "立場を決める",
    summary: "問いに直接答える。一つに決める",
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption: "一番多い失点はこれ。どちらとも取れる書き方は、立場を決めていないのと同じだ。",
        manuscript: {
          lines: [{ text: "この問題については、賛成の面も反対の面もあると思う。", tone: "bad" }],
        },
        highlightBlock: "position",
      },
      {
        id: "s2",
        visual: "manuscript",
        caption: "立場は一つに決めて言い切る。迷いは⑤譲歩のブロックで書けばいい。",
        manuscript: {
          lines: [{ text: "私は導入を進めるべきだと考える。", tone: "good", blockId: "position" }],
        },
        highlightBlock: "position",
      },
      {
        id: "s3",
        visual: "manuscript",
        caption: "設問が「是非を論じよ」なら是非を答える。ずれた答えは、内容が良くても点にならない。",
        manuscript: {
          lines: [
            { text: "設問：オンライン教育の是非を論じなさい", tone: "normal" },
            { text: "オンライン教育には多くの利点がある。", tone: "bad" },
            { text: "私はオンライン教育を進めるべきだと考える。", tone: "good" },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption: "「思う」で終えると弱い。小論文は「考える」「べきだ」で言い切る。",
        manuscript: {
          lines: [
            { text: "〜だと思います。", tone: "bad" },
            { text: "〜だと考える。／〜すべきである。", tone: "good" },
          ],
        },
      },
      {
        id: "s5",
        visual: "blocks",
        caption: "②立場は答案の背骨。ここが決まると、③理由と⑥結論が自動的に決まる。",
        blocks: { filled: ["position", "reason", "conclusion"] },
        highlightBlock: "position",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption: "60字で書く。長く書く必要はない。一文で言い切れれば十分だ。",
        manuscript: {
          lines: [{ text: "私は〜と考える。（60字）", tone: "good", blockId: "position" }],
        },
      },
    ],
    drill: { kind: "subject_predicate" },
    exercise: {
      prompt:
        "「高校生にスマートフォンの使用時間の制限は必要か」という問いに対し、あなたの立場を60字以内で書きなさい。理由は書かなくてよい。",
      wordLimit: 60,
      minLength: 20,
      focusPoints: ["立場の明確さ", "問いへの正対"],
      blockId: "position",
    },
```

`essay-basics-06`（論証 → 新4講「理由を書く」）:

```ts
    order: 4,
    title: "理由を書く",
    summary: "主張の言い換えにしない。理由は一本に絞る",
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption: "理由が主張の言い換えになっている例。これは何も説明していない。",
        manuscript: {
          lines: [
            { text: "私は制限が必要だと考える。", blockId: "position" },
            { text: "なぜなら、制限すべきだからである。", tone: "bad", blockId: "reason" },
          ],
        },
        highlightBlock: "reason",
      },
      {
        id: "s2",
        visual: "manuscript",
        caption: "理由は「なぜそう言えるか」を別の言葉で説明する。主張に無い語が入るのが目印。",
        manuscript: {
          lines: [
            { text: "私は制限が必要だと考える。", blockId: "position" },
            { text: "なぜなら、睡眠時間の減少が学習の妨げになるからである。", tone: "good", blockId: "reason" },
          ],
        },
        highlightBlock: "reason",
      },
      {
        id: "s3",
        visual: "manuscript",
        caption: "理由を並べすぎると全部が浅くなる。800字なら理由は一本、掘り下げる方がいい。",
        manuscript: {
          lines: [
            { text: "理由は3つある。第一に…第二に…第三に…", tone: "bad" },
            { text: "最も大きな理由は、睡眠時間の減少である。", tone: "good" },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption: "理由と主張の間が飛んでいないか確かめる。間に一段必要なことが多い。",
        manuscript: {
          lines: [
            { text: "スマホを使う → 成績が下がる", tone: "bad" },
            { text: "スマホを使う → 睡眠が減る → 授業の集中が落ちる → 成績が下がる", tone: "good" },
          ],
        },
      },
      {
        id: "s5",
        visual: "blocks",
        caption: "③理由は②立場と④根拠をつなぐ橋。ここが弱いと、根拠を足しても効かない。",
        blocks: { filled: ["position", "reason", "evidence"] },
        highlightBlock: "reason",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption: "100字で書く。「なぜなら〜だからである」の形に収める。",
        manuscript: {
          lines: [{ text: "なぜなら〜だからである。（100字）", tone: "good", blockId: "reason" }],
        },
      },
    ],
    drill: { kind: "sentence_length" },
    exercise: {
      prompt:
        "前の講で書いた「スマートフォンの使用時間の制限」についての立場に対し、その理由を100字以内で書きなさい。主張の言い換えにならないよう注意すること。",
      wordLimit: 100,
      minLength: 40,
      focusPoints: ["理由の説明力", "主張との非重複"],
      blockId: "reason",
    },
```

- [ ] **Step 6: 検証を通す**

Run: `npx tsx scripts/validate-essay-lectures.ts`
Expected: PASS — `[essay-lectures] OK (8 lectures)`

- [ ] **Step 7: コミット**

```bash
git add src/data/essay-lectures/lessons.ts scripts/validate-essay-lectures.ts package.json
git commit -m "feat(essay): 1〜4講をアニメ講義に書き換える"
```

---

### Task 13: 5〜8講のコンテンツを書く

**Files:**
- Modify: `src/data/essay-lectures/lessons.ts`

各講とも Task 12 と同じ形（`order` / `title` / `summary` / `scenes` 6〜8個 / `drill` / `exercise`）で書く。
シーンの内容は次のとおり。

- [ ] **Step 1: 5講「根拠・具体例」を書く**

`order: 5` / `drill: { kind: "particle" }` / `exercise.blockId: "evidence"` / `wordLimit: 150`

| シーン | visual | 見せるもの | caption の要点 |
|---|---|---|---|
| s1 | manuscript | 「多くの人が困っている」(bad) | 一般論は根拠にならない。誰がどう困っているのかが無い |
| s2 | manuscript | 「文部科学省の調査では〜」(good) | 事実・数字・出典のいずれかを置く |
| s3 | manuscript | 自分の経験を根拠にした例 (good) | 経験は使える。ただし「楽しかった」ではなく、主張を支える形にする |
| s4 | manuscript | bad→good の書き換え | 抽象語（社会問題・多様性）は具体に落とす |
| s5 | blocks | reason + evidence をハイライト | ③理由と④根拠がセット。理由だけでは説得力が出ない |
| s6 | manuscript | 150字の型 | 「実際、〜」で始めて事実を1つ書く |

課題: 「前の講の理由を支える根拠・具体例を150字以内で書きなさい。自分の経験でも調べた事実でもよい。」
focusPoints: `["根拠の具体性", "主張との関連"]`

- [ ] **Step 2: 6講「譲歩と反論」を書く**

`order: 6` / `drill: { kind: "particle" }` / `exercise.blockId: "concession"` / `wordLimit: 150`

| シーン | visual | 見せるもの | caption の要点 |
|---|---|---|---|
| s1 | manuscript | 反論に触れない答案 | 一方的に見え、議論の成熟度（配点10）が伸びない |
| s2 | manuscript | 「確かに〜。しかし〜」の型 | 反対側を認めてから切り返す |
| s3 | manuscript | 弱い反論を置いた例 (bad) | わざと弱い反論を立てると逆効果。相手の一番強い言い分を書く |
| s4 | manuscript | 切り返しが無い例 (bad) | 「確かに」で終わると、立場が揺らいで見える |
| s5 | blocks | concession をハイライト | ⑤は②立場を強めるためにある。譲るためではない |
| s6 | manuscript | 150字の型 | 「確かに〜。しかし〜」を2文で収める |

課題: 「あなたの立場に対する最も強い反論を1つ挙げ、それに応答する形で150字以内で書きなさい。」
focusPoints: `["反論の的確さ", "切り返しの説得力"]`

- [ ] **Step 3: 7講「結論」を書く**

`order: 7` / `drill: { kind: "sentence_length" }` / `exercise.blockId: "conclusion"` / `wordLimit: 80`

| シーン | visual | 見せるもの | caption の要点 |
|---|---|---|---|
| s1 | manuscript | 結論で新しい話を始める例 (bad) | 結論に新情報を入れない。回収されないまま終わる |
| s2 | manuscript | 立場の言い直し (good) | ②立場を言い換えて閉じる。同じ文のコピーにはしない |
| s3 | manuscript | 「〜していきたい」で終わる例 (bad) | 決意表明で終わらない。問いへの答えで終わる |
| s4 | manuscript | 字数が尽きた答案 | 結論に80字残す。書き始める前に配分を決める |
| s5 | blocks | position と conclusion を並べる | ②と⑥が呼応しているかを最後に確かめる |
| s6 | manuscript | 80字の型 | 「したがって〜である」で言い切る |

課題: 「これまでの講で書いた立場・理由・根拠・譲歩を踏まえ、結論を80字以内で書きなさい。」
focusPoints: `["立場との一貫性", "新情報を足さないこと"]`

- [ ] **Step 4: 8講「ブロックをつなぐ」を書く**

`order: 8` / `drill: { kind: "particle" }` / `exercise.blockId: null` / `wordLimit: 400`

| シーン | visual | 見せるもの | caption の要点 |
|---|---|---|---|
| s1 | blocks | 6ブロック全部 | ここまでで部品はそろった。つなげて1本にする |
| s2 | manuscript | 接続詞なしで並んだ文 (bad) | 文が並んでいるだけで、関係が読み取れない |
| s3 | manuscript | 接続詞を足した文 (good) | 「なぜなら」「実際」「確かに」「したがって」が道しるべになる |
| s4 | manuscript | 同じ接続詞の連続 (bad) | 「そして」の連発は幼く見える。種類を変える |
| s5 | manuscript | 段落の切り方 | 一段落一主張。ブロックの切れ目で改行する |
| s6 | manuscript | 400字の全体像 | ②〜⑥を400字でつなぐ。これが答案の骨格になる |

課題: 「3〜7講で書いた各ブロックをつなぎ、400字の答案にまとめなさい。接続表現と段落の切り方に注意すること。」
focusPoints: `["ブロックの接続", "段落構成", "一貫性"]`

- [ ] **Step 5: 旧2・3講の order を振り直す**

既存の `essay-basics-02`（課題文の読み方）と `essay-basics-03`（設問分析）は Phase 3（13講・12講）へ移すが、
P1 では講数を増やさない。`order` を 9・10 に振り直し、`level` は `"実践"` のままにする。
`essay-basics-08`（推敲）は `order: 11`。

Run: `npx tsx scripts/verify-lecture-types.ts`
Expected: PASS（order が 1..11 の連番）

- [ ] **Step 6: 検証とビルド**

Run: `npm run validate:data && npm run build`
Expected: `[essay-lectures] OK (11 lectures)` のあと `✓ Compiled successfully`

- [ ] **Step 7: コミット**

```bash
git add src/data/essay-lectures/lessons.ts
git commit -m "feat(essay): 5〜8講をアニメ講義に書き換え、旧講の順序を振り直す"
```

---

### Task 14: 一覧ページに Phase と進捗を出す

**Files:**
- Modify: `src/app/student/essay/lectures/page.tsx`

- [ ] **Step 1: Phase の区切りを足す**

`lectures.map(...)` の外側で Phase ごとにまとめる:

```tsx
const PHASES = [
  { key: "intro", label: "導入", orders: [1] },
  { key: "form", label: "型を組む", orders: [2, 3, 4, 5, 6, 7, 8] },
  { key: "rest", label: "読む・仕上げる", orders: [9, 10, 11] },
] as const;
```

各 Phase の見出しを出し、その `orders` に含まれる講だけを描く:

```tsx
{PHASES.map((phase) => {
  const items = lectures.filter((l) => phase.orders.includes(l.order));
  if (items.length === 0) return null;
  return (
    <section key={phase.key} className="space-y-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide">
        {phase.label}
      </h2>
      {/* 既存の Card 描画をここに移す */}
    </section>
  );
})}
```

- [ ] **Step 2: ビルドを通す**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: コミット**

```bash
git add src/app/student/essay/lectures/page.tsx
git commit -m "feat(essay): 講座一覧をPhaseごとに分ける"
```

---

### Task 15: エミュレータで通しで確認する

**Files:**
- Modify: `scripts/seed-emulator.ts`（確認用の導線を出力に足す）

- [ ] **Step 1: エミュレータを起動する**

3つのターミナルで:

```bash
npm run emu
npm run seed:emu
npm run dev:emu
```

- [ ] **Step 2: 講義を通しで実行する**

`http://localhost:3000/login` から `student@example.com` / `password` でログインし、
`/student/essay/lectures` を開く。2講「型の全体像」で次を確認する。

- [ ] アニメが自動で進み、「自動再生を止める」で止まる
- [ ] 「戻る」で前のシーンに戻れる
- [ ] 最後のシーンで「ドリルへ進む」が出る
- [ ] ドリルで選択肢を選ぶと即座に正誤と解説が出る
- [ ] 5問終わると課題画面へ進む
- [ ] 課題を提出すると採点結果が出る（AI添削は実APIを叩く。`.env.local` の `ANTHROPIC_API_KEY` を使う）
- [ ] `/student/essay/history` に「小論文講座: 型の全体像」が並ぶ

- [ ] **Step 3: ドリル結果の保存を確認する**

エミュレータUI（`http://127.0.0.1:4501/firestore`）で
`users/{uid}/sentenceDrills` に1件増えており、`completedAt` が **timestamp 型**であることを確認する。
文字列になっていたら `FieldValue.serverTimestamp()` を使っていない（Task 9 を見直す）。

- [ ] **Step 4: 旧テキスト講が壊れていないことを確認する**

9講「課題文の読み方」（`scenes` 無し）を開き、テキスト解説が出て「課題へ進む」で進めることを確認する。

- [ ] **Step 5: シードに導線を足してコミット**

`scripts/seed-emulator.ts` の `console.log` 群の末尾に足す:

```ts
  console.log("  /student/essay/lectures                 … 小論文講座（アニメ→ドリル→課題）");
```

```bash
git add scripts/seed-emulator.ts
git commit -m "chore(emu): 講座の確認導線をシードの出力に足す"
```

- [ ] **Step 6: push する**

```bash
git push
```

push で App Hosting の本番デプロイが走る（CLAUDE.md 5.5）。build が通っていること、
上の目視確認が全部済んでいることを確認してから実行する。

---

## 完了の定義

- `npm run validate:data` と `npm run build` が通る
- `npx tsx scripts/verify-essay-blocks.ts` / `verify-lecture-types.ts` / `verify-sentence-drill.ts` が全部通る
- 2〜8講がアニメ → ドリル → 課題 → 添削結果の順で通しで動く
- 9〜11講（旧テキスト講）が従来どおり動く
- 講座の提出が `/student/essay/history` と管理者の添削履歴に `sourceType: "lecture"` で並ぶ

## P1 に入れないもの（P2 以降）

- ドリル3種（係り受け・指示語／文末・語彙／冗長）
- 本人の赤ペン履歴（`languageCorrections`）からの出題
- 対比シーン（compare）・図解シーン（diagram）
- Phase 2「中身の質」3講、Phase 3「読む・分析」3講の新規化
- 設問タイプ別の型4講（フル答案）
- 管理者向けの「どの講で詰まっているか」画面

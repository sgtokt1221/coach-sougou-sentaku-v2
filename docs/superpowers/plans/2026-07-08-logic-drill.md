# 論理ドリル（論理シリーズ）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生徒の言語的論理能力を鍛える「論理ドリル」を追加する。v1は②論理の穴さがし・④即興ロジックの2型で、AI採点・履歴・活動状況への別枠反映まで含む。

**Architecture:** 既存の「要約ドリル」(`summary-drill`) の構成に準拠。静的問題バンク＋型別入力UI＋Anthropic採点API＋`users/{uid}/logicDrills` 保存。管理者の活動状況ヒートマップに `logicDrill` 系列を追加。将来の「学習ツアー」から `?type=` で当日の型に直行できる口を用意する。

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind + shadcn/ui, Firebase Admin (Firestore), Anthropic SDK (`claude-sonnet-4-20250514`)。テストランナーは無く、静的データは `tsx` 検証スクリプト、その他は `tsc --noEmit` + `eslint` + 実機で検証する（プロジェクト規約）。

**参照する既存実装（実装前に必ず読む）:**
- 評価API: `src/app/api/essay/summary-drill/evaluate/route.ts`
- ドリル画面: `src/app/student/essay/summary-drill/page.tsx`（select→drill→result のステップ機、タイマー、mobileTab）
- プロンプト: `src/lib/ai/prompts/summary-drill.ts`
- 静的バンク＋検証: `src/data/choco-passages.ts` / `scripts/validate-choco-passages.ts`
- 管理者取得API: `src/app/api/admin/students/[id]/summary-drills/route.ts`
- 管理者セクション: `src/components/admin/SummaryDrillsSection.tsx`
- 活動集計: `src/lib/utils/activity-heatmap.ts` / `src/components/admin/ActivityHeatmap.tsx`

---

## Task 1: 型定義

**Files:**
- Create: `src/lib/types/logic-drill.ts`

- [ ] **Step 1: 型定義ファイルを作成**

```ts
// src/lib/types/logic-drill.ts

/** v1は2型。v2で "skeleton" | "abstraction" を追加予定。 */
export type LogicDrillType = "flaw_finder" | "quick_logic";

export const LOGIC_DRILL_TYPES: LogicDrillType[] = ["flaw_finder", "quick_logic"];

export const LOGIC_DRILL_TYPE_LABELS: Record<LogicDrillType, string> = {
  flaw_finder: "論理の穴さがし",
  quick_logic: "即興ロジック",
};

/** 論理的欠陥の種類（flaw_finder の選択肢/正解ラベル） */
export type FlawKind =
  | "leap" // 飛躍
  | "substitution" // すり替え
  | "circular" // 循環論法
  | "overgeneralize" // 過度な一般化
  | "false_cause"; // 因果の取り違え

export const FLAW_KIND_LABELS: Record<FlawKind, string> = {
  leap: "論理の飛躍",
  substitution: "論点のすり替え",
  circular: "循環論法",
  overgeneralize: "過度な一般化",
  false_cause: "因果の取り違え",
};

/** 問題バンクの1問（型により data の形が変わる判別ユニオン） */
export type LogicDrillItem =
  | {
      id: string;
      type: "flaw_finder";
      prompt: string; // 欠陥を含む意見文（3〜5文）
      answerFlaw: FlawKind; // 正解の欠陥種別
      explanation: string; // 模範解説
    }
  | {
      id: string;
      type: "quick_logic";
      prompt: string; // 賛否が割れるお題
      timeLimitSec?: number; // 未指定は DEFAULT_QUICK_LOGIC_SEC
    };

export const DEFAULT_QUICK_LOGIC_SEC = 300; // 5分

/** 生徒の回答（型別。評価APIに送る） */
export type LogicDrillAnswer =
  | {
      type: "flaw_finder";
      selectedFlaw: FlawKind;
      explanation: string;
      fix: string;
    }
  | {
      type: "quick_logic";
      stance: "agree" | "disagree";
      reasons: string[];
    };

export interface LogicDrillScores {
  consistency: number; // 論理の一貫性 0-5
  validity: number; // 根拠の妥当性 0-5
  structure: number; // 構成の明快さ 0-5
}

export interface LogicDrillFeedback {
  good: string; // 良かった点
  improve: string; // 改善点（赤ペン）
  flawCorrect?: boolean; // flaw_finder 専用: 欠陥同定が正解か
  modelAnswer?: string; // 模範例（任意）
}

export interface LogicDrillResult {
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback;
}

/** Firestore: users/{uid}/logicDrills/{autoId} に保存する形 */
export interface LogicDrillRecord {
  id: string;
  drillType: LogicDrillType;
  itemId: string;
  answer: LogicDrillAnswer;
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback;
  completedAt: unknown; // FieldValue.serverTimestamp() / 読み出し時は Timestamp
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep -i "logic-drill" || echo "clean"`
Expected: `clean`（このファイル単体はまだ未参照なのでエラーが出ないこと）

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/logic-drill.ts
git commit -m "feat(logic-drill): 型定義を追加"
```

---

## Task 2: 静的問題バンク

**Files:**
- Create: `src/data/logic-drills.ts`

各型 **最低10問**。ここでは各型の完全な実例を示す。残りは同じ構造で内容を追加し、Task 4 の検証スクリプトが件数と整合を強制する。

- [ ] **Step 1: バンクファイルを作成（実例つき）**

```ts
// src/data/logic-drills.ts
import type { LogicDrillItem } from "@/lib/types/logic-drill";

/** ②論理の穴さがし: 欠陥を1つ含む意見文。answerFlaw が正解。 */
export const FLAW_FINDER_ITEMS: Extract<LogicDrillItem, { type: "flaw_finder" }>[] = [
  {
    id: "ff-001",
    type: "flaw_finder",
    prompt:
      "スマートフォンを使う中学生は成績が下がる。実際、私の友人はスマホを買ってから成績が落ちた。だからスマホは学力低下の原因だ。",
    answerFlaw: "false_cause",
    explanation:
      "友人1人の事例で因果を断定しており、相関と因果を取り違えている。成績低下には勉強時間や生活習慣など他要因もありうる。",
  },
  {
    id: "ff-002",
    type: "flaw_finder",
    prompt:
      "読書は良いことだ。なぜなら、良いこととは読書のように人を成長させる行いだからだ。したがって読書はすべきである。",
    answerFlaw: "circular",
    explanation:
      "結論（読書は良い）を前提（良いこと＝読書のような行い）に含めており、理由が主張の言い換えになっている循環論法。",
  },
  {
    id: "ff-003",
    type: "flaw_finder",
    prompt:
      "この学校の生徒会長は真面目だ。だからこの学校の生徒はみんな真面目に違いない。",
    answerFlaw: "overgeneralize",
    explanation:
      "1人の事例から集団全体の性質を断定しており、標本が全体を代表しない過度な一般化。",
  },
  {
    id: "ff-004",
    type: "flaw_finder",
    prompt:
      "環境保護は大切だ。ところで、経済成長こそ国民を幸せにする。だから環境より経済を優先すべきだ。",
    answerFlaw: "substitution",
    explanation:
      "「環境保護の重要性」という論点から「経済成長の重要性」へ論点をすり替えており、両立可能性を検討していない。",
  },
  {
    id: "ff-005",
    type: "flaw_finder",
    prompt:
      "彼は毎日練習している。だから次の試合はきっと優勝する。",
    answerFlaw: "leap",
    explanation:
      "練習量から優勝という結論まで飛躍がある。対戦相手やコンディションなど、結論に必要な前提が埋まっていない。",
  },
  // TODO(実装者): 同構造で ff-006 〜 ff-010 以上を追加（各 FlawKind を最低1問はカバー）。
  //   Task 4 の検証スクリプトが「flaw_finder が10問以上」「answerFlaw が全種を最低1問」を強制する。
];

/** ④即興ロジック: 賛否が割れるお題。 */
export const QUICK_LOGIC_ITEMS: Extract<LogicDrillItem, { type: "quick_logic" }>[] = [
  { id: "ql-001", type: "quick_logic", prompt: "中学・高校の制服は必要か。" },
  { id: "ql-002", type: "quick_logic", prompt: "学校に紙の教科書は今後も必要か。" },
  { id: "ql-003", type: "quick_logic", prompt: "部活動は全員参加であるべきか。" },
  { id: "ql-004", type: "quick_logic", prompt: "宿題は学力向上に有効か。" },
  { id: "ql-005", type: "quick_logic", prompt: "地方より都市に住む方が良いか。" },
  // TODO(実装者): 同構造で ql-006 〜 ql-010 以上を追加。
  //   Task 4 の検証スクリプトが「quick_logic が10問以上」を強制する。
];

export const ALL_LOGIC_DRILL_ITEMS: LogicDrillItem[] = [
  ...FLAW_FINDER_ITEMS,
  ...QUICK_LOGIC_ITEMS,
];

/** 型別に問題配列を返す */
export function getLogicDrillItemsByType(
  type: LogicDrillItem["type"],
): LogicDrillItem[] {
  return ALL_LOGIC_DRILL_ITEMS.filter((it) => it.type === type);
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep -iE "data/logic-drills" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/data/logic-drills.ts
git commit -m "feat(logic-drill): 問題バンク(2型)を追加"
```

> 注: バンクを最低10問/型に満たすのは Task 4（検証スクリプト）を先に用意してから、それを回しながら埋めるのが安全。実装順は Task 3 → Task 4 → バンク補充でよい。

---

## Task 3: ローテーション/決定的選定ヘルパー

**Files:**
- Create: `src/lib/logic-drill/rotation.ts`

乱数は使わない（`Math.random`/`Date.now` に依存しない純関数。日付文字列を引数に取る）。

- [ ] **Step 1: ヘルパーを作成**

```ts
// src/lib/logic-drill/rotation.ts
import { LOGIC_DRILL_TYPES, type LogicDrillType } from "@/lib/types/logic-drill";
import {
  getLogicDrillItemsByType,
  ALL_LOGIC_DRILL_ITEMS,
} from "@/data/logic-drills";
import type { LogicDrillItem } from "@/lib/types/logic-drill";

/** "YYYY-MM-DD" → 1970-01-01 からの通日数。パース不能時は 0。 */
function dayNumber(dateStr: string): number {
  const t = new Date(`${dateStr}T00:00:00`).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor(t / 86_400_000);
}

/** その日の型（通日 mod 型数）。 */
export function getRotatedLogicDrillType(dateStr: string): LogicDrillType {
  const n = dayNumber(dateStr);
  return LOGIC_DRILL_TYPES[n % LOGIC_DRILL_TYPES.length];
}

/** 指定型の中から、その日の1問を決定的に選ぶ（通日でバンクを巡回）。 */
export function pickLogicDrillItem(
  type: LogicDrillType,
  dateStr: string,
): LogicDrillItem | null {
  const items = getLogicDrillItemsByType(type);
  if (items.length === 0) return null;
  const n = dayNumber(dateStr);
  return items[n % items.length];
}

/** id から1問取得（評価API・結果再表示用）。 */
export function getLogicDrillItemById(id: string): LogicDrillItem | null {
  return ALL_LOGIC_DRILL_ITEMS.find((it) => it.id === id) ?? null;
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep -iE "logic-drill/rotation" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/lib/logic-drill/rotation.ts
git commit -m "feat(logic-drill): 決定的ローテーション/問題選定ヘルパーを追加"
```

---

## Task 4: バンク検証スクリプト（このプロジェクトの「テスト」）

**Files:**
- Create: `scripts/validate-logic-drills.ts`
- Modify: `package.json`（`validate:data` にチェーン）

- [ ] **Step 1: 検証スクリプトを作成**

```ts
// scripts/validate-logic-drills.ts
import {
  ALL_LOGIC_DRILL_ITEMS,
  getLogicDrillItemsByType,
} from "../src/data/logic-drills";
import { FLAW_KIND_LABELS, type FlawKind } from "../src/lib/types/logic-drill";
import { getRotatedLogicDrillType, pickLogicDrillItem } from "../src/lib/logic-drill/rotation";

let errors = 0;
const fail = (msg: string) => {
  console.error(`[logic-drills] ${msg}`);
  errors++;
};

// 1) id 重複なし
const seen = new Set<string>();
for (const it of ALL_LOGIC_DRILL_ITEMS) {
  if (seen.has(it.id)) fail(`dup id: ${it.id}`);
  seen.add(it.id);
  if (!it.prompt || it.prompt.length < 10) fail(`short prompt: ${it.id}`);
}

// 2) 各型10問以上
for (const type of ["flaw_finder", "quick_logic"] as const) {
  const n = getLogicDrillItemsByType(type).length;
  if (n < 10) fail(`type ${type} has ${n} items (need >=10)`);
}

// 3) flaw_finder は answerFlaw が全種を最低1問カバー
const flawItems = getLogicDrillItemsByType("flaw_finder");
const flawsCovered = new Set<FlawKind>();
for (const it of flawItems) {
  if (it.type !== "flaw_finder") continue;
  if (!(it.answerFlaw in FLAW_KIND_LABELS)) fail(`bad answerFlaw: ${it.id}`);
  if (!it.explanation || it.explanation.length < 10) fail(`short explanation: ${it.id}`);
  flawsCovered.add(it.answerFlaw);
}
for (const k of Object.keys(FLAW_KIND_LABELS) as FlawKind[]) {
  if (!flawsCovered.has(k)) fail(`FlawKind not covered: ${k}`);
}

// 4) ローテーション/選定が決定的（同じ日付で同じ結果、選定はnull以外）
const day = "2026-07-08";
const t1 = getRotatedLogicDrillType(day);
const t2 = getRotatedLogicDrillType(day);
if (t1 !== t2) fail("rotation not deterministic");
if (!pickLogicDrillItem("flaw_finder", day)) fail("pick returned null for flaw_finder");
if (!pickLogicDrillItem("quick_logic", day)) fail("pick returned null for quick_logic");

if (errors > 0) {
  console.error(`\n${errors} 件のエラー`);
  process.exit(1);
}
console.log(`logic-drills OK: ${ALL_LOGIC_DRILL_ITEMS.length} items`);
```

- [ ] **Step 2: `validate:data` にチェーン**

`package.json` の該当行を次のように変更する（`validate:university-data` は既存想定。実ファイル名は現物に合わせる）:

```json
"validate:data": "tsx scripts/validate-university-data.ts && tsx scripts/validate-logic-drills.ts",
```

- [ ] **Step 3: 検証スクリプトを実行（失敗するはず＝バンク未充足）**

Run: `npx tsx scripts/validate-logic-drills.ts`
Expected: FAIL（`type flaw_finder has 5 items (need >=10)` 等）。これがバンク補充の指針になる。

- [ ] **Step 4: バンクを各型10問以上・全FlawKind被覆まで補充**

`src/data/logic-drills.ts` の TODO 箇所に、示した構造のまま問題を追加する。追加後に再実行:

Run: `npx tsx scripts/validate-logic-drills.ts`
Expected: PASS（`logic-drills OK: N items`）

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-logic-drills.ts package.json src/data/logic-drills.ts
git commit -m "feat(logic-drill): バンク検証スクリプトを追加しバンクを充足"
```

---

## Task 5: 採点プロンプトビルダ

**Files:**
- Create: `src/lib/ai/prompts/logic-drill.ts`

- [ ] **Step 1: プロンプトビルダを作成**

```ts
// src/lib/ai/prompts/logic-drill.ts
import {
  FLAW_KIND_LABELS,
  type LogicDrillItem,
  type LogicDrillAnswer,
} from "@/lib/types/logic-drill";

const COMMON_RUBRIC = `あなたは高校生の小論文・論理表現を指導するコーチです。
以下の回答を「論理」の観点で採点してください。必ず日本語で、次のJSONだけを出力してください（前後に文章を付けない）。
{
  "scores": { "consistency": <0-5>, "validity": <0-5>, "structure": <0-5> },
  "feedback": { "good": "<良かった点>", "improve": "<改善点(具体的な赤ペン)>"{FLAW_FIELD} }
}
- consistency: 主張と根拠が矛盾なく一貫しているか
- validity: 根拠が主張を支える妥当なものか（飛躍・すり替えがないか）
- structure: 構成が明快で読み手に伝わるか`;

export function buildLogicDrillPrompt(
  item: LogicDrillItem,
  answer: LogicDrillAnswer,
): string {
  if (item.type === "flaw_finder" && answer.type === "flaw_finder") {
    const correct = FLAW_KIND_LABELS[item.answerFlaw];
    const picked = FLAW_KIND_LABELS[answer.selectedFlaw];
    const rubric = COMMON_RUBRIC.replace(
      "{FLAW_FIELD}",
      `, "flawCorrect": <true|false>, "modelAnswer": "<模範的な修正の要点>"`,
    );
    return `${rubric}

【問題文（欠陥を含む意見文）】
${item.prompt}

【正解の欠陥種別】${correct}
【生徒が選んだ欠陥種別】${picked}
【生徒の説明】${answer.explanation}
【生徒の修正文】${answer.fix}

flawCorrect は「生徒が選んだ欠陥種別が正解と一致するか」で判定してください。
修正文が論理的に通っているかを validity/consistency に反映してください。`;
  }

  if (item.type === "quick_logic" && answer.type === "quick_logic") {
    const rubric = COMMON_RUBRIC.replace("{FLAW_FIELD}", `, "modelAnswer": "<模範例の要点>"`);
    const stance = answer.stance === "agree" ? "賛成" : "反対";
    const reasons = answer.reasons.map((r, i) => `理由${i + 1}: ${r}`).join("\n");
    return `${rubric}

【お題】${item.prompt}
【立場】${stance}
${reasons}

立場と理由の一貫性(consistency)、理由の妥当性・非重複(validity)、全体構成(structure)を採点してください。`;
  }

  // 型と回答が不一致（呼び出し側でガード済みだが保険）
  throw new Error("logic-drill: item.type と answer.type が一致しません");
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep -iE "prompts/logic-drill" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts/logic-drill.ts
git commit -m "feat(logic-drill): 採点プロンプトビルダを追加"
```

---

## Task 6: 採点API

**Files:**
- Create: `src/app/api/essay/logic-drill/evaluate/route.ts`

`summary-drill/evaluate` を踏襲（Anthropic、JSON抽出 `/\{[\s\S]*\}/`、`users/{uid}/logicDrills` 保存、保存失敗は握る）。

- [ ] **Step 1: 評価ルートを作成**

```ts
// src/app/api/essay/logic-drill/evaluate/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { buildLogicDrillPrompt } from "@/lib/ai/prompts/logic-drill";
import { getLogicDrillItemById } from "@/lib/logic-drill/rotation";
import type { LogicDrillAnswer, LogicDrillType } from "@/lib/types/logic-drill";

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const body = (await request.json().catch(() => null)) as {
    drillType?: LogicDrillType;
    itemId?: string;
    answer?: LogicDrillAnswer;
  } | null;

  const drillType = body?.drillType;
  const itemId = body?.itemId;
  const answer = body?.answer;
  if (!drillType || !itemId || !answer) {
    return NextResponse.json({ error: "drillType, itemId, answer は必須です" }, { status: 400 });
  }

  const item = getLogicDrillItemById(itemId);
  if (!item || item.type !== drillType || answer.type !== drillType) {
    return NextResponse.json({ error: "itemId/drillType/answer が不整合です" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEYが設定されていません" }, { status: 503 });
  }

  const client = new Anthropic();
  const prompt = buildLogicDrillPrompt(item, answer);
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    const result = JSON.parse(jsonMatch[0]);

    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      const { FieldValue } = await import("firebase-admin/firestore");
      if (adminDb) {
        const docRef = adminDb.collection(`users/${uid}/logicDrills`).doc();
        await docRef.set({
          id: docRef.id,
          drillType,
          itemId,
          answer,
          scores: result.scores,
          feedback: result.feedback,
          completedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("[logic-drill] failed to save result", err);
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "AI応答のパースに失敗しました", raw: text },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 型チェック + lint**

Run: `npx tsc --noEmit 2>&1 | grep -iE "logic-drill/evaluate" || echo "clean"` → `clean`
Run: `npx eslint "src/app/api/essay/logic-drill/evaluate/route.ts"` → エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/app/api/essay/logic-drill/evaluate/route.ts
git commit -m "feat(logic-drill): 採点APIを追加"
```

---

## Task 7: 生徒ドリル画面

**Files:**
- Create: `src/app/student/essay/logic-drill/page.tsx`

`summary-drill/page.tsx` の骨格（`"use client"`、`useState` ステップ機、`authFetch`、`useSearchParams` を `Suspense` で包む、`result` のドット表示）に倣う。以下は完全な実装。

- [ ] **Step 1: ドリル画面を作成**

```tsx
// src/app/student/essay/logic-drill/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import {
  LOGIC_DRILL_TYPES,
  LOGIC_DRILL_TYPE_LABELS,
  FLAW_KIND_LABELS,
  DEFAULT_QUICK_LOGIC_SEC,
  type LogicDrillType,
  type LogicDrillItem,
  type LogicDrillAnswer,
  type LogicDrillResult,
  type FlawKind,
} from "@/lib/types/logic-drill";
import { getRotatedLogicDrillType, pickLogicDrillItem } from "@/lib/logic-drill/rotation";

/** "YYYY-MM-DD"（ローカル日付）。SSRとの齟齬を避けクライアントで確定する。 */
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

type Step = "select" | "drill" | "result";

function LogicDrillInner() {
  const search = useSearchParams();
  const forcedType = search.get("type") as LogicDrillType | null;

  const [date] = useState(todayStr);
  const [step, setStep] = useState<Step>("select");
  const [drillType, setDrillType] = useState<LogicDrillType>(
    forcedType && LOGIC_DRILL_TYPES.includes(forcedType)
      ? forcedType
      : getRotatedLogicDrillType(todayStr()),
  );
  const [item, setItem] = useState<LogicDrillItem | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<LogicDrillResult | null>(null);

  // flaw_finder の回答
  const [selectedFlaw, setSelectedFlaw] = useState<FlawKind | null>(null);
  const [flawExplanation, setFlawExplanation] = useState("");
  const [flawFix, setFlawFix] = useState("");
  // quick_logic の回答
  const [stance, setStance] = useState<"agree" | "disagree" | null>(null);
  const [reasons, setReasons] = useState<string[]>(["", "", ""]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // ?type= 指定時は select を飛ばして即開始
  useEffect(() => {
    if (forcedType && LOGIC_DRILL_TYPES.includes(forcedType)) {
      start(forcedType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start(type: LogicDrillType) {
    const picked = pickLogicDrillItem(type, date);
    if (!picked) {
      toast.error("問題の取得に失敗しました");
      return;
    }
    setDrillType(type);
    setItem(picked);
    setResult(null);
    setSelectedFlaw(null);
    setFlawExplanation("");
    setFlawFix("");
    setStance(null);
    setReasons(["", "", ""]);
    if (picked.type === "quick_logic") {
      setTimeLeft(picked.timeLimitSec ?? DEFAULT_QUICK_LOGIC_SEC);
    } else {
      setTimeLeft(null);
    }
    setStep("drill");
  }

  // quick_logic タイマー
  useEffect(() => {
    if (step !== "drill" || timeLeft === null) return;
    if (timeLeft <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => (v === null ? v : v - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeLeft]);

  const answer: LogicDrillAnswer | null = useMemo(() => {
    if (!item) return null;
    if (item.type === "flaw_finder") {
      if (!selectedFlaw) return null;
      return { type: "flaw_finder", selectedFlaw, explanation: flawExplanation, fix: flawFix };
    }
    if (stance === null) return null;
    return { type: "quick_logic", stance, reasons };
  }, [item, selectedFlaw, flawExplanation, flawFix, stance, reasons]);

  async function submit() {
    if (!item || !answer || evaluating) return;
    setEvaluating(true);
    try {
      const res = await authFetch("/api/essay/logic-drill/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drillType: item.type, itemId: item.id, answer }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LogicDrillResult;
      setResult(data);
      setStep("result");
    } catch (err) {
      console.error("logic-drill evaluate failed", err);
      toast.error("採点に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/student/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold">論理ドリル</h1>
        </div>
        <Link href="/student/essay/logic-drill/history">
          <Button variant="outline" size="sm" className="gap-1">
            <History className="size-4" /> 履歴
          </Button>
        </Link>
      </div>

      {step === "select" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            今日のおすすめ: <b>{LOGIC_DRILL_TYPE_LABELS[getRotatedLogicDrillType(date)]}</b>
          </p>
          {LOGIC_DRILL_TYPES.map((t) => (
            <Card key={t} className="cursor-pointer hover:bg-accent/40" onClick={() => start(t)}>
              <CardContent className="py-4">
                <p className="font-medium">{LOGIC_DRILL_TYPE_LABELS[t]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === "drill" && item?.type === "flaw_finder" && (
        <div className="space-y-4">
          <Card><CardContent className="py-4 text-sm leading-relaxed">{item.prompt}</CardContent></Card>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">どの欠陥か</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FLAW_KIND_LABELS) as FlawKind[]).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={selectedFlaw === k ? "default" : "outline"}
                  onClick={() => setSelectedFlaw(k)}
                >
                  {FLAW_KIND_LABELS[k]}
                </Button>
              ))}
            </div>
          </div>
          <Textarea placeholder="どこがどう論理的におかしいか説明" value={flawExplanation} onChange={(e) => setFlawExplanation(e.target.value)} />
          <Textarea placeholder="論理が通るよう修正した文" value={flawFix} onChange={(e) => setFlawFix(e.target.value)} />
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "quick_logic" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{item.prompt}</p>
            {timeLeft !== null && (
              <span className="text-sm tabular-nums text-muted-foreground">
                残り {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={stance === "agree" ? "default" : "outline"} onClick={() => setStance("agree")}>賛成</Button>
            <Button size="sm" variant={stance === "disagree" ? "default" : "outline"} onClick={() => setStance("disagree")}>反対</Button>
          </div>
          {reasons.map((r, i) => (
            <Textarea
              key={i}
              placeholder={`理由${i + 1}`}
              value={r}
              onChange={(e) => setReasons((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {([["consistency", "一貫性"], ["validity", "妥当性"], ["structure", "構成"]] as const).map(([key, label]) => (
              <Card key={key}><CardContent className="py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{result.scores[key]}<span className="text-xs">/5</span></p>
              </CardContent></Card>
            ))}
          </div>
          {result.feedback.flawCorrect !== undefined && (
            <p className={`text-sm font-medium ${result.feedback.flawCorrect ? "text-emerald-600" : "text-rose-600"}`}>
              欠陥の同定: {result.feedback.flawCorrect ? "正解" : "不正解"}
            </p>
          )}
          <Card><CardContent className="py-4 space-y-2 text-sm">
            <p><b>良い点:</b> {result.feedback.good}</p>
            <p><b>改善:</b> {result.feedback.improve}</p>
            {result.feedback.modelAnswer && <p className="text-muted-foreground"><b>模範:</b> {result.feedback.modelAnswer}</p>}
          </CardContent></Card>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => start(drillType)}>もう一度</Button>
            <Link href="/student/essay/logic-drill/history" className="flex-1"><Button variant="outline" className="w-full">履歴</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LogicDrillPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="size-5 animate-spin" /></div>}>
      <LogicDrillInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: 型チェック + lint**

Run: `npx tsc --noEmit 2>&1 | grep -iE "student/essay/logic-drill/page" || echo "clean"` → `clean`
Run: `npx eslint "src/app/student/essay/logic-drill/page.tsx"` → エラーなし（warning は既存規約上許容）

- [ ] **Step 3: Commit**

```bash
git add src/app/student/essay/logic-drill/page.tsx
git commit -m "feat(logic-drill): 生徒ドリル画面(2型)を追加"
```

---

## Task 8: 履歴画面

**Files:**
- Create: `src/app/student/essay/logic-drill/history/page.tsx`

生徒自身の履歴。生徒の自己データ取得は既存パターンに合わせ、専用GET `/api/essay/logic-drill/history` を作らず、`summary-drill/history` の取得方式に倣う。**実装前に `src/app/student/essay/summary-drill/history/page.tsx` を読み、その取得方式（SWRエンドポイント or 直接Firestore SDK）をそのまま踏襲して `logicDrills` に差し替える。**

- [ ] **Step 1: `summary-drill/history/page.tsx` を読み、方式を確認**

Run: `sed -n '1,60p' src/app/student/essay/summary-drill/history/page.tsx`
Expected: 取得エンドポイント/コレクション名の把握（`summaryDrills`）

- [ ] **Step 2: 同方式で履歴画面を作成**

`summaryDrills` → `logicDrills`、スコア表示は Task 7 の3軸（consistency/validity/structure）に合わせる。1件 = `LogicDrillRecord`。型別ラベルは `LOGIC_DRILL_TYPE_LABELS[record.drillType]`。

> 取得が専用APIを要する方式だった場合は、`GET /api/essay/logic-drill/history`（`requireRole(["student",...])`、`users/{uid}/logicDrills` を `completedAt desc` で返す）を `summary-drill` の同等ルートに倣って追加する。

- [ ] **Step 3: 型チェック + lint**

Run: `npx tsc --noEmit 2>&1 | grep -iE "logic-drill/history" || echo "clean"` → `clean`
Run: `npx eslint "src/app/student/essay/logic-drill/history/page.tsx"` → エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/app/student/essay/logic-drill/history
git commit -m "feat(logic-drill): 履歴画面を追加"
```

---

## Task 9: 管理者向け履歴取得API

**Files:**
- Create: `src/app/api/admin/students/[id]/logic-drills/route.ts`

**実装前に `src/app/api/admin/students/[id]/summary-drills/route.ts` を読み、その認証・スコープ・返却をそのまま踏襲し、コレクションを `summaryDrills` → `logicDrills` に差し替える。**（`requireRole(["admin","teacher","superadmin"])` ＋ managedBy/組織スコープ）

- [ ] **Step 1: `summary-drills` route を読む**

Run: `cat "src/app/api/admin/students/[id]/summary-drills/route.ts"`

- [ ] **Step 2: 同型で `logic-drills` route を作成（collection差し替え）**

返却フィールドは `LogicDrillRecord`（`drillType`/`itemId`/`answer`/`scores`/`feedback`/`completedAt`）。

- [ ] **Step 3: 型チェック + lint**

Run: `npx tsc --noEmit 2>&1 | grep -iE "logic-drills/route" || echo "clean"` → `clean`
Run: `npx eslint "src/app/api/admin/students/[id]/logic-drills/route.ts"` → エラーなし

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/admin/students/[id]/logic-drills/route.ts"
git commit -m "feat(logic-drill): 管理者向け履歴取得APIを追加"
```

---

## Task 10: 活動状況ヒートマップへ別枠追加

**Files:**
- Modify: `src/lib/utils/activity-heatmap.ts`
- Modify: `src/components/admin/ActivityHeatmap.tsx`
- Modify: `src/app/admin/students/[id]/page.tsx`

- [ ] **Step 1: `activity-heatmap.ts` に `logicDrill` を追加**

`ActivityHeatmapData`（日別集計型）に `logicDrill: number;` を追加。`sources` 入力に `logicDrills?: Array<{ completedAt?: string; createdAt?: string }>;` を追加。集計本体（`drill` の隣）に:

```ts
logicDrill: countByDay(sources.logicDrills ?? [], 'completedAt', day) +
            countByDay(sources.logicDrills ?? [], 'createdAt', day),
```

（`drill`（要約ドリル）の集計行に倣う。`countByDay` は既存関数）

- [ ] **Step 2: `ActivityHeatmap.tsx` にラベルと系列を追加**

`typeLabels` に `logicDrill: "論理ドリル",` を追加。ヒートマップ/凡例が `typeLabels` のキーを走査する実装ならこれだけで反映。個別に系列(Bar等)を列挙している場合は `logicDrill` の系列を1つ追加（`drill` の系列定義に倣い、色は未使用の1色）。

- [ ] **Step 3: `admin/students/[id]/page.tsx` で logicDrills を読み heatmap に渡す**

既存で `summaryDrills` を取得して `buildActivityHeatmapData({ ..., summaryDrills })` に渡している箇所を探し、同様に `users/{studentId}/logicDrills` を取得して `logicDrills` として渡す。**取得方法は既存の `summaryDrills` 取得と同一方式に合わせる**（同ページ内のfetch/SWR/props経路を踏襲）。

Run(調査): `grep -n "summaryDrills\|buildActivityHeatmapData" "src/app/admin/students/[id]/page.tsx"`

- [ ] **Step 4: 型チェック + lint**

Run: `npx tsc --noEmit 2>&1 | grep -iE "activity-heatmap|ActivityHeatmap|students/\[id\]/page" || echo "clean"` → `clean`
Run: `npx eslint src/lib/utils/activity-heatmap.ts src/components/admin/ActivityHeatmap.tsx "src/app/admin/students/[id]/page.tsx"` → 新規エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/activity-heatmap.ts src/components/admin/ActivityHeatmap.tsx "src/app/admin/students/[id]/page.tsx"
git commit -m "feat(logic-drill): 活動状況ヒートマップに論理ドリル枠を追加"
```

---

## Task 11: 管理者の生徒詳細に論理ドリルセクション

**Files:**
- Create: `src/components/admin/LogicDrillsSection.tsx`
- Modify: `src/app/admin/students/[id]/page.tsx`

**`src/components/admin/SummaryDrillsSection.tsx` を読み、同型で作成。** データ取得を Task 9 の `GET /api/admin/students/[id]/logic-drills` に、表示スコアを3軸（consistency/validity/structure）に、型ラベルを `LOGIC_DRILL_TYPE_LABELS` に差し替える。props は `{ studentId: string }`。

- [ ] **Step 1: `SummaryDrillsSection.tsx` を読む**

Run: `cat src/components/admin/SummaryDrillsSection.tsx`

- [ ] **Step 2: `LogicDrillsSection.tsx` を作成（上記差し替え）**

- [ ] **Step 3: 生徒詳細に埋め込む**

`admin/students/[id]/page.tsx` の `<SummaryDrillsSection studentId={id} />`（または要約ドリル節）付近に `<LogicDrillsSection studentId={id} />` を追加。

- [ ] **Step 4: 型チェック + lint**

Run: `npx tsc --noEmit 2>&1 | grep -iE "LogicDrillsSection|students/\[id\]/page" || echo "clean"` → `clean`
Run: `npx eslint src/components/admin/LogicDrillsSection.tsx "src/app/admin/students/[id]/page.tsx"` → 新規エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/LogicDrillsSection.tsx "src/app/admin/students/[id]/page.tsx"
git commit -m "feat(logic-drill): 管理者生徒詳細に論理ドリルセクションを追加"
```

---

## Task 12: ナビ導線

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`（および同種の `BottomNav.tsx` / `MobileMenuContent.tsx` があれば）

**要約ドリル(`/student/essay/summary-drill`)へのリンクがある箇所を探し、その直後に「論理ドリル」(`/student/essay/logic-drill`)リンクを同じ書式で追加する。**

- [ ] **Step 1: 既存リンク箇所を特定**

Run: `grep -rn "summary-drill" src/components/layout`

- [ ] **Step 2: 各該当ファイルに論理ドリルのリンクを追加（要約ドリルの記述に倣う）**

アイコンは lucide の未使用の適当なもの（例: `Brain` / `Scale`）を要約ドリルの書式に合わせて使う。

- [ ] **Step 3: 型チェック + lint**

Run: `npx tsc --noEmit 2>&1 | grep -iE "layout/" || echo "clean"` → `clean`
Run: `npx eslint src/components/layout/Sidebar.tsx` → 新規エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/components/layout
git commit -m "feat(logic-drill): ナビに論理ドリル導線を追加"
```

---

## Task 13: 総合検証

- [ ] **Step 1: データ検証**

Run: `npx tsx scripts/validate-logic-drills.ts`
Expected: `logic-drills OK: N items`（N>=20）

- [ ] **Step 2: 型チェック（全体）**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 3: lint（触ったファイル）**

Run: `npx eslint src/lib/types/logic-drill.ts src/data/logic-drills.ts src/lib/logic-drill/rotation.ts src/lib/ai/prompts/logic-drill.ts "src/app/api/essay/logic-drill/evaluate/route.ts" "src/app/student/essay/logic-drill/page.tsx"`
Expected: 新規エラーなし

- [ ] **Step 4: 実機スモーク（デプロイ後、ローカルはFirebase未接続のため）**

チェックリスト:
1. `/student/essay/logic-drill` を開く → 今日のおすすめ型が出て、2型とも select→drill→result が完結する
2. flaw_finder で欠陥種別を選び採点 → 正誤バッジ＋3軸スコア＋赤ペンが出る
3. quick_logic でタイマー動作・時間切れ自動採点
4. `?type=flaw_finder` / `?type=quick_logic` 直リンクで当該型に直行
5. 履歴に反映される
6. 管理者の生徒詳細「活動状況」に「論理ドリル」枠が別枠で日別表示、論理ドリルセクションに履歴表示
7. 狭幅（モバイル）で入力UIが崩れない

- [ ] **Step 5: 最終Commit（残差分があれば）**

```bash
git add -A -- src/ scripts/ package.json docs/
git commit -m "chore(logic-drill): 総合検証と微修正"
```

---

## Self-Review（この計画の自己点検）

**1. スペック網羅性**（`docs/superpowers/specs/2026-07-08-logic-drill-design.md` 各節 → 対応タスク）:
- §3 問題型（2型） → Task 2/5/7 ✅
- §4 ローテーション/決定的選定 → Task 3 ✅（乱数不使用・日付シード）
- §5 ファイル構成（型/バンク/プロンプト/API/画面/履歴/管理API/セクション/heatmap/nav） → Task 1〜12 ✅
- §6 データモデル → Task 1 ✅（`LogicDrillRecord.completedAt` は serverTimestamp）
- §7 評価API（503/JSON抽出/保存握り） → Task 6 ✅
- §8 画面（型別入力UI・タイマー・?type=・3軸結果） → Task 7 ✅
- §9 管理者・活動状況（logicDrill枠/セクション/管理API） → Task 9/10/11 ✅
- §10 エラー/エッジ（APIキー/JSON/認証/不正id/タイマー/決定的選定） → Task 6/7/3 ✅
- §11 検証（2型完結/flaw正誤/保存/別枠/?type/モバイル/tsc+lint） → Task 13 ✅
- §3「各型最低10問」「全FlawKind被覆」 → Task 4 の検証スクリプトが強制 ✅

**2. プレースホルダ走査:** バンクの `TODO(実装者)` は「同構造で件数を満たす」コンテンツ追記であり、Task 4 の検証スクリプトが件数・被覆を機械的に強制する（曖昧な放置ではない）。履歴/管理API/セクション/heatmap/nav は既存の具体ファイルを名指しで踏襲する指示（実在の参照コード）で、コード骨子は本文に提示済み。

**3. 型整合:** `LogicDrillType`/`FlawKind`/`LogicDrillAnswer`/`LogicDrillScores`/`LogicDrillResult`/`LogicDrillRecord` は Task 1 で定義し、Task 5/6/7/9/11 で同名参照。評価APIの保存フィールドは `LogicDrillRecord` と一致（`drillType/itemId/answer/scores/feedback/completedAt`）。採点3軸キー `consistency/validity/structure` は プロンプト(Task5)・画面(Task7)・型(Task1)で一致。

**判明した是正点（反映済み）:**
- 履歴・管理API・SummaryDrillsSection・activity-heatmap への source 追加は、同ページ内の既存 `summaryDrills` 経路に依存するため、各タスクに「まず既存の該当ファイルを読む」調査ステップを明示した（取得方式の齟齬を防ぐ）。

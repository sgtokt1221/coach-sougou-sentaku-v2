# ランクを提出の平均に変え、スキルチェックを画面から消す Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ランク（スキルバッジ）を「直近10件の提出の平均」だけで決め、小論文・面接のスキルチェックを生徒・管理者の画面から消す（データは残す）。

**Architecture:** 直近の重み付き平均を DB を使わない関数（`src/lib/rank/recent-average.ts`）に切り出して検査で固定し、`src/lib/skill-check/aggregate.ts` の合成をこの関数だけにする。生徒のランクは新設の `/api/student/rank` から読み、スキルチェックの API（受験・採点・状態）はすべて 410 を返す。画面の入口・案内・内訳の文言を消す。ファイルの削除（部品・プロンプト・API の中身）は別計画（片付け）に回す。

**Tech Stack:** Next.js 16 App Router / TypeScript / Firebase Admin（Firestore）/ SWR（`useAuthSWR`）/ 検査は `tsx` で動く `scripts/verify-*.ts`（`npm run validate:data` に連結）

設計書: `docs/superpowers/specs/2026-09-23-admin-student-detail-redesign-design.md` §3・§4

**経緯（変える理由として残す）:** `aggregate.ts` は 2026-08-14 に「直近30日の窓」から「全期間の平均」へ変えている。直近30日だと直近の弱い1件だけでランクが決まったため。今回の「重みの合計10まで」は常に10件分を見るので、1件に引きずられる問題は起きない。全期間だと初期の低い点が伸びを隠すので、直近10件にする（2026-09-23 決定）。

**あわせて直る既存の不具合:** 面接のランクは練習の点を一律 `×40/50` していた（`INTERVIEW_PRACTICE_MAX = 50`）。今の面接の満点は 40（口頭試問は 50）なので、共通の面接は2割低く出ていた。答案ごとの満点（`interviewTotalMax()`）で揃える。

---

## ファイル構成

| ファイル                                                                         | 役割                                 | 変更                         |
| -------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------- |
| `src/lib/rank/recent-average.ts`                                                 | 直近の重み付き平均（純関数）         | 新規                         |
| `scripts/verify-rank-average.ts`                                                 | 上の検査                             | 新規（validate:data に連結） |
| `src/lib/skill-check/aggregate.ts`                                               | ランクの集計（スキルチェックを外す） | 変更                         |
| `src/lib/skill-check/weights.ts`                                                 | SC 40% / 練習 60% の定数             | 削除（参照を消してから）     |
| `src/app/api/student/rank/route.ts`                                              | 生徒のランクを返す                   | 新規                         |
| `src/components/skill-check/SkillRankPanel.tsx`                                  | ランクの表示                         | 変更（SC の文言を消す）      |
| `src/app/student/dashboard/page.tsx`                                             | 生徒ダッシュボード                   | 変更                         |
| `src/components/layout/MobileMenuContent.tsx`                                    | モバイルメニュー                     | 変更                         |
| `src/app/student/skill-check/**`・`src/app/student/interview-skill-check/**`     | 受験画面                             | ダッシュボードへ移す         |
| `src/app/api/skill-check/**`・`src/app/api/interview-skill-check/**`             | 受験・採点・状態                     | 410                          |
| `src/app/api/admin/students/[id]/skill-check/**`・`.../interview-skill-check/**` | 管理者の SC 読み取り                 | 410                          |
| 管理者の生徒詳細・面談画面・生徒一覧 API・生徒詳細 API                           | SC の表示と取得                      | 変更                         |
| オンボーディング・ツアー・アラート・活動量・未確認・台本生成・スーパー管理者     | SC への言及                          | 変更                         |

---

### Task 1: 直近の重み付き平均（純関数と検査）

**Files:**

- Create: `src/lib/rank/recent-average.ts`
- Create: `scripts/verify-rank-average.ts`
- Modify: `package.json`（`validate:data` の末尾に連結）

- [ ] **Step 1: 失敗する検査を書く**

`scripts/verify-rank-average.ts`:

```ts
/**
 * ランクの元になる「直近の重み付き平均」の検査（AI も DB も使わない）。
 * 設計: docs/superpowers/specs/2026-09-23-admin-student-detail-redesign-design.md §3
 */
import assert from "node:assert/strict";
import {
  recentWeightedAverage,
  RANK_WINDOW_WEIGHT,
  type PracticeScore,
} from "../src/lib/rank/recent-average";

let checks = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    checks++;
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

const s = (value: number, at: number, max = 50, weight = 1): PracticeScore => ({
  value,
  max,
  weight,
  at,
});

check("窓は重み10", () => assert.equal(RANK_WINDOW_WEIGHT, 10));

check("0件は null", () => {
  const r = recentWeightedAverage([], 50);
  assert.equal(r.avg, null);
  assert.equal(r.used, 0);
});

check("新しい順に重みの合計10までしか見ない", () => {
  // 古い5件は10点、新しい10件は30点
  const old = Array.from({ length: 5 }, (_, i) => s(10, i));
  const recent = Array.from({ length: 10 }, (_, i) => s(30, 100 + i));
  const r = recentWeightedAverage([...old, ...recent], 50);
  assert.equal(r.avg, 30);
  assert.equal(r.used, 10);
});

check("ちょこ添削は0.5件として数え、重み付きで平均する", () => {
  // 本添削8件(40点) + ちょこ4件(20点, 重み0.5) = 重み10
  const essays = Array.from({ length: 8 }, (_, i) => s(40, 100 + i));
  const chocos = Array.from({ length: 4 }, (_, i) => s(20, 200 + i, 50, 0.5));
  const r = recentWeightedAverage([...essays, ...chocos], 50);
  // (8*40 + 2*20) / 10 = 36
  assert.equal(r.avg, 36);
  assert.equal(r.used, 12);
});

check("窓をまたぐ1件は、残りの重みだけ入れる", () => {
  // 新しい順: 本添削9件(30点) → ちょこ(重み0.5, 50点) → 本添削(10点)
  // 9 + 0.5 = 9.5、残り0.5 を本添削(10点)から取る
  const items = [
    ...Array.from({ length: 9 }, (_, i) => s(30, 300 + i)),
    s(50, 200, 50, 0.5),
    s(10, 100),
  ];
  const r = recentWeightedAverage(items, 50);
  // (9*30 + 0.5*50 + 0.5*10) / 10 = 30
  assert.equal(r.avg, 30);
});

check("満点の違う記録は scaleMax に揃えてから平均する", () => {
  // 口頭試問型 48/60 → 40/50、通常 30/50
  const r = recentWeightedAverage([s(48, 2, 60), s(30, 1, 50)], 50);
  assert.equal(r.avg, 35);
});

check("面接: 40点満点を40点スケールのまま、50点満点は40点へ揃える", () => {
  const r = recentWeightedAverage([s(32, 2, 40), s(40, 1, 50)], 40);
  // 32/40 → 32、40/50 → 32
  assert.equal(r.avg, 32);
});

console.log(`verify-rank-average: ${checks} checks passed`);
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx tsx scripts/verify-rank-average.ts`
Expected: FAIL（`Cannot find module '../src/lib/rank/recent-average'`）

- [ ] **Step 3: 実装する**

`src/lib/rank/recent-average.ts`:

```ts
/**
 * ランク（スキルバッジ）の元になる「直近の重み付き平均」。
 *
 * 新しい順に、重みの合計が RANK_WINDOW_WEIGHT に達するまでの提出で平均する。
 * 本添削・面接は重み1、ちょこ添削は重み0.5（CHOCO_WEIGHT）。窓をまたぐ1件は
 * 残りの重みだけ入れる。満点の違う記録（口頭試問型60点など）は scaleMax に揃える。
 *
 * 全期間の平均だと初期の低い点が伸びを隠し、直近30日の窓だと直近の1件で
 * ランクが決まった（2026-08-14 以前）。常に10件分を見る形にする（2026-09-23）。
 */
export const RANK_WINDOW_WEIGHT = 10;

export interface PracticeScore {
  /** その回の合計点 */
  value: number;
  /** その回の満点 */
  max: number;
  /** 本添削・面接は1、ちょこ添削は0.5 */
  weight: number;
  /** 提出時刻（ミリ秒）。新しい順に並べるのに使う */
  at: number;
}

export interface RecentAverage {
  /** scaleMax に揃えた重み付き平均。0件は null */
  avg: number | null;
  /** 平均に入れた記録の件数（窓をまたいだ1件も1と数える） */
  used: number;
}

export function recentWeightedAverage(
  items: PracticeScore[],
  scaleMax: number,
  window: number = RANK_WINDOW_WEIGHT
): RecentAverage {
  const sorted = items
    .filter((x) => x.max > 0 && x.weight > 0 && Number.isFinite(x.value))
    .sort((a, b) => b.at - a.at);
  let weightSum = 0;
  let valueSum = 0;
  let used = 0;
  for (const x of sorted) {
    if (weightSum >= window) break;
    const w = Math.min(x.weight, window - weightSum);
    valueSum += (x.value / x.max) * scaleMax * w;
    weightSum += w;
    used++;
  }
  return {
    avg:
      weightSum > 0 ? Math.round((valueSum / weightSum) * 1000) / 1000 : null,
    used,
  };
}
```

- [ ] **Step 4: 検査が通ることを確かめる**

Run: `npx tsx scripts/verify-rank-average.ts`
Expected: `verify-rank-average: 7 checks passed`

- [ ] **Step 5: validate:data に連結する**

`package.json` の `validate:data` の末尾（`tsx scripts/verify-weakness-records.ts` の後ろ）に ` && tsx scripts/verify-rank-average.ts` を足す。

Run: `npm run validate:data 2>&1 | tail -2`
Expected: 最後に `verify-rank-average: 7 checks passed`

- [ ] **Step 6: Commit**

```bash
git add src/lib/rank/recent-average.ts scripts/verify-rank-average.ts package.json
git commit -m "feat(rank): 直近10件の重み付き平均を純関数にして検査で固定"
```

---

### Task 2: ランクの集計からスキルチェックを外す

**Files:**

- Modify: `src/lib/skill-check/aggregate.ts`（全体）
- Delete: `src/lib/skill-check/weights.ts`（Task 4 で参照を消してから。ここでは import だけ外す）

- [ ] **Step 1: `AggregateBreakdown` と合成を練習だけにする**

`src/lib/skill-check/aggregate.ts` の `AggregateMode`・`AggregateBreakdown`・`emptyBreakdown`・`blend` を次で置き換える:

```ts
export type AggregateMode = "practice_only" | "none";

export interface AggregateBreakdown {
  /** 直近の重み付き平均（scaleMax に揃えた値）。0件は null */
  practiceAvg: number | null;
  /** 平均に入れた記録の件数 */
  practiceCount: number;
  /** 表示用（小数1桁） */
  compositeScore: number | null;
  compositeRank: SkillRank | null;
  mode: AggregateMode;
}

function emptyBreakdown(): AggregateBreakdown {
  return {
    practiceAvg: null,
    practiceCount: 0,
    compositeScore: null,
    compositeRank: null,
    mode: "none",
  };
}

function toBreakdown(
  avg: number | null,
  used: number,
  rankFn: (total: number) => SkillRank
): AggregateBreakdown {
  if (avg === null) return emptyBreakdown();
  return {
    practiceAvg: avg,
    practiceCount: used,
    // 表示は小数1桁。ランクは丸め前で判定する
    compositeScore: Math.round(avg * 10) / 10,
    compositeRank: rankFn(avg),
    mode: "practice_only",
  };
}
```

import から `SC_WEIGHT, PRACTICE_WEIGHT`・`blendPracticeScores` を外し、`export { SC_WEIGHT, PRACTICE_WEIGHT } from "./weights";` の行を消す。定数 `INTERVIEW_SC_MAX`・`INTERVIEW_PRACTICE_MAX` を消し、次を足す:

```ts
import {
  recentWeightedAverage,
  type PracticeScore,
} from "@/lib/rank/recent-average";
import { ESSAY_SCORE_MAX } from "@/lib/types/essay";
import {
  INTERVIEW_CONTENT_MAX,
  interviewTotalMax,
} from "@/lib/types/interview";

/** Timestamp と ISO 文字列の両方を読む（コレクションで型が違う。CLAUDE.md 6.5） */
function toMs(v: unknown): number {
  const t = v as { toDate?: () => Date } | null;
  if (t && typeof t.toDate === "function") return t.toDate().getTime();
  if (typeof v === "string") {
    const ms = new Date(v).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  return v instanceof Date ? v.getTime() : 0;
}
```

- [ ] **Step 2: `computeEssayAggregate` を置き換える**

```ts
/**
 * 小論文のランク。添削した答案（重み1）とちょこ添削（重み0.5）の直近の平均。
 * 満点の違う答案（口頭試問型60点）は50点へ揃える。
 */
export async function computeEssayAggregate(
  userId: string
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return emptyBreakdown();
  try {
    const [essayAll, chocoAll] = await Promise.all([
      adminDb.collection("essays").where("userId", "==", userId).get(),
      adminDb.collection(`users/${userId}/chokoReviews`).get(),
    ]);
    const items: PracticeScore[] = [];
    for (const d of essayAll.docs) {
      const data = d.data();
      const total = data?.scores?.total;
      if (typeof total !== "number") continue;
      items.push({
        value: total,
        max: data?.feedback?.scoreMaximum ?? ESSAY_SCORE_MAX,
        weight: 1,
        at: toMs(data.submittedAt) || toMs(data.reviewedAt),
      });
    }
    for (const d of chocoAll.docs) {
      const data = d.data();
      const total = data?.scores?.total;
      if (typeof total !== "number") continue;
      items.push({
        value: total,
        max: ESSAY_SCORE_MAX, // computeChocoTotal は 0-50 に換算済み
        weight: CHOCO_WEIGHT,
        at: toMs(data.submittedAt) || toMs(data.createdAt),
      });
    }
    const { avg, used } = recentWeightedAverage(items, ESSAY_SCORE_MAX);
    return toBreakdown(avg, used, calculateRank);
  } catch (err) {
    console.warn("essay aggregate failed:", err);
    return emptyBreakdown();
  }
}
```

- [ ] **Step 3: `computeInterviewAggregate` を置き換える**

`isPracticed` はそのまま残し、本体を次にする:

```ts
/**
 * 面接のランク。生徒が話した completed の面接の直近の平均。
 * 満点は答案ごとに違う（共通40点・口頭試問50点）ので、40点スケールに揃える
 * （ランクの境界 INTERVIEW_SKILL_RANK_THRESHOLDS は40点スケール）。
 * 以前は一律 ×40/50 しており、40点満点の面接が2割低く出ていた。
 */
export async function computeInterviewAggregate(
  userId: string
): Promise<AggregateBreakdown> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return emptyBreakdown();
  try {
    const snap = await adminDb
      .collection("interviews")
      .where("userId", "==", userId)
      .get();
    const items: PracticeScore[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (!isPracticed(data)) continue;
      const total = data?.scores?.total;
      if (typeof total !== "number") continue;
      items.push({
        value: total,
        max: interviewTotalMax(data.scores),
        weight: 1,
        at: toMs(data.completedAt) || toMs(data.startedAt),
      });
    }
    const { avg, used } = recentWeightedAverage(items, INTERVIEW_CONTENT_MAX);
    return toBreakdown(avg, used, calculateInterviewRank);
  } catch (err) {
    console.warn("interview aggregate failed:", err);
    return emptyBreakdown();
  }
}
```

`isPracticed` は関数の中に定義されているので、ファイル先頭のモジュールスコープへ移す（中身は変えない）。

- [ ] **Step 4: `resolveScRawScore` を消し、キャッシュ更新から SC を外す**

`resolveScRawScore` 関数とそのコメントを削除する。`refreshEssayAggregateCache` と `refreshInterviewAggregateCache` の本体を次にする（SC のサブコレクションを読まない）:

```ts
export async function refreshEssayAggregateCache(
  userId: string
): Promise<void> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;
  const userRef = adminDb.doc(`users/${userId}`);
  if (!(await userRef.get()).exists) return;
  const result = await computeEssayAggregate(userId);
  await userRef.update({
    currentSkillScore: result.compositeScore,
    currentSkillRank: result.compositeRank,
  });
}

export async function refreshInterviewAggregateCache(
  userId: string
): Promise<void> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;
  const userRef = adminDb.doc(`users/${userId}`);
  if (!(await userRef.get()).exists) return;
  const result = await computeInterviewAggregate(userId);
  await userRef.update({
    currentInterviewScore: result.compositeScore,
    currentInterviewRank: result.compositeRank,
  });
}
```

（null も書く。以前の SC 込みの値を残さないため）

`blendPracticeScores`（`src/lib/choco/blend.ts`）は他で使われていなければ Task 10 で消す。

- [ ] **Step 5: 型チェックで呼び出し側の崩れを出す**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "^$" | head -40`
Expected: `computeEssayAggregate`/`computeInterviewAggregate` の引数、`resolveScRawScore`、`scRank`/`scScore`/`SC_WEIGHT` を使っている箇所でエラーが出る。**ここでは直さない**（Task 3〜8 で直す）。出たファイルの一覧を控える。

- [ ] **Step 6: Commit しない**（型エラーが残るため。Task 8 までまとめて1コミットにする）

---

### Task 3: 生徒のランク API を作り、スキルチェックの API を止める

**Files:**

- Create: `src/app/api/student/rank/route.ts`
- Modify: `src/app/api/skill-check/**/route.ts`・`src/app/api/interview-skill-check/**/route.ts`・`src/app/api/admin/students/[id]/skill-check/**/route.ts`・`src/app/api/admin/students/[id]/interview-skill-check/**/route.ts`
- Create: `src/lib/api/gone.ts`

- [ ] **Step 1: ランク API を書く**

`src/app/api/student/rank/route.ts`（認証は今の `/api/skill-check/status` と同じ書き方にする）:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
  type AggregateBreakdown,
} from "@/lib/skill-check/aggregate";

export interface StudentRankResponse {
  essay: AggregateBreakdown;
  interview: AggregateBreakdown;
}

/**
 * 生徒本人のランク（小論文・面接）。直近10件の提出の平均だけで決める。
 * 以前は /api/skill-check/status・/api/interview-skill-check/status に相乗りしていた
 * （スキルチェックは 2026-09-23 に廃止）。
 */
export async function GET(request: NextRequest) {
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        userId = (await adminAuth.verifyIdToken(authHeader.slice(7))).uid;
      }
    } catch {}
  }
  if (!userId && process.env.NODE_ENV === "development") userId = "dev-user";
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const [essay, interview] = await Promise.all([
    computeEssayAggregate(userId),
    computeInterviewAggregate(userId),
  ]);
  return NextResponse.json<StudentRankResponse>({ essay, interview });
}
```

- [ ] **Step 2: 410 を返す共通関数を書く**

`src/lib/api/gone.ts`:

```ts
import { NextResponse } from "next/server";

/** スキルチェックは 2026-09-23 に廃止。古い画面が開いたままでも新しい記録を作らない */
export function skillCheckGone() {
  return NextResponse.json(
    { error: "スキルチェックは終了しました" },
    { status: 410 }
  );
}
```

- [ ] **Step 3: スキルチェックの API をすべて 410 にする**

対象（`find src/app/api/skill-check src/app/api/interview-skill-check "src/app/api/admin/students/[id]/skill-check" "src/app/api/admin/students/[id]/interview-skill-check" -name route.ts` で一覧を出す）:
`skill-check/{submit,category,questions,ocr,history,status}`、`interview-skill-check/{start,message,gemini-live-session,end,status}`、管理者の `skill-check/{route,[resultId],category}`・`interview-skill-check/{route,[resultId]}`。

各ファイルの中身を丸ごと次に置き換える（export しているメソッドだけ残す。例: GET だけのファイルは GET だけ）:

```ts
import { skillCheckGone } from "@/lib/api/gone";

export async function POST() {
  return skillCheckGone();
}
```

（GET のファイルは `export async function GET()`、PATCH は `PATCH`。`maxDuration` などの export は消す）

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit -p . 2>&1 | grep "src/app/api/\(skill-check\|interview-skill-check\|student/rank\)" | head`
Expected: 出力なし

---

### Task 4: ランクの表示から SC の文言を消す（SkillRankPanel・ダッシュボード・モバイルメニュー）

**Files:**

- Modify: `src/components/skill-check/SkillRankPanel.tsx`
- Modify: `src/app/student/dashboard/page.tsx`
- Modify: `src/components/layout/MobileMenuContent.tsx`

- [ ] **Step 1: SkillRankPanel の props と文言**

- import から `ACADEMIC_CATEGORY_LABELS, type AcademicCategory` と `SC_WEIGHT, PRACTICE_WEIGHT`、定数 `SC_PCT`・`PRACTICE_PCT` を消す。
- props から `takenAt`・`daysSinceLast`・`category` を消し、関数の引数からも消す。
- `emptyMessage` の既定値を `"未受験"` → `"まだ提出がありません"`、minimal の `"未受験"`（2か所）を `"提出なし"` に。
- `aggregate.mode === "weighted"` の「総合」バッジと、`weighted`・`sc_only`・`practice_only` の3つの説明文を消し、次の1行にする:

```tsx
{
  aggregate && aggregate.mode === "practice_only" && (
    <p className="text-muted-foreground mt-1 text-sm">
      直近{aggregate.practiceCount}件の平均
    </p>
  );
}
```

- カテゴリのバッジと日付の `<div className="mt-1 flex ...">` ブロックを丸ごと消す。

- [ ] **Step 2: ダッシュボード**

`src/app/student/dashboard/page.tsx`:

- import の `SkillCheckRefreshBanner`・`SkillCheckStatus`・`InterviewSkillCheckStatus` を消し、`import type { StudentRankResponse } from "@/app/api/student/rank/route";` を足す。
- `skillCheckStatus`・`interviewSkillStatus` の2つの `useAuthSWR` を次の1つにする:

```ts
const { data: rank } = useAuthSWR<StudentRankResponse>("/api/student/rank");
```

- `NotificationPermissionBanner` の直後の `skillCheckStatus?.needsRefresh && ... <SkillCheckRefreshBanner .../>` を消す。
- モバイル・デスクトップの4つの `SkillRankPanel` を、リンク先 `/student/growth`、`rank={rank?.essay.compositeRank ?? null}` / `score={rank?.essay.compositeScore ?? null}` / `aggregate={rank?.essay}`（面接は `rank?.interview`、`maxScore={40}`）にし、`takenAt`・`daysSinceLast`・`category`・`subLabel` を消す。`emptyMessage` は `"まだ提出がありません"`。ラベルは今の「小論文レベル」「面接レベル」「小論文スキル」「面接スキル」のまま。`data-tour="skill-rank-essay"` は残す（ツアーの吹き出しが指している）。

- [ ] **Step 3: モバイルメニュー**

`src/components/layout/MobileMenuContent.tsx`:

- 115〜121行付近のメニュー項目「スキル診断」（`href: "/student/skill-check"`）を消す。
- 274〜283行付近の2つの status の取得を `useAuthSWR<StudentRankResponse>("/api/student/rank")` 1つにし、`essayRank = rank?.essay.compositeRank ?? null`、`interviewRank = rank?.interview.compositeRank ?? null` にする（`latestResult` へのフォールバックを消す）。
- 342〜343行の `RankSummary` の `href` を両方 `/student/growth` に。
- 551行付近の「診断する」の文言を「提出する」に（ランクが無いときの誘導）。リンク先は `/student/essay/new`。
- import の `SkillCheckStatus`・`InterviewSkillCheckStatus` を消す。

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit -p . 2>&1 | grep "dashboard/page\|MobileMenuContent\|SkillRankPanel" | head`
Expected: 出力なし

---

### Task 5: 生徒の受験画面を移し、入口・案内を消す

**Files:**

- Modify: `src/app/student/skill-check/page.tsx`・`new/page.tsx`・`[resultId]/page.tsx`
- Modify: `src/app/student/interview-skill-check/page.tsx`・`new/page.tsx`・`[resultId]/page.tsx`
- Modify: `src/app/tour/skill-check/page.tsx`・`src/lib/tutorial/tour-routes.ts`・`src/app/tour/complete/page.tsx`
- Modify: `src/app/student/onboarding/page.tsx`・`src/app/student/self-analysis/result/page.tsx`・`src/components/onboarding/SelfAnalysisStep.tsx`
- Modify: `src/lib/api/inline-comment-targets.ts`・`src/components/chat/ChatThread.tsx`・`src/components/sessions/SessionArtifactsPanel.tsx`（リンク先）

- [ ] **Step 1: 6つの受験画面をダッシュボードへ移す**

6ファイルの中身を丸ごと次にする:

```tsx
import { redirect } from "next/navigation";

/** スキルチェックは 2026-09-23 に廃止。古いリンクはダッシュボードへ */
export default function Page() {
  redirect("/student/dashboard");
}
```

- [ ] **Step 2: ツアーから外す**

- `src/lib/tutorial/tour-routes.ts`: `TOUR_ORDER` から skill-check の項目（29行付近）を消し、前後の `next`/`prev`（90行・123行付近）を詰める（skill-check の前の項目の `next` を、skill-check の `next` に付け替える）。99〜120行の `/tour/skill-check` の定義を消す。58〜62行のダッシュボードの吹き出しの文言「スキルチェックのランクと推移。30 日経過でリマインド」を「提出の平均で決まるランク。直近10件で動きます」に。
- `src/app/tour/skill-check/page.tsx`: Step 1 と同じ形で `/tour/complete` ではなく、ツアーの次の画面（Step 2 で詰めた先）へ `redirect` する。
- `src/app/tour/complete/page.tsx` 44行の「月 1 回のスキルチェックで実力を定量化」を「提出するたびにランクが更新される」に。
- `src/lib/tutorial/mocks.ts` のスキルチェックの status のモック（82〜179行付近）は、ダッシュボードが `/api/student/rank` を読むようになったので、`/api/student/rank` のモック `{ essay: {...}, interview: {...} }` に置き換える（`mode: "practice_only"`、`practiceCount: 8`、`compositeScore: 28.5`、`compositeRank: "C"` など、今のモックと同じ水準の値）。

- [ ] **Step 3: オンボーディングの最後の段を外す**

- `src/app/student/onboarding/page.tsx`: `STEPS` から「スキルチェック」（20行付近）を消し、step 4（229〜235行付近、`SkillCheckStep`）を消す。自己分析をスキップしたときの遷移先が step 4 なら、最後の段の完了処理（`onboardingChain` を消してダッシュボードへ）に付け替える。`SkillCheckStep` の import を消す。
- `src/app/student/self-analysis/result/page.tsx` 190〜197・243〜256行の「次はスキルチェックです」の案内を消し、`onboardingChain` の localStorage フラグをここで消して（`try { localStorage.removeItem(...) } catch {}`）ダッシュボードへの案内にする。フラグのキー名は `src/app/student/skill-check/[resultId]/page.tsx` の83行（Step 1 で消す前に確認して控える）と同じにする。
- `src/components/onboarding/SelfAnalysisStep.tsx` 15・54行のスキルチェックへの言及を消す。

- [ ] **Step 4: 古いリンクの行き先を変える**

`inline-comment-targets.ts` 59行（`studentHref`）、`ChatThread.tsx` 152〜164行、`SessionArtifactsPanel.tsx` 182〜185行で `/student/skill-check` や `/student/interview-skill-check` を指している箇所を `/student/dashboard` にする（古いメッセージの参照カードを壊さないため、カード自体は残す）。

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit -p . 2>&1 | grep "student/\(skill-check\|interview-skill-check\|onboarding\|self-analysis\)\|tour\|tutorial\|ChatThread\|inline-comment" | head`
Expected: 出力なし

---

### Task 6: 管理者の生徒詳細・面談画面から SC を消す

**Files:**

- Modify: `src/app/admin/students/[id]/page.tsx`
- Modify: `src/components/admin/StudentSkillRadar.tsx`
- Modify: `src/components/admin/SessionStudentDossier.tsx`
- Modify: `src/app/admin/sessions/[id]/page.tsx`
- Modify: `src/components/sessions/SessionArtifactsPanel.tsx`・`src/lib/api/session-artifacts.ts`

- [ ] **Step 1: StudentSkillRadar**

- props から `skillCheck`・`interviewSkillCheck`・`onSelectEssay`・`onSelectInterview` と `SkillCheckMeta` 型を消す。
- レーダーは SC の `latestResult` から組んでいる（82〜114行）。**`detail` の練習の項目別平均から組む**（生徒詳細の成績タブの「項目別の平均」と同じ値。`src/app/admin/students/[id]/page.tsx` 940〜960行付近の `essayAxisAvg` の計算を `StudentSkillRadar` に `essayAxisAvg`・`interviewAxisAvg` props として渡す）。
- 207〜212行の「スキルチェックテストを受けるとランクが付きます／月1回の受験…」を「提出するとランクが付きます」に。
- 受験日（217〜220・285〜290行）、「再受験推奨」バッジ（259〜264行）、SC ×40% の内訳（295〜302行）を消し、`直近{aggregate.practiceCount}件の平均` の1行にする。
- カードのクリックで SC のダイアログを開く処理（144・152〜154行）を消す。

- [ ] **Step 2: 生徒詳細のページ**

`src/app/admin/students/[id]/page.tsx`:

- import: `CategorySelector`（105行）、SC の型（107行）、`SkillCheckDetailDialog`・`SkillCheckHistorySection`（111〜122行）を消す。`SkillRadarChart`（109行）は答案詳細で使うので残す。
- state: `skillCheck`・`interviewSkillCheck`・`scDialog`・`savingCategory`（545〜554行）を消す。
- `fetchSkill` と `handleChangeSkillCategory`（752〜792行）を消し、呼び出しも消す。
- ヒートマップに渡している `skillChecks`（603・618行）を消す。
- `renderOverviewTab` の `StudentSkillRadar` から SC の props を消し、Step 1 の `essayAxisAvg`・`interviewAxisAvg` を渡す。`SkillCheckHistorySection`（990〜998行）を消す。
- 「スキルチェック系統」のカード（1150〜1167行）を消す。
- `tabUnviewed([...])` の `"skillCheck"`（1523〜1524行）を外す。
- `SkillCheckDetailDialog`（1794〜1801行）を消す。

- [ ] **Step 3: 面談画面**

- `src/components/admin/SessionStudentDossier.tsx`: SC の import（24・39〜45行）、props と `scDialog`（70〜83行）、`StudentSkillRadar` への SC の props（195〜214行）、ダイアログ（354〜359行）を消す。`StudentSkillRadar` には Step 1 の `essayAxisAvg`・`interviewAxisAvg` を `detail` から計算して渡す（生徒詳細と同じ関数を使うため、Step 1 で計算を `src/lib/admin/axis-averages.ts` に `computeAxisAverages(detail)` として切り出し、両方から呼ぶ）。
- `src/app/admin/sessions/[id]/page.tsx`: SC の型と state（48〜49・101〜103行）、管理者の SC API の取得（155〜170行）、ドシエへの受け渡し（599〜600行）を消す。
- `src/lib/api/session-artifacts.ts`（24〜25・42・93〜94・189〜192・212行）と `SessionArtifactsPanel.tsx`（14〜18・57・104・137〜160・202・265・389〜394行）から「スキルチェック」のグループとダイアログを消す。小論文・面接に使っている `calculateRank`・`calculateInterviewRank` は残す。

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit -p . 2>&1 | grep "admin/students/\[id\]/page\|StudentSkillRadar\|SessionStudentDossier\|admin/sessions/\[id\]/page\|session-artifacts\|SessionArtifactsPanel" | head`
Expected: 出力なし

---

### Task 7: 管理者の API・アラート・活動量・未確認・台本生成から SC を外す

**Files:**

- Modify: `src/app/api/admin/students/route.ts`・`src/app/api/admin/students/[id]/route.ts`・`src/lib/types/admin.ts`
- Modify: `src/lib/api/submission-kinds.ts`・`src/app/api/admin/alerts/route.ts`・`src/app/admin/alerts/page.tsx`
- Modify: `src/lib/api/last-activity.ts`・`src/lib/utils/activity-heatmap.ts`・`src/components/admin/ActivityHeatmap.tsx`
- Modify: `src/app/api/admin/sessions/[id]/generate-plan/route.ts`・`src/lib/ai/prompts/lesson-plan.ts`
- Modify: `src/app/api/admin/students/[id]/ai-conversations/route.ts`
- Modify: `src/app/api/superadmin/stats/route.ts`・`src/app/superadmin/dashboard/page.tsx`・`src/app/api/admin/bigquery-snapshot/route.ts`

- [ ] **Step 1: 生徒一覧・生徒詳細の API**

- `src/app/api/admin/students/route.ts`: `resolveScRawScore` の import（9〜13行）、`skillChecks`・`interviewSkillChecks` の取得（217〜229・238〜239・248〜249行）、`lastSkillChecked/InterviewCheckedAt`（413〜416行）、返り値の `lastSkillCheckedAt`・`academicCategory`・`lastInterviewCheckedAt`（471〜475行）を消す。421〜433行は `computeEssayAggregate(uid)`・`computeInterviewAggregate(uid)`（引数1つ）にする。`currentSkillRank`・`currentInterviewRank` とランクの並べ替え・絞り込み（496・505〜516行）は残す。
- `src/app/api/admin/students/[id]/route.ts`: SC の取得（172〜173・182〜191行）、`resolveScRawScore` と `buildSkillCheckMeta`（522〜559行）、返り値の SC の meta（609〜610行）を消す。`essayAggregate`・`interviewAggregate` は引数1つで残す。
- `src/lib/types/admin.ts`: `lastSkillCheckedAt`・`academicCategory`・`lastInterviewCheckedAt`（65〜78行）、`essaySkillCheckMeta`・`interviewSkillCheckMeta`・`skillCheck?`・`interviewSkillCheck?`（168〜191行）、`featureUsage.skillChecks`（313行）を消す。

- [ ] **Step 2: 未確認の数え方**

`src/lib/api/submission-kinds.ts` 12〜13・40〜49行の `skillCheck`・`interviewSkillCheck` を消す（画面から開けなくなるので、残すと未確認のバッジが消えなくなる）。

- [ ] **Step 3: アラート**

`src/app/api/admin/alerts/route.ts` の `skill_check_done`（50・604〜624行）と、最終活動の日付に SC のコレクションを入れている箇所（423〜424行）を消す。`src/app/admin/alerts/page.tsx` 92〜93行と `src/lib/types/admin.ts` 389行の `skill_check_done` を消す。

- [ ] **Step 4: 最終活動・活動量**

`src/lib/api/last-activity.ts`（14〜15・29〜30・56〜57行）、`src/lib/utils/activity-heatmap.ts`（64・82〜83・104〜105行）、`src/components/admin/ActivityHeatmap.tsx`（29・72・81・90・94・134行）から SC（「スキル」の系列）を消す。

- [ ] **Step 5: 台本生成**

`src/app/api/admin/sessions/[id]/generate-plan/route.ts` の `latestSkill`（108〜120・184〜185・242〜263行）を、SC の文書ではなく `users/{uid}` の `currentSkillRank`・`currentSkillScore`・`currentInterviewRank`・`currentInterviewScore` から組む。`src/lib/ai/prompts/lesson-plan.ts` 50〜60・140〜165行の SC の文言を「直近10件の提出の平均によるランク」に直す。プロンプトの中身が変わるので `src/lib/ai/prompt-versions.ts` に lesson plan の版があれば上げる。

- [ ] **Step 6: AI 対話・スーパー管理者・BigQuery**

- `src/app/api/admin/students/[id]/ai-conversations/route.ts`（15・97・116・158・204〜213行）から面接スキルチェックの対話を外す。
- `src/app/api/superadmin/stats/route.ts`（471・505〜533行）と `src/app/superadmin/dashboard/page.tsx`（63・373行）の「スキルチェック」の利用数を消す。
- `src/app/api/admin/bigquery-snapshot/route.ts` 231〜238行の `sc_essay_score`・`sc_interview_score` は `null` を書く（スキーマは変えない。列を消すと過去のスナップショットとの比較が崩れる）。
- スーパー管理者の面接問題バンクの `skill_check` カテゴリ（`api/superadmin/interview-content/route.ts` 16、`superadmin/interview-content/page.tsx` 32、`types/interview-content.ts` 16・44・63、`data/interview-content.ts` 91〜98）は、選べないように画面の選択肢から外す（データの型は残す）。

- [ ] **Step 7: 型チェックを全体で通す**

Run: `npx tsc --noEmit -p . 2>&1 | head -30`
Expected: 出力なし。残っていれば、そのファイルの SC の参照を同じ方針（表示は消す／ランクは `compute*Aggregate(uid)`）で直す。

---

### Task 8: 検証してコミット（ランク変更とスキルチェックの画面の撤去）

- [ ] **Step 1: 残った参照を確かめる**

Run: `grep -rn "skill-check\|skillCheck\|SkillCheck\|interview-skill-check\|academicCategory" src --include=*.tsx --include=*.ts -l | sort`
Expected: 残るのは次だけ（どれも「データを表示するため／ランクのため」に残すもの）:
`src/lib/skill-check/{aggregate,rank,questions,category-mapper}.ts`、`src/lib/interview-skill-check/rank.ts`、`src/lib/types/{skill-check,interview-skill-check,user,essay,interview,growth,feedback}.ts`、`src/components/skill-check/{SkillRankBadge,SkillRadarChart,SkillRankPanel}.tsx`、Task 3・5 で 410／redirect にしたファイル、削除予定の SC 専用部品（Task 10）、弱点の `source` の文字列を使う箇所。
これ以外が出たら、その箇所を直す。

- [ ] **Step 2: 検査・lint・ビルド**

Run: `npm run validate:data 2>&1 | tail -3 && npx eslint $(git diff --name-only | grep -E '\.(ts|tsx)$') && npm run build 2>&1 | tail -3`
Expected: 検査がすべて通り、eslint のエラー0、ビルド成功

- [ ] **Step 3: エミュレータで画面を確かめる**

`npm run emu`・`npm run seed:emu`・`npm run dev:emu -- -p 3100` を起動し、Playwright で:

1. 生徒（`student@example.com`）でダッシュボードを開き、ランクが出る（「直近○件の平均」）、「再測定」の案内が無い、コンソールエラーが無い
2. `/student/skill-check`・`/student/interview-skill-check/new` を開くとダッシュボードへ移る
3. モバイル幅（375px）でメニューを開き、「スキル診断」が無い、ランクの行が `/student/growth` へ行く
4. 管理者で生徒詳細を開き、スキルチェック履歴・系統のカードが無く、スキルのカード（レーダー）が練習の平均で出る
5. 面談画面（シードのセッション）を開き、ドシエにスキルチェックが無い
6. `curl -X POST localhost:3100/api/skill-check/submit` が 410

- [ ] **Step 4: Commit と push**

```bash
git add -A src scripts package.json
git commit -m "feat(rank): ランクを直近10件の提出の平均だけで決め、スキルチェックを画面から消す"
git push origin main
```

（コミットメッセージの本文に、変えた理由・面接の満点のずれの修正・データは残すことを書く）

---

### Task 9: 保存済みのランクを付け直す（本番の書き込み。実行前に確認を取る）

`users.currentSkillRank`・`currentInterviewRank` には SC 込みの値が残っている。次の提出まで古い値のままなので、全生徒分を付け直す。

**Files:**

- Create: `scripts/refresh-ranks.ts`

- [ ] **Step 1: スクリプトを書く**

```ts
/**
 * 保存済みのランク（users.currentSkillRank / currentInterviewRank）を付け直す。
 * 2026-09-23 にランクをスキルチェック込みから「直近10件の提出の平均」に変えたため。
 *
 * 確認のみ（既定）: npx tsx --env-file=.env.local scripts/refresh-ranks.ts
 * 書き込む:          npx tsx --env-file=.env.local scripts/refresh-ranks.ts --apply
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
} from "../src/lib/skill-check/aggregate";

const APPLY = process.argv.includes("--apply");

async function main() {
  const db = adminDb;
  if (!db) throw new Error("Firestore に接続できません");
  const users = await db
    .collection("users")
    .where("role", "==", "student")
    .get();
  let changed = 0;
  for (const u of users.docs) {
    const d = u.data();
    const [essay, interview] = await Promise.all([
      computeEssayAggregate(u.id),
      computeInterviewAggregate(u.id),
    ]);
    const before = `${d.currentSkillRank ?? "-"}/${d.currentInterviewRank ?? "-"}`;
    const after = `${essay.compositeRank ?? "-"}/${interview.compositeRank ?? "-"}`;
    if (before !== after) changed++;
    console.log(`${d.displayName ?? u.id}  小論文/面接 ${before} → ${after}`);
    if (APPLY) {
      await u.ref.update({
        currentSkillScore: essay.compositeScore,
        currentSkillRank: essay.compositeRank,
        currentInterviewScore: interview.compositeScore,
        currentInterviewRank: interview.compositeRank,
      });
    }
  }
  console.log(
    `\n${APPLY ? "書き換えた" : "確認のみ"}: ${users.size}人中 ${changed}人のランクが変わる`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

- [ ] **Step 2: 確認のみで実行してもらう**（本番の読み取り。自動モードでは止まるのでユーザーが `!` で実行）

`! npx tsx --env-file=.env.local scripts/refresh-ranks.ts`
Expected: 生徒ごとに「前 → 後」。面接のランクは上がる生徒が多い（満点のずれの修正）

- [ ] **Step 3: 結果を見せて確認を取り、`--apply` で実行してもらう**

- [ ] **Step 4: Commit**

```bash
git add scripts/refresh-ranks.ts
git commit -m "chore(scripts): 保存済みのランクを直近10件の平均で付け直す"
```

---

### Task 10: 使わなくなった部品を消す（片付け）

画面・API から参照が消えたものを削除する。

- [ ] **Step 1: 参照が無いことを確かめてから消す**

候補: `src/components/skill-check/{CategorySelector,SkillCheckExamView,SkillCheckRefreshBanner,SkillCheckResultView,SkillHistoryChart}.tsx`、`src/components/interview-skill-check/*`、`src/components/admin/{SkillCheckDetailDialog,SkillCheckHistorySection}.tsx`、`src/components/onboarding/SkillCheckStep.tsx`、`src/components/dashboard/SkillRankCard.tsx`（もともと未使用）、`src/lib/skill-check/{questions,category-mapper,weights}.ts`、`src/lib/choco/blend.ts`、`src/lib/ai/prompts/{skill-check,interview-skill-check,interview-skill-check-realtime}.ts`、`src/lib/ai/essay-reviewer.ts`・`src/lib/ai/schemas/skill-check.ts`、`scripts/rescore-skill-checks.ts`。

各ファイルについて `grep -rn "<ファイル名（拡張子なし）>" src scripts` で参照が0件なのを確かめてから `git rm` する。`scripts/verify-ai-prompt-safety.ts` 20行の `essay-reviewer` の import は、そのファイルを消すなら検査対象から外す。

- [ ] **Step 2: 検査・ビルド**

Run: `npm run validate:data 2>&1 | tail -2 && npm run verify:ai-prompts && npm run build 2>&1 | tail -2`
Expected: すべて成功

- [ ] **Step 3: Commit と push**

```bash
git add -A
git commit -m "chore: スキルチェック専用の部品・プロンプト・スクリプトを消す"
git push origin main
```

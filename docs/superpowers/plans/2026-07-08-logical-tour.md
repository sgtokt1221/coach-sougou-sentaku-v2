# ロジカルツアー Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ちょこ添削→要約ドリル→論理ドリルを毎日30-40分で巡回する「ロジカルツアー」を追加。ダッシュボードのモーション風ヒーロー、実データ基準の完了判定、ストリーク、`?tour=1`チェーン、ちょこの活動状況別枠まで含む。

**Architecture:** 各駅は既存ドリルを流用し、ツアーは順路・進捗・継続の器に徹する。進捗は各駅コレクションの当日記録から派生判定、ストリークは単票 `logicalTours/{uid}` にトランザクション冪等更新。UIはダッシュボードのヒーロー＋各駅結果への「次の駅へ」差し込み（専用ページなし）。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind/shadcn, **framer-motion ^12.38（導入済み）**, Firebase Admin (Firestore Timestamp/Transaction)。テストランナー無し→純ロジックは `tsx` 検証スクリプト、他は `tsc --noEmit` + `eslint` + 実機。

**設計書:** `docs/superpowers/specs/2026-07-08-logical-tour-design.md`

**参照する既存実装（実装前に読む）:**
- 活動集計: `src/lib/utils/activity-heatmap.ts` / `src/components/admin/ActivityHeatmap.tsx`（`logicDrill`/`drill` の追加箇所に倣う）
- 管理者ドリル取得API: `src/app/api/admin/students/[id]/summary-drills/route.ts`（choco版を同型で作る）
- 認可: `src/lib/api/auth.ts` の `requireRole`（`{uid, role}` を返す）
- 生徒詳細のheatmap供給: `src/app/admin/students/[id]/page.tsx:405-414`
- 各駅結果: `src/app/student/essay/choco/page.tsx:126-133` / `summary-drill/page.tsx`(result step) / `logic-drill/page.tsx:218-241`
- choco保存形: `src/app/api/essay/choco-review/route.ts`（`users/{uid}/chokoReviews`, `createdAt`）

---

## Task 1: 型定義

**Files:** Create `src/lib/types/logical-tour.ts`

- [ ] **Step 1: 作成**

```ts
// src/lib/types/logical-tour.ts
export type TourStationKey = "choco" | "summary" | "logic";

export interface TourStation {
  key: TourStationKey;
  label: string;
  href: string;      // 導線URL（?tour=1 は付けない。付与は tourHref() で）
  collection: string; // users/{uid}/<collection>
  dateField: "createdAt" | "completedAt";
  dateType: "isoString" | "timestamp";
  estMinutes: number;
  order: number;
}

/** 単票 logicalTours/{uid} */
export interface LogicalTourState {
  lastCompletedDate: string; // "YYYY-MM-DD"（未達は ""）
  streak: number;
  longestStreak: number;
}

export interface LogicalTourResponse {
  date: string;
  stations: { key: TourStationKey; done: boolean }[];
  completedCount: number;
  allDone: boolean;
  nextStationKey: TourStationKey | null;
  remainingMinutes: number;
  streak: number;
  longestStreak: number;
}
```

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "types/logical-tour" || echo clean` → `clean`
- [ ] **Step 3:** commit `feat(logical-tour): 型定義を追加`

---

## Task 2: 駅定義

**Files:** Create `src/lib/logical-tour/stations.ts`

- [ ] **Step 1: 作成**

```ts
// src/lib/logical-tour/stations.ts
import type { TourStation, TourStationKey } from "@/lib/types/logical-tour";

export const TOUR_STATIONS: TourStation[] = [
  { key: "choco", label: "ちょこ添削", href: "/student/essay/choco", collection: "chokoReviews", dateField: "createdAt", dateType: "isoString", estMinutes: 10, order: 1 },
  { key: "summary", label: "要約ドリル", href: "/student/essay/summary-drill", collection: "summaryDrills", dateField: "completedAt", dateType: "timestamp", estMinutes: 10, order: 2 },
  { key: "logic", label: "論理ドリル", href: "/student/essay/logic-drill", collection: "logicDrills", dateField: "completedAt", dateType: "timestamp", estMinutes: 15, order: 3 },
];

export function getStation(key: TourStationKey): TourStation | undefined {
  return TOUR_STATIONS.find((s) => s.key === key);
}

/** 駅の導線URLに ?tour=1 を付ける */
export function tourHref(key: TourStationKey): string {
  const s = getStation(key);
  if (!s) return "/student/dashboard";
  return `${s.href}?tour=1`;
}
```

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "logical-tour/stations" || echo clean` → `clean`
- [ ] **Step 3:** commit `feat(logical-tour): 駅定義を追加`

---

## Task 3: 純ロジック（日窓・ストリーク・次の駅）

**Files:** Create `src/lib/logical-tour/logic.ts`

乱数・argless `new Date()` 不使用（引数付き `new Date("...")` はOK）。

- [ ] **Step 1: 作成**

```ts
// src/lib/logical-tour/logic.ts
import { TOUR_STATIONS } from "@/lib/logical-tour/stations";
import type { LogicalTourState, TourStationKey } from "@/lib/types/logical-tour";

/** JST の当日 [start, end) を UTC ISO 文字列で返す。 */
export function jstDayBoundsUtc(dateStr: string): { startIso: string; endIso: string } {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** "YYYY-MM-DD" に days を加えた日付文字列（UTC基準で桁上げ）。 */
export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 3駅完了日のストリーク更新値。更新不要なら null（＝未完 or 既に今日カウント済み）。
 * yesterday 連続で +1、途切れは 1、longestStreak は最大を維持。
 */
export function computeStreakUpdate(
  prev: LogicalTourState,
  today: string,
  allDone: boolean,
): LogicalTourState | null {
  if (!allDone) return null;
  if (prev.lastCompletedDate === today) return null;
  const yesterday = addDaysStr(today, -1);
  const streak = prev.lastCompletedDate === yesterday ? (prev.streak ?? 0) + 1 : 1;
  const longestStreak = Math.max(prev.longestStreak ?? 0, streak);
  return { lastCompletedDate: today, streak, longestStreak };
}

/** 未完了の最初の駅key（順路順）。全完なら null。 */
export function nextIncompleteStation(
  doneByKey: Record<TourStationKey, boolean>,
): TourStationKey | null {
  for (const s of [...TOUR_STATIONS].sort((a, b) => a.order - b.order)) {
    if (!doneByKey[s.key]) return s.key;
  }
  return null;
}

/** 未完了駅の estMinutes 合計。 */
export function remainingMinutes(doneByKey: Record<TourStationKey, boolean>): number {
  return TOUR_STATIONS.filter((s) => !doneByKey[s.key]).reduce((n, s) => n + s.estMinutes, 0);
}
```

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "logical-tour/logic" || echo clean` → `clean`
- [ ] **Step 3:** commit `feat(logical-tour): 日窓/ストリーク/次駅の純ロジックを追加`

---

## Task 4: 検証スクリプト（このプロジェクトの「テスト」）

**Files:** Create `scripts/validate-logical-tour.ts`; Modify `package.json`

- [ ] **Step 1: 作成**

```ts
// scripts/validate-logical-tour.ts
import { TOUR_STATIONS, tourHref } from "../src/lib/logical-tour/stations";
import {
  jstDayBoundsUtc, addDaysStr, computeStreakUpdate, nextIncompleteStation, remainingMinutes,
} from "../src/lib/logical-tour/logic";

let errors = 0;
const fail = (m: string) => { console.error(`[logical-tour] ${m}`); errors++; };

// 駅定義
const keys = new Set<string>();
for (const s of TOUR_STATIONS) {
  if (keys.has(s.key)) fail(`dup key ${s.key}`);
  keys.add(s.key);
  if (!s.href.startsWith("/student/")) fail(`bad href ${s.key}`);
  if (s.estMinutes <= 0) fail(`estMinutes ${s.key}`);
  if (tourHref(s.key) !== `${s.href}?tour=1`) fail(`tourHref ${s.key}`);
}
if (TOUR_STATIONS.length !== 3) fail(`stations=${TOUR_STATIONS.length}`);

// 日窓（JST）
const b = jstDayBoundsUtc("2026-07-08");
if (b.startIso !== "2026-07-07T15:00:00.000Z") fail(`startIso ${b.startIso}`); // JST00:00 = UTC前日15:00
if (b.endIso !== "2026-07-08T15:00:00.000Z") fail(`endIso ${b.endIso}`);
if (addDaysStr("2026-07-08", -1) !== "2026-07-07") fail("addDaysStr -1");
if (addDaysStr("2026-07-01", -1) !== "2026-06-30") fail("addDaysStr month boundary");

// ストリーク
const base = { lastCompletedDate: "2026-07-07", streak: 3, longestStreak: 5 };
let u = computeStreakUpdate(base, "2026-07-08", true);
if (!u || u.streak !== 4 || u.longestStreak !== 5 || u.lastCompletedDate !== "2026-07-08") fail("streak yesterday+1");
u = computeStreakUpdate({ lastCompletedDate: "2026-07-05", streak: 9, longestStreak: 9 }, "2026-07-08", true);
if (!u || u.streak !== 1 || u.longestStreak !== 9) fail("streak gap reset to 1");
if (computeStreakUpdate(base, "2026-07-07", true) !== null) fail("streak same day null"); // lastCompletedDate===today
if (computeStreakUpdate(base, "2026-07-08", false) !== null) fail("streak notAllDone null");
u = computeStreakUpdate({ lastCompletedDate: "2026-07-07", streak: 7, longestStreak: 5 }, "2026-07-08", true);
if (!u || u.longestStreak !== 8) fail("longest updates when streak exceeds");

// 次駅 / 残り分
if (nextIncompleteStation({ choco: true, summary: false, logic: false }) !== "summary") fail("next=summary");
if (nextIncompleteStation({ choco: true, summary: true, logic: true }) !== null) fail("next=null when all done");
if (remainingMinutes({ choco: true, summary: false, logic: false }) !== 25) fail("remaining=25");

if (errors > 0) { console.error(`\n${errors} 件のエラー`); process.exit(1); }
console.log("logical-tour OK");
```

- [ ] **Step 2: `validate:data` にチェーン**

`package.json` の `validate:data` の末尾に `&& tsx scripts/validate-logical-tour.ts` を追加（既存の `validate-university-data` / `validate-logic-drills` の後ろ。実ファイル名は現物に合わせる）。

- [ ] **Step 3: 実行**

Run: `npx tsx scripts/validate-logical-tour.ts`
Expected: `logical-tour OK`（失敗なら該当行を修正）

- [ ] **Step 4:** commit `feat(logical-tour): 検証スクリプトを追加`

---

## Task 5: 進捗API

**Files:** Create `src/app/api/student/logical-tour/route.ts`

- [ ] **Step 1: 作成**

```ts
// src/app/api/student/logical-tour/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { TOUR_STATIONS } from "@/lib/logical-tour/stations";
import {
  jstDayBoundsUtc, computeStreakUpdate, nextIncompleteStation, remainingMinutes,
} from "@/lib/logical-tour/logic";
import type { LogicalTourResponse, TourStationKey, LogicalTourState } from "@/lib/types/logical-tour";

const EMPTY: LogicalTourState = { lastCompletedDate: "", streak: 0, longestStreak: 0 };

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const { startIso, endIso } = jstDayBoundsUtc(date);

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const { Timestamp } = await import("firebase-admin/firestore");
  const startTs = Timestamp.fromDate(new Date(startIso));
  const endTs = Timestamp.fromDate(new Date(endIso));

  // 各駅の当日記録有無（失敗時は未完扱い）
  const doneByKey = {} as Record<TourStationKey, boolean>;
  await Promise.all(
    TOUR_STATIONS.map(async (s) => {
      try {
        const col = adminDb.collection(`users/${uid}/${s.collection}`);
        const q =
          s.dateType === "isoString"
            ? col.where(s.dateField, ">=", startIso).where(s.dateField, "<", endIso)
            : col.where(s.dateField, ">=", startTs).where(s.dateField, "<", endTs);
        const snap = await q.limit(1).get();
        doneByKey[s.key] = !snap.empty;
      } catch (e) {
        console.warn(`[logical-tour] ${s.key} query failed:`, e);
        doneByKey[s.key] = false;
      }
    }),
  );

  const completedCount = TOUR_STATIONS.filter((s) => doneByKey[s.key]).length;
  const allDone = completedCount === TOUR_STATIONS.length;

  // ストリーク（3駅完了かつ未計上ならトランザクション冪等更新）
  const ref = adminDb.doc(`logicalTours/${uid}`);
  let state: LogicalTourState = ((await ref.get()).data() as LogicalTourState | undefined) ?? EMPTY;
  if (allDone && state.lastCompletedDate !== date) {
    try {
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const prev = (snap.data() as LogicalTourState | undefined) ?? EMPTY;
        const upd = computeStreakUpdate(prev, date, true);
        if (upd) {
          tx.set(ref, upd, { merge: true });
          state = { ...prev, ...upd };
        } else {
          state = prev;
        }
      });
    } catch (e) {
      console.warn("[logical-tour] streak update failed:", e);
    }
  }

  const body: LogicalTourResponse = {
    date,
    stations: [...TOUR_STATIONS].sort((a, b) => a.order - b.order).map((s) => ({ key: s.key, done: doneByKey[s.key] })),
    completedCount,
    allDone,
    nextStationKey: nextIncompleteStation(doneByKey),
    remainingMinutes: remainingMinutes(doneByKey),
    streak: state.streak ?? 0,
    longestStreak: state.longestStreak ?? 0,
  };
  return NextResponse.json(body);
}
```

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "api/student/logical-tour" || echo clean` → `clean`; `npx eslint "src/app/api/student/logical-tour/route.ts"` → エラーなし
- [ ] **Step 3:** commit `feat(logical-tour): 進捗API(派生判定+ストリーク)を追加`

---

## Task 6: ヒーロー（framer-motion）

**Files:** Create `src/components/student/LogicalTourHero.tsx`

- [ ] **Step 1: 作成**

```tsx
// src/components/student/LogicalTourHero.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { TOUR_STATIONS, tourHref } from "@/lib/logical-tour/stations";
import type { LogicalTourResponse } from "@/lib/types/logical-tour";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LogicalTourHero() {
  const { data } = useAuthSWR<LogicalTourResponse>(`/api/student/logical-tour?date=${todayStr()}`);
  const total = TOUR_STATIONS.length;
  const done = data?.completedCount ?? 0;
  const allDone = data?.allDone ?? false;
  const nextKey = data?.nextStationKey ?? TOUR_STATIONS[0].key;
  const remaining = data?.remainingMinutes ?? 35;
  const streak = data?.streak ?? 0;
  const pct = Math.round((done / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 via-sky-50 to-emerald-50 p-4 dark:border-teal-900/40 dark:from-teal-950/30 dark:via-sky-950/20 dark:to-emerald-950/20"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <motion.span
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <Sparkles className="size-6 text-teal-600 dark:text-teal-300" />
          </motion.span>
          <h2 className="text-lg font-bold tracking-tight">ロジカルツアー</h2>
        </div>
        {streak > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {streak}日連続
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {allDone
          ? "本日のツアーは完走しました！"
          : done === 0
            ? `今日のロジカルツアー・約${remaining}分`
            : `残り${total - done}駅・約${remaining}分`}
      </p>

      {/* 進行バー + 駅ドット */}
      <div className="mt-3">
        <div className="relative h-2 rounded-full bg-white/70 dark:bg-white/10">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          {[...TOUR_STATIONS].sort((a, b) => a.order - b.order).map((s) => {
            const isDone = data?.stations.find((x) => x.key === s.key)?.done ?? false;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1">
                <motion.span
                  animate={{ scale: isDone ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                    isDone ? "bg-emerald-500 text-white" : "bg-white/80 text-muted-foreground dark:bg-white/20"
                  }`}
                >
                  {isDone ? <Check className="size-3" /> : s.order}
                </motion.span>
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        {allDone ? (
          <Link href="/student/essay/logic-drill/history">
            <button className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              今日はおしまい・記録を見る
            </button>
          </Link>
        ) : (
          <Link href={tourHref(nextKey)}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              {done === 0 ? "はじめる" : "続きから"}
            </motion.button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "LogicalTourHero" || echo clean` → `clean`; `npx eslint src/components/student/LogicalTourHero.tsx` → エラーなし
- [ ] **Step 3:** commit `feat(logical-tour): ダッシュボードのモーションヒーローを追加`

---

## Task 7: 「次の駅へ」ボタン

**Files:** Create `src/components/student/TourNextButton.tsx`

- [ ] **Step 1: 作成**

```tsx
// src/components/student/TourNextButton.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { getStation, tourHref } from "@/lib/logical-tour/stations";
import type { LogicalTourResponse } from "@/lib/types/logical-tour";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 各駅の結果画面に差し込む。?tour=1 の時だけ表示。 */
export function TourNextButton() {
  const search = useSearchParams();
  const inTour = search.get("tour") === "1";
  const { data } = useAuthSWR<LogicalTourResponse>(
    inTour ? `/api/student/logical-tour?date=${todayStr()}` : null,
  );
  if (!inTour || !data) return null;

  const nextKey = data.nextStationKey;
  if (nextKey) {
    const label = getStation(nextKey)?.label ?? "次の駅";
    return (
      <Link href={tourHref(nextKey)} className="block">
        <Button className="w-full gap-1">
          次の駅へ（{label}）<ArrowRight className="size-4" />
        </Button>
      </Link>
    );
  }
  return (
    <Link href="/student/dashboard" className="block">
      <Button className="w-full gap-1">ロジカルツアー完走！ ダッシュボードへ</Button>
    </Link>
  );
}
```

> 注: `TourNextButton` を使うページは、`useSearchParams` のため呼び出し側が既に `Suspense` 境界内である必要がある。3駅の結果画面はいずれもクライアントページなので、境界が無ければ差し込み箇所を `<Suspense>` で包む（summary/logicは既にSuspense内。chocoは要確認）。

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "TourNextButton" || echo clean` → `clean`; eslint → エラーなし
- [ ] **Step 3:** commit `feat(logical-tour): 「次の駅へ」ボタンを追加`

---

## Task 8: ダッシュボードにヒーロー配置

**Files:** Modify `src/app/student/dashboard/page.tsx`

- [ ] **Step 1:** import 追加: `import { LogicalTourHero } from "@/components/student/LogicalTourHero";`
- [ ] **Step 2:** 返却JSXの最上部（`<UpcomingSessionCard />` を包む `<div data-tour="upcoming-session">` の直前）に `<LogicalTourHero />` を配置。
- [ ] **Step 3:** `npx tsc --noEmit 2>&1 | grep -i "dashboard/page" || echo clean` → `clean`; eslint（新規エラーなし）
- [ ] **Step 4:** commit `feat(logical-tour): ダッシュボード最上部にヒーローを配置`

---

## Task 9: 3駅の結果画面に「次の駅へ」差し込み

**Files:** Modify `src/app/student/essay/choco/page.tsx`, `.../summary-drill/page.tsx`, `.../logic-drill/page.tsx`

各ファイルで `import { TourNextButton } from "@/components/student/TourNextButton";` を追加し、結果表示の操作ボタン群に `<TourNextButton />` を差し込む。

- [ ] **Step 1: choco** — `choco/page.tsx:126-133` の `<Button onClick={startNew}>もう一問やる</Button>` の並びに `<TourNextButton />` を追加。ページが `Suspense` 境界を持たない場合は、`useSearchParams` を使う `TourNextButton` のために該当箇所（または結果ブロック）を `<Suspense fallback={null}>` で包む。
- [ ] **Step 2: summary-drill** — result step（`step === "result"`）の「もう一度/History」ボタン群の下に `<TourNextButton />` を追加。
- [ ] **Step 3: logic-drill** — `logic-drill/page.tsx:238-241` の「もう一度/履歴」flex の直後に `<TourNextButton />` を追加（結果ブロックは既に `Suspense` 内の `LogicDrillInner`）。
- [ ] **Step 4:** `npx tsc --noEmit 2>&1 | grep -iE "essay/(choco|summary-drill|logic-drill)/page" || echo clean` → `clean`; 各ファイル eslint（新規エラーなし）
- [ ] **Step 5:** commit `feat(logical-tour): 各駅の結果に「次の駅へ」を差し込み`

---

## Task 10: 管理者向け choco 取得API

**Files:** Create `src/app/api/admin/students/[id]/choco-reviews/route.ts`

**`src/app/api/admin/students/[id]/summary-drills/route.ts` を読み、同型で作成**（`requireRole` + スコープ）。コレクションを `summaryDrills` → `chokoReviews` に、返却の日時は `createdAt`（ISO文字列）を含める。heatmap集計に必要な最低限（`createdAt`）を返せばよい。

- [ ] **Step 1:** `cat "src/app/api/admin/students/[id]/summary-drills/route.ts"` で方式確認
- [ ] **Step 2:** 同型で `choco-reviews/route.ts` を作成（collection差し替え、`createdAt` を返す）
- [ ] **Step 3:** `npx tsc --noEmit 2>&1 | grep -i "choco-reviews/route" || echo clean` → `clean`; eslint → エラーなし
- [ ] **Step 4:** commit `feat(logical-tour): 管理者向けちょこ取得APIを追加`

---

## Task 11: 活動状況にちょこ別枠

**Files:** Modify `src/lib/utils/activity-heatmap.ts`, `src/components/admin/ActivityHeatmap.tsx`, `src/app/admin/students/[id]/page.tsx`

- [ ] **Step 1: `activity-heatmap.ts`** — 集計日型に `choco: number;` を追加、sources に `chocoReviews?: Array<{ createdAt?: string }>` を追加、`choco: countByDay(sources.chocoReviews ?? [], 'createdAt', day)` を集計（`drill`/`logicDrill` の行に倣う）。
- [ ] **Step 2: `ActivityHeatmap.tsx`** — `typeLabels` に `choco: "ちょこ添削"` を追加し、系列/凡例/合計など `logicDrill` を足した全箇所に `choco` を追加（未使用の色を1つ割当）。
- [ ] **Step 3: `admin/students/[id]/page.tsx`** — `logicDrillsData` の隣（:407付近）に `const { data: chocoReviewsData } = useAuthSWR<any[]>(\`/api/admin/students/${id}/choco-reviews\`);` を追加し、`buildActivityHeatmapData({ ..., chocoReviews: chocoReviewsData })`（:414）に渡す。`useMemo` 依存配列にも追加。
- [ ] **Step 4:** `npx tsc --noEmit 2>&1 | grep -c "error TS"`（ベースライン0を維持）; 触ったファイル eslint（新規エラーなし）
- [ ] **Step 5:** commit `feat(logical-tour): 活動状況ヒートマップにちょこ別枠を追加`

---

## Task 12: 総合検証

- [ ] **Step 1:** `npx tsx scripts/validate-logical-tour.ts` → `logical-tour OK`
- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `0`
- [ ] **Step 3:** 触った全ファイル eslint → 新規エラーなし
- [ ] **Step 4: 実機スモーク（デプロイ後・ローカルはFirebase未接続）**
  1. ダッシュボードにヒーロー表示、0/3で「はじめる」→ ちょこへ `?tour=1`
  2. 駅をやり切ると結果に「次の駅へ」→ 要約 → 論理 と巡回、3駅目で「完走」表示
  3. ダッシュボードに戻ると進行バー・残り分・（3駅完了日は）ストリークが更新
  4. 同日に複数回開いてもストリークが二重加算されない
  5. 管理者の生徒詳細「活動状況」に「ちょこ添削」枠が別枠で日別表示
  6. `?tour=1` 無しの通常導線では「次の駅へ」は出ない
  7. モバイル幅でヒーローが崩れない
- [ ] **Step 5:** 残差分があれば commit `chore(logical-tour): 総合検証と微修正`

---

## Self-Review（計画の自己点検）

**1. スペック網羅性**（`2026-07-08-logical-tour-design.md` 各節 → タスク）:
- §3 駅定義（estMinutes含む） → Task 2 ✅
- §4 完了判定（JST日窓・実データ派生） → Task 3(jstDayBoundsUtc)/Task 5(範囲クエリ) ✅
- §4 ストリーク（冪等トランザクション） → Task 3(computeStreakUpdate)/Task 5(runTransaction) ✅
- §5 API（レスポンス形・requireRole） → Task 5 ✅
- §6-1 ヒーロー（framer-motion・3状態・進行バー） → Task 6 ✅
- §6-2 「次の駅へ」（?tour=1のみ） → Task 7 + Task 9 ✅
- §6-3 ダッシュボード配置 → Task 8 ✅
- §7 活動状況ちょこ別枠 → Task 10(取得API)/Task 11(集計・表示) ✅
- §8 エッジ（クエリ失敗→未完・ストリーク失敗→warn・?tour無しは従来通り） → Task 5/7/9 ✅
- §9 検証（状態別・冪等・別枠・モバイル・tsc/lint） → Task 4/Task 12 ✅

**2. プレースホルダ走査:** UIの差し込み・heatmap・管理APIは実在の参照ファイルを名指しで踏襲する指示で、純ロジック/型/API/ヒーロー/ボタンは本文に完全コードを提示。「TODO放置」なし。バンク的な件数依存もなし。

**3. 型整合:** `TourStationKey`/`TourStation`/`LogicalTourState`/`LogicalTourResponse` は Task 1 定義、Task 2/3/5/6/7 で同名参照。API返却フィールド（date/stations/completedCount/allDone/nextStationKey/remainingMinutes/streak/longestStreak）は `LogicalTourResponse` と一致。ヒーロー/ボタンは同型を購読。`logicalTours/{uid}` 単票のフィールド（lastCompletedDate/streak/longestStreak）は `LogicalTourState` と一致。

**是正点（反映済み）:**
- 単票のFirestoreパスは仕様の「users/{uid}/logicalTour」（奇数セグメント＝コレクション）ではdoc指定にならないため、**`logicalTours/{uid}`（トップレベルcollection・doc=uid）**に確定してTask1/5で統一。
- `TourNextButton` は `useSearchParams` 使用のため、差し込み先の `Suspense` 境界有無を Task 9 で各ページ確認する手順を明示（chocoは要確認）。

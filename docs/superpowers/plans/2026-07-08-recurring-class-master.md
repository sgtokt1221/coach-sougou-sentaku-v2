# 定期授業マスタ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1:1定期授業をテンプレ(マスタ)/前月コピーから月次一括生成する機能。休校日(設定基準のみ)スキップ・重複防止・通知なし・プレビュー→確定。マスタ/週表示に生徒名・講師名・種別を表示。

**Architecture:** 純粋な生成ロジック(`generate.ts`)＋テンプレ/休校日/生成の各API(org-scoped)＋`/admin/sessions`の「マスタ」タブUI＋`/admin/settings`の休校日設定。生成は既存 `POST /api/sessions` を使わず、通知を発火させずに `sessions` へ直接一括作成する。

**Tech Stack:** Next.js 16 App Router, React 19, TS, Tailwind/shadcn(tabs.tsx有), Firebase Admin(Firestore batch)。テストランナー無し→純ロジックは `tsx` 検証スクリプト、他は `tsc`+`eslint`+実機。

**設計書:** `docs/superpowers/specs/2026-07-08-recurring-class-master-design.md`

**参照する既存実装:**
- セッション作成/型: `src/app/api/sessions/route.ts`（1:1作成のdoc形状・`createdByAdminId`・notify）
- 組織スコープ: `getOrgMemberAdminUids(adminDb, adminUid)`（`@/lib/api/organization-scope`）
- 認可: `requireRole`（`@/lib/api/auth`）
- 管理者セッション画面: `src/app/admin/sessions/page.tsx`（`activeTab: "schedule"|"list"`、`coachStudents`、週カレンダー）
- 表示: `src/components/admin/SessionCalendar.tsx` / `AdminSessionList.tsx`
- 設定: `src/app/admin/settings/`（既存）
- 検証スクリプト流儀: `scripts/validate-logical-tour.ts`

---

## Task 1: 型定義

**Files:** Create `src/lib/types/recurring-class.ts`

- [ ] **Step 1: 作成**

```ts
// src/lib/types/recurring-class.ts
import type { SessionType } from "@/lib/types/session";

/** 1:1 定期授業テンプレ。Firestore: recurringClassTemplates/{id} */
export interface RecurringClassTemplate {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  type: SessionType; // 1:1系のみ（group_review不可）
  weekday: number; // 0=日 .. 6=土
  startTime: string; // "HH:MM"
  duration?: number | null;
  format?: "online" | "offline";
  active: boolean;
  createdByAdminId: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 休校日。Firestore: closureDays/{id}（組織別） */
export interface ClosureDay {
  id: string;
  organizationId: string;
  date: string; // "YYYY-MM-DD"
  note?: string;
  createdByAdminId: string;
  createdAt: string;
}

/** 生成の元になるスロット */
export interface GenSlot {
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  type: SessionType;
  weekday: number;
  startTime: string;
  duration?: number | null;
  format?: "online" | "offline";
}

export interface GenPreviewItem {
  studentId: string;
  studentName: string;
  teacherName: string;
  type: SessionType;
  scheduledAt: string; // `${date}T${startTime}:00`
  slot: GenSlot;
}

export interface GenResult {
  toCreate: GenPreviewItem[];
  skippedClosure: GenPreviewItem[];
  skippedDuplicate: GenPreviewItem[];
}

/** 1:1 の種別（group_review を除く） */
export const ONE_ON_ONE_TYPES: SessionType[] = [
  "coaching",
  "mock_interview",
  "essay_review",
  "general",
];
```

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "recurring-class" || echo clean` → `clean`
- [ ] **Step 3:** commit `feat(recurring-master): 型定義を追加`

---

## Task 2: 純粋な生成ロジック

**Files:** Create `src/lib/recurring-class/generate.ts`

乱数不使用。`new Date(y, mIndex, day)`（引数付き）で日付を構成（date-only なので getDay は安定）。

- [ ] **Step 1: 作成**

```ts
// src/lib/recurring-class/generate.ts
import type {
  GenSlot,
  GenPreviewItem,
  GenResult,
} from "@/lib/types/recurring-class";
import type { SessionType } from "@/lib/types/session";

/** "YYYY-MM" を {year, monthIndex(0-11)} に分解 */
function parseMonth(month: string): { y: number; mi: number } {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  return { y, mi: m - 1 };
}

/** 対象月の weekday(0-6) に該当する "YYYY-MM-DD" 一覧（昇順） */
export function datesForWeekdayInMonth(month: string, weekday: number): string[] {
  const { y, mi } = parseMonth(month);
  const last = new Date(y, mi + 1, 0).getDate(); // 当月末日
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, mi, d);
    if (dt.getDay() === weekday) {
      out.push(`${y}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return out;
}

/** 対象月の1つ前のカレンダー月 "YYYY-MM" */
export function previousMonth(month: string): string {
  const { y, mi } = parseMonth(month);
  const d = new Date(y, mi - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface SessionLike {
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  type?: SessionType;
  status?: string;
  scheduledAt?: string;
  duration?: number | null;
  format?: "online" | "offline";
}

/**
 * セッション群からスロットを抽出。
 * - cancelled(欠席) は除外
 * - 同一枠(studentId×weekday×startTime×type)は1つに集約
 */
export function extractSlots(sessions: SessionLike[]): GenSlot[] {
  const map = new Map<string, GenSlot>();
  for (const s of sessions) {
    if (!s.studentId || !s.teacherId || !s.type || !s.scheduledAt) continue;
    if (s.status === "cancelled") continue;
    const at = new Date(s.scheduledAt);
    if (Number.isNaN(at.getTime())) continue;
    const weekday = at.getDay();
    const startTime = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    const key = `${s.studentId}|${weekday}|${startTime}|${s.type}`;
    if (map.has(key)) continue;
    map.set(key, {
      studentId: s.studentId,
      studentName: s.studentName ?? "",
      teacherId: s.teacherId,
      teacherName: s.teacherName ?? "",
      type: s.type,
      weekday,
      startTime,
      duration: s.duration ?? null,
      format: s.format,
    });
  }
  return [...map.values()];
}

/**
 * 生成計算（純関数）。
 * closureDates: 休校日 "YYYY-MM-DD" 集合 / existingKeys: `${studentId}|${scheduledAt}` 集合
 */
export function computeGeneration(params: {
  slots: GenSlot[];
  month: string;
  closureDates: Set<string>;
  existingKeys: Set<string>;
}): GenResult {
  const { slots, month, closureDates } = params;
  const existing = new Set(params.existingKeys); // 実行内の重複も防ぐためコピーして追記
  const result: GenResult = { toCreate: [], skippedClosure: [], skippedDuplicate: [] };

  for (const slot of slots) {
    for (const date of datesForWeekdayInMonth(month, slot.weekday)) {
      const scheduledAt = `${date}T${slot.startTime}:00`;
      const item: GenPreviewItem = {
        studentId: slot.studentId,
        studentName: slot.studentName,
        teacherName: slot.teacherName,
        type: slot.type,
        scheduledAt,
        slot,
      };
      if (closureDates.has(date)) {
        result.skippedClosure.push(item);
        continue;
      }
      const key = `${slot.studentId}|${scheduledAt}`;
      if (existing.has(key)) {
        result.skippedDuplicate.push(item);
        continue;
      }
      existing.add(key);
      result.toCreate.push(item);
    }
  }
  // 見やすさのため scheduledAt 昇順
  const byAt = (a: GenPreviewItem, b: GenPreviewItem) => a.scheduledAt.localeCompare(b.scheduledAt);
  result.toCreate.sort(byAt);
  result.skippedClosure.sort(byAt);
  result.skippedDuplicate.sort(byAt);
  return result;
}
```

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -i "recurring-class/generate" || echo clean` → `clean`
- [ ] **Step 3:** commit `feat(recurring-master): 純粋な生成ロジックを追加`

---

## Task 3: 検証スクリプト

**Files:** Create `scripts/validate-recurring-class.ts`; Modify `package.json`

- [ ] **Step 1: 作成**

```ts
// scripts/validate-recurring-class.ts
import {
  datesForWeekdayInMonth,
  previousMonth,
  extractSlots,
  computeGeneration,
} from "../src/lib/recurring-class/generate";

let errors = 0;
const fail = (m: string) => { console.error(`[recurring-class] ${m}`); errors++; };
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${msg}: got ${JSON.stringify(a)}`);
};

// 2026-07 の水曜(3): 1,8,15,22,29
eq(datesForWeekdayInMonth("2026-07", 3),
  ["2026-07-01", "2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29"], "水曜列挙");
eq(previousMonth("2026-07"), "2026-06", "前月");
eq(previousMonth("2026-01"), "2025-12", "前月(年跨ぎ)");

// スロット抽出: cancelled除外 + 集約
const slots = extractSlots([
  { studentId: "s1", studentName: "岡本", teacherId: "t1", teacherName: "赤木", type: "coaching", status: "completed", scheduledAt: "2026-06-03T19:00:00" },
  { studentId: "s1", studentName: "岡本", teacherId: "t1", teacherName: "赤木", type: "coaching", status: "scheduled", scheduledAt: "2026-06-10T19:00:00" }, // 同枠→集約
  { studentId: "s1", studentName: "岡本", teacherId: "t1", teacherName: "赤木", type: "coaching", status: "cancelled", scheduledAt: "2026-06-17T19:00:00" }, // 除外
]);
if (slots.length !== 1) fail(`slot集約 expected 1 got ${slots.length}`);
if (slots[0]?.weekday !== 3 || slots[0]?.startTime !== "19:00") fail("slot weekday/startTime");

// 生成: 休校日と重複をスキップ
const res = computeGeneration({
  slots,
  month: "2026-07",
  closureDates: new Set(["2026-07-15"]), // 15日休校
  existingKeys: new Set(["s1|2026-07-08T19:00:00"]), // 8日は既存
});
// 水曜: 1,8,15,22,29 → 15休校 / 8重複 → 作成は 1,22,29 の3件
if (res.toCreate.length !== 3) fail(`toCreate expected 3 got ${res.toCreate.length}`);
if (res.skippedClosure.length !== 1) fail(`skippedClosure expected 1 got ${res.skippedClosure.length}`);
if (res.skippedDuplicate.length !== 1) fail(`skippedDuplicate expected 1 got ${res.skippedDuplicate.length}`);
if (res.toCreate[0].scheduledAt !== "2026-07-01T19:00:00") fail("toCreate順序");

if (errors > 0) { console.error(`\n${errors} 件のエラー`); process.exit(1); }
console.log("recurring-class OK");
```

- [ ] **Step 2:** `package.json` の `validate:data` 末尾に `&& tsx scripts/validate-recurring-class.ts` を追加
- [ ] **Step 3:** `npx tsx scripts/validate-recurring-class.ts` → `recurring-class OK`
- [ ] **Step 4:** commit `feat(recurring-master): 検証スクリプトを追加`

---

## Task 4: テンプレCRUD API

**Files:** Create `src/app/api/admin/recurring-templates/route.ts`

**参照**: 既存の org-scoped admin ルート（例 `src/app/api/admin/students/route.ts` の `getOrgMemberAdminUids` スコープ）を踏襲。

- [ ] **Step 1: 作成**（GET/POST/PATCH/DELETE）

要件:
- `requireRole(["admin","teacher","superadmin"])`。`organizationId` は呼び出し元の org（`users/{uid}.organizationId`）。
- **GET**: 自 org のテンプレ一覧（`recurringClassTemplates` を `organizationId == 自org` で取得。org未設定admin向けに `createdByAdminId == 自uid` フォールバック）。
- **POST**: body(`RecurringClassTemplate` の入力分) を検証して作成。`type` が `ONE_ON_ONE_TYPES` 以外なら400。`weekday`(0-6)/`startTime`("HH:MM")必須。`createdByAdminId=uid`, `organizationId=自org`, `active` 既定true, `createdAt/updatedAt` 設定。
- **PATCH `?id=`**: 自 org のテンプレのみ更新（active切替・各フィールド）。`updatedAt` 更新。
- **DELETE `?id=`**: 自 org のテンプレのみ削除。

コード骨子（GET/POSTのみ抜粋。PATCH/DELETEも同様に org 所有チェックを入れる）:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { ONE_ON_ONE_TYPES } from "@/lib/types/recurring-class";

async function callerOrg(uid: string): Promise<string | null> {
  const d = (await adminDb!.doc(`users/${uid}`).get()).data();
  return (d?.organizationId as string | undefined) ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  const orgId = await callerOrg(auth.uid);
  let q = adminDb.collection("recurringClassTemplates").where("organizationId", "==", orgId);
  const snap = orgId
    ? await q.get()
    : await adminDb.collection("recurringClassTemplates").where("createdByAdminId", "==", auth.uid).get();
  return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  const b = await request.json().catch(() => null);
  if (!b?.studentId || !b?.teacherId || typeof b?.weekday !== "number" || !b?.startTime || !b?.type) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  if (!ONE_ON_ONE_TYPES.includes(b.type)) {
    return NextResponse.json({ error: "1:1の種別のみ登録できます" }, { status: 400 });
  }
  const orgId = await callerOrg(auth.uid);
  const now = new Date().toISOString();
  const ref = adminDb.collection("recurringClassTemplates").doc();
  const doc = {
    id: ref.id,
    studentId: b.studentId, studentName: b.studentName ?? "",
    teacherId: b.teacherId, teacherName: b.teacherName ?? "",
    type: b.type, weekday: b.weekday, startTime: b.startTime,
    duration: b.duration ?? null, format: b.format === "online" ? "online" : "offline",
    active: b.active !== false,
    createdByAdminId: auth.uid, organizationId: orgId ?? undefined,
    createdAt: now, updatedAt: now,
  };
  await ref.set(doc);
  return NextResponse.json(doc, { status: 201 });
}
```

（PATCH/DELETE は `id` から doc 取得→`organizationId===自org`（or `createdByAdminId===自uid`）を確認してから更新/削除。不一致は403。）

- [ ] **Step 2:** tsc + eslint クリーン
- [ ] **Step 3:** commit `feat(recurring-master): テンプレCRUD APIを追加`

---

## Task 5: 休校日CRUD API

**Files:** Create `src/app/api/admin/closure-days/route.ts`

- [ ] **Step 1: 作成**（GET/POST/DELETE、org-scoped。Task4 と同じ `callerOrg` パターン）

- **GET `?month=YYYY-MM`（任意）**: 自 org の休校日。`month` 指定時は `date` が当月のものだけ返す（`date >= "${month}-01" && date <= "${month}-31"` の文字列範囲でよい）。
- **POST**: `{ date:"YYYY-MM-DD", note? }`。同一 org+date が既にあれば作らず既存を返す（重複無視）。`createdByAdminId=uid`。
- **DELETE `?id=`**: 自 org の休校日のみ削除。

`ClosureDay` の型に沿って保存。実装は Task4 のCRUDに準拠。

- [ ] **Step 2:** tsc + eslint クリーン
- [ ] **Step 3:** commit `feat(recurring-master): 休校日CRUD APIを追加`

---

## Task 6: 生成API

**Files:** Create `src/app/api/admin/sessions/generate/route.ts`

- [ ] **Step 1: 作成**

要件:
- `requireRole(["admin","teacher","superadmin"])`、org-scoped。
- body: `{ month: "YYYY-MM", source: "master" | "previous-month", dryRun: boolean }`。
- スロット取得:
  - `master`: 自 org の `active===true` テンプレ → `GenSlot` に変換
  - `previous-month`: `previousMonth(month)` の自 org セッション（`createdByAdminId` が自 org メンバー：`getOrgMemberAdminUids`）で、`scheduledAt` が前月・`type` が1:1 のものを取得 → `extractSlots`
- 休校日: 自 org の当月 `closureDays` の date を `Set`
- 既存: 自 org の当月セッションから `existingKeys`（`${studentId}|${scheduledAt}`）を作る
- `computeGeneration({slots, month, closureDates, existingKeys})`
- `dryRun` なら結果(件数＋一覧)を返すのみ
- 本番作成: `toCreate` を **通知なし**で `sessions` に一括作成（`writeBatch`、**500件ごとに分割**）。作成docは既存1:1作成と同形状（`teacherId/studentId/teacherName/studentName/createdByAdminId=auth.uid/type/status:"scheduled"/scheduledAt/duration/format/meetLink:null/notes:null/sharedWithStudent:false/createdAt/updatedAt`）。`notifyStudentOfSession` は呼ばない。
- 返却: `{ created?: number, toCreate, skippedClosure, skippedDuplicate }`

（プレビュー一覧が大きくなりうるので、一覧は各配列 `slice(0, 200)` 程度に制限し `counts` を別途返す。件数は全数。）

- [ ] **Step 2:** tsc + eslint クリーン
- [ ] **Step 3:** commit `feat(recurring-master): 月次生成APIを追加`

---

## Task 7: マスタタブUI

**Files:**
- Create `src/components/admin/RecurringMasterPanel.tsx`
- Modify `src/app/admin/sessions/page.tsx`

- [ ] **Step 1: `RecurringMasterPanel` 作成**

- `useAuthSWR("/api/admin/recurring-templates")` でテンプレ一覧。
- テンプレ一覧テーブル: **生徒名 / 担当講師名 / 種別 / 曜日 / 時刻 / active(トグル) / 削除**。
- 追加フォーム: 生徒（`coachStudents` から選択）・講師（`/api/admin/teachers` から選択）・種別（`ONE_ON_ONE_TYPES`）・曜日・時刻・duration/format。→ `POST /api/admin/recurring-templates`。
- アクション: 「今月分を生成」「前月をコピー」。押下で対象月(既定=今月)を選び `POST /api/admin/sessions/generate` を `dryRun:true` で叩き、**プレビューモーダル**（作成N件/休校スキップM件/重複スキップK件＋一覧）を表示→「確定して作成」で `dryRun:false` 再送→トースト＋一覧再取得。

**props**: `{ coachStudents: StudentListItem[] }`（生徒プールは親から渡す）。講師一覧はコンポーネント内で取得。

- [ ] **Step 2: `admin/sessions/page.tsx` にタブ追加**

`activeTab` の型を `"schedule" | "list" | "master"` に拡張。タブUIに「マスタ」を追加し、`activeTab === "master"` で `<RecurringMasterPanel coachStudents={coachStudents} />` を表示。既存 schedule/list はそのまま。

- [ ] **Step 3:** tsc + eslint クリーン（新規エラーなし）
- [ ] **Step 4:** commit `feat(recurring-master): マスタタブUIを追加`

---

## Task 8: 休校日設定UI

**Files:** Create `src/app/admin/settings/closure-days/page.tsx`（既存 `/admin/settings` 配下）

- [ ] **Step 1: 作成**

- `useAuthSWR("/api/admin/closure-days")` で一覧。
- 日付追加（date入力＋note任意）→ `POST /api/admin/closure-days`、一覧に反映。
- 各行に削除ボタン → `DELETE ?id=`。
- 月フィルタ（任意）。
- 説明文: 「ここで登録した休校日は、定期授業の月次生成で除外されます（祝日は自動では除外されません）」。
- （導線）`/admin/settings` のインデックスに「休校日設定」リンクを追加。RecurringMasterPanel からも当ページへのリンクを置く。

- [ ] **Step 2:** tsc + eslint クリーン
- [ ] **Step 3:** commit `feat(recurring-master): 休校日設定UIを追加`

---

## Task 9: スケジュール表記に生徒名/講師名/種別

**Files:** Modify `src/components/admin/SessionCalendar.tsx` および/または `src/components/admin/AdminSessionList.tsx`

- [ ] **Step 1: 現状確認**：両コンポーネントを読み、各セッション表記に **生徒名・担当講師名・種別** が出ているか確認。
- [ ] **Step 2: 不足分を追加**：出ていない項目のみ、既存の表記スタイルに合わせて追加（`session.studentName` / `session.teacherName` / `SESSION_TYPE` ラベル）。※既に出ていれば変更不要（その旨コミットログに記す）。
- [ ] **Step 3:** tsc + eslint クリーン（新規エラーなし）
- [ ] **Step 4:** commit `feat(recurring-master): スケジュール表記に生徒名/講師名/種別を追加`（変更不要なら本タスクはスキップ）

---

## Task 10: 総合検証

- [ ] **Step 1:** `npx tsx scripts/validate-recurring-class.ts` → `recurring-class OK`
- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `0`
- [ ] **Step 3:** 触った全ファイル eslint → 新規エラーなし
- [ ] **Step 4: 実機スモーク（デプロイ後・ローカルFirebase未接続）**
  1. マスタタブでテンプレ登録（生徒/講師/種別/曜日/時刻）→一覧に生徒名・講師名・種別が出る
  2. 休校日設定で当月の休校日を登録
  3. 「今月分を生成」→プレビューで 作成/休校スキップ/重複スキップ の内訳が出る→確定→週カレンダーに反映
  4. もう一度「生成」しても重複が増えない
  5. 生成で生徒にPush通知が飛ばない
  6. 「前月をコピー」で前月枠が当月に複写される（欠席は複写されない）
  7. 他塾のテンプレ/休校日/セッションは対象外（越境なし）
- [ ] **Step 5:** 残差分があれば commit `chore(recurring-master): 総合検証と微修正`

---

## Self-Review（計画の自己点検）

**1. スペック網羅性**（`2026-07-08-recurring-class-master-design.md` → タスク）:
- §3 データ(テンプレ/休校日) → Task1/4/5 ✅
- §4 生成エンジン(datesForWeekday/extractSlots/computeGeneration・休校スキップ・重複・cancelled除外・通知なし・バッチ500) → Task2(純ロジック)/Task6(API・batch・no notify) ✅
- §4 プレビュー→確定(dryRun) → Task6 + Task7(モーダル) ✅
- §5 API(テンプレ/休校日/生成・org-scoped) → Task4/5/6 ✅
- §6 UI(マスタタブ・休校日設定・生徒名/講師名/種別) → Task7/8/9 ✅
- §7 エッジ(group_review400・0件・越境・通知なし・duration/format既定) → Task4/6 ✅
- §8 検証(日付列挙/休校/重複/前月スロット・tsc/lint) → Task3/Task10 ✅

**2. プレースホルダ走査:** 純ロジック/型/生成APIの中核は完全コード。CRUD API(Task4/5)・UI(Task7/8/9)は既存の org-scoped ルート/画面を名指しで踏襲する指示＋骨子コード。曖昧放置なし。

**3. 型整合:** `RecurringClassTemplate`/`ClosureDay`/`GenSlot`/`GenPreviewItem`/`GenResult`/`ONE_ON_ONE_TYPES` は Task1 定義、Task2/3/4/6/7 で同名参照。生成docは既存 `sessions` 1:1 形状に一致（Task6）。重複キー `${studentId}|${scheduledAt}` と scheduledAt フォーマット `${date}T${startTime}:00` は純ロジック・生成API・検証で統一。

**是正点（反映済み）:**
- 生成は既存 `POST /api/sessions`(通知発火)ではなく `sessions` へ直接 writeBatch（通知なし）と明記。
- プレビュー一覧は肥大回避のため slice、件数は全数返す。
- Task9 は「既に出ていれば変更不要」を明示（不要な改変を避ける）。

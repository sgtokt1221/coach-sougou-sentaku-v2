# 生徒詳細の作り直し（要点の帯＋時系列）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者の生徒詳細（`/admin/students/[id]`）を「ヘッダー1行＋要点の帯4枚＋切り替え（時系列／成績・弱点／書類・実績／自己分析／レポート）＋設定のパネル」に組み替える。

**Architecture:** 帯の中身は今の生徒詳細 API の応答に `summary` を足して返す（組み立ては純関数 `buildStudentSummary` にして検査で固定）。時系列は新しい API `/api/admin/students/[id]/timeline` が種類ごとに読んで日時で合わせる（合わせる部分は純関数 `mergeTimeline`）。行を開く詳細は、今は各一覧の部品に埋め込まれているダイアログを外へ切り出して使い回す。ページはタブをやめ、`?view=` で切り替える。

**Tech Stack:** Next.js 16 App Router / TypeScript / Firebase Admin / SWR（`useAuthSWR`）/ shadcn/ui（`Sheet`・`Select`・`Dialog`）/ 検査は `scripts/verify-*.ts`（`npm run validate:data` に連結）

設計書: `docs/superpowers/specs/2026-09-23-admin-student-detail-redesign-design.md` §5〜§6（計画1でランクとスキルチェックは済み）

**設計書からの修正（実物に合わせる）:**

- 出願書類の「完成」は `isDocumentComplete(status)`＝`status !== "draft"`（`src/lib/types/document.ts:247`）。帯の要対応(1)は「期限7日以内（当日・超過含む）かつ `status === "draft"`」にする。
- テーマ別ドリル（`users/{uid}/interviewDrills`）・面接・AI対話は「まだ開いていない」の仕組みの対象外。赤い点は `essay`・`document`・`chocoReview`・`summaryDrill`・`logicDrill` の5種類だけに付く。

**あわせて直す既存の不具合:**

- 管理者画面のちょこ添削の点が「/ 30」と出ている（`src/components/admin/ChocoReviewsSection.tsx:110`）。本当は 0〜50（`computeChocoTotal`）。
- 概要タブの活動量のグラフは面接を一度も数えていない（管理者の面接 API が `status`・`startedAt` を返さないため）。時系列の活動量は新しい API で数え直す。

---

## 記録の種類と出どころ（実装の正本）

| kind             | 場所                                               | 並べる日時（型）           | 題                                                   | 点（満点）                                      | 詳細                                                                 |
| ---------------- | -------------------------------------------------- | -------------------------- | ---------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `essay`          | `essays`（`userId`）                               | `submittedAt`（Timestamp） | `topic`（無ければ「お題なし」）                      | `scores.total`（`feedback.scoreMaximum ?? 50`） | ページの `openEssayDetail(id)`                                       |
| `interview`      | `interviews`（`userId`、`status=="completed"`）    | `startedAt`（Timestamp）   | `INTERVIEW_MODE_LABELS[mode]`                        | `scores.total`（`interviewTotalMax(scores)`）   | 切り出す `InterviewDetailDialog`                                     |
| `chocoReview`    | `users/{uid}/chokoReviews`                         | `createdAt`（ISO）         | `themeTitle`・`blankIndex+1`段落目                   | `scores.total`（50）                            | 切り出す `ChocoReviewDetailDialog`                                   |
| `summaryDrill`   | `users/{uid}/summaryDrills`                        | `completedAt`（Timestamp） | `passageTitle ?? "無題"`                             | `total`（25）                                   | 切り出す `SummaryDrillDetailDialog`                                  |
| `logicDrill`     | `users/{uid}/logicDrills`                          | `completedAt`（Timestamp） | `LOGIC_DRILL_TYPE_LABELS[drillType]`                 | 3軸の和（15）                                   | 切り出す `LogicDrillDetailDialog`                                    |
| `interviewDrill` | `users/{uid}/interviewDrills`                      | `createdAt`（Timestamp）   | `category`・`question`                               | `score`（5）                                    | 切り出す `InterviewDrillDetailDialog`                                |
| `document`       | `documents`（`userId`）                            | `updatedAt`（ISO）         | `type`（志望理由書など）・大学名                     | `aiScore` 合計（`calculateDocumentTotal`）      | 切り出す `DocumentDetailDialog`                                      |
| `session`        | `sessions`（**`studentId`**）                      | `scheduledAt`（ISO）       | `SESSION_TYPE_LABELS[type]`・`debrief.notes` の1行目 | なし                                            | `/admin/sessions/{id}` へ移る                                        |
| `homework`       | `users/{uid}/homeworkAssignments`                  | `assignedAt`（Timestamp）  | `snapshot.title`（状態・期限を添える）               | なし                                            | 行の中で状態を出すだけ（今と同じく「確認済み」ボタン）               |
| `aiConversation` | `/api/admin/students/[id]/ai-conversations` の結果 | `updatedAt`（ISO）         | `title`                                              | なし                                            | 切り出す `AiConversationDialog`（`CoachConversationList` の1件表示） |

---

### Task 1: 時系列を合わせる純関数と検査

**Files:**

- Create: `src/lib/admin/timeline.ts`
- Create: `scripts/verify-timeline.ts`
- Modify: `package.json`（`validate:data` の末尾に ` && tsx scripts/verify-timeline.ts`）

- [ ] **Step 1: 型と純関数を書く**

`src/lib/admin/timeline.ts`:

```ts
/**
 * 生徒詳細の「時系列」。種類をまたいで新しい順に並べる。
 * 読み込み（Firestore）は API 側、ここは合わせ方だけ（DB を使わないので検査できる）。
 * 設計: docs/superpowers/specs/2026-09-23-admin-student-detail-redesign-design.md §5.4・§6.1
 */
export const TIMELINE_KINDS = [
  "essay",
  "interview",
  "chocoReview",
  "summaryDrill",
  "logicDrill",
  "interviewDrill",
  "document",
  "session",
  "homework",
  "aiConversation",
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const TIMELINE_KIND_LABELS: Record<TimelineKind, string> = {
  essay: "小論文",
  interview: "面接",
  chocoReview: "ちょこ添削",
  summaryDrill: "要約ドリル",
  logicDrill: "論理ドリル",
  interviewDrill: "テーマ別ドリル",
  document: "書類",
  session: "面談",
  homework: "宿題",
  aiConversation: "AI対話",
};

/** 絞り込みのチップ（ドリル3種はまとめて1つ） */
export const TIMELINE_FILTERS: {
  key: string;
  label: string;
  kinds: TimelineKind[];
}[] = [
  { key: "all", label: "すべて", kinds: [...TIMELINE_KINDS] },
  { key: "essay", label: "小論文", kinds: ["essay", "chocoReview"] },
  { key: "interview", label: "面接", kinds: ["interview", "interviewDrill"] },
  { key: "drill", label: "ドリル", kinds: ["summaryDrill", "logicDrill"] },
  { key: "document", label: "書類", kinds: ["document"] },
  { key: "session", label: "面談", kinds: ["session"] },
  { key: "homework", label: "宿題", kinds: ["homework"] },
  { key: "aiConversation", label: "AI対話", kinds: ["aiConversation"] },
];

export interface TimelineItem {
  kind: TimelineKind;
  id: string;
  /** 並べる日時（ISO） */
  at: string;
  title: string;
  /** 題の下に添える1行（大学名・状態など）。無ければ省く */
  subtitle?: string;
  score?: { value: number; max: number };
  /** 開く先がページ遷移のときだけ */
  href?: string;
}

export interface TimelinePage {
  items: TimelineItem[];
  /** 続きを読むときに before に渡す値。これ以上無ければ null */
  nextBefore: string | null;
  /** 読み込めなかった種類（黙って欠かさず画面に出す） */
  failedKinds: TimelineKind[];
}

/**
 * 種類ごとに「before より古いものを新しい順に最大 limit 件」読んだ結果を合わせる。
 * 同じ日時の行は kind・id の順で並べて、ページをまたいで順番が揺れないようにする。
 * nextBefore は返した最後の行の日時。同じ日時の行がページ境界で割れないよう、
 * 最後の行と同じ日時の行は次のページへ回す（この日時の行が limit 件を超える場合を除く）。
 */
export function mergeTimeline(
  perKind: Partial<Record<TimelineKind, TimelineItem[]>>,
  limit: number,
  failedKinds: TimelineKind[] = []
): TimelinePage {
  const all = Object.values(perKind)
    .flat()
    .filter((x): x is TimelineItem => !!x && !Number.isNaN(Date.parse(x.at)))
    .sort(
      (a, b) =>
        Date.parse(b.at) - Date.parse(a.at) ||
        a.kind.localeCompare(b.kind) ||
        a.id.localeCompare(b.id)
    );
  if (all.length <= limit) {
    return { items: all, nextBefore: null, failedKinds };
  }
  let items = all.slice(0, limit);
  const lastAt = items[items.length - 1].at;
  const trimmed = items.filter((x) => x.at !== lastAt);
  // 全部が同じ日時なら割るしかない（極端な場合）
  if (trimmed.length > 0) items = trimmed;
  return {
    items,
    nextBefore: items[items.length - 1].at,
    failedKinds,
  };
}

/** 直近 days 日の日ごとの件数（活動量の棒）。日付は日本時間の YYYY-MM-DD */
export function dailyActivity(
  items: Pick<TimelineItem, "at">[],
  days: number,
  now: Date = new Date()
): { date: string; count: number }[] {
  const toJstDate = (ms: number) =>
    new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  for (const x of items) {
    const d = toJstDate(Date.parse(x.at));
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = toJstDate(now.getTime() - i * 86400000);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}
```

- [ ] **Step 2: 検査を書く**

`scripts/verify-timeline.ts`:

```ts
/** 生徒詳細の時系列の合わせ方の検査（DB を使わない）。 */
import assert from "node:assert/strict";
import {
  mergeTimeline,
  dailyActivity,
  type TimelineItem,
} from "../src/lib/admin/timeline";

let checks = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    checks++;
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
};
const it = (
  kind: TimelineItem["kind"],
  id: string,
  at: string
): TimelineItem => ({
  kind,
  id,
  at,
  title: id,
});

check("種類をまたいで新しい順", () => {
  const r = mergeTimeline(
    {
      essay: [it("essay", "e1", "2026-09-20T10:00:00Z")],
      session: [it("session", "s1", "2026-09-21T10:00:00Z")],
      document: [it("document", "d1", "2026-09-19T10:00:00Z")],
    },
    20
  );
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["s1", "e1", "d1"]
  );
  assert.equal(r.nextBefore, null);
});

check("limit を超えたら nextBefore を返す", () => {
  const essays = Array.from({ length: 5 }, (_, i) =>
    it("essay", `e${i}`, `2026-09-2${i}T00:00:00Z`)
  );
  const r = mergeTimeline({ essay: essays }, 3);
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["e4", "e3", "e2"]
  );
  assert.equal(r.nextBefore, "2026-09-22T00:00:00Z");
});

check("同じ日時の行はページ境界で割らない", () => {
  const r = mergeTimeline(
    {
      essay: [
        it("essay", "a", "2026-09-23T00:00:00Z"),
        it("essay", "b", "2026-09-22T00:00:00Z"),
      ],
      session: [it("session", "c", "2026-09-22T00:00:00Z")],
    },
    2
  );
  // 2件目と3件目が同じ日時なので、2件目も次のページへ回す
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["a"]
  );
  assert.equal(r.nextBefore, "2026-09-23T00:00:00Z");
});

check("日時が壊れた行は捨てる・失敗した種類を返す", () => {
  const r = mergeTimeline(
    {
      essay: [
        it("essay", "x", "not-a-date"),
        it("essay", "y", "2026-09-01T00:00:00Z"),
      ],
    },
    20,
    ["session"]
  );
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["y"]
  );
  assert.deepEqual(r.failedKinds, ["session"]);
});

check("活動量は日本時間の日ごと", () => {
  const now = new Date("2026-09-24T03:00:00Z"); // 日本時間 12:00
  const r = dailyActivity(
    [
      { at: "2026-09-23T16:00:00Z" }, // 日本時間 9/24 01:00
      { at: "2026-09-23T14:00:00Z" }, // 日本時間 9/23 23:00
    ],
    2,
    now
  );
  assert.deepEqual(r, [
    { date: "2026-09-23", count: 1 },
    { date: "2026-09-24", count: 1 },
  ]);
});

console.log(`verify-timeline: ${checks} checks passed`);
```

- [ ] **Step 3: 実行して通す**

Run: `npx tsx scripts/verify-timeline.ts` → `verify-timeline: 5 checks passed`

- [ ] **Step 4: validate:data に連結して通す、commit**

```bash
npx prettier --write src/lib/admin/timeline.ts scripts/verify-timeline.ts
git add src/lib/admin/timeline.ts scripts/verify-timeline.ts package.json
git commit -m "feat(admin): 生徒詳細の時系列を合わせる純関数と検査"
```

---

### Task 2: 時系列の API

**Files:**

- Create: `src/lib/admin/timeline-sources.ts`（種類ごとの読み込み）
- Create: `src/app/api/admin/students/[id]/timeline/route.ts`

- [ ] **Step 1: 種類ごとの読み込みを書く**

`src/lib/admin/timeline-sources.ts` に、種類ごとの関数を1つずつ書く。形はすべて
`(db: Firestore, uid: string, before: Date | null, limit: number) => Promise<TimelineItem[]>`。
上の「記録の種類と出どころ」の表のとおりに読む。守ること:

- **日時の型に合わせて範囲条件を書く。** Timestamp の場所は `where(field, "<", before)`（Date）、ISO 文字列の場所は `where(field, "<", before.toISOString())`。取り違えると一致0件の沈黙失敗になる（CLAUDE.md 6.5）。
- 並べ替えは `orderBy(field, "desc").limit(limit)`。`essays`・`interviews`・`documents`・`sessions` はトップレベルで `userId`（sessions は `studentId`）の等値＋日時の範囲＋並べ替えになる。複合インデックスが要るかを `firestore.indexes.json` で確かめ、足りなければ Step 4 で足す。
- `at` は ISO 文字列にそろえる（Timestamp は `.toDate().toISOString()`）。
- `interview` は `status == "completed"` のうえ、生徒が一度も話していないもの（`messages` に `role === "student"` が無い）を除く（ランクの集計の `isPracticed` と同じ）。
- `homework` は `assignedAt`（Timestamp）で並べ、`subtitle` に状態と期限（`未提出／取組中／提出済／確認済 ・ 期限 M/D`、期限切れは「期限切れ」）を入れる。
- `session` の `href` は `/admin/sessions/{id}`。`cancelled` は除く。
- `aiConversation` は `src/app/api/admin/students/[id]/ai-conversations/route.ts` の組み立てを関数に切り出して（ルートからもその関数を呼ぶ形にして）使い、`updatedAt` が `before` より古いものを新しい順に `limit` 件。
- 各関数は例外を投げてよい（呼ぶ側で種類ごとに受け止める）。

関数を種類→関数の表 `TIMELINE_SOURCES: Record<TimelineKind, SourceFn>` にまとめて export する。

- [ ] **Step 2: API を書く**

`src/app/api/admin/students/[id]/timeline/route.ts`。認可は `src/app/api/admin/students/[id]/summary-drills/route.ts:31-69` と同じ手順をそのまま写す:

1. `requireRole(request, ["admin","teacher","superadmin"])`
2. `users/{id}` を読み、無ければ 404
3. `scopeByOrganization({ requesterUid, requesterRole, studentUid: id, studentData: { managedBy, organizationId, assignedTeacherIds: getAssignedTeacherIds(userData) }, allowAssignedTeacher: true })`
4. 拒否かつ `role === "teacher"` なら `hasActiveSessionAccess(uid, id)` で救済

本体:

```ts
const url = new URL(request.url);
const filterKey = url.searchParams.get("filter") ?? "all";
const beforeParam = url.searchParams.get("before");
const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 50);
const filter =
  TIMELINE_FILTERS.find((f) => f.key === filterKey) ?? TIMELINE_FILTERS[0];
const before = beforeParam ? new Date(beforeParam) : null;
if (before && Number.isNaN(before.getTime())) {
  return NextResponse.json({ error: "before が不正です" }, { status: 400 });
}
const perKind: Partial<Record<TimelineKind, TimelineItem[]>> = {};
const failedKinds: TimelineKind[] = [];
await Promise.all(
  filter.kinds.map(async (kind) => {
    try {
      perKind[kind] = await TIMELINE_SOURCES[kind](adminDb, id, before, limit);
    } catch (err) {
      console.warn(`[timeline] ${kind} failed:`, err);
      failedKinds.push(kind);
    }
  })
);
const page = mergeTimeline(perKind, limit, failedKinds);
// 最初のページだけ活動量（直近30日）を返す。種類は絞り込みに関係なく全部で数える
let activity: { date: string; count: number }[] | undefined;
if (!before) {
  const since = new Date(Date.now() - 30 * 86400000);
  const recent: TimelineItem[] = [];
  await Promise.all(
    TIMELINE_KINDS.map(async (kind) => {
      try {
        const rows = await TIMELINE_SOURCES[kind](adminDb, id, null, 200);
        recent.push(...rows.filter((r) => Date.parse(r.at) >= since.getTime()));
      } catch {
        // 活動量の欠けは failedKinds で既に知らせている種類と同じなので黙る
      }
    })
  );
  activity = dailyActivity(recent, 30);
}
return NextResponse.json({ ...page, activity });
```

- [ ] **Step 3: エミュレータで確かめる**

`npm run emu`・`npm run seed:emu`・`npm run dev:emu -- -p 3100` を起動し、管理者（`admin@example.com` / `password`）の ID トークンで
`curl "localhost:3100/api/admin/students/<生徒ID>/timeline"`（トークンは Playwright でログインして `authFetch` と同じヘッダーを取るか、開発時の `dev-user` フォールバックを使う）を叩き、

- 新しい順に並ぶ
- `?before=<nextBefore>` で重複・欠落なく続く
- `?filter=session` で面談だけ
- `failedKinds` が空
  を確かめる。**サーバーのログにインデックス欠落のエラーが出ていないこと**（出ていれば Step 4）。

- [ ] **Step 4: インデックス（要る場合だけ）**

エラーに出た複合インデックスを `firestore.indexes.json` に足す。本番への反映（`firebase deploy --only firestore:indexes`）は**実行前にユーザーの確認を取る**（CLAUDE.md）。エミュレータはインデックスを要求しないので、足したものは本番で必要になるものだけ。

- [ ] **Step 5: 型チェック・lint・commit**

```bash
npx tsc --noEmit -p . && npx eslint src/lib/admin/timeline-sources.ts "src/app/api/admin/students/[id]/timeline/route.ts" "src/app/api/admin/students/[id]/ai-conversations/route.ts"
git add -A src firestore.indexes.json
git commit -m "feat(admin): 生徒詳細の時系列 API（種類をまたいで新しい順、続きから読める）"
```

---

### Task 3: 帯の中身（`summary`）

**Files:**

- Create: `src/lib/admin/student-summary.ts`（純関数）
- Create: `scripts/verify-student-summary.ts`
- Modify: `src/lib/types/admin.ts`（`StudentDetail` に `summary`）
- Modify: `src/app/api/admin/students/[id]/route.ts`（`summary` を組んで返す）

- [ ] **Step 1: 純関数と型**

```ts
// src/lib/admin/student-summary.ts
import {
  getWeaknessReminderLevel,
  type WeaknessRecord,
} from "@/lib/types/growth";

export interface SummaryActionItem {
  kind: "document" | "homework";
  id: string;
  label: string; // 「志望理由書の期限 あと3日」「宿題『…』期限切れ」
}

export interface SummaryWeakness {
  area: string;
  /** 直近の記録での指摘回数と母数（「直近5回中4回」）。旧データは null */
  recent: { hits: number; of: number } | null;
  level: "critical" | "warning";
}

export interface StudentSummary {
  actionItems: SummaryActionItem[];
  topWeaknesses: SummaryWeakness[];
  nextSession: { id: string; scheduledAt: string; typeLabel: string } | null;
  /** 前回の面談の振り返りの1行（nextAgendaSeed、無ければ notes の1行目） */
  lastDebriefLine: string | null;
  teacherNames: string[];
}

export function buildActionItems(input: {
  documents: {
    id: string;
    type: string;
    deadline?: string | null;
    status: string;
  }[];
  homework: {
    id: string;
    title: string;
    dueDate?: string | null;
    status: string;
  }[];
  now: Date;
}): SummaryActionItem[] {
  const day = 86400000;
  const startOfToday = new Date(input.now);
  startOfToday.setHours(0, 0, 0, 0);
  const daysUntil = (iso: string) =>
    Math.round(
      (new Date(iso).setHours(0, 0, 0, 0) - startOfToday.getTime()) / day
    );
  const items: SummaryActionItem[] = [];
  for (const d of input.documents) {
    if (!d.deadline || d.status !== "draft") continue;
    const n = daysUntil(d.deadline);
    if (Number.isNaN(n) || n > 7) continue;
    items.push({
      kind: "document",
      id: d.id,
      label:
        n < 0
          ? `${d.type}の期限切れ（${-n}日超過）`
          : n === 0
            ? `${d.type}の期限 今日`
            : `${d.type}の期限 あと${n}日`,
    });
  }
  for (const h of input.homework) {
    if (h.status !== "assigned" && h.status !== "in_progress") continue;
    if (!h.dueDate) continue;
    const n = daysUntil(h.dueDate);
    if (Number.isNaN(n) || n > 2) continue;
    items.push({
      kind: "homework",
      id: h.id,
      label:
        n < 0
          ? `宿題「${h.title}」期限切れ`
          : `宿題「${h.title}」期限 ${n === 0 ? "今日" : `あと${n}日`}`,
    });
  }
  return items;
}

export function buildTopWeaknesses(
  records: WeaknessRecord[],
  max = 3
): SummaryWeakness[] {
  const rank = { critical: 0, warning: 1 } as const;
  return records
    .filter((w) => !w.archivedAt && !w.resolved)
    .map((w) => ({ w, level: getWeaknessReminderLevel(w) }))
    .filter(
      (x): x is { w: WeaknessRecord; level: "critical" | "warning" } =>
        x.level === "critical" || x.level === "warning"
    )
    .sort((a, b) => rank[a.level] - rank[b.level] || b.w.count - a.w.count)
    .slice(0, max)
    .map(({ w, level }) => ({
      area: w.area,
      level,
      recent:
        w.recentHits && w.recentHits.length > 0
          ? {
              hits: w.recentHits.reduce((s, x) => s + x, 0),
              of: w.recentHits.length,
            }
          : null,
    }));
}

export function firstLine(text: string | null | undefined): string | null {
  const line = (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean);
  return line ? line.slice(0, 80) : null;
}
```

`src/lib/types/admin.ts` の `StudentDetail` に `summary?: StudentSummary;` を足す（型は上から import）。

- [ ] **Step 2: 検査**

`scripts/verify-student-summary.ts` で次を確かめる（`buildActionItems`・`buildTopWeaknesses`・`firstLine`）:

1. 下書きで期限5日後 → 「志望理由書の期限 あと5日」、`status: "in_review"` の書類は出ない、期限8日後は出ない、期限2日前（超過）→「期限切れ（2日超過）」
2. 宿題 `assigned` で期限切れ → 「期限切れ」、`submitted` は出ない、期限3日後は出ない
3. 弱点: `recentHits [1,1,1]` → critical、`[1,0,1]` → warning、`resolved` や `archivedAt` は出ない、最大3件、critical が先、`recent` が「3回中3回」
4. `firstLine("\n  次回は反論\n2行目")` → `"次回は反論"`

`package.json` の `validate:data` の末尾に連結する。

- [ ] **Step 3: API に組み込む**

`src/app/api/admin/students/[id]/route.ts` の応答を組む直前で、`Promise.all` で次を読んで `summary` を作る:

- 書類: `documents` の `userId == id`（`id, type, deadline, status`）
- 宿題: `users/{id}/homeworkAssignments`（`id, snapshot.title, dueDate, status`）
- 弱点: `loadWeaknessRecords(adminDb, id)`（`src/lib/growth/weakness-store.ts`）の `records`
- 次の面談: `sessions` の `studentId == id`、`scheduledAt >= new Date().toISOString()`（**ISO 文字列で比べる**）、`orderBy("scheduledAt","asc").limit(3)` から `status` が `cancelled` でない最初の1件。`typeLabel` は `SESSION_TYPE_LABELS[type]`
- 前回の振り返り: `sessions` の `studentId == id`、`scheduledAt < now(ISO)`、`orderBy desc limit 5` から `debrief` がある最初の1件 → `firstLine(debrief.nextAgendaSeed) ?? firstLine(debrief.notes)`
- 講師名: `profile.assignedTeacherIds` の `users/{uid}.displayName`（最大5件、無ければ飛ばす）

どれかが失敗しても生徒詳細そのものは返す（その項目だけ空）。新しい複合インデックスが要るかは Task 2 と同じ手順で確かめる。

- [ ] **Step 4: 検査・型チェック・commit**

```bash
npx tsx scripts/verify-student-summary.ts && npx tsc --noEmit -p .
git add -A src scripts package.json
git commit -m "feat(admin): 生徒詳細の要点の帯（要対応・重要な弱点・次の面談）の中身を返す"
```

---

### Task 4: 詳細のダイアログを切り出す（挙動は変えない）

**Files:**

- Create: `src/components/admin/detail-dialogs/{InterviewDetailDialog,ChocoReviewDetailDialog,SummaryDrillDetailDialog,LogicDrillDetailDialog,InterviewDrillDetailDialog,DocumentDetailDialog,AiConversationDialog}.tsx`
- Modify: `src/components/admin/{InterviewsSection,ChocoReviewsSection,SummaryDrillsSection,LogicDrillsSection,InterviewDrillsSection,DocumentsSection}.tsx`、`AiConversationsSection` / `CoachConversationList`

- [ ] **Step 1: 1つずつ切り出す**

各一覧の部品の中にあるダイアログ（`InterviewsSection.tsx:291-527`、`ChocoReviewsSection.tsx:120〜`、`SummaryDrillsSection.tsx:134〜`、`LogicDrillsSection.tsx:135〜`、`InterviewDrillsSection.tsx:99〜`、`DocumentsSection.tsx:585〜`）を、そのまま別ファイルへ移す。形は全部そろえる:

```ts
interface Props {
  studentId: string;
  /** 開く記録の ID。null で閉じる */
  id: string | null;
  onOpenChange: (open: boolean) => void;
}
```

ダイアログの中で、ID から記録を取る（今は一覧の state に持っている記録を使っている部品は、一覧の SWR と同じ API のキャッシュから `id` で探す。無ければ `A/<kind>/[id]` の詳細 API を呼ぶ。詳細 API が無い種類は一覧の API を呼んで探す）。**開いたときに「見た」印を付ける処理（`markSubmissionViewed`）もダイアログ側へ移す**（時系列から開いたときも赤い点が消えるように）。

元の一覧の部品は、切り出したダイアログを使う形に変える。**見た目・挙動は変えない。**

- [ ] **Step 2: ちょこ添削の満点の表示を直す**

`ChocoReviewDetailDialog`（元 `ChocoReviewsSection.tsx:110`）と一覧の「/ 30」を「/ 50」に。

- [ ] **Step 3: AI 対話**

`CoachConversationList` の1件分の表示を `AiConversationDialog`（`conversation: AiConversation | null`）で開けるようにする。一覧の部品はこれまでどおり行の展開で見せる。

- [ ] **Step 4: 画面で確かめる・commit**

エミュレータで管理者の生徒詳細の各一覧から1件ずつ開き、切り出す前と同じ中身が出ることを確かめる（スクリーンショットで前後を比べる）。

```bash
npx tsc --noEmit -p . && npx eslint src/components/admin
git add -A src
git commit -m "refactor(admin): 各一覧の詳細ダイアログを切り出し、時系列からも開けるようにする"
```

---

### Task 5: 画面の部品（ヘッダー・帯・時系列・設定のパネル）

**Files:**

- Create: `src/components/admin/student-detail/{StudentHeader,SummaryBand,StudentTimeline,StudentSettingsSheet}.tsx`

デザインの決まり（`~/ObsidianVault/wiki/tech/design-preferences.md`）: 帯は**ベタ塗り**（白地に色帯のカードは使わない）、濃い色に白文字で 4.5:1、数字は 28px 以下、文字は 14px 以上（`text-sm` 以上）、押せるものは 44px、状態は色だけに頼らない（件数と文言）、絵文字・記号は使わない。色はプロジェクトのトークン（primary ティール）。

- [ ] **Step 1: `StudentHeader`**

props: `detail: StudentDetail`、`onOpenSettings`、`onCreateHomework`。1行に 名前・学年・第一志望（`profile.resolvedUniversities[0]` の大学・学部）・担当（`summary.teacherNames` を「・」でつなぐ、無ければ出さない）・最終活動（今の活動状態のバッジの判定をそのまま移す）。右に3つのボタン:「メッセージ」（`/admin/messages/{uid}` への `Link`）、「宿題を出す」（既存の `CreateHomeworkDialog` を開く）、「設定」。スマホでは名前の行の下にボタンを折り返す（見出しの横に `shrink-0` で並べない）。

- [ ] **Step 2: `SummaryBand`**

props: `detail: StudentDetail`、`unviewedCount: number`（ページが `useUnviewedSubmissions` の `byStudentKind[uid]` を合計して渡す）、`onOpenPerformance`。4枚:

1. **ランク**（ティール）: 小論文 `essayAggregate.compositeRank`／`compositeScore`/50、面接 同/40。無ければ「未提出」。下に `直近{practiceCount}件の平均`。「詳しく見る」で `onOpenPerformance`。
2. **要対応**（赤 `#b91c1c`。0件なら緑で「対応が必要なものはありません」）: 件数＝`summary.actionItems.length + (unviewedCount > 0 ? 1 : 0)`。中身は actionItems の label を最大3行＋「まだ開いていない提出 N件」。
3. **重要な弱点**（濃いスレート）: `summary.topWeaknesses` を「{area} 直近{of}回中{hits}回」（`recent` が null なら「{count}回」）。無ければ「重要な弱点はありません」。「詳しく見る」で `onOpenPerformance`。
4. **次の面談**（濃い藍）: `summary.nextSession` の日時（`M/D HH:mm`）と種別、`summary.lastDebriefLine` を「前回: …」。無ければ「予定なし」。

PC は4列、スマホ（`sm` 未満）は2列×2段。

- [ ] **Step 3: `StudentTimeline`**

props: `studentId`、`unviewedIds: Partial<Record<SubmissionKind, string[]>>`（`useUnviewedSubmissions().data?.ids`）、`initialFilter?: string`、`onOpenEssay(id)`。

- 上に絞り込みのチップ（`TIMELINE_FILTERS`、1つだけ選ぶ、押せる高さ44px）。
- `useSWRInfinite` で `/api/admin/students/{id}/timeline?filter=…&before=…` を読む（`authFetch` を使う既存の fetcher に合わせる）。「もっと見る」ボタンで次を読む（`nextBefore` が null なら出さない）。
- 最初のページの `activity` を、直近30日の小さな棒で出す（Recharts の `BarChart`、高さ 48px、軸なし、ツールチップで「M/D N件」）。
- 行: 日付（`M/D`、今日は「今日」）・種類（`TIMELINE_KIND_LABELS`）・題（1行で省略）・`subtitle`（あれば）・点（`value/max`）。`unviewedIds[kind]` に `id` が含まれる行は赤い点＋画面読み上げ用に「未確認」。
- 行を押す: `essay` → `onOpenEssay(id)`、`session` → `href` へ、`homework` → 何もしない（行の中に既存と同じ「確認済み」ボタンを置く。PATCH は `HomeworkStatusSection` と同じ）、それ以外 → Task 4 のダイアログを開く（`aiConversation` は行の id から会話を取り直す: 時系列 API の行に会話本体は含めないので、ダイアログで `/api/admin/students/{id}/ai-conversations` を読んで `id` で探す）。
- `failedKinds` があれば一覧の上に「{種類}の記録を読み込めませんでした」を出す。
- 0件: 「まだ記録がありません」。

- [ ] **Step 4: `StudentSettingsSheet`**

shadcn の `Sheet`（右から）。中身は今のページから移す: プロフィール（今の Profile Card と編集ダイアログ・パスワード再設定）、機能スイッチ、`SubscriptionManagementSection`・`ResearchEnrollmentSection`・`TeacherAssignmentSection`（この3つは今と同じく `!isTeacherViewer` のときだけ）、`AdminResearchCurriculumSection`、生徒の削除（今の確認ダイアログを通す）。**表示条件は今のページのものをそのまま移す**（変えない）。

- [ ] **Step 5: 型チェック・lint・commit**

```bash
npx tsc --noEmit -p . && npx eslint src/components/admin/student-detail
git add -A src
git commit -m "feat(admin): 生徒詳細のヘッダー・要点の帯・時系列・設定のパネルの部品"
```

---

### Task 6: 生徒詳細のページを組み替える

**Files:**

- Modify: `src/app/admin/students/[id]/page.tsx`

- [ ] **Step 1: 切り替えと URL**

タブ（`Tabs`・`TabsList`・`TAB_LABELS`・`handleTabChange`）をやめ、`view` を `?view=` で持つ。値は `timeline`（既定）/ `performance` / `documents` / `self-analysis` / `reports`。古い `?tab=` は読み替える:
`overview→timeline`、`performance→performance`、`activity→documents`、`reports→reports`、`homework→timeline`（`initialFilter="homework"`）、`messages→timeline` のうえで設定のパネルを開く。`?essay=`・`?interview=` の深いリンク（通知から来る）は今どおり答案詳細・面接詳細を開く。

- [ ] **Step 2: 並べ替え**

```
<StudentHeader />
<SummaryBand />
<切り替え（sticky top-0。PC はボタン列、スマホは Select）/>
{view === "timeline" && <StudentTimeline />}
{view === "performance" && ...今の renderPerformanceTab の中身から履歴の折りたたみ（添削・面接・要約・ちょこ・論理・テーマ別）を除いたもの＋StudentSkillRadar＋重点弱点（カテゴリ別）}
{view === "documents" && <DocumentsSection /><ActivitiesSection /><ExamResultsSection />}
{view === "self-analysis" && <DiscoverSection />（7項目は折りたたみ既定）}
{view === "reports" && <GrowthReportsSection />}
<StudentSettingsSheet />
```

- 今の「活動状況」グラフ（`ActivityHeatmap`）は時系列の棒に置き換えるので外す（面接が数えられていなかった不具合もここで消える）。
- 今の `PinnedSummary`（最終活動・最終ログイン）は `StudentHeader` に吸収する。
- 全タブの末尾にあった「生徒アカウントの削除」は消す（設定のパネルへ移った）。
- `SessionsHistorySection`・`HomeworkStatusSection`・`AiConversationsSection` と、成績タブの履歴の折りたたみ6つはページから外す（時系列で見る）。部品のファイルは面談画面（`SessionStudentDossier`）など他で使っていないかを `grep` で確かめ、使っていなければ Task 7 で消す。
- `DiscoverSection` の7項目の折りたたみ既定: 部品に `defaultCollapsed` を足すか、既に折りたためるなら既定値だけ変える（面談画面側の見え方を変えない形で）。

- [ ] **Step 3: 型チェック・lint・build**

```bash
npx tsc --noEmit -p . && npx eslint "src/app/admin/students/[id]/page.tsx" && npm run build 2>&1 | tail -3
```

（`npm run build` の前に動いている開発サーバーを止める。止めずに build すると開発サーバーの `.next` が壊れる）

- [ ] **Step 4: commit**

```bash
git add -A src
git commit -m "feat(admin): 生徒詳細をヘッダー・要点の帯・時系列・切り替えに組み替える"
```

---

### Task 7: 検証・片付け・取り込み

- [ ] **Step 1: エミュレータで画面を確かめる**（Playwright。開発サーバーは起動し直す）

1. 管理者で `/admin/students/<生徒ID>`: 帯4枚が出る（ランク C・要対応・重要な弱点・次の面談）、時系列が新しい順に出る、絞り込みで種類が変わる、「もっと見る」で続きが出る、行を開くと各詳細が出る（小論文・面接・ちょこ・要約・論理・テーマ別・書類・AI対話）、面談の行は面談ページへ移る、宿題の行に状態と期限
2. 切り替え: 成績・弱点／書類・実績／自己分析／レポート が出る。URL の `?view=` が変わり、再読み込みで保たれる
3. 古いリンク: `?tab=performance`・`?tab=homework`・`?tab=messages`・`?essay=<id>` が正しく読み替わる
4. 設定のパネル: 開く・プロフィール編集・機能スイッチ・削除の確認ダイアログが出る（削除は実行しない）
5. 講師（エミュレータに講師アカウントが無ければ、`users/{uid}.role = "teacher"` の講師を1人シードに足す）で開き、プラン・探究授業・担当講師の割り当てが設定のパネルに出ない
6. スマホ幅 375px: 帯が2列×2段、切り替えがドロップダウン、横スクロールが出ない
7. コンソールエラーが無い

- [ ] **Step 2: 使わなくなった部品を消す**

Task 6 Step 2 で外した部品のうち、他から参照が無いもの（`grep -rn "<名前>" src` が0件）を `git rm`。`ActivityHeatmap`・`activity-heatmap.ts`・`PinnedSummary` なども同じ手順。

- [ ] **Step 3: レビューを受け、取り込む**

ブランチ全体を `superpowers:code-reviewer` でレビューし、指摘を直してから main に取り込み push する（push で本番にデプロイされる）。新しい複合インデックスを足していれば、**push の前に**ユーザーの確認を取って `firebase deploy --only firestore:indexes` を実行する（無いまま出すと時系列が空になる沈黙失敗）。

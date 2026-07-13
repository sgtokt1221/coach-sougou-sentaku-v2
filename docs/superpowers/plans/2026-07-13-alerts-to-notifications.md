# アラート→通知 改称＋活動系通知の追加 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理者向け「アラート」を「通知」に改称し、活動系通知（添削提出・自己分析完了・書類提出/再提出・面接/スキルチェック完了）をクリックで該当機能へ遷移できる形で追加する。

**Architecture:** 既存の on-the-fly 生成（`GET /api/admin/alerts` の `detectAlerts`）を拡張。per-student で既に取得済みの活動データ（essays/interviews/skillChecks/documents）＋新規 `selfAnalysis/{uid}` から「直近3日の活動」を検出し `severity:"info"` の通知を `link` 付きで生成。既存警告系は不変。UI は表示名改称＋通知リンク化＋要注意/お知らせ区分。

**Tech Stack:** Next.js 16 / TypeScript / firebase-admin。認証は既存 `requireRole` + `scopeByOrganization`。

**設計書:** `docs/superpowers/specs/2026-07-13-alerts-to-notifications-design.md`

**前提（コードベース確認済み）:**
- `src/app/api/admin/alerts/route.ts`: `detectAlerts(students)` が `add(student, discriminator, base)` で AlertItem を生成（`acknowledged` は `student.acknowledgedKeys` から復元）。`severityOrder = { critical:0, high:1, warning:2 }`（L240）。per-student loop で `essays`(top-level, userId, submittedAt desc), `users/{uid}/{interviews(startedAt)/skillChecks(takenAt)/interviewSkillChecks(takenAt)/summaryDrills(completedAt)/activityLogs(createdAt)}`(各 limit1), `users/{uid}/weaknesses`, `users/{uid}/documents`, `users/{uid}/alertAcks` を取得済み。POST が `users/{uid}/alertAcks/{alertKey}` に確認済みを保存。
- self-analysis: **top-level `selfAnalysis/{userId}`**（doc id=userId）。承認は `selfAnalysisApprovals/{userId}`。
- `AlertItem`（`src/lib/types/admin.ts`）: id/studentUid/studentName/type(8種)/severity(3種)/message/detectedAt/acknowledged/recommendedAction?。
- `admin/alerts/page.tsx`: `useAuthSWR<AlertItem[]>("/api/admin/alerts")`。`alertTypeConfig(type)`, `severityBgClass/IconBg/Label/BadgeVariant(severity)`, `toggleAcknowledged`。`next/link` の `Link`・`ExternalLink` 既に import。`unacknowledgedCount`＝全未確認、要注意カウントは `critical||high` で算出（L124）。
- 生徒詳細 `admin/students/[id]/page.tsx`: `?tab=overview|performance|activity|reports|homework|messages`。
- ナビ表記: `Header.tsx:50`（ページ名）, `Sidebar.tsx:135`, `BottomNav.tsx:150`(+43コメント), `MobileMenuContent.tsx:162`。アイコン `Bell`。
- **pre-modified（触らない）**: `CLAUDE.md`, `firestore.rules`, `src/app/api/essay/coach/route.ts`, `src/lib/ai/prompts/essay.ts`。本機能は無関係なので影響なし。各コミットは対象ファイルのみ add。

**規約:** JSDocコメント必須。絵文字禁止。既存スタイル準拠。触るのは必要な箇所のみ。既存デッドコード削除しない。

---

## File Structure

| ファイル | 責務 | 種別 |
|----------|------|------|
| `src/lib/types/admin.ts` | AlertItem に info severity・活動系5type・link 追加 | 変更 |
| `src/app/api/admin/alerts/route.ts` | 活動系通知生成・link 付与・severityOrder に info | 変更 |
| `src/app/admin/alerts/page.tsx` | 通知への改称・リンク化・要注意/お知らせ区分・info スタイル | 変更 |
| `src/components/layout/Header.tsx` | ページ名 改称 | 変更 |
| `src/components/layout/Sidebar.tsx` | ラベル 改称 | 変更 |
| `src/components/layout/BottomNav.tsx` | ラベル 改称 | 変更 |
| `src/components/layout/MobileMenuContent.tsx` | ラベル 改称 | 変更 |
| `src/app/admin/dashboard/page.tsx` | 表記改称＋件数は info 除外 | 変更 |
| `src/app/admin/settings/page.tsx` | 表記改称 | 変更 |
| `src/app/admin/students/page.tsx` | 表記改称 | 変更 |
| `src/lib/email/templates.ts` | 表記改称（該当範囲） | 変更 |
| `src/app/api/notifications/alert-digest/route.ts` | 表記改称・info 除外（警告系のみ） | 変更 |

**進め方:** 型（T1）→ 生成ロジック（T2）→ 通知ページ（T3）→ 改称スイープ（T4）。

---

## Task 1: 型拡張

**Files:** Modify `src/lib/types/admin.ts`

- [ ] **Step 1: AlertItem を拡張**

`AlertItem` を次のように変更（既存フィールドは残す）:
```ts
export interface AlertItem {
  id: string;
  studentUid: string;
  studentName: string;
  type:
    | "inactive" | "declining" | "repeated_weakness" | "document_deadline"
    | "ap_struggle" | "weakness_stuck" | "deadline_risk" | "score_plateau"
    | "essay_reviewed"        // 添削を提出・完了（活動系）
    | "self_analysis_done"    // 自己分析の進捗・完了（活動系）
    | "document_submitted"    // 書類の提出・再提出（活動系）
    | "interview_done"        // 模擬面接 完了（活動系）
    | "skill_check_done";     // スキルチェック 完了（活動系）
  severity: "critical" | "warning" | "high" | "info"; // info=活動系のお知らせ
  message: string;
  detectedAt: string;
  acknowledged: boolean;
  recommendedAction?: string;
  /** クリックで遷移する先（例 /admin/students/{uid}?tab=activity）。省略時は非リンク。 */
  link?: string;
}
```

- [ ] **Step 2: 型チェック** — `npx tsc --noEmit` PASS（severity/type を絞り込む既存 switch が exhaustive でなくても既存は default を持つ想定。エラーが出た箇所は T3 で対応するが、型追加自体で他ファイルが壊れるならその型エラー箇所を報告）。
- [ ] **Step 3: Commit**
```bash
git add src/lib/types/admin.ts
git commit -m "feat(alerts): add info severity, activity types and link to AlertItem"
```

---

## Task 2: 活動系通知の生成（alerts route）

**Files:** Modify `src/app/api/admin/alerts/route.ts`

- [ ] **Step 1: severityOrder に info、add() に link 対応**

1. `severityOrder`（L240）を `{ critical: 0, high: 1, warning: 2, info: 3 }` にする。
2. `add()` の `base` 型に `link` を含め、既定リンクを付与する。`add` の Pick を
   `Pick<AlertItem, "type" | "severity" | "message" | "detectedAt" | "recommendedAction" | "link">` にし、push 時に
   `link: base.link ?? \`/admin/students/${student.uid}\`` を設定（既存の警告系も生徒詳細へクリック遷移できるようになる）。

- [ ] **Step 2: StudentAlertData に活動データを追加**

`StudentAlertData` に追記:
```ts
  /** 直近(3日以内)の活動。info 通知の元。 */
  recentActivities: {
    type: "essay_reviewed" | "self_analysis_done" | "document_submitted" | "interview_done" | "skill_check_done";
    itemId: string;   // 安定キー用（活動 id か日付）
    at: string;       // ISO
    message: string;
    link: string;
  }[];
```

- [ ] **Step 3: per-student loop で recentActivities を構築**

`NEW_WINDOW_DAYS = 3` をファイル上部に定数定義。per-student の `return { ... }` の前に、直近活動を集める。既存クエリを活用し、無いものは追加取得:

```ts
    const now = Date.now();
    const isRecent = (ms: number) => (now - ms) / (1000 * 60 * 60 * 24) <= NEW_WINDOW_DAYS;
    const recentActivities: StudentAlertData["recentActivities"] = [];
    const sName = data.displayName ?? "";

    // 添削（essays 最新）
    const eDoc = essaysSnap.docs[0];
    const eAt = eDoc?.data()?.submittedAt?.toDate?.();
    if (eDoc && eAt && isRecent(eAt.getTime())) {
      recentActivities.push({
        type: "essay_reviewed", itemId: eDoc.id, at: eAt.toISOString(),
        message: `${sName}さんが添削を提出しました`,
        link: `/admin/students/${studentUid}?tab=activity`,
      });
    }

    // 自己分析（selfAnalysis/{uid} の updatedAt）
    try {
      const saSnap = await adminDb!.doc(`selfAnalysis/${studentUid}`).get();
      const saAt = saSnap.data()?.updatedAt?.toDate?.();
      if (saSnap.exists && saAt && isRecent(saAt.getTime())) {
        recentActivities.push({
          type: "self_analysis_done", itemId: `${saAt.toISOString().slice(0,10)}`, at: saAt.toISOString(),
          message: `${sName}さんが自己分析を更新しました`,
          link: `/admin/students/${studentUid}?tab=activity`,
        });
      }
    } catch { /* skip */ }

    // 面接（users/{uid}/interviews 最新 startedAt）
    try {
      const iSnap = await adminDb!.collection(`users/${studentUid}/interviews`).orderBy("startedAt", "desc").limit(1).get();
      const iDoc = iSnap.docs[0];
      const iAt = iDoc?.data()?.startedAt?.toDate?.();
      if (iDoc && iAt && isRecent(iAt.getTime())) {
        recentActivities.push({
          type: "interview_done", itemId: iDoc.id, at: iAt.toISOString(),
          message: `${sName}さんが模擬面接を実施しました`,
          link: `/admin/students/${studentUid}?tab=activity`,
        });
      }
    } catch { /* skip */ }

    // スキルチェック（users/{uid}/skillChecks 最新 takenAt）
    try {
      const scSnap = await adminDb!.collection(`users/${studentUid}/skillChecks`).orderBy("takenAt", "desc").limit(1).get();
      const scDoc = scSnap.docs[0];
      const scAt = scDoc?.data()?.takenAt?.toDate?.();
      if (scDoc && scAt && isRecent(scAt.getTime())) {
        recentActivities.push({
          type: "skill_check_done", itemId: scDoc.id, at: scAt.toISOString(),
          message: `${sName}さんがスキルチェックを完了しました`,
          link: `/admin/students/${studentUid}?tab=performance`,
        });
      }
    } catch { /* skip */ }
```

書類（提出・再提出）は既存の `documentsSnap`（`users/{uid}/documents`）を使う。`documents` マップ処理で `id`/`updatedAt`/`reviewState`/`status` も拾えるようにし、直近更新かつ status が draft 以外 or `review.state==="resubmitted"` のものを1件、recentActivities に追加:
```ts
    // documentsSnap.docs をループし、直近更新の提出/再提出を検出（最大1件）
    for (const d of documentsSnap.docs) {
      const dd = d.data();
      const uAt = dd.updatedAt?.toDate?.();
      const resubmitted = dd.review?.state === "resubmitted";
      const submitted = dd.status && dd.status !== "draft";
      if (uAt && isRecent(uAt.getTime()) && (resubmitted || submitted)) {
        recentActivities.push({
          type: "document_submitted", itemId: d.id, at: uAt.toISOString(),
          message: `${sName}さんが「${dd.title ?? dd.type ?? "書類"}」を${resubmitted ? "再提出" : "提出"}しました`,
          link: `/admin/students/${studentUid}?tab=reports`,
        });
        break; // 1件で十分
      }
    }
```
そして `return { ... }` に `recentActivities` を含める。

- [ ] **Step 4: detectAlerts で info 通知を生成**

`detectAlerts` の per-student ループ末尾（既存アラート生成の後）に追加:
```ts
    // === ACTIVITY NOTIFICATIONS (info) ===
    for (const act of student.recentActivities) {
      add(student, act.itemId, {
        type: act.type,
        severity: "info",
        message: act.message,
        detectedAt: act.at,
        link: act.link,
      });
    }
```
（`add()` は `link` を base から受け取れるよう Step 1 で拡張済み。`acknowledged` は itemId ベースの alertKey で復元＝確認済みは復活しない。）

- [ ] **Step 5: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/app/api/admin/alerts/route.ts` PASS。
- [ ] **Step 6: Commit**
```bash
git add src/app/api/admin/alerts/route.ts
git commit -m "feat(alerts): generate activity notifications with deep links"
```

---

## Task 3: 通知ページ（改称・リンク化・区分）

**Files:** Modify `src/app/admin/alerts/page.tsx`

ページを読んで最小差分で。

- [ ] **Step 1: 改称**
- 見出し「アラート管理」→「通知」、説明「要注意生徒のアラートを確認・管理できます」→「生徒の状況と活動の通知を確認できます」、空表示「現在アラートはありません」→「現在通知はありません」、エラー「アラートの取得に失敗しました」→「通知の取得に失敗しました」等、ページ内の「アラート」表記を「通知」に。

- [ ] **Step 2: 新 severity/type 対応**
- `severityBgClass`/`severityIconBgClass`/`severityLabel`/`severityBadgeVariant` に `"info"` を追加（info は控えめな色＝例: 青/グレー系、`severityLabel`→「お知らせ」、`severityBadgeVariant`→"secondary"）。
- `alertTypeConfig(type)` に活動系5種（essay_reviewed/self_analysis_done/document_submitted/interview_done/skill_check_done）のラベル・アイコンを追加（絵文字不使用。既存の lucide アイコン、例 FileText/UserCheck/FileText/Mic/CheckCircle 等）。

- [ ] **Step 3: リンク化**
- 各通知カードに `item.link` があれば `Link href={item.link}`（`next/link`, 既に import 済み）でラップ、または `router.push(item.link)`。ExternalLink アイコンを付けてもよい。
- 確認済みトグル等のボタンは `e.stopPropagation()`/`e.preventDefault()` でカードのリンク遷移と競合させない。

- [ ] **Step 4: 要注意/お知らせ区分**
- 一覧を「要注意（severity critical/high/warning）」と「お知らせ（severity info）」の2グループに分けて表示（見出し付き）。もしくは既存のフィルタ機構があればそこに「お知らせ」を足す。既存の並び順（route 側でソート済み）を尊重。
- 要注意カウント（L124 の critical||high）はそのまま（info を含めない）。

- [ ] **Step 5: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/app/admin/alerts/page.tsx` 新規エラー増分ゼロ（git stash で HEAD 比較）。`npm run dev` で通知一覧→クリックで生徒詳細へ、を目視（controller確認）。
- [ ] **Step 6: Commit**
```bash
git add src/app/admin/alerts/page.tsx
git commit -m "feat(alerts): rename to notifications, link items, group warnings/info"
```

---

## Task 4: 改称スイープ（ナビ・ダッシュボード・設定・メール）

**Files:** Modify `src/components/layout/{Header,Sidebar,BottomNav,MobileMenuContent}.tsx`, `src/app/admin/{dashboard,settings,students}/page.tsx`, `src/lib/email/templates.ts`, `src/app/api/notifications/alert-digest/route.ts`

- [ ] **Step 1: ナビの表示ラベル改称**
- `Header.tsx:50` の `if (pathname.startsWith("/admin/alerts")) return "アラート";` → `"通知"`。
- `Sidebar.tsx:135` の `{ label: "アラート", href: "/admin/alerts", icon: Bell }` → `label: "通知"`。
- `BottomNav.tsx:150` の `{ label: "アラート", ... }` → `label: "通知"`（L43 のコメントも合わせる）。
- `MobileMenuContent.tsx:162` の `label: "アラート"` → `"通知"`。
- **`href`/`icon` は変えない**（URL・アイコン維持）。

- [ ] **Step 2: ダッシュボード等の表記改称＋件数 info 除外**
- `src/app/admin/dashboard/page.tsx`: 「アラート」表記→「通知」。アラート件数カードが `/api/admin/alerts` の結果を数えている場合、`severity !== "info"` で絞って要注意件数のみ表示（活動系を件数に含めない）。数え方が別 API（`alertStudentCount`）ならそのまま（info を生成しないため影響なし）。
- `src/app/admin/settings/page.tsx`, `src/app/admin/students/page.tsx`: 「アラート」表記→「通知」（文脈に合う範囲。設定のメール通知セクション等）。

- [ ] **Step 3: メール表記改称・info 除外**
- `src/lib/email/templates.ts`: メール文面の「アラート」→「通知」（該当箇所）。
- `src/app/api/notifications/alert-digest/route.ts`: 「アラート」表記→「通知」。ダイジェスト対象は**警告系のみ**（`severity !== "info"` で除外。活動系はメールで送らない）。alert-digest が `/api/admin/alerts` 相当のロジックを呼ぶ/再実装しているか確認し、info を含めないようにする。

- [ ] **Step 4: 検証** — `npx tsc --noEmit` PASS、`npx eslint`（変更ファイル）新規エラー増分ゼロ。`grep -rn "アラート" src/components/layout src/app/admin` で残存表記を確認（意図的に残すもの以外は無いこと）。
- [ ] **Step 5: Commit**
```bash
git add src/components/layout/Header.tsx src/components/layout/Sidebar.tsx src/components/layout/BottomNav.tsx src/components/layout/MobileMenuContent.tsx src/app/admin/dashboard/page.tsx src/app/admin/settings/page.tsx src/app/admin/students/page.tsx src/lib/email/templates.ts src/app/api/notifications/alert-digest/route.ts
git commit -m "feat(alerts): rename alerts to notifications across nav, dashboard, email"
```

---

## Self-Review（計画者チェック）

**Spec coverage:**
- 改称（表示のみ・URL維持） → T1(型は不要)/T3(ページ)/T4(ナビ・他)。✓
- 活動系5通知（添削/自己分析/書類/面接/スキルチェック） → T2。✓
- info severity・link → T1(型)/T2(生成)/T3(表示)。✓
- 深リンク（該当タブ） → T2(link 付与)/T3(クリック遷移)。✓
- 要注意/お知らせ区分・件数 info 除外 → T3/T4。✓
- alert-digest は警告系のみ → T4。✓
- 確認済み復活防止（itemId キー） → T2。✓
- セキュリティ（org スコープ） → 既存 GET/POST 踏襲、変更なし。✓

**Placeholder scan:** T1/T2 は実コード。T3/T4 は既存ファイル読解＋改称・分岐の契約（巨大/多数ファイルの外科的変更）。

**Type consistency:** `AlertItem.type` の活動系5種・`severity:"info"`・`link` を T1/T2/T3 で統一。`recentActivities` の type は AlertItem.type のサブセットで一致。alertKey(type, itemId) の itemId は T2 で活動 id/日付。

**未解決（実装時確認）:**
- `selfAnalysis/{uid}` の `updatedAt` フィールド名（無ければ他の日時フィールドで代替、または完了フラグ）。
- `users/{uid}/skillChecks` の `takenAt`・`interviews` の `startedAt` は既存クエリで使用済み＝存在確認済み。
- ダッシュボードのアラート件数の実データ源（`/api/admin/alerts` か `alertStudentCount` か）。
- 生徒詳細タブ（activity/reports/performance）が各活動を実際に表示するか（不明なら overview フォールバック）。

---

## Execution Handoff

計画を `docs/superpowers/plans/2026-07-13-alerts-to-notifications.md` に保存。実行は Subagent-Driven（推奨）。

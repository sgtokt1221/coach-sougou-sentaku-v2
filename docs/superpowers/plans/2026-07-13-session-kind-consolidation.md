# セッション種別の統合（探究授業を種別へ）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** セッションの `type` + `isResearch` を UI用の単一種別 `SessionKind`（面談/模擬面接/探究授業/グループ添削）に射影し、3画面の種別選択を統一・レガシー非表示・探究チェックボックス廃止・補足追記。データ構造は不変・後方互換。

**Architecture:** `session.ts` に UI射影の型・ラベル・補足・変換関数（`kindToTypeResearch`/`typeResearchToKind`）を追加。各画面は種別セレクトを `SessionKind` ベースにし、保存時に `type`/`isResearch` へ変換。保存形式・作成API・データモデルは不変。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / shadcn Select。

**設計書:** `docs/superpowers/specs/2026-07-13-session-kind-consolidation-design.md`

**前提（コードベース確認済み）:**
- `src/lib/types/session.ts`: `SessionType`(5種), `SESSION_TYPE_LABELS`(coaching=コーチング/mock_interview=模擬面接/essay_review=小論文レビュー/general=面談/group_review=グループ添削), `SESSION_TYPE_CREATE_OPTIONS=["general","mock_interview","group_review"]`, `Session.isResearch?:boolean`。
- セル追加モーダル `admin/sessions/page.tsx`: `formType`(SessionType) / `formIsResearch`(boolean) state。種別 select は `SESSION_TYPE_CREATE_OPTIONS.filter(t=>t!=="group_review")`（面談/模擬面接）。探究チェックボックス L505-514。作成 `createSessionAt(studentId, studentName, date, time, formType, formIsResearch)`（引数: `type: SessionType, isResearch: boolean`）。
- 新規作成 `sessions/new/page.tsx`: `type`(SessionType|"") / `isResearch`(boolean) state。種別 Select（`SESSION_TYPE_CREATE_OPTIONS`, L251-268）。授業形態＋研究チェックは `type !== "group_review"` で表示（研究チェック L308-314）。submit で `type==="group_review"` 分岐（締切ベース）／それ以外は `type`, `isResearch` を送信。`canSubmit` は `type` 参照。
- 詳細 `sessions/[id]/page.tsx`: タイプ表示（L324-327 `SESSION_TYPE_LABELS[session.type]`）＋編集 select（L333-336, `Object.entries(SESSION_TYPE_LABELS)` **全5種**）→ `patchSession({type})`。研究チェック L374-386 → `patchSession({isResearch})`。`isResearchSession = !!session.isResearch && session.type !== "group_review"`（L287, 専用レイアウト分岐）。

**規約:** JSDocコメント必須。絵文字禁止。既存スタイル準拠。触るのは必要な箇所のみ。既存デッドコード削除しない。**pre-modified の `src/lib/ai/prompts/essay.ts` 等は触らない**（本機能と無関係）。各コミットは対象ファイルのみ add。

---

## File Structure

| ファイル | 役割 | 種別 |
|----------|------|------|
| `src/lib/types/session.ts` | `SessionKind`・ラベル・補足・CREATE_OPTIONS・変換関数を追加 | 変更 |
| `src/app/admin/sessions/page.tsx` | セル追加モーダルの種別統一・探究チェック廃止 | 変更 |
| `src/app/admin/sessions/new/page.tsx` | 新規作成の種別統一・探究チェック廃止 | 変更 |
| `src/app/admin/sessions/[id]/page.tsx` | 詳細の種別セレクト統一・レガシー非表示・探究チェック廃止 | 変更 |

**進め方:** 型・変換（T1）→ セル追加モーダル（T2）→ 新規作成（T3）→ 詳細（T4）。

---

## Task 1: SessionKind 型・変換関数

**Files:** Modify `src/lib/types/session.ts`

- [ ] **Step 1: 追加する**

`SESSION_TYPE_CREATE_OPTIONS` 定義の後に追記（既存の型・定数は変更しない）:
```ts
/** UI上の種別（type + isResearch を1軸に射影）。データは従来の type/isResearch で保存。 */
export type SessionKind = "general" | "mock_interview" | "research" | "group_review";

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  general: "面談",
  mock_interview: "模擬面接",
  research: "探究授業",
  group_review: "グループ添削",
};

/** 各種別の1行補足（違いの明示）。 */
export const SESSION_KIND_DESCRIPTIONS: Record<SessionKind, string> = {
  general: "1対1の全般セッション",
  mock_interview: "面接練習（要約・振り返りが面接特化）",
  research: "生徒が講師に教える回（探究授業）",
  group_review: "グループ添削（別フロー）",
};

/** カレンダー/1対1作成で選べる種別（group_review は別経路）。 */
export const SESSION_KIND_CREATE_OPTIONS: SessionKind[] = ["general", "mock_interview", "research"];

/**
 * SessionKind → 保存用の { type, isResearch }。
 * research は type=general + isResearch=true に射影（探究は専用レイアウトで扱う）。
 */
export function kindToTypeResearch(kind: SessionKind): { type: SessionType; isResearch: boolean } {
  if (kind === "research") return { type: "general", isResearch: true };
  return { type: kind as SessionType, isResearch: false };
}

/**
 * 保存済み { type, isResearch } → UI種別。
 * isResearch 優先。レガシー(coaching/essay_review)は面談(general)へ寄せる。
 */
export function typeResearchToKind(type: SessionType, isResearch?: boolean): SessionKind {
  if (isResearch) return "research";
  if (type === "mock_interview") return "mock_interview";
  if (type === "group_review") return "group_review";
  return "general";
}
```

- [ ] **Step 2: 型チェック** — `npx tsc --noEmit` PASS。
- [ ] **Step 3: Commit**
```bash
git add src/lib/types/session.ts
git commit -m "feat(sessions): add SessionKind projection for type + isResearch"
```

---

## Task 2: セル追加モーダルの種別統一

**Files:** Modify `src/app/admin/sessions/page.tsx`

- [ ] **Step 1: state を kind 化**
- `formType`/`formIsResearch` の代わりに `const [formKind, setFormKind] = useState<SessionKind>("general");` を導入（既存 `formType`/`formIsResearch` の宣言を置換。他で `formType`/`formIsResearch` を参照している箇所も追随）。import に `SessionKind`, `SESSION_KIND_LABELS`, `SESSION_KIND_DESCRIPTIONS`, `SESSION_KIND_CREATE_OPTIONS`, `kindToTypeResearch` を追加。

- [ ] **Step 2: 種別 select を統一＋探究チェック削除**
- 種別 select（L488-503）の options を `SESSION_KIND_CREATE_OPTIONS`（面談/模擬面接/探究授業）に変更、`value={formKind}` / `onChange={(e)=>setFormKind(e.target.value as SessionKind)}`、ラベルは `SESSION_KIND_LABELS[k]`。
- select 直下に選択中種別の補足を1行表示: `<p className="text-xs text-muted-foreground">{SESSION_KIND_DESCRIPTIONS[formKind]}</p>`。
- **探究チェックボックス（L505-514）を削除**。

- [ ] **Step 3: 作成時に変換**
- 「追加」ボタンの onClick（L523-）で `const { type, isResearch } = kindToTypeResearch(formKind);` を計算し、`createSessionAt(studentId, studentName, dialog.date, dialog.time, type, isResearch)` を呼ぶ（`createSessionAt` の引数・実装は不変）。

- [ ] **Step 4: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/app/admin/sessions/page.tsx` 新規エラー増分ゼロ（git stash で HEAD 比較）。
- [ ] **Step 5: Commit**
```bash
git add src/app/admin/sessions/page.tsx
git commit -m "feat(sessions): unify kind select and drop research checkbox in add dialog"
```

---

## Task 3: 新規作成ページの種別統一

**Files:** Modify `src/app/admin/sessions/new/page.tsx`

- [ ] **Step 1: state を kind 化**
- `const [type, setType] = useState<SessionType | "">("")` と `const [isResearch, setIsResearch] = useState(false)` を、`const [kind, setKind] = useState<SessionKind | "">("")` に置換。import に `SessionKind`, `SESSION_KIND_LABELS`, `SESSION_KIND_DESCRIPTIONS`, `SESSION_KIND_CREATE_OPTIONS`, `kindToTypeResearch` を追加。

- [ ] **Step 2: 種別 Select（group_review 含む）＋探究チェック削除**
- Select（L251-268）の value を `kind`、onValueChange を `(v)=>setKind((v ?? "") as SessionKind | "")`、options を **`[...SESSION_KIND_CREATE_OPTIONS, "group_review"]`**（新規作成は group_review も選べる）、ラベル `SESSION_KIND_LABELS`。
- Select 下に補足 `{kind && <p className="text-xs text-muted-foreground">{SESSION_KIND_DESCRIPTIONS[kind]}</p>}`。
- 授業形態・研究チェックの表示条件 `type !== "group_review"` を `kind !== "group_review"` に変更。**研究チェックボックス（L308-314 のブロック）を削除**。

- [ ] **Step 3: submit・canSubmit を kind ベースに**
- `canSubmit`（L74）の `type` 参照を `kind` に: `const canSubmit = teacherId && kind && scheduledAt && (kind !== "group_review" ? studentId : submissionDeadline);`
- handleSubmit（L79-）: `if (kind === "group_review") { ...既存の group_review 経路... }` に変更。**それ以外**の1対1経路では `const { type, isResearch } = kindToTypeResearch(kind);` を計算して `type`/`isResearch` を送信（既存の送信ボディの `type`, `isResearch` をこの変換値に置換）。
- その他 `type !== "group_review"` の条件（L134, L182 等）は `kind !== "group_review"` に置換。`selectedStudent` 必須判定等はそのまま（kind 判定に合わせる）。

- [ ] **Step 4: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/app/admin/sessions/new/page.tsx` 新規エラー増分ゼロ。
- [ ] **Step 5: Commit**
```bash
git add src/app/admin/sessions/new/page.tsx
git commit -m "feat(sessions): unify kind select and drop research checkbox in new page"
```

---

## Task 4: 詳細ページの種別統一（レガシー非表示）

**Files:** Modify `src/app/admin/sessions/[id]/page.tsx`

- [ ] **Step 1: 種別編集 select を統一・レガシー非表示**
- import に `SessionKind`, `SESSION_KIND_LABELS`, `SESSION_KIND_CREATE_OPTIONS`, `kindToTypeResearch`, `typeResearchToKind` を追加。
- タイプ編集 select（L333-336, `Object.entries(SESSION_TYPE_LABELS)` 全列挙）を、`SessionKind` ベースへ:
  - 現在の kind: `const currentKind = typeResearchToKind(session.type, session.isResearch);`
  - options: `const kindOptions = currentKind === "group_review" ? [...SESSION_KIND_CREATE_OPTIONS, "group_review"] : SESSION_KIND_CREATE_OPTIONS;`（既存が group_review のときのみ group_review を含める）。ラベル `SESSION_KIND_LABELS`。
  - `value={currentKind}`、onChange で `const { type, isResearch } = kindToTypeResearch(e.target.value as SessionKind); patchSession({ type, isResearch });`（type と isResearch を同時更新）。

- [ ] **Step 2: 読み取り表示「タイプ:」を isResearch 優先に**
- 表示（L324-327）を、`session.isResearch ? "探究授業" : SESSION_TYPE_LABELS[session.type]` にする（レガシー type も正しく面談等で表示されるが、探究は「探究授業」と出す）。

- [ ] **Step 3: 探究チェックボックス削除**
- 探究チェックボックス（L374-386 のブロック）を**削除**（種別 select で選べるため）。`isResearchSession`（L287）の分岐・専用レイアウトは**不変**。

- [ ] **Step 4: 検証** — `npx tsc --noEmit` PASS、`npx eslint 'src/app/admin/sessions/[id]/page.tsx'` 新規エラー増分ゼロ。
- [ ] **Step 5: Commit**
```bash
git add 'src/app/admin/sessions/[id]/page.tsx'
git commit -m "feat(sessions): unify kind select, hide legacy types, drop research checkbox in detail"
```

---

## Self-Review（計画者チェック）

**Spec coverage:**
- 探究を種別に統合・チェック廃止 → T2/T3/T4。✓
- レガシー非表示 → T4（CREATE_OPTIONS ベース）＋ T2/T3（元々 CREATE_OPTIONS）。✓
- 補足追記 → T2/T3（SESSION_KIND_DESCRIPTIONS）。✓
- データ不変・変換 → T1（kindToTypeResearch/typeResearchToKind）、各画面は変換のみ。✓
- group_review 保持（詳細） → T4（currentKind==="group_review" 時のみ含める）。✓
- group_review×research 排他 → kind 単一選択で自然に排他。✓

**Placeholder scan:** T1 は実コード。T2-T4 は既存ファイルの state/select/checkbox を kind ベースに置換する具体指示。

**Type consistency:** `SessionKind`/`SESSION_KIND_LABELS`/`SESSION_KIND_DESCRIPTIONS`/`SESSION_KIND_CREATE_OPTIONS`/`kindToTypeResearch`/`typeResearchToKind` を T1 定義、T2-T4 で統一使用。`createSessionAt`/`patchSession`/新規作成送信の `type`/`isResearch` 保存形式は不変。

**未解決（実装時確認）:**
- 各画面で `formType`/`formIsResearch`/`type`/`isResearch` を参照する**全箇所**を kind ベースに追随（grep で漏れ確認）。
- 補足文言の表示位置（select 直下の1行）。
- 定期授業マスタ等の他導線は本計画では触らない（別途）。

---

## Execution Handoff

計画を `docs/superpowers/plans/2026-07-13-session-kind-consolidation.md` に保存。実行は Subagent-Driven（推奨）。

# 志望理由書（書類）の途中保存・再開 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 出願書類の作成ウィザードと編集画面に「途中保存・再開」を追加する（案B: Documentに一本化、自動保存＋手動併置）。

**Architecture:** ウィザードは志望校確定時にDocumentを早期作成（status=draft, content=""）し、以降の選択・生成本文をそのDocumentへ自動保存。編集画面も本文を自動保存。共通デバウンスフック `useAutosave` を新設。一覧は `wizardState.completed` と `content` で再開先（ウィザード or 編集）を分岐。PUTは自動保存時にバージョンを増やさない。

**Tech Stack:** Next.js 16 App Router / React 19 / TypeScript / firebase-admin。認証は `verifyAuthToken` + `requireFeature(request,"documentEditor")` + `userId===uid`。

**設計書:** `docs/superpowers/specs/2026-07-12-document-draft-resume-design.md`

**前提（コードベース確認済み）:**
- `api/documents/route.ts`: GET(一覧, userId), POST(作成, `adminDb.collection("documents").add`, `status:"draft"`, `initialContent||""`)。認証=`verifyAuthToken`＋`requireFeature`。
- `api/documents/[id]/route.ts`: GET/PUT/DELETE。**PUTは content 更新のたびに `versions` へ arrayUnion で版を積む**（L110-135）。受理項目は content/status/title/targetWordCount/deadline のみ。**DELETEはクライアントSDKを server で使う壊れ実装**（L158-186, コメントで自認）。所有者チェック `data.userId !== auth.uid` あり。
- `documents/new/page.tsx`（638行）: `STEPS=["書類タイプ","志望校","フレームワーク","活動実績","下書き生成"]`。state: `step/documentType/selectedUniversity/frameworkType/selectedActivityIds/targetWordCount/draftResult/saving`。生成=`handleGenerate`→`/api/documents/generate-draft`。末尾保存=`handleSave`→`POST /api/documents`（`initialContent:draftResult.draft`）。`authFetch` 使用。
- `documents/[id]/page.tsx`（463行）: `content` state、`handleSave`→`PUT /api/documents/[id]` `{content}`、`Save` アイコン、差し戻しバナー。
- `documents/page.tsx`（207行）: 大学別グループ一覧、`STATUS_VARIANT`、`DOCUMENT_STATUS_LABELS`、カードから `[id]` へリンク。
- 型 `src/lib/types/document.ts`: `Document`/`DocumentVersion`/`DocumentCreateRequest`/`DOCUMENT_STATUS_LABELS`。
- 検証: `npx tsc --noEmit`＋`npx eslint`。テストランナー無し。React hook の単体テスト基盤無し→hookは tsc/eslint＋手動。

**規約:** JSDocコメント必須。絵文字禁止。既存スタイル準拠。触るのは必要な箇所のみ。既存デッドコードは削除しない。

---

## File Structure

| ファイル | 責務 | 種別 |
|----------|------|------|
| `src/lib/types/document.ts` | `DocumentWizardState` 追加、`Document`/`DocumentCreateRequest` 拡張 | 変更 |
| `src/hooks/useAutosave.ts` | デバウンス自動保存フック | 新規 |
| `src/app/api/documents/route.ts` | POST で `wizardState` 受理・保存 | 変更 |
| `src/app/api/documents/[id]/route.ts` | PUT で `wizardState`/基本項目 受理＋`autosave`時は版を積まない、DELETE を admin SDK に修正 | 変更 |
| `src/app/student/documents/new/page.tsx` | 早期作成・自動保存・`?resume`復元・インジケータ | 変更 |
| `src/app/student/documents/[id]/page.tsx` | 本文自動保存・インジケータ・離脱flush | 変更 |
| `src/app/student/documents/page.tsx` | 再開判定でリンク分岐・「作成途中」バッジ・破棄 | 変更 |

**進め方:** 型（T1）→ フック（T2）→ API（T3 POST, T4 PUT/DELETE）→ クライアント（T5 ウィザード, T6 編集, T7 一覧）。バックエンドは確定コード、クライアントは既存ページを読んで最小差分で結線。

---

## Task 1: 型拡張

**Files:**
- Modify: `src/lib/types/document.ts`

- [ ] **Step 1: 型を追加**

`Document` インターフェースの定義の直前に `DocumentWizardState` を追加し、`Document` に `wizardState?` を、`DocumentCreateRequest` に `wizardState?` を追加する。

```ts
/** 未完了ウィザードの復元用進行状態。ウィザード完走後は completed:true。 */
export interface DocumentWizardState {
  /** 0-4（書類タイプ/志望校/フレームワーク/活動実績/下書き生成） */
  currentStep: number;
  frameworkType?: string;
  selectedActivityIds: string[];
  targetWordCount: number;
  /** true以降は編集画面が主。false=ウィザード再開対象 */
  completed: boolean;
}
```

`Document` に追記（既存フィールドは変えない）:
```ts
  /** 未完了ウィザードの復元用。完走後は completed:true（または省略）。 */
  wizardState?: DocumentWizardState;
```

`DocumentCreateRequest` に追記:
```ts
  /** 早期作成時のウィザード進行状態 */
  wizardState?: DocumentWizardState;
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/document.ts
git commit -m "feat(documents): add DocumentWizardState for draft resume"
```

---

## Task 2: 自動保存フック `useAutosave`

**Files:**
- Create: `src/hooks/useAutosave.ts`

- [ ] **Step 1: フックを実装**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 自動保存の状態 */
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseAutosaveResult {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  /** 保留中のデバウンスを無視して即時保存する（離脱時・手動保存に使用） */
  flush: () => Promise<void>;
}

/**
 * value の変更をデバウンスして saveFn を呼ぶ自動保存フック。
 * - 直近に保存した値と同一ならスキップ（無駄な書き込み防止）。
 * - enabled=false の間は保存しない（早期作成前など）。
 * - unmount でタイマをクリアして多重送信を防ぐ。
 * @param value 監視対象（変化したら保存）
 * @param saveFn 保存関数（value を受け取り Promise を返す）
 * @param opts.delay デバウンス(ms, 既定1500) / opts.enabled 有効フラグ(既定true)
 */
export function useAutosave<T>(
  value: T,
  saveFn: (v: T) => Promise<void>,
  opts?: { delay?: number; enabled?: boolean }
): UseAutosaveResult {
  const delay = opts?.delay ?? 1500;
  const enabled = opts?.enabled ?? true;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSnapshotRef = useRef<string>(JSON.stringify(value));
  const saveFnRef = useRef(saveFn);
  const valueRef = useRef(value);
  saveFnRef.current = saveFn;
  valueRef.current = value;

  const doSave = useCallback(async () => {
    const snapshot = JSON.stringify(valueRef.current);
    if (snapshot === savedSnapshotRef.current) return; // 変化なし
    setStatus("saving");
    try {
      await saveFnRef.current(valueRef.current);
      savedSnapshotRef.current = snapshot;
      setStatus("saved");
      setLastSavedAt(new Date());
    } catch {
      setStatus("error");
    }
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await doSave();
  }, [doSave]);

  useEffect(() => {
    if (!enabled) return;
    const snapshot = JSON.stringify(value);
    if (snapshot === savedSnapshotRef.current) return; // 変化なし
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void doSave();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, delay, doSave]);

  return { status, lastSavedAt, flush };
}
```

- [ ] **Step 2: 型チェック＋lint**

Run: `npx tsc --noEmit && npx eslint src/hooks/useAutosave.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAutosave.ts
git commit -m "feat(documents): add useAutosave debounced autosave hook"
```

---

## Task 3: POST で wizardState を受理

**Files:**
- Modify: `src/app/api/documents/route.ts`

- [ ] **Step 1: docData に wizardState を追加**

POST ハンドラの `docData` オブジェクト（L82-99）に `wizardState` を条件付きで含める。`body.wizardState` が渡されたときのみ保存する（undefined を書かないよう分岐）。`docData` 定義の直後に追記:

```ts
    if (body.wizardState !== undefined) {
      (docData as Record<string, unknown>).wizardState = body.wizardState;
    }
```

（`docData` は `const` のままでよい。`add(docData)` に渡る前に付与する。`Document` 型に `wizardState?` があるため型は整合。）

- [ ] **Step 2: 型チェック＋lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/documents/route.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/documents/route.ts
git commit -m "feat(documents): accept wizardState on document create"
```

---

## Task 4: PUT で wizardState/基本項目を受理＋autosave時は版を積まない、DELETE修正

**Files:**
- Modify: `src/app/api/documents/[id]/route.ts`

- [ ] **Step 1: PUT を拡張（版ノイズ防止＋受理項目追加）**

PUT ハンドラの本文組み立て部（L99-135付近）を次の方針で修正する:

1. `body.autosave === true` のときは **バージョンを積まない**（`newVersion` を作らない）。手動保存/生成保存（`autosave` 無し or false）では従来どおり版を積む。
2. 受理する更新項目に `wizardState` と書類基本項目（`universityId`/`facultyId`/`universityName`/`facultyName`/`type`）を**ホワイトリストで**追加。`userId`/`createdAt`/`review`/`versions` はクライアントから更新させない。

該当ブロックを次に置換:

```ts
    const body = await request.json();
    const now = new Date().toISOString();
    const isAutosave = body.autosave === true;

    const updates: Record<string, unknown> = {
      updatedAt: now,
    };
    let newVersion: Record<string, unknown> | null = null;

    if (body.content !== undefined) {
      updates.content = body.content;
      updates.wordCount = body.content.length;
      // 自動保存では版を増やさない（ノイズ防止）。手動/生成保存でのみ版を積む。
      if (!isAutosave) {
        newVersion = {
          id: `v-${Date.now()}`,
          content: body.content,
          wordCount: body.content.length,
          createdAt: now,
        };
      }
    }

    if (body.status !== undefined) updates.status = body.status;
    if (body.title !== undefined) updates.title = body.title;
    if (body.targetWordCount !== undefined) updates.targetWordCount = body.targetWordCount;
    if (body.deadline !== undefined) updates.deadline = body.deadline;
    // ウィザード進行状態と書類基本項目（志望校/タイプ変更対応）。ホワイトリストのみ。
    if (body.wizardState !== undefined) updates.wizardState = body.wizardState;
    if (body.universityId !== undefined) updates.universityId = body.universityId;
    if (body.facultyId !== undefined) updates.facultyId = body.facultyId;
    if (body.universityName !== undefined) updates.universityName = body.universityName;
    if (body.facultyName !== undefined) updates.facultyName = body.facultyName;
    if (body.type !== undefined) updates.type = body.type;

    // 本文を修正したら、承認/差し戻し済みのレビュー状態は「再確認待ち」に戻す。
    if (body.content !== undefined) {
      const existingReview = existing.data()?.review as DocumentReview | undefined;
      if (existingReview && existingReview.state !== "resubmitted") {
        updates.review = { state: "resubmitted", at: now };
      }
    }

    if (newVersion) {
      updates.versions = FieldValue.arrayUnion(newVersion);
    }

    await docRef.update(updates);
```

（`FieldValue`/`DocumentReview` の import は既存のまま使える。）

- [ ] **Step 2: DELETE を admin SDK ＋所有者チェックに修正**

現状の DELETE（L158-186, クライアントSDKを server で使う壊れ実装）を、既存の GET/PUT と同じ admin SDK ＋認証＋所有者チェックに置換:

```ts
/**
 * 書類を削除する。認証＋所有者チェック必須（admin SDK）。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { id } = await params;
    const docRef = adminDb.doc(`documents/${id}`);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }
    if (existing.data()?.userId !== auth.uid) {
      return NextResponse.json({ error: "この書類へのアクセス権がありません" }, { status: 403 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json({ error: "書類の削除中にエラーが発生しました" }, { status: 500 });
  }
}
```

（引数名を `_request` → `request` に変える。旧の動的 import `@/lib/firebase/config` は削除。）

- [ ] **Step 3: 型チェック＋lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/documents/[id]/route.ts`
Expected: PASS（未使用 import なし。`request` 未使用警告が出ないこと）

- [ ] **Step 4: Commit**

```bash
git add src/app/api/documents/[id]/route.ts
git commit -m "feat(documents): PUT accepts wizardState/basics, skip version on autosave, fix DELETE to admin SDK"
```

---

## Task 5: ウィザードの早期作成・自動保存・再開

**Files:**
- Modify: `src/app/student/documents/new/page.tsx`

このタスクはページ（638行）を読んで最小差分で結線する。以下の契約を満たすこと。

- [ ] **Step 1: docId state と早期作成（冪等）**

- `const [docId, setDocId] = useState<string | null>(null);` と `const [creating, setCreating] = useState(false);` を追加。
- `?resume=<id>` を `useSearchParams` で読み、あれば下記 Step 3 の復元を行う（その場合は早期作成せず既存 docId を使う）。
- Step1→2 遷移（志望校 `selectedUniversity` 確定）時、`!docId && !creating` のときのみ `POST /api/documents` を1回呼ぶ:
  ```ts
  // body: { type: documentType, universityId, facultyId, universityName, facultyName,
  //         targetWordCount, initialContent: "", wizardState: { currentStep, frameworkType, selectedActivityIds, targetWordCount, completed: false } }
  ```
  レスポンス（201, `{id,...}`）の `id` を `setDocId` する。`creating` フラグで二重POSTを防ぐ。

- [ ] **Step 2: wizardState の自動保存**

- `useAutosave` を使い、`{ currentStep: step, frameworkType, selectedActivityIds, targetWordCount }` の変化を `PUT /api/documents/${docId}` に `{ wizardState: {...}, autosave: true }` で保存する（`enabled: !!docId`）。志望校/タイプを戻って変更した場合は同PUTに `universityId/facultyId/universityName/facultyName/type` も含める。
- ステップ遷移時と `beforeunload` で `flush()` を呼ぶ（`beforeunload` は keepalive fetch。既存 `authFetch` に `keepalive:true` を付けるヘルパを用意するか、`flush` 内で通常 PUT）。
- ヘッダ付近に保存インジケータ（`status==="saving"?"保存中…":status==="saved"?`保存済み ${HH:MM}`:status==="error"?"保存に失敗（自動再試行）":""`）を表示。

- [ ] **Step 3: 生成本文の保存と再開**

- `handleGenerate` 成功後、生成本文（`draftResult.draft`）を `PUT /api/documents/${docId}` に `{ content: draft }`（autosave なし＝初版を積む）で保存。
- 末尾の旧 `handleSave`（`POST /api/documents` で一括作成）は**廃止**し、「この内容で保存」ボタンは `PUT /api/documents/${docId}` に `{ wizardState: { ...prev, completed: true } }` を送って `router.push(\`/student/documents/${docId}\`)` へ遷移する処理に置き換える。
- `?resume=<id>` で開いたとき: `GET /api/documents/${id}` → `wizardState`・`content`・基本項目を state に復元し、`setStep(wizardState.currentStep)`・`setDocId(id)`。必要な大学/活動データのロードは既存の初期化フローを流用。

- [ ] **Step 4: 検証**

Run: `npx tsc --noEmit && npx eslint src/app/student/documents/new/page.tsx`
Expected: PASS（新規 lint エラーを増やさない。既存デッドコード由来のエラーは git stash で HEAD 比較し増分ゼロを確認）

`npm run dev` で: 志望校選択→戻る/進む→リロードで途中から復元、を目視確認（controllerが確認）。

- [ ] **Step 5: Commit**

```bash
git add src/app/student/documents/new/page.tsx
git commit -m "feat(documents): wizard early-create + autosave + resume"
```

---

## Task 6: 編集画面の自動保存

**Files:**
- Modify: `src/app/student/documents/[id]/page.tsx`

- [ ] **Step 1: content の自動保存を追加**

- `useAutosave(content, saveFn, { delay: 1500, enabled: !loading })` を追加。`saveFn` は `PUT /api/documents/${id}` に `{ content, autosave: true }`（自動保存では版を積まない）。
- 既存の手動 `handleSave`（`{content}`, autosave なし＝版を積む）は残す。手動保存時は `flush()` ではなく既存の即時 PUT を使う（版を残す明示保存として）。
- `beforeunload` とルート遷移時に `flush()`。`beforeunload` は keepalive fetch。
- ヘッダの `Save` ボタン付近に保存インジケータ（ウィザードと同じ文言）を表示。
- 差し戻し→`resubmitted` 自動遷移は PUT 経路で維持（サーバ側で処理済み）。ただし**自動保存の度に resubmitted へ動くのが煩わしい場合**は、手動保存時のみ resubmitted 遷移させる案もあるが、本実装ではサーバ既存挙動（content更新で遷移）を維持する。

- [ ] **Step 2: 検証**

Run: `npx tsc --noEmit && npx eslint src/app/student/documents/[id]/page.tsx`
Expected: PASS（新規エラー増分ゼロ）

`npm run dev` で: 本文編集→1.5s後に「保存済み」表示、リロードで保持、を目視確認。

- [ ] **Step 3: Commit**

```bash
git add src/app/student/documents/[id]/page.tsx
git commit -m "feat(documents): autosave document content in editor"
```

---

## Task 7: 一覧の再開判定・作成途中バッジ・破棄

**Files:**
- Modify: `src/app/student/documents/page.tsx`

- [ ] **Step 1: リンク分岐とバッジ**

- 下書きカードのリンク先を判定関数で分岐:
  ```ts
  const isWizardIncomplete = (d: Document) => d.content === "" && d.wizardState !== undefined && d.wizardState.completed === false;
  const hrefFor = (d: Document) => isWizardIncomplete(d) ? `/student/documents/new?resume=${d.id}` : `/student/documents/${d.id}`;
  ```
- `isWizardIncomplete(doc)` のカードに「作成途中」バッジを表示（既存の `Badge` / `STATUS_VARIANT` のスタイルに合わせる。絵文字不使用）。

- [ ] **Step 2: 破棄アクション**

- 「作成途中」カードに破棄ボタンを追加し、確認後 `DELETE /api/documents/${id}`（`authFetch`）→ 一覧を再取得 or 楽観的に除去。既存のトースト（あれば）でフィードバック。破棄確認は既存のダイアログ機構があれば流用、無ければ `confirm` 相当を避け最小のインライン確認にする。

- [ ] **Step 3: 検証**

Run: `npx tsc --noEmit && npx eslint src/app/student/documents/page.tsx`
Expected: PASS（新規エラー増分ゼロ）

`npm run dev` で: 途中離脱した下書きが「作成途中」で並び、タップでウィザード復帰、破棄で消える、を目視確認。

- [ ] **Step 4: Commit**

```bash
git add src/app/student/documents/page.tsx
git commit -m "feat(documents): list resume routing, in-progress badge, discard"
```

---

## Self-Review（計画者チェック）

**Spec coverage:**
- ①ウィザード途中保存・再開 → T5（早期作成/autosave/resume）＋T3（POST wizardState）＋T4（PUT wizardState）。✓
- ②編集本文の途中保存・再開 → T6（editor autosave）＋T4（PUT autosave版なし）。✓
- 自動保存＋手動併置 → T2（hook）＋T5/T6（手動保存維持）。✓
- 早期作成・content一元管理・completed判定 → T1（型）＋T5＋T7（判定）。✓
- 志望校変更時のtop-level更新 → T4（PUT whitelist）。✓
- 二重作成冪等 → T5（creatingフラグ）。✓
- 版ノイズ防止 → T4（autosave時skip）。✓
- 一覧再開分岐・作成途中・破棄 → T7。DELETE修正 → T4。✓
- セキュリティ（認証/所有者/ホワイトリスト） → T3/T4（既存踏襲＋whitelist）。✓

**Placeholder scan:** バックエンド（T1-T4）は実コード。クライアント（T5-T7）は既存ページ読解が要るため契約＋差分方針で記述（No-Placeholders の例外＝既存巨大ページへの外科的結線。実装者がページを読んで適合）。

**Type consistency:** `DocumentWizardState`(currentStep/frameworkType/selectedActivityIds/targetWordCount/completed)、`wizardState`/`autosave` フラグ、`useAutosave(value,saveFn,{delay,enabled})→{status,lastSavedAt,flush}` を全タスクで統一。PUTの `autosave` フラグ名を T4/T5/T6 で一致。

**未解決（実装時確認）:**
- `documents/new/page.tsx` の初期化フロー（大学/活動データのロード）への `?resume` 復元の差し込み位置。
- keepalive fetch ヘルパの実装（`authFetch` にトークン付き keepalive を通せるか）。
- 破棄確認ダイアログの既存UI有無。

---

## Execution Handoff

計画を `docs/superpowers/plans/2026-07-12-document-draft-resume.md` に保存しました。実行は Subagent-Driven（推奨）でタスクごとに実装＋二段レビュー。

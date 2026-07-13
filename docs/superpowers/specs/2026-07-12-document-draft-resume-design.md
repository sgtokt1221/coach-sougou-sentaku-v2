# 志望理由書（書類）の途中保存・再開 設計書

作成日: 2026-07-12
対象: 志望理由書など出願書類の作成ウィザードと編集画面（`src/app/student/documents/*`, `src/app/api/documents/*`）

## 1. 目的とゴール

出願書類（志望理由書・学業活動報告書・研究計画書・自己推薦書・学びの設計書）の作成を、**途中でやめて後から再開できる**ようにする。添削（essay）の下書き保存を参考にするが、書類は「下書き＝Document（status: draft）」がモデルの既定であるため、**Documentに一本化**して実現する。

### スコープ（ユーザー決定）
1. **ウィザード進行の途中保存・再開**（新規作成の5ステップ）。
2. **保存済みDocument本文の編集途中保存・再開**。
- 保存トリガーは **自動保存（デバウンス）＋手動ボタン併置**。
- 保存先モデルは **案B: Documentに一本化**（ウィザードで志望校/タイプ確定後にDocumentを早期作成し、以降すべてそのDocumentへ自動保存。本文は `content` に一元管理）。

### スコープ外
- リアルタイム共同編集・複数ユーザー同時編集の衝突解決（シングルユーザー last-write-wins のみ）。
- 自動保存ごとのバージョン履歴追加（バージョンは既存の明示的タイミングのみ）。
- 添削（essay）側の挙動変更（参考にするだけで手を入れない）。

### 現状（コードベース確認済み）
- `documents/new/page.tsx`（638行）: 5ステップウィザード（書類タイプ/志望校/フレームワーク/活動実績/下書き生成）。状態は全てReactメモリ内。最後に `handleSave` → `POST /api/documents`（`initialContent=draftResult.draft`）でDocument作成。途中離脱で全消失。
- `documents/[id]/page.tsx`（463行）: 編集画面。`content` state、手動 `handleSave`（`PUT /api/documents/[id]` に `{content}`）。差し戻し時は修正・保存で `resubmitted` に自動遷移。
- `documents/page.tsx`（207行）: 大学別グループの書類一覧。status バッジ表示。「書類を作成する」→ `/student/documents/new`。
- `api/documents/route.ts`: GET(一覧, userId), POST(作成, `status:"draft"`)。
- `api/documents/[id]/route.ts`: PUT(更新, 現状 `{content}` のみ)。所有者チェックあり。
- 型 `src/lib/types/document.ts`: `Document`（status: draft/in_review/reviewed/final）, `DocumentVersion`, `DocumentCreateRequest`。
- 参考: 添削は `essayDrafts` 別コレクション＋`?draft=ID`復元（`/api/student/essay-drafts`）。書類では踏襲せず案Bを採用。

## 2. データモデル

`src/lib/types/document.ts` に追加:
```ts
/** 未完了ウィザードの復元用進行状態。ウィザード完走後は completed:true */
export interface DocumentWizardState {
  currentStep: number;            // 0-4（書類タイプ/志望校/フレームワーク/活動実績/下書き生成）
  frameworkType?: string;
  selectedActivityIds: string[];
  targetWordCount: number;
  completed: boolean;             // true以降は編集画面が主。false=ウィザード再開対象
}

export interface Document {
  // ...既存フィールド...
  /** 未完了ウィザードの復元用。完走後は completed:true（または省略） */
  wizardState?: DocumentWizardState;
}
```

`DocumentCreateRequest` に追加（早期作成用）:
```ts
export interface DocumentCreateRequest {
  // ...既存...
  /** 早期作成時のウィザード進行状態 */
  wizardState?: DocumentWizardState;
}
```

**再開判定ロジック**（一覧・遷移で使用）:
- `content` が空文字 かつ `wizardState && wizardState.completed === false` → **ウィザード再開**（`/student/documents/new?resume=<id>`）。
- それ以外（`content` あり、または `wizardState` 無し/completed） → **編集画面**（`/student/documents/[id]`）。

補足: Step4（下書き生成済みだが「この内容で保存」未実行＝`completed:false`）で離脱した場合は、`content` が既に入っているため**編集画面へ**再開する（生成後はマス目編集フェーズとみなす）。ウィザード再開はStep0-3の選択段階（本文未生成）に限られる。

本文はウィザードでも編集画面でも `content` に一元管理し、`wizardState` には本文を持たせない（重複回避）。

## 3. API 変更

### POST /api/documents（`api/documents/route.ts`）
- 既存の作成（`status:"draft"`）を活用。**`wizardState` を受理して保存**し、`initialContent`（未指定なら `""`）を `content` に入れる。
- 早期作成の呼び出し: 志望校・タイプ確定時に `content:""`, `wizardState:{currentStep, frameworkType, selectedActivityIds, targetWordCount, completed:false}` で作成。
- 認証・userId=uid は既存踏襲。

### PUT /api/documents/[id]（`api/documents/[id]/route.ts`）
- 現状 `{content}` のみ受理 → **`content`・`wizardState`・書類の基本項目（`type`/`universityId`/`facultyId`/`universityName`/`facultyName`/`targetWordCount`/`title`）の部分更新**を受理（渡されたフィールドのみ merge、`updatedAt` 更新）。
  - 理由: 早期作成後にウィザードで**志望校やタイプを変更（戻る操作）**した場合、これら top-level フィールドも更新する必要があるため。フレームワークは `wizardState.frameworkType` で保持。
  - 受理フィールドはホワイトリストで限定し、`userId`/`createdAt`/`review`/`versions` 等はクライアントから更新させない（改ざん防止）。
- 所有者チェック（`userId === uid`）は既存踏襲。
- 差し戻し（`review.state==="revision_requested"`）状態で `content` 更新時に `resubmitted` へ遷移する既存挙動は維持（自動保存も手動と同じ経路のため自然に維持）。

### DELETE /api/documents/[id]
- 既存 DELETE があれば流用。無ければ追加（認証＋所有者チェック）。「作成途中」下書きの破棄に使用。

## 4. クライアント実装

### 共通: 自動保存フック `src/hooks/useAutosave.ts`（新規）
```ts
/**
 * value の変更をデバウンスし saveFn を呼ぶ。手動flush・unmountクリーンアップ対応。
 * @returns { status: "idle"|"saving"|"saved"|"error", lastSavedAt, flush }
 */
export function useAutosave<T>(value: T, saveFn: (v: T) => Promise<void>, opts?: { delay?: number; enabled?: boolean }): {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
  flush: () => Promise<void>;
};
```
- delay 既定 1500ms。`enabled=false` の間は保存しない（早期作成前など）。
- 直近保存値と同一なら送信スキップ（無駄な書き込み防止）。
- ウィザードと編集画面の両方で使用（DRY）。

### ウィザード（`documents/new/page.tsx`）
- **旧挙動の置換**: ウィザード末尾の旧 `handleSave`（最終 `POST /api/documents` で一括作成）は**廃止**し、下記の「早期作成＋PUT自動保存」に置き換える。
- **早期作成（冪等）**: Step1→2（志望校確定）で `docId` 未取得のときのみ POST 作成 → `docId` を state 保持。**送信中フラグ**で二重POSTを防止（作成が完了するまで次のPOSTを発火させない）。作成後は `enabled=true`。
- **自動保存**: `frameworkType/selectedActivityIds/targetWordCount/step` をまとめた `wizardState` と、志望校/タイプ変更時は基本項目も、`useAutosave` で PUT 保存（＋ステップ遷移時・`beforeunload`時に flush）。手動「保存」ボタンも併置。
- **下書き生成**: `generate-draft` 成功時、生成本文を `content` として PUT 保存（`completed` はまだ false, Step4）。「この内容で保存」で `completed:true` にして `/student/documents/[id]` へ遷移。
- **再開**: `?resume=<docId>` で開くと GET `/api/documents/[id]` → `wizardState`・各選択・`currentStep` を復元して途中から再開。
- **保存インジケータ**: ヘッダに「保存中…／保存済み HH:MM／保存に失敗（自動再試行）」。

### 編集画面（`documents/[id]/page.tsx`）
- 手動 `handleSave` を残しつつ、`content` に `useAutosave`（PUT `{content}`, delay 1500ms）を追加。`beforeunload`・画面遷移で flush。
- 保存インジケータをウィザードと共通化。
- 差し戻し→`resubmitted` 自動遷移は既存 PUT 経路で維持。

### 一覧（`documents/page.tsx`）
- 各下書きカードのリンク先を §2 の再開判定で分岐。「作成途中」バッジ（`content` 空 && `wizardState.completed===false`）を表示。
- 「作成途中」カードに**破棄アクション**（DELETE）。放置された空Documentを片付け可能に。

## 5. エッジケース・非機能

- **並行**: シングルユーザー last-write-wins（`updatedAt`）。複数タブは後勝ち（衝突解決はスコープ外）。
- **早期作成の放置**: Step2で離脱＝空Document残存 → 一覧で「作成途中」表示＋破棄可能なので許容。
- **保存失敗**: インジケータを「保存に失敗（自動再試行）」にしローカル state 保持。次のデバウンス/手動で再送。
- **離脱時フラッシュ**: ルート遷移では通常の `flush()`（await PUT）。`beforeunload` は認証ヘッダ付きで送るため **keepalive fetch**（`authFetch` 相当に `keepalive:true`）を用いる（`sendBeacon` は Authorization ヘッダを付けにくいため不採用）。
- **多重送信防止**: デバウンスタイマを unmount でクリア。直近保存値と同一ならスキップ。
- **バージョン**: 自動保存で `versions[]` を増やさない（`content`＋`updatedAt` のみ）。バージョン追加は既存の明示的タイミング（レビュー実行等）のみ。
- **セキュリティ**: POST/PUT/GET/DELETE すべて認証必須＋所有者（`userId===uid`）チェック（既存踏襲、body の id を鵜呑みにしない）。
- **書き込み量**: デバウンス 1.5s ＋ 同値スキップ ＋ バージョン非増加で Firestore 書き込みを抑制。
- **インデックス**: 新規不要（一覧は既存 userId クエリのまま）。

## 6. ファイル構成（新規/変更）

| ファイル | 役割 | 種別 |
|----------|------|------|
| `src/lib/types/document.ts` | `DocumentWizardState` 追加、`Document`/`DocumentCreateRequest` 拡張 | 変更 |
| `src/hooks/useAutosave.ts` | デバウンス自動保存フック | 新規 |
| `src/app/api/documents/route.ts` | POST で `wizardState` 受理・保存 | 変更 |
| `src/app/api/documents/[id]/route.ts` | PUT で `content`/`wizardState` 部分更新受理、DELETE（無ければ追加） | 変更 |
| `src/app/student/documents/new/page.tsx` | 早期作成・自動保存・`?resume`復元・インジケータ | 変更 |
| `src/app/student/documents/[id]/page.tsx` | 本文自動保存・インジケータ | 変更 |
| `src/app/student/documents/page.tsx` | 再開判定でリンク分岐・「作成途中」バッジ・破棄 | 変更 |

## 7. 未解決点（実装計画で確定）
- 保存インジケータの正確なUI（既存デザインシステムに合わせる）。
- DELETE ルートの既存有無（`api/documents/[id]/route.ts` に DELETE があるか実装時に確認。無ければ追加）と、一覧の破棄確認ダイアログの実装。
- `useAutosave` の `beforeunload` keepalive fetch が全対象ブラウザ（iOS Safari 等）で確実に飛ぶかの実機確認。
- 仕様として明示（対応不要）: ウィザードのStep0-1のごく初期（志望校未確定）に離脱した場合はDocument化しないため復元対象外。

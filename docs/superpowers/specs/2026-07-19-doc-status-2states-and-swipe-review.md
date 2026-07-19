# 出願書類: ステータス2択化 + AI添削スワイプカード 設計書

作成日: 2026-07-19
対象: 出願書類エディタ `src/app/student/documents/[id]/page.tsx` ほか

## A. ステータスを2択（下書き/完成）に簡素化

### 背景・決定
現在 `DocumentStatus` は draft/in_review/reviewed/final の4状態。ただし管理者のレビュー（承認/差し戻し）は別軸 `DocumentReview`(approved/revision_requested/resubmitted) で動いており、「レビュー中/レビュー済み」ステータスは役割が重複・冗長。生徒側は **下書き / 完成 の2択**に簡素化する（ユーザー承認済み）。**データ移行はしない**（旧値は残し、UI/ロジックが2状態として扱う）。管理者レビュー軸は維持。

### 設計
- **型**: `DocumentStatus` の union は現状維持（後方互換。旧データの in_review/reviewed を型エラーにしない）。
- **表示ヘルパー**（`src/lib/types/document.ts` に追加）:
  ```ts
  /** 2状態表示ラベル: draft→下書き / それ以外→完成（旧 in_review/reviewed も完成扱い）。 */
  export function documentStatusLabel2(status: DocumentStatus): string {
    return status === "draft" ? "下書き" : "完成";
  }
  /** 2状態判定: 完成（＝下書きでない）か。 */
  export function isDocumentComplete(status: DocumentStatus): boolean {
    return status !== "draft";
  }
  ```
- **エディタのステータス選択**（`[id]/page.tsx`）: SelectItem を **draft(下書き)・final(完成) の2つだけ**にする。SelectValue 表示は `documentStatusLabel2(status)`。
- **提出ソフト警告ゲート**: 現在 draft→in_review で AIっぽさ警告を出しているのを **draft→final** に変更（＝「完成」にする時に警告）。
- **表示（バッジ/バリアント）の2状態化**: 以下の表示箇所で、4値ラベルの代わりに `documentStatusLabel2` を使い、バリアントは draft=outline / それ以外=default に:
  - `[id]/page.tsx` ヘッダーのステータスBadge / STATUS_VARIANT
  - `documents/page.tsx` の STATUS_VARIANT・一覧Badge、`deleteLabels`（提出済み判定は `isDocumentComplete`）
  - `documents/checklist/page.tsx` の STATUS_VARIANT/STATUS_ICON
  - `components/admin/DocumentsSection.tsx` の STATUS_CONFIG（表示を2状態に）
- **完成カウント**（`isDocumentComplete` に統一）:
  - `documents/page.tsx` の completionRate（`status !== "draft"` で完成扱い）
  - `documents/checklist/page.tsx` の完成判定
  - `api/admin/students/route.ts` の完成カウント
  - （レポートの `documentSummary.completed` は `status==="final"` のままで可。新規は final のみ完成なので整合。ただし旧 in_review を完成に寄せるなら `!== "draft"` に統一してもよい→今回は `!== "draft"` に統一して一貫させる）
- **管理者通知/締切アラート**（`api/admin/alerts/route.ts`）: `document_submitted` は `status !== "draft"` 判定、締切除外は `status === "final"`。→ これらは現状のままで2状態でも成立（変更不要）。ただし締切除外を「完成なら除外」に合わせるため `isDocumentComplete` 相当（`!== "draft"`）に寄せてもよい（任意・今回は現状維持で可）。

### スコープ外
- Firestore の既存データ移行（旧 in_review/reviewed のまま。表示・ロジックで2状態化）。
- 管理者レビュー軸（approved/差し戻し）の変更。
- essay/homework など**別enumの reviewed/submitted**（DocumentStatusと無関係。触らない）。

## B. AI添削をモバイルで左スライドカード化

### 背景・決定
モバイルは「エディタ / AI添削」の**タブ切替**で、AI添削を見るとエディタが隠れる。書きながら覗きたい要望に対応し、**左端から出るスワイプ式スライドカード**にする（ユーザー承認済み・向きはA案）。

### 設計
- **PC（`hidden lg:grid` の2カラム）は現状維持**（エディタ＋ReviewPanel横並び）。
- **モバイル（`lg:hidden`）**:
  - `SegmentControl` のタブ切替を**廃止**し、**エディタを常に全幅表示**。
  - AI添削＋AIっぽさ＋バージョン履歴（＝既存 `ReviewPanel`）を、**左端から出るオーバーレイ・スライドカード**に格納。
  - **左端に縦長のハンドル**（例「AI ▸」/ Sparklesアイコン、`lg:hidden`、画面左端に固定）。
  - 開閉インタラクション（framer-motion）:
    - ハンドルを**タップ**、または**右へスワイプ（ドラッグ）**でカードが左から出る（`x: -100% → 0`）。
    - カードを**左へスワイプ**、**背景（バックドロップ）タップ**、または**ハンドル/閉じるボタン**で左へ隠す。
    - `motion.div` の `drag="x"` ＋ `onDragEnd` の offset/velocity 閾値でスナップ開閉。
  - カードは全高・幅 ~85%（`max-w-sm`）、影・右角丸、`z-50`。開いている間は半透明バックドロップ（`z-40`、タップで閉じる）。カード内は既存 `ReviewPanel` をそのまま描画（props据え置き）。
  - `reviewOpen` state で制御。既存の `mobileTab` state は削除。
- **アクセシビリティ/フォールバック**: スワイプできなくてもハンドルのタップで開閉可能。閉じるボタン（×）もカード内に置く。

### スコープ外
- PC 側のレイアウト変更。
- スワイプの高度なエッジ検出（ハンドルタップ＋ドラッグ開閉で十分）。

## 影響ファイル
- `src/lib/types/document.ts`（A: ヘルパー2つ追加）
- `src/app/student/documents/[id]/page.tsx`（A: Select2択・ゲート・表示 / B: モバイルをスワイプカード化）
- `src/app/student/documents/page.tsx`（A: 表示・完成カウント・deleteLabels）
- `src/app/student/documents/checklist/page.tsx`（A: 表示・完成判定）
- `src/components/admin/DocumentsSection.tsx`（A: STATUS_CONFIG 2状態）
- `src/app/api/admin/students/route.ts`（A: 完成カウント）

## 検証基準
- エディタのステータス選択が「下書き/完成」の2択。旧 in_review/reviewed の書類は「完成」表示。完成にする時にAIっぽさ警告。
- 一覧/チェックリスト/管理者一覧/完成率が2状態で正しく集計・表示。旧データも壊れない。
- モバイル: エディタ常時全幅＋左ハンドル→スワイプ/タップでAI添削カードが出入りし、書きながら覗ける。PCは横並び現状維持。
- `npm run build` パス、対象ファイル eslint クリーン。

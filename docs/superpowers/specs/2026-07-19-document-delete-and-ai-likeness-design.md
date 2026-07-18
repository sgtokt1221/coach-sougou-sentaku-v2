# 出願書類: 削除ボタン一般化 + AIっぽさチェッカー 設計書

作成日: 2026-07-19
対象: Coach v2 (CoachFor総合型選抜) `src/app/student/documents/` 周辺

## 1. 背景と目的

出願書類（志望理由書・自己推薦書 等）の下書き機能に2つの課題がある。

1. **削除ボタンが一部の書類にしか出ない。** 現状、削除（破棄）ボタンは「作成ウィザードを途中でやめた書類」にのみ表示される。本文が入った不要な書類を生徒がUIから削除できない。
2. **AI生成に頼った下書きをそのまま提出できてしまう。** 総合型選抜では自分の言葉・体験が評価される。AIっぽい文章のまま提出されるのを防ぎ、人間らしく直してから提出する導線がない。

本設計は (A) 削除ボタンの一般化、(B) AIっぽさチェッカーの追加、(C) 提出時のソフト警告ゲート、を扱う。

## 2. 現状の把握（調査結果）

### 削除ボタンの表示条件
`src/app/student/documents/page.tsx:47`
```js
const isWizardIncomplete = (d) =>
  d.content === "" && d.wizardState !== undefined && d.wizardState.completed === false;
```
この3条件すべてを満たす書類だけに削除（破棄）アイコンが出る（`page.tsx:230` のガード）。`status`（draft/in_review/…）や所有者チェックは表示条件に**使われていない**。詳細ページ `[id]/page.tsx` に削除ボタンは存在しない。

### 削除API
`src/app/api/documents/[id]/route.ts` の `DELETE`（162行〜）は `requireFeature("documentEditor")` + `requireRole(["student"])` + 所有者チェックのみで、**ステータス問わず所有者なら削除可能**。制限はUI側の `isWizardIncomplete` ガードだけ。→ API変更は不要。

### 提出（ステータス変更）
`src/app/student/documents/[id]/page.tsx:376-386` のステータスSelectで draft → in_review へ変更するのが実質の「提出」。専用の提出ボタンはない。

### AI添削の既存パターン（踏襲対象）
- API: `src/app/api/documents/[id]/review/route.ts`（`claude-sonnet-4-6`、`requireFeature` + `requireRole`）
- UI: `[id]/page.tsx` の `ReviewPanel`（手動実行ボタン→スコアバー→総合評価→改善点）
- 管理者表示: `src/components/admin/DocumentsSection.tsx` に `aiScore`（AP/構成/独自性）表示あり

## 3. 決定事項（ユーザー承認済み）

- 削除: **全書類に削除を追加**（作成途中に限らない）
- 判定方式: **Claude で判定**（外部AI検出器は日本語精度が低く不採用）
- 提出ゲート: **ソフト警告**（ブロックせず、警告の上で本人判断で提出可）

## 4. 設計

### A. 削除ボタンの一般化

対象: `src/app/student/documents/page.tsx`

- 表示ガードから `isWizardIncomplete(doc) &&` を外し、**所有者の全書類カードにゴミ箱アイコンを表示**する。
- 既存の2段階インライン確認UI（アイコン→「○○しますか？」→実行/キャンセル、`page.tsx:230-275`）をそのまま流用する。
- 文言を状態で出し分ける:
  - 作成途中（`isWizardIncomplete === true`）: 「破棄」
  - それ以外: 「削除」
  - `status` が `in_review` / `reviewed` / `final` の書類は、確認文に「提出済みの書類です。削除すると元に戻せません」を追記して誤削除を抑止する。
- `isWizardIncomplete` 関数自体は**残す**（バッジ表示・カードのリンク先切替 `page.tsx:51-52,200-202` で引き続き使用）。削除ボタンの表示ガードからのみ切り離す。
- 削除実行は既存 `handleDiscard`（`page.tsx:58-73`、DELETE→SWRキャッシュ除外）をそのまま使う。関数名は汎用化のため `handleDelete` にリネームしてよい（呼び出し箇所も追従）。

APIは変更しない。

### B. AIっぽさチェッカー（Claude判定）

#### データモデル
`src/lib/types/document.ts` に追加:
```ts
export type DocumentAiLikenessLevel = "low" | "medium" | "high";

export interface DocumentAiLikeness {
  /** 0-100。高いほどAIっぽい */
  score: number;
  /** score から導出: low 0-39 / medium 40-69 / high 70-100 */
  level: DocumentAiLikenessLevel;
  /** AIっぽいと判定した根拠（生徒向けの平易な日本語） */
  reasons: string[];
  /** 人間らしくする具体的な直し方（どの一文をどう直すか） */
  suggestions: string[];
  checkedAt: string;
  /** 判定時の本文文字数。現在の wordCount と異なれば「再チェック推奨」を出す */
  checkedWordCount: number;
}
```
`Document` インターフェースに `aiLikeness?: DocumentAiLikeness` を追加する。

`level` は score から機械的に導出するヘルパー `aiLikenessLevel(score): DocumentAiLikenessLevel` を用意し、API側で付与する。

#### プロンプト
`src/lib/ai/prompts/ai-likeness.ts` を新規作成。総合型選抜の出願書類向けに、以下の観点で 0-100 のAIっぽさスコアと根拠・直し方を JSON で返させる:
- 自分の具体的な体験・エピソードの有無（固有名詞・数値・固有の状況の具体性）
- テンプレ的な言い回し・汎用フレーズの多用
- バズワード/抽象語（「多角的な視点」「深く学びたい」等）への依存
- 文のリズム・長さの均一さ（機械的な整いすぎ）
- 一人称の実感・当事者性の薄さ

出力は既存プロンプト（`document.ts` 等）と同様に**厳密なJSON**を要求し、パース失敗時はエラーを返す（沈黙フォールバックしない）。

#### API
`POST /api/documents/[id]/ai-check` を新規作成。`[id]/review/route.ts` を雛形にする。
- ガード: `requireFeature(request, "documentEditor")` → `requireRole(request, ["student"])` → 所有者チェック
- モデル: `claude-sonnet-4-6`（既存踏襲）
- 本文が空なら 400
- Claude 応答をパースし、`aiLikenessLevel(score)` で level を付与、`checkedAt`（サーバ時刻ISO）・`checkedWordCount` を付与
- 結果を Firestore の当該ドキュメント `aiLikeness` フィールドに保存し、レスポンスでも返す
- `ANTHROPIC_API_KEY` 未設定時は 503（既存 route と同様）

#### UI（生徒）
`src/app/student/documents/[id]/page.tsx` の `ReviewPanel` に「AIっぽさチェック」カードを「AI添削」カードの隣（下）に追加:
- 手動実行ボタン「AIっぽさをチェック」（`contentEmpty` 時は無効、実行中は「チェック中…」）
- 結果表示: スコアのゲージ/バー（level で色分け: low=緑 / medium=黄 / high=赤）、level ラベル（例: 「人間らしい / 要改善 / AIっぽい」）
- 「AIっぽいと判定した理由」リスト（`reasons`）
- 「人間らしくする直し方」リスト（`suggestions`）
- `aiLikeness.checkedWordCount !== 現在の wordCount` のとき「本文が変わりました。再チェックしてください」を表示

#### UI（管理者）
`src/components/admin/DocumentsSection.tsx` に、既存 `aiScore` 表示の近くで `aiLikeness`（score/level）を表示できるようにする。管理者API（`src/app/api/admin/students/[id]/documents/route.ts` 等）のレスポンスに `aiLikeness` を含める。

### C. 提出時ソフト警告ゲート

対象: `src/app/student/documents/[id]/page.tsx` のステータス変更ハンドラ。

- **draft → in_review**（提出）に変更した瞬間だけ判定する。他の遷移は対象外。
- 次のいずれかで警告ダイアログを出す:
  - `aiLikeness` が未実施（未チェックで提出しようとしている）
  - `aiLikeness.score >= AI_LIKENESS_SUBMIT_THRESHOLD`（初期値 60、定数で `src/lib/` 側に定義し調整可能に）
  - `aiLikeness.checkedWordCount !== wordCount`（チェック後に本文が変わっている＝判定が古い）
- ダイアログ文言（例）: 「AIっぽさが高いまま/未チェックです。自分の体験や言葉を加えてから提出することを推奨します。」
- ボタンは2択: **「このまま提出」**（ステータス変更を続行）/ **「戻って直す」**（ステータス変更をキャンセルし draft のまま）。
- ハードブロックはしない。閾値・帯の切り方は `level` 導出（medium 下限=40, high 下限=70）と整合させ、提出ゲートは medium 帯に入る 60 を初期値とする。

## 5. スコープ外（YAGNI）

- 外部AI検出APIの利用
- AIっぽさスコアの履歴・推移グラフ（今回は最新1件のみ保持）
- 管理者側からの再チェック実行や強制提出オーバーライド（今回はソフト警告のみ）
- 削除の論理削除（ゴミ箱・復元）。今回は既存の物理削除のまま

## 6. 影響ファイル一覧

新規:
- `src/app/api/documents/[id]/ai-check/route.ts`
- `src/lib/ai/prompts/ai-likeness.ts`

変更:
- `src/lib/types/document.ts`（型追加 + `aiLikenessLevel` ヘルパー）
- `src/app/student/documents/page.tsx`（削除ボタン一般化）
- `src/app/student/documents/[id]/page.tsx`（AIっぽさカード + 提出ゲート）
- `src/components/admin/DocumentsSection.tsx`（`aiLikeness` 表示）
- `src/app/api/admin/students/[id]/documents/route.ts` ほか管理者documents API（`aiLikeness` をレスポンスに含める）

## 7. 検証基準

- 削除: 本文入りの draft / in_review 書類のカードに削除ボタンが出て、確認後に一覧から消える。提出済み書類では警告文が出る。
- AIチェック: 明らかにAI的な定型文で高スコア（high）、具体的な体験入りの文で低スコア（low）に寄る。本文編集後は「再チェック推奨」が出る。
- 提出ゲート: 未チェック/高スコアで draft→in_review にすると警告ダイアログが出る。「このまま提出」で in_review になる。「戻って直す」で draft のまま。
- `npm run build` がエラーなく通る。

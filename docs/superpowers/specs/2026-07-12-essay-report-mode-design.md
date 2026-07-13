# 添削レポートモード 設計書

作成日: 2026-07-12
対象: 小論文添削（essay）機能に「レポートモード」を追加（`src/app/student/essay/*`, `src/app/api/essay/*`, `src/lib/essay/review-core.ts`, `src/data/*`, `src/lib/types/essay.ts`）

## 1. 目的とゴール

総合型選抜では「講義を受けて、それについてレポートを書く」出題が多い。講義動画は制作コストが高いため、**約1万字の学部別長文（課題文）を読んでレポートを書く**形式で代替する。UIは既存の添削を再利用し、結果は小論文添削の見せ方に準じつつ**レポート独自の観点**を追加する。

### スコープ（ユーザー決定）
1. 添削ページ内に**レポートモード**を追加（専用ページではなくモード切替）。
2. 課題文は**キュレート優先＋AI補完**。ただし **AIに実行時生成させず、キュレート課題文を本設計で人手（Claudeが下書き）で作成して同梱**する。AI生成APIは未整備fieldのフォールバックとして**後回し可**。
3. 採点は**5観点維持＋レポート専用フィードバックブロック追加**（見せ方は小論文添削に準じる）。

### スコープ外
- 講義動画の制作。
- レポート専用のスコア軸追加（5観点は据え置き、レポート観点は定性フィードバックのみ）。
- AI課題文生成の作り込み（フォールバックとして最小 or 後回し）。

### 現状（コードベース確認済み）
- 共通レビューエンジン `src/lib/essay/review-core.ts`（`reviewEssayCore`）: `questionType`/`sourceText`/`lectureInfo` を受け、5観点スコア＋`EssayFeedback` を返す。`questionType!=="essay"` のとき `sourceText` をプロンプトへ差し込む下地あり。
- `EssayReviewRequest.questionType`: `"essay"|"english-reading"|"data-analysis"|"mixed"|"lecture"`。`sourceText?:string`。
- `EssayScores`（5観点: structure/logic/expression/apAlignment/originality, total 0-50）、`EssayFeedback`（overall/goodPoints/improvements/topicInsights/quantitativeAnalysis/languageCorrections 等）。
- `sourceType`: `"manual"|"homework"|"skill_check"|"lecture"`。
- `essay/new/page.tsx`: `inputMode:"text"|"image"|"dictation"`。テキスト入力・文字数・提出・下書き保存あり。
- お題データ `src/data/essay-themes.ts`（`EssayTheme`, field 9系統: society/economy/education/environment/international/law/medical/politics/technology）。既存の `essay/lecture`（小論文講座, `essay-lectures`）は別概念（短い演習）。

## 2. データモデル

### questionType / sourceType 追加（`src/lib/types/essay.ts`）
- `EssayReviewRequest.questionType` に `"report"` を追加。
- `Essay.sourceType` に `"report"` を追加（履歴で区別）。
- 提出時: `questionType:"report"`, `sourceType:"report"`, `sourceText:<課題文body>` を渡す。入力方法は `inputMode:"text"` を流用。

### レポート専用フィードバック（5観点は不変）
```ts
/** レポート課題（課題文を読んで書く）専用の講評。questionType="report" のときのみ生成。 */
export interface ReportInsights {
  sourceComprehension: string;      // 課題文の理解度・要点把握
  summaryAccuracy: string;          // 要約・言い換えの正確さ
  citationAppropriateness: string;  // 引用/参照の妥当性
  analysisDepth: string;            // 自分の考察の深さ・独自性
  sourceConnection: string;         // 課題文と自論の接続
  misreadings: string[];            // 課題文の誤読・事実誤認の指摘
}

export interface EssayFeedback {
  // ...既存...
  reportInsights?: ReportInsights;  // report のときのみ
}
```

### 課題文データ（`src/data/essay-report-materials.ts`）
```ts
export interface ReportMaterial {
  id: string;
  field: string;            // essay-themes と同じ 9系統
  fieldLabel: string;
  title: string;
  body: string;             // 約1万字の課題文本文（人手作成）
  focusPoints: string[];    // レポートで問う観点（AI採点のヒント）
  recommendedWordLimit: number; // 推奨レポート字数（例: 1200）
  difficulty: 1 | 2 | 3;
}
export const reportMaterials: ReportMaterial[];
export function getReportMaterialsByField(field: string): ReportMaterial[];
export function getReportMaterialById(id: string): ReportMaterial | undefined;
```
- **本設計で Claude が課題文を書き起こして同梱**する。初期は主要fieldに各1本（実装計画で本数確定。最低3〜9本）。`validate:data` に本数・字数（例: 8,000〜12,000字）・field整合の検証を追加。

## 3. コンテンツ源（キュレート優先・AI補完は後回し）

- `GET /api/essay/report/materials?field=<field>`: キュレートから field で絞って一覧（id/title/difficulty/recommendedWordLimit）を返す。
- `GET /api/essay/report/materials/[id]`: 1件の全文（body含む）を返す。
- **AI生成フォールバック**は本リリースでは実装しない。キュレートに課題文が無い field は一覧で **「準備中」表示**とし、選択不可にする（提出まで進ませない）。将来 `POST /api/essay/report/generate` を追加余地として設計にのみ残す。
- 認証必須（`verifyAuthToken` 等、既存 essay API の流儀に合わせる）。課題文は機密ではないが、認可は既存に揃える。

## 4. クライアント（レポートモードUI）

`src/app/student/essay/new/page.tsx` にモードを追加。**巨大ファイルのため追加は外科的に**（新規サブコンポーネントに切り出し、page からは条件分岐で差し込む）。

- 上部に「通常の小論文 / レポート（課題文を読んで書く）」のモード切替を追加。
- レポート選択時:
  1. field 選択 → `GET /api/essay/report/materials?field=` で課題文一覧、1件選択。
  2. `GET /api/essay/report/materials/[id]` で全文取得し、**スクロール可能な読解ペイン**（新規コンポーネント `ReportSourcePane`）に表示。
  3. 既存のテキスト入力（`inputMode:"text"`）でレポート執筆。読解ペインと入力は縦積み or 左右分割（モバイルは縦積み＋折りたたみ）。
  4. 提出時、review に `questionType:"report"`, `sourceType:"report"`, `sourceText:<body>`, `topic:<title>`, `wordLimit:<recommendedWordLimit>`, `lectureInfo:<focusPoints結合>` を渡す。
- **submit 経路**: 既存の提出（`essay/new` → `POST /api/essay/review`）は既に `sourceText`/`questionType` を運ぶ下地がある（お題・過去問経路で使用）。レポートモードでは選択した課題文の `body` を `sourceText` に、`title` を `topic` に載せて同じ経路で送る（新経路は作らない）。選択中の課題文（id/title/body/focusPoints/recommendedWordLimit）を state に保持し提出時に参照する。
- **既存再利用**: 入力エリア・文字数・提出は現行UIを流用。読解ペインのみ新規。通常モードの挙動は不変。**下書き保存（essayDrafts）はレポート非対応（本リリース）**。

## 5. レビューエンジン（reportInsights生成）

`src/lib/essay/review-core.ts` に report 分岐を追加。
- `questionType:"report"` のとき、プロンプトに「与えた課題文（sourceText）に対するレポートとして評価。5観点スコアに加え、課題文理解/要約/引用/考察/接続/誤読を講評し JSON の `reportInsights` に格納」を追加。
- 応答スキーマに `reportInsights`（6項目、`misreadings` は配列）を含める。パースして `feedback.reportInsights` に格納。
- 5観点スコア・既存 `feedback` 生成は据え置き（レポート文脈で解釈するようプロンプト補足）。`questionType!=="report"` では `reportInsights` を生成しない（既存挙動不変）。
- **sourceText ラベルの一般化**: 現状 review-core は `sourceText` を `【出題資料(英文)】` ラベルでプロンプトに差し込む（english-reading 前提）。report では `【課題文】` 等の日本語ラベルに切り替える（questionType で分岐、既存 english-reading の表記は変えない）。
- **トークン/コスト**: 日本語1万字 ≒ 約1.5万トークン（入力）。Claude の入力上限に対して十分収まるため要約せず全文投入する。出力 `max_tokens` は reportInsights 6項目ぶん既存より余裕を持たせる（実装計画で数値確定）。

## 6. 結果表示

- 結果UI（`essay/[id]` 詳細・結果コンポーネント）に、`feedback.reportInsights` があるときのみ **「レポート観点」ブロック**を追加（課題文理解度/要約の正確さ/引用の妥当性/考察の深さ/課題文との接続/誤読の指摘）。小論文添削に準じたカード/セクションで表示。
- **結果描画の具体ファイルは実装計画で特定**する（`src/app/student/essay/[id]/page.tsx` および `feedback` を描画する結果コンポーネント群を grep で洗い出し、`goodPoints`/`improvements` 等を描く既存ブロックの隣に追加）。既存フィードバック描画箇所と同じスタイルに合わせる。
- 5観点レーダー・総評・良い点/改善点・言語添削・定量分析など**既存の見せ方は不変**。
- 履歴一覧で `sourceType:"report"` を「レポート」バッジで区別（既存の sourceType 表示に倣う）。

## 7. ファイル構成（新規/変更）

| ファイル | 役割 | 種別 |
|----------|------|------|
| `src/lib/types/essay.ts` | `questionType`/`sourceType` に report、`ReportInsights`＋`EssayFeedback.reportInsights` | 変更 |
| `src/data/essay-report-materials.ts` | 課題文データ＋アクセサ（本文は人手作成） | 新規 |
| `scripts/validate-report-materials.ts` | 課題文の本数・字数・field 検証（validate:data に連結） | 新規 |
| `src/app/api/essay/report/materials/route.ts` | field で課題文一覧 | 新規 |
| `src/app/api/essay/report/materials/[id]/route.ts` | 課題文1件全文 | 新規 |
| `src/lib/essay/review-core.ts` | report 分岐＋reportInsights 生成・パース | 変更 |
| `src/app/api/essay/review/route.ts` | report の questionType/sourceType 受け渡し（必要なら） | 変更 |
| `src/components/essay/ReportSourcePane.tsx` | 課題文読解ペイン | 新規 |
| `src/app/student/essay/new/page.tsx` | レポートモード切替・課題文選択・提出配線 | 変更 |
| 結果表示コンポーネント（`essay/[id]` 等） | reportInsights ブロック追加 | 変更 |
| 履歴一覧 | report バッジ | 変更 |

## 8. 未解決点（実装計画で確定）
- 課題文の本数と対象field（最低3〜9本、実装計画で確定。Claude が本文を執筆）。
- 1万字 sourceText 投入時のトークン/コスト実測と `max_tokens` 調整。
- 読解ペインと入力の配置（縦積み/左右分割）とモバイル対応の詳細。
- 下書き保存（essayDrafts）をレポートにも対応させるか（本リリースは任意）。
- AI生成フォールバック（`/api/essay/report/generate`）は将来対応。

# 小論文添削 新規提出画面（essay/new）Step1 UI整理 設計書

作成日: 2026-07-13
対象: `src/app/student/essay/new/page.tsx`（Step 1 のレイアウト）

## 1. 目的とゴール

新規提出画面 Step 1 の「ごちゃごちゃ感・統一感のなさ」を解消する。散らばった自作トグル（通常/レポート、提出方法）を上部タブと同じ `SegmentControl` に統一し、AP参照先選択・テーマ入力と合わせて**1枚の「情報入力」カード**に集約する。ヒーローは維持。

### スコープ（ユーザー合意）
1. **切替UIの統一**: 「通常/レポート」「提出方法（テキスト/画像/音読）」の自作トグル（`flex rounded-lg border p-1` 手製ボックス）を `SegmentControl` に置換。
2. **1カードに集約**: 上記切替＋AP参照先選択＋テーマ入力を「情報入力」カードにラベル付き縦セクションで統合。
3. **declutter**: 浮いたボックスを廃し余白・境界を整理。
4. **維持**: `FeatureHero`、上部タブ（新規提出/添削履歴 の `SegmentControl`）、`StepIndicator`、機能はすべて維持。

### スコープ外
- Step 2 以降（テキスト入力/画像アップロード/OCR確認/音読）のレイアウト変更。
- 機能の追加・削除（レポートモード・過去問・再トライ・テーマ練習・下書き復元の挙動は不変）。
- ヒーロー（`FeatureHero`）の変更。

## 2. 現状（コードベース確認済み）

`essay/new/page.tsx`（2169行）Step 1（`step === 1`）の構成:
- `FeatureHero`（維持）→ 戻るボタン → `SegmentControl`（新規提出/添削履歴, L1008）→ `StepIndicator`。
- `SelfAnalysisGuardCard` / `WeaknessReminderCard`（リマインダー）。
- 条件付き情報カード: 再トライ（retryParent）/ 過去問（PastQuestionTopicCard）/ テーマ（selectedTheme）。
- **通常/レポート トグル**（L1196-1223, 手製 `flex rounded-lg border p-1`）— `!pastQuestion && !retryParent && !selectedTheme` のみ表示。
- **提出方法トグル**（inputMode: text/image/dictation, L1226+, 手製ボックス）— `!reportMode` のみ表示。
- レポート課題文選択カード（L1257-1337, reportMode 時）。
- メイン入力カード:
  - `(pastQuestion || retryParent)` の場合（L1340-1441）: 志望校は自動設定表示＋書き方向。
  - それ以外（通常, L1442-1541+）: 「アドミッションポリシー参照先を選択してテーマを入力」カード＝AP参照先選択（`resolved` 1校なら固定 / 複数なら選択グリッド）＋「他の大学から選ぶ」（`UniversityPicker`）＋テーマ入力（`topic`）＋書き方向（画像/音読時）。
- 既存の再利用可能コンポーネント: `SegmentControl`（props: `value`/`onChange`/`options:{id,label}[]`/`fullWidth`/`size`/`defaultAccent`/`className`）。

## 3. 新レイアウト（Step 1）

上から:
1. `FeatureHero`（不変）
2. 戻るボタン ＋（Step1以外の）タイトル（不変）
3. 上部タブ `SegmentControl`（新規提出/添削履歴）（不変）
4. `StepIndicator`（不変）
5. リマインダー（`SelfAnalysisGuardCard` / `WeaknessReminderCard`）（不変, 位置は上部にまとめる）
6. 条件付き情報カード（再トライ/過去問/テーマ）（不変）
7. **「情報入力」カード（統合）**:
   - **小論文の種類**（`!pastQuestion && !retryParent && !selectedTheme` 時のみ）: `SegmentControl`（options: 通常の小論文 / レポート）。← 旧 L1196-1223 の置換
   - **提出方法**（`!reportMode` 時のみ）: `SegmentControl`（options: テキスト / 画像 / 音読）。← 旧 inputMode トグルの置換
   - **アドミッションポリシー参照先**: 既存ロジック（1校固定表示 / 複数選択グリッド / 「他の大学から選ぶ」）をカード内セクションとして配置。過去問・再トライ時は自動設定の固定表示。
   - **テーマ**（`!selectedTheme && !pastQuestion && !reportMode` 時）: `topic` 入力（任意）。
   - **レポート課題文選択**（reportMode 時）: 分野選択＋課題文選択（旧 L1257-1337 を同カード内 or 直下のサブセクションに）。
   - **原稿の書き方向**（image/dictation 時）: 既存の縦/横トグル（`SegmentControl` に揃えてもよい）。
   - フッター: 「次へ」ボタン（既存のバリデーション `disabled` 条件を維持）。

要点:
- **すべての切替を `SegmentControl` に統一**して見た目を上部タブと揃える。
- **1カードに集約**（種類→提出方法→AP参照先→テーマ→(レポート課題文)→書き方向→次へ）。過去問/再トライ/テーマ経由は該当セクションを自動設定表示にする既存分岐を保つ。
- ラベルは `Label` で統一。セクション間は `space-y` で整える。

### 目標 JSX 骨子（Step 1 の情報入力カード）
```text
<Card>  // 情報入力カード（統合）
  <CardHeader><CardTitle>情報入力</CardTitle></CardHeader>
  <CardContent className="space-y-5">
    {種類}      // !pastQuestion && !retryParent && !selectedTheme のときのみ
      <Label>小論文の種類</Label>
      <SegmentControl value={reportMode?"report":"normal"} onChange={v=>handleToggleReportMode(v==="report")}
        options=[{id:"normal",label:"通常の小論文"},{id:"report",label:"レポート（課題文を読んで書く）"}] fullWidth />
    {提出方法}  // !reportMode のときのみ
      <Label>提出方法</Label>
      <SegmentControl value={inputMode} onChange={v=>setInputMode(v as "text"|"image"|"dictation")}
        options=[{id:"text",label:"テキスト"},{id:"image",label:"画像"},{id:"dictation",label:"手書き＋音読"}] fullWidth />
    {AP参照先}
      (pastQuestion||retryParent) ? 自動設定の固定表示(effectiveUni)
      : resolved.length===1 ? 1校固定表示
      : 選択グリッド + 「他の大学から選ぶ」(UniversityPicker)
    {テーマ}    // !selectedTheme && !pastQuestion && !reportMode
      <Label>テーマ<Badge>任意</Badge></Label> <Input value={topic} .../>
    {レポート課題文}  // reportMode のとき
      <Label>分野を選択</Label> 分野グリッド
      {reportField && (<Label>課題文を選択</Label> 課題文一覧)}
    {書き方向}  // inputMode==="image"||"dictation"
      <Label>原稿の書き方向</Label> SegmentControl(縦書き/横書き)
  </CardContent>
  <CardFooter or 末尾>「次へ」ボタン（既存 disabled 条件維持）</CardFooter>
</Card>
```
- この1カードが、既存の「(pastQuestion||retryParent) ? 自動設定カード : 通常入力カード」の**両方を内包**する。種類/提出方法/テーマの各セクションは既存の表示条件（`!pastQuestion && ...` 等）で出し分けるため、過去問/再トライ時は AP参照先の自動設定表示＋書き方向のみが出る（現状挙動と同じ）。
- **レポート課題文の配置**: 同じ情報入力カード内のセクションとして置く（reportMode 時、提出方法・テーマは非表示になり、代わりに分野/課題文選択が出る）。別カードにしない（集約の趣旨）。
- **書き方向も `SegmentControl` に統一**（縦書き/横書きの2択, fullWidth）。

## 4. 実装方針

- **単一ファイルの外科的リファクタ**。巨大ファイルのため**並列編集は禁止**、直列で1箇所ずつ。既存の state・ハンドラ（`inputMode`/`setInputMode`, `reportMode`/`handleToggleReportMode`, `selectedCompoundId`, `topic`, `writingDirection`, `resolved`, `handleSelectReportField`/`handleSelectReportMaterial` 等）は**変更しない**。JSX の構造だけ再配置する。
- `SegmentControl` を inputMode と 種類 に適用:
  - 種類: `value = reportMode ? "report" : "normal"`, `onChange = (v) => handleToggleReportMode(v === "report")`。
  - 提出方法: `value = inputMode`, `onChange = (v) => setInputMode(v as "text" | "image" | "dictation")`（`SegmentControl` の onChange は option の `id` 文字列を渡すため、`setInputMode` の型に合わせて **as キャスト**が必要。上部タブ `setActiveTab` は string 受けなので不要だった点に注意）。
  - 書き方向: `value = writingDirection`, `onChange = (v) => setWritingDirection(v as "vertical" | "horizontal")`。
  - `SegmentControl` は options 配列で **3択（text/image/dictation）にも対応**（`fullWidth size="sm"`）。`defaultAccent` は上部タブと揃える（blue 系 or 既定）。
- 条件分岐（`!pastQuestion && !retryParent && !selectedTheme` で種類トグル表示、`!reportMode` で提出方法表示 等）は**そのまま維持**し、カード内に移設。
- メイン入力カードの `(pastQuestion || retryParent) ? (自動設定) : (通常の選択)` 分岐は維持。統合カードはこの両分岐を内包する形にする（種類/提出方法トグルは通常時のみ表示なので自然に収まる）。
- 変更は Step 1 のレンダリング JSX に限定。Step 2 以降・ロジック・API は触らない。

## 5. 非機能・検証
- **機能不変**: レポートモード切替→課題文選択→提出、通常のテキスト/画像/音読提出、過去問・再トライ・テーマ・下書き復元、いずれも従来どおり動くこと。
- **検証**: `npx tsc --noEmit` PASS、`npx eslint`（当該ファイル）新規エラー増分ゼロ（既存デッドコードは規約により残す）。`npm run dev` で Step 1 を実機目視（種類/提出方法の切替、AP選択、テーマ、レポート、書き方向、次へ）。
- **アクセシビリティ**: ボタンの最小タップ領域（44px）を維持。`SegmentControl` は既存踏襲。
- **スタイル**: 既存のカラー/余白トークンに合わせ、絵文字不使用。

## 6. ファイル構成（変更）
| ファイル | 役割 | 種別 |
|----------|------|------|
| `src/app/student/essay/new/page.tsx` | Step 1 の切替統一・カード集約（JSX再配置のみ） | 変更 |

（新規コンポーネント切り出しは任意。行数が増えるなら Step1 入力カードを小コンポーネントに抽出してもよいが、まずは同ファイル内の再配置で最小差分を優先。）

## 7. 未解決点（実装時確認）
- （確定）書き方向トグルも `SegmentControl` に統一する。
- （確定）レポート課題文選択は「情報入力」カード内のセクションに統合する（別カードにしない）。
- リマインダーカード（自己分析/弱点）は現状位置を維持し余白のみ整える（折りたたみ化はスコープ外）。
- `SegmentControl` の実 props 名（`value`/`onChange`/`options`/`fullWidth`/`size`/`defaultAccent`）は L1008 の既存使用に厳密に合わせる（実装時にコンポーネント定義を確認）。

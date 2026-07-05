# ちょこ添削 設計書

- 日付: 2026-07-05
- 対象: Coach v2（総合型選抜）`coach-sougou-sentaku-v2`
- ステータス: Draft（レビュー待ち）

## 1. 背景・目的（Why）
フル添削（白紙から800字）は、離脱しかけの生徒には負荷が高い。「1段落だけなら書ける」という生徒を拾い、**志望学部テーマの完成本文のうち1段落だけを穴埋めさせる**ことで、
- 心理的ハードルを下げて継続・習慣づけにつなげる
- 前後段落を"お手本"として、良い構成・論理展開を体で覚える
- 学部テーマの**背景知識を、描きながら覚える**

を狙う。UIは通常添削と同様、**テキスト入力のみ**。

## 2. 全体方針
既存の「要約ドリル（summary-drill）」が構造的にほぼ同型（テキスト入力のみ／本文＋模範を持つ静的素材／3ステップUI）のため、これを下敷きにする。ちょこ添削は「入力対象を"要約"から"欠落段落の穴埋め"に変えた変種」。ルートは `/student/essay/choco`。

## 3. 非目標（Non-goals / v1で作らない）
- 管理画面からのAI一括生成ツール（v1は静的バンクを人手で用意。将来拡張）
- 画像アップロード／音読入力（テキストのみ）
- 5軸50点満点の本添削ルーブリック（1段落には過剰。3軸に絞る）

## 4. ユーザー体験（3ステップ）
1. **開始**: 生徒の志望学部に合う本文を1本ランダム抽選（該当なしは汎用にフォールバック）。「別の本文にする」ボタンで引き直し可。
2. **記入**: 本文全体を表示。**ランダムに選ばれた1段落だけ**が入力欄になり、その位置に役割ラベル（例:「ここは【根拠】の段落です」）を表示。`keyPoints`（背景知識）は伏せる＝挑戦。入力欄は既存 `ManuscriptEditor`（字数カウント付き、目安150〜250字）。
3. **結果**: 点数（3軸＋total）＋講評＋良かった点／もう一歩＋**赤ペン**（`RedPenText`）＋**模範段落＋この段落で押さえたい背景知識**＋次の一手1つ。

## 5. データモデル

### 5.1 本文バンク（静的データ、人手で用意）
`src/data/choco-passages/`（要約ドリルの `summary-passages/` と同型のディレクトリ構成）。

```ts
export interface ChocoPassage {
  id: string;
  facultyKey: string;      // 学部テーマ分類キー（summary-passages の faculty 分類に合わせる）
  themeTitle: string;      // 例「食料自給率と持続可能な農業」
  difficulty: "easy" | "normal" | "hard";
  wordCount: number;       // 本文合計字数（目安800前後）
  paragraphs: ChocoParagraph[]; // 4〜5段落
}

export interface ChocoParagraph {
  text: string;                                   // 模範（伏せたときの正解）
  role: "intro" | "claim" | "reason" | "counter" | "conclusion";
  keyPoints: string[];                            // 背景知識・押さえどころ（結果画面で開示）
}
```
- 配信時に `facultyKey` で候補を絞り、本文1本と**欠落段落インデックスをランダム**に決める。
- 欠落段落は全段落から一様ランダム（intro/conclusion も対象。将来必要なら role でバイアス可）。

### 5.2 結果の保存（Firestore）
`users/{uid}/chokoReviews/{reviewId}`（`essays` コレクションとは分離）。

```ts
export interface ChocoReview {
  id: string;
  userId: string;
  passageId: string;
  facultyKey: string;
  themeTitle: string;
  blankIndex: number;          // 伏せた段落index
  role: ChocoParagraph["role"];
  studentText: string;         // 生徒が書いた段落
  modelText: string;           // 模範段落
  keyPoints: string[];
  scores: {
    logic: number;             // 論理 0-10
    coherence: number;         // つながり(前後文脈適合) 0-10
    expression: number;        // 表現 0-10
    total: number;             // 0-50換算（rank用）= round((logic+coherence+expression)/30*50)
  };
  feedback: {
    overall: string;
    goodPoints: string[];
    improvements: string[];
    languageCorrections: LanguageCorrection[]; // 既存 essay.ts の型を再利用（赤ペン）
    weaknessTags: string[];    // 弱点DB反映用
    nextTip: string;
  };
  wordCount: number;
  submittedAt: string;         // ISO（rank集計の直近30日判定に使用）
  createdAt: string;
}
```

## 6. API
新規ルート `POST /api/essay/choco-review`。**`/api/essay/review` は通さない**（連動は必要分だけ明示的に呼ぶ）。

- 入力: `{ passageId, blankIndex, studentText }`（＋認証）。サーバー側で `passageId` から本文・伏せ段落の `role`/`keyPoints`/`modelText` を復元（クライアントから模範を送らせない）。
- 処理:
  1. `requireRole(["student"])` で認可、志望学部などは users から取得。
  2. 新規プロンプトで Claude（`reviewEssayCore` 相当の薄い呼び出し）を実行 → `{scores(3軸), feedback, weaknessTags}`。
  3. `scores.total` を 0-50 に換算。
  4. `users/{uid}/chokoReviews` に保存。
  5. **弱点DB**: `updateWeaknessRecords()`（既存）を等倍で呼ぶ（`weaknessTags` を渡す）。
  6. **ランク**: `refreshEssayAggregateCache()`（既存）を呼び再計算をトリガ（集計側は §7 で拡張）。
  7. **BigQuery**: `logEssaySubmission({ essay_type: "choco", ... })`（§7.3）。
- 出力: `ChocoReview`（結果画面がそのまま描画）。

### プロンプト（新規）`src/lib/ai/prompts/choco.ts`
- 入力差し込み: 本文全体（伏せ段落は「【ここに生徒の段落】」として位置を示す）＋伏せた段落の `role`・`keyPoints`・`modelText`＋生徒回答。
- 出力(JSON): `scores{logic,coherence,expression}`、`overall`、`goodPoints[]`、`improvements[]`、`languageCorrections[]`、`weaknessTags[]`、`nextTip`。
- 観点: ①前後文脈への適合（coherence）②段落の役割を果たしているか＋論理（logic）③日本語表現・誤り（expression＋赤ペン）。対象は離脱しかけの生徒なので**褒めて具体的に**。

## 7. 連動（完全連動）

### 7.1 ランク（割引反映 weight=0.5）
`src/lib/skill-check/aggregate.ts` の `computeEssayAggregate()` を拡張:
- 現状: 直近30日（fallback: 全期間直近10件）の `essays.scores.total` を単純平均 → `practiceAvg`。
- 変更: 同じ期間の `users/{uid}/chokoReviews.scores.total` も取得し、**重み付き平均**にする。
  - `practiceAvg =(Σ essayTotal×1.0 + Σ chokoTotal×0.5) /(Nessay×1.0 + Ncho×0.5)`
  - 定数 `CHOCO_WEIGHT = 0.5` をこのモジュールに定義。
  - fallback（直近30日に何も無い）ロジックも essays と choco の両方を見るよう対応。
- `blend()` 以降・ランク境界は不変。

### 7.2 弱点DB（等倍反映）
`src/lib/growth/analyze.ts` の `updateWeaknessRecords()` を choco-review から呼ぶ。渡すのは `feedback.weaknessTags`。本添削と同じ `users/{uid}/weaknesses/{area}` に加算。

### 7.3 BigQuery
既存 `logEssaySubmission()`（`essay_submissions` テーブル）を再利用し、マーカー付きで送る:
- `essay_type: "choco"`
- `score_logic ← logic`、`score_structure ← coherence`、`score_expression ← expression`
- `score_ap_alignment: null`、`score_originality: null`、`score_total ← total(0-50)`
- `weakness_tags ← weaknessTags`、`word_count ← 段落字数`、`topic ← themeTitle`、`essay_id ← chocoReview.id`
- fire-and-forget（`void`）で本処理を止めない。

## 8. UI コンポーネント
- 再利用: `ManuscriptEditor`（入力）、`RedPenText`＋`LanguageCorrection`（赤ペン）、summary-drill ページの3ステップ構成とスタイル。
- 新規:
  - `src/app/student/essay/choco/page.tsx`（3ステップ制御）
  - 本文表示＋欠落段落枠コンポーネント（本文を段落配列で描画し、`blankIndex` の位置に入力欄＋役割ラベル）
  - `ChocoResultView`（点数3軸＋total、講評、赤ペン、模範段落＋背景知識、次の一手）
- スコアは出す（ユーザー決定）。ただしレーダー等は使わず、3軸＋totalの簡潔表示。

## 9. 導線（ナビ）
「要約ドリル」の隣に「ちょこ添削」を追加:
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileMenuContent.tsx`（2箇所）
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/Header.tsx`（パス→タイトル）

## 10. エラー処理
- `passageId` 不正/該当なし → 400。
- AI応答が JSON 崩れ → 既存の jsonrepair フォールバック（`reviewEssayCore` と同様）。失敗時は 500＋やり直し導線。
- 弱点DB更新・BigQuery・ランク再計算は fire-and-forget（失敗しても結果保存は成立）。
- 生徒本人以外のアクセス拒否（`requireRole(["student"])` ＋ uid 一致）。

## 11. テスト（検証観点）
- 段落穴埋めUIが `blankIndex` の位置に正しく入力欄を出す。
- choco-review が3軸＋total を返し、`chokoReviews` に保存される。
- `computeEssayAggregate` の重み付き平均が期待どおり（essayのみ／chocoのみ／混在／30日境界／fallback）。ユニットテスト対象。
- 弱点DBに `weaknessTags` が等倍加算される。
- BigQuery mock ログに `essay_type:"choco"` と3軸マッピングが出る。
- スキルランクが choco だけでも fallback 経由で付与される。

## 12. 初期バンク（人手で用意、たたき台）
**教育・看護医療・経済経営・人文社会・理工 の5分野 × 各2本（計10本）**。各本文800字前後・4〜5段落・各段落に role と keyPoints（背景知識）。分野・本数はレビューで調整。

## 13. 新規/変更ファイル一覧
新規:
- `src/data/choco-passages/`（types.ts, index.ts, 分野別データ）
- `src/lib/types/choco.ts`（ChocoReview 等。LanguageCorrection は essay.ts から再利用）
- `src/lib/ai/prompts/choco.ts`
- `src/app/api/essay/choco-review/route.ts`
- `src/app/student/essay/choco/page.tsx` ＋ 結果/穴埋めコンポーネント

変更:
- `src/lib/skill-check/aggregate.ts`（`computeEssayAggregate` に choco 重み付き平均）
- ナビ4ファイル（§9）

## 14. 将来拡張（v1対象外）
- 管理画面からのAI本文バンク自動生成・公開フロー
- role による欠落段落バイアス、難易度選択、ヒント段階開示
- 講師画面での choco 履歴閲覧

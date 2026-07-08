# 論理ドリル（論理シリーズ）設計書

- 日付: 2026-07-08
- 対象プロジェクト: Coach for 総合型選抜（v2 / `coach-sougou-sentaku-v2`）
- 位置づけ: 「生徒の言語的論理能力を高める」新機能。将来の「学習ツアー」（別サブプロジェクト）における1駅（ちょこ添削 → 要約ドリル → **論理ドリル**）。
- 本スペックの範囲: **論理ドリル単体**（ツアーは別スペック）

## 1. 目的とゴール

### 目的
生徒が「主張を筋道立てて言葉にする」力（言語的論理能力）を、短時間の反復ドリルで鍛える。小論文・面接・自己分析すべての土台となる能力を、既存フローとは独立した専用ドリルで底上げする。

### 成功基準（検証可能）
- 生徒が問題型を選ぶ／出題される → 回答する → AIが論理面を採点・解説する、の1サイクルが完結する
- 完了が `users/{uid}/logicDrills` にサーバ保存される
- 管理者の生徒詳細「活動状況」ヒートマップに **論理ドリル** が独立枠で日別集計される
- 履歴画面で過去の結果を振り返れる

### 非ゴール（この範囲では作らない）
- 学習ツアーの順次遷移・進捗・ストリーク（サブB / 別スペック）
- 弱点DB（`growthProfile`）への論理弱点の反映（サブBまたは別途で判断）
- ①骨組み穴埋め・③具体↔抽象変換の2型（v2で追加。下記スコープ参照）

## 2. スコープ（v1）

問題型は4型構想だが、**v1では②論理の穴さがし・④即興ロジックの2型**を実装する。理由: 学習効果が高く、入力UI・採点プロンプトが素直で、枠組み検証に十分。①③はv2で同じ枠組みに追加する。

4型ローテーションを見据え、型は「差し替え可能なプラグイン」的に設計する（型追加時に既存2型へ影響が出ないこと）。

### 前提・アクセス方針
- **対応言語**: 日本語のみ。多言語（要約ドリルの `lang` 切替に相当するもの）は範囲外。
- **アクセス制限**: 既存の要約ドリル（`summary-drill`）と同じアクセス方針に合わせる。実装時に要約ドリルがプレミアム機能ゲート（`requireFeature`）配下かを確認し、それに一致させる（現時点の想定はコーチ/一般問わず全生徒が利用可。齟齬があれば要約ドリル基準を優先）。
- **プラットフォーム**: PWA/モバイル前提。要約ドリルの `mobileTab`（読み/書き切替）に倣い、狭幅では入力UIをタブ分割する。

## 3. 問題型の仕様

### 共通
- 各問題は静的バンク `src/data/logic-drills.ts` に定義。1問 = `LogicDrillItem`。
- **バンク規模**: v1は各型 **最低10問**（日替わり巡回で当面同一問題が続かない規模）。
- 回答後、`/api/essay/logic-drill/evaluate` に送信しAI採点。
- 採点は **共通3軸（論理の一貫性 / 根拠の妥当性 / 構成の明快さ、各5点）** ＋型別の赤ペン（コメント）。

### ②論理の穴さがし（`flaw_finder`）
- 出題: 短い意見文（3〜5文）＋選択肢（欠陥の種類: 飛躍 / すり替え / 循環論法 / 過度な一般化 / 因果の取り違え）。
- 生徒操作: (a) 欠陥の種類を選択、(b) どこがどう論理的におかしいかを説明、(c) 論理が通るよう修正文を書く。
- AI採点: 欠陥同定の正誤（バンクに正解ラベルを持つ）、説明の的確さ、修正で論理が通ったか。共通3軸に加え「欠陥同定の正誤」を feedback で明示。

### ④即興ロジック（`quick_logic`）
- 出題: 賛否が割れるお題1つ（例「制服は必要か」）。制限時間あり（既定5分、要約ドリルの `TIME_LIMIT` に倣う）。
- 生徒操作: 立場（賛成/反対）を選び、理由を3つ、各1〜2文で記述。
- AI採点: 立場と理由の一貫性、理由3つの非重複・妥当性、全体構成。共通3軸で採点。

## 4. 「今日の型」の決定

- **単体利用**: `select` 画面で型を選べる。デフォルト選択は日付ベースのローテーション。
- **ツアー利用（サブB）**: クエリ `?type=flaw_finder` 等で当日の型を指定して遷移。
- ローテーション判定は共通ヘルパー `getRotatedLogicDrillType(date): LogicDrillType`（曜日 or 通日 mod 型数）。単体のデフォルトとツアーの当日決定の両方で使う。バンクから当該型の1問を選ぶ選定も同ヘルパー群に置く（乱数不使用: 日付シードで決定的に選ぶ）。

## 5. アーキテクチャ（既存「要約ドリル」に準拠）

参考にする既存実装:
- ページ: `src/app/student/essay/summary-drill/page.tsx`（select→drill→result のステップ機）
- 評価API: `src/app/api/essay/summary-drill/evaluate/route.ts`（Anthropic SDK＋プロンプトビルダ→ `users/{uid}/summaryDrills` に保存）
- プロンプト: `src/lib/ai/prompts/summary-drill.ts`
- 静的バンク例: `src/data/choco-passages.ts`
- 型: `src/lib/types/choco.ts`
- 管理者セクション: `src/components/admin/SummaryDrillsSection.tsx`
- 活動集計: `src/lib/utils/activity-heatmap.ts` / `src/components/admin/ActivityHeatmap.tsx`

### 追加/変更ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `src/lib/types/logic-drill.ts` | 新規 | 型定義（下記データモデル） |
| `src/data/logic-drills.ts` | 新規 | 型別の問題バンク（静的）＋型メタ（ラベル等） |
| `src/lib/ai/prompts/logic-drill.ts` | 新規 | 型別の採点プロンプト生成関数 |
| `src/lib/logic-drill/rotation.ts` | 新規 | `getRotatedLogicDrillType` と日付シードの問題選定 |
| `src/app/api/essay/logic-drill/evaluate/route.ts` | 新規 | Anthropic採点→ `users/{uid}/logicDrills` 保存 |
| `src/app/student/essay/logic-drill/page.tsx` | 新規 | select→drill→result。型ごとに入力UI出し分け |
| `src/app/student/essay/logic-drill/history/page.tsx` | 新規 | 履歴一覧 |
| `src/app/api/admin/students/[id]/logic-drills/route.ts` | 新規 | 管理者向け履歴取得（`summary-drills` route に倣う） |
| `src/components/admin/LogicDrillsSection.tsx` | 新規 | 管理者生徒詳細の論理ドリルセクション |
| `src/lib/utils/activity-heatmap.ts` | 変更 | `logicDrill` 集計を追加（`users/{uid}/logicDrills` を source に） |
| `src/components/admin/ActivityHeatmap.tsx` | 変更 | `logicDrill`（ラベル「論理ドリル」）の系列・凡例追加 |
| `src/app/admin/students/[id]/page.tsx` | 変更 | `LogicDrillsSection` と heatmap source（logicDrills）を組み込み |
| ナビ（Sidebar / BottomNav 等） | 変更 | 「論理ドリル」への導線追加（既存ドリルに倣う） |

## 6. データモデル

```ts
// src/lib/types/logic-drill.ts
export type LogicDrillType = "flaw_finder" | "quick_logic"; // v2で "skeleton" | "abstraction" を追加

export type FlawKind =
  | "leap"            // 飛躍
  | "substitution"    // すり替え
  | "circular"        // 循環論法
  | "overgeneralize"  // 過度な一般化
  | "false_cause";    // 因果の取り違え

/** 問題バンクの1問（型により data の形が変わる判別ユニオン） */
export type LogicDrillItem =
  | {
      id: string;
      type: "flaw_finder";
      prompt: string;         // 欠陥を含む意見文
      answerFlaw: FlawKind;   // 正解の欠陥種別
      explanation: string;    // 解説（模範）
    }
  | {
      id: string;
      type: "quick_logic";
      prompt: string;         // 賛否が割れるお題
      timeLimitSec?: number;  // 既定は定数で補完
    };

/** 生徒の回答（型別。API に送る） */
export type LogicDrillAnswer =
  | { type: "flaw_finder"; selectedFlaw: FlawKind; explanation: string; fix: string }
  | { type: "quick_logic"; stance: "agree" | "disagree"; reasons: string[] };

export interface LogicDrillScores {
  consistency: number; // 論理の一貫性 0-5
  validity: number;    // 根拠の妥当性 0-5
  structure: number;   // 構成の明快さ 0-5
}

export interface LogicDrillFeedback {
  good: string;        // 良かった点
  improve: string;     // 改善点（赤ペン）
  /** flaw_finder 専用: 欠陥同定が正解だったか */
  flawCorrect?: boolean;
  modelAnswer?: string; // 模範例（任意）
}

export interface LogicDrillResult {
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback;
}

/** Firestore: users/{uid}/logicDrills/{autoId} */
export interface LogicDrillRecord {
  drillType: LogicDrillType;
  itemId: string;
  answer: LogicDrillAnswer;
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback;
  completedAt: string; // serverTimestamp
}
```

## 7. 評価API

- ルート: `POST /api/essay/logic-drill/evaluate`
- 認証: `requireRole(["student", ...])`（要約ドリルの認証に準拠。`uid` は自分自身に保存）
- 入力: `{ drillType, itemId, answer }`（`answer` は型別）
- 処理:
  1. `ANTHROPIC_API_KEY` 未設定なら 503（要約ドリルと同様）
  2. `buildLogicDrillPrompt(drillType, item, answer)` で型別プロンプト生成
  3. Anthropic で採点、JSON（`LogicDrillResult`）を得る。**モデルは要約ドリル `summary-drill/evaluate` の現行指定（本設計時点で `claude-sonnet-4-20250514`）に合わせる**。実装時に要約ドリル側の指定を再確認し、乖離していればそちらに一致させる（プロジェクト全体のモデル整合を優先）
  4. `users/{uid}/logicDrills` に `LogicDrillRecord` を保存（`completedAt: FieldValue.serverTimestamp()`）
  5. `LogicDrillResult` を返す
- 保存失敗は採点結果の返却を妨げない（要約ドリルの握り方に準拠、warnログ）

### プロンプト方針（`logic-drill.ts`）
- 型別に「採点観点」を明示し、**必ずJSONのみ**で `{scores:{consistency,validity,structure}, feedback:{good,improve,flawCorrect?,modelAnswer?}}` を返させる。
- `flaw_finder` は `answerFlaw` を採点コンテキストに渡し、`flawCorrect` を判定させる。

## 8. 画面（`logic-drill/page.tsx`）

ステップ機（要約ドリルに準拠）:
- `select`: 型の説明＋開始。デフォルト型は日付ローテーション、手動選択も可。履歴への導線。`?type=` があればその型で即 `drill` へ（ツアー連携）。
- `drill`: 型別の入力UI。
  - `flaw_finder`: 意見文表示＋欠陥ラジオ＋説明欄＋修正欄
  - `quick_logic`: お題＋立場トグル＋理由3欄＋残り時間タイマー
- `result`: 3軸スコア（要約ドリルのドット表示に準拠）＋赤ペン。`flaw_finder` は正誤バッジ＋解説。「もう一度」「履歴」「（ツアー時）次へ」。

## 9. 管理者・活動状況への反映

- `buildActivityHeatmapData` に `logicDrill: number` を追加し、`users/{uid}/logicDrills` を `completedAt` で日別カウント（要約ドリル `drill` と同じ要領）。source 取得は `admin/students/[id]/page.tsx` 側で `logicDrills` を読み heatmap に渡す。
- `ActivityHeatmap` の `typeLabels` に `logicDrill: "論理ドリル"` を追加、系列（バー/凡例）に反映。
- `LogicDrillsSection`（`SummaryDrillsSection` に倣う）を生徒詳細に追加。取得は `GET /api/admin/students/[id]/logic-drills`（`requireRole` ＋ managedByスコープ、`summary-drills` route を踏襲）。

## 10. エラーハンドリング / エッジ

- APIキー未設定: 503（画面は「現在利用できません」表示）
- AI応答がJSONとして壊れている: パース失敗時は 500＋汎用エラー（要約ドリルの握りに準拠）
- 未認証: 401
- `itemId`/`drillType` 不正: 400
- タイマー切れ（`quick_logic`）: 自動で採点に送る（要約ドリルのタイマー挙動に準拠）
- 乱数不使用: 問題選定は日付シードで決定的（同日は同一問題）。連日で同じ問題に偏らないよう、通日でバンクを巡回。

## 11. テスト / 検証

- ローカルは Firebase Admin 未接続のため、保存系は Anthropic モックまたはデプロイ後の実機で確認する前提を明記。
- 検証項目:
  1. 2型それぞれで select→drill→result が完結し、3軸スコアと赤ペンが表示される
  2. `flaw_finder` の正誤判定が `answerFlaw` と整合
  3. `users/{uid}/logicDrills` にレコードが保存される
  4. 管理者の活動状況に「論理ドリル」枠が別枠で日別表示される
  5. `?type=` 指定で当該型に直行できる（ツアー連携の前提）
  6. 狭幅（モバイル）で入力UIがタブ分割され操作できる
- 型チェック・lint クリーンを完了条件とする（既存規約）。

## 12. 将来拡張（この範囲外）

- ①骨組み穴埋め・③具体↔抽象変換の追加（同枠組みに型を足す）
- 学習ツアー（サブB）での順次遷移・進捗サーバ記録・ストリーク・未実施アラート連動
- 論理弱点の `growthProfile` 連動、志望学部AP連動のお題出し分け

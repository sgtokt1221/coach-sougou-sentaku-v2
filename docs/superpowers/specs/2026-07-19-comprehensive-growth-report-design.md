# 包括成長レポート 設計書

作成日: 2026-07-19
対象: Coach v2 (CoachFor総合型選抜) 成長レポート（`src/lib/growth/report.ts`, `src/app/api/admin/reports/generate/route.ts` ほか）

## 1. 背景と目的

現在の成長レポートは実質「**小論文＋面接**の成長レポート（＋面談ノートの部分要約）」で、生徒の全アクティビティを対象にしていない。

- 総合所見（`overallAssessment`）・推奨（`recommendations`）は**ルールベースのテンプレ**で、AIは観察抽出と類題生成にのみ使われている。
- 面談セッションは `debrief.notes` を AI 要約した観察3点のみ反映。要約本文・アクションアイテム・次回アジェンダは未反映。
- 活動実績・出願書類・自己分析は、**類題生成の文脈（`loadStudentContext`）としてのみ**使われ、レポート本文には出ない。

目的: 生徒の**全アクティビティ（小論文・面接・面談セッション・活動実績・出願書類・自己分析）を対象**にし、**AIが全データを読んで総合所見を1本化**する包括レポートにする。

## 2. 決定事項（ユーザー承認済み）

- レポート形式: **AI総合所見に一本化**（既存の統計・弱点推移は残しつつ、総合所見にすべてのデータを反映）
- 面談セッション: **要約・アクションアイテム・次回アジェンダまで反映**
- AIモデル: **claude-haiku-4-5**（既存踏襲・コスト重視）
- 一括生成（batch）: **個別生成のみ AI 総合所見を生成／一括は従来の軽量集計のまま**（コスト抑制）

## 3. 現状の把握

生成: `src/app/api/admin/reports/generate/route.ts`
- essays / interviews（今期間＋前期間、スコア）→ `essayStats` / `interviewStats`
- `users/{id}/weaknesses` ＋ essays/interviews の weaknessTags → `weaknessProgress`
- sessions（期間内）→ `buildSessionSummaryDraft` で `sessionSummary`（prepPlan.goal→mainTopics、debrief.notes→AI要約 teacherObservations、newWeaknessAreas、latestNextAgenda）
- `loadStudentContext`（志望校/自己分析/MBTI/活動/資格）→ **類題生成の入力のみ**
- `overallAssessment` / `recommendations` は `generateOverallAssessment` / `generateRecommendations`（ルールベース）

データ源:
- Session 型（`src/lib/types/session.ts`）: `summary`(SessionSummary: points + `actionItems`), `prepPlan.goal`, `debrief`(notes, newWeaknessAreas, nextAgendaSeed)
- `loadStudentContext`（`src/lib/growth/student-context.ts`）: primaryTargets, selfAnalysis, mbtiType, recentActivities, englishCerts
- Document（`src/lib/types/document.ts`）: status, deadline, aiLikeness, versions(feedback スコア)

## 4. 設計

### 4.1 データ収集の拡張（generate route）

期間 `[start, end]` に対し、既存収集に加えて:

1. **面談セッション（拡張）**: 既に取得している `sessions` から、各セッションの `summary`（要約ポイント + `actionItems`）、`prepPlan.goal`、`debrief`（notes/newWeaknessAreas/nextAgendaSeed）を抽出して構造化。debrief の AI 観察抽出（既存）は維持。
2. **活動実績**: `loadStudentContext` の `recentActivities`（既存ロード）を利用。期間フィルタは行わず「直近の活動実績」として扱う（Activity は更新頻度が低く件数も少ないため）。件数と各活動の見出し・AP最適化有無を要約。
3. **出願書類**: `documents` コレクションを `where("userId","==",studentId)` で取得し、status（下書き/レビュー中/完成）、deadline、最新版 feedback スコア、aiLikeness を集計。締切が近い/未完成のものを抽出。
4. **自己分析・MBTI・志望校・資格**: `loadStudentContext` の既存フィールドを利用。

これらは主に **AI 総合所見の入力**として使う。表示用に軽い件数集計（活動件数、書類の完成/未完成数など）も保持する。

### 4.2 AI 総合所見の生成（新規）

- 新プロンプト `buildComprehensiveAssessmentPrompt`（`src/lib/ai/prompts/growth-report.ts` に追加）が、収集した全データの要約（小論文/面接スコア推移、弱点推移、セッション要約＋アクションアイテム＋次回アジェンダ、活動実績、出願書類状況、自己分析/志望校）を受け取り、以下を JSON で返す:
  - `overallAssessment`: この期間の全体像・成長・つまずき・次の一手（300〜500字程度の散文）
  - `recommendations`: 具体的な推奨アクション 3〜5件（全データ横断）
- モデル: `claude-haiku-4-5`、`max_tokens` 1500 程度。
- **フォールバック**: `ANTHROPIC_API_KEY` 未設定、または AI 呼び出し/パース失敗時は、既存の `generateOverallAssessment` / `generateRecommendations`（ルールベース）を使う（サイレント劣化はログに出す）。
- **個別生成のみ**（`api/admin/reports/generate`）で実行。**一括（batch）は従来どおり**この AI 呼び出しをスキップし、軽量集計＋ルールベース所見のまま。

### 4.3 スキーマ拡張（`GrowthReport`）

`src/lib/types/growth-report.ts` に追加（すべて任意・後方互換）:

```ts
/** 面談セッションの反映（要約・アクションアイテム・次回アジェンダ） */
sessionDigest?: {
  totalCount: number;
  sessions: {
    date: string;          // scheduledAt
    goal?: string;         // prepPlan.goal
    summaryPoints: string[]; // SessionSummary の要点
    actionItems: string[];   // ActionItem のテキスト
    nextAgenda?: string;     // debrief.nextAgendaSeed
  }[];
};
/** 活動実績の集計（AI入力＋軽い表示） */
activitySummary?: {
  totalCount: number;
  highlights: string[];   // 各活動の見出し
};
/** 出願書類の状況 */
documentSummary?: {
  total: number;
  completed: number;
  inProgress: number;
  upcomingDeadlines: { title: string; deadline: string }[];
};
```

`sessionSummary`（既存）は維持（後方互換）。`overallAssessment` / `recommendations` は AI 生成値が入る（フォールバック時はルールベース）。

### 4.4 UI

- 総合所見一本化のため、表示は既存の `overallAssessment` / `recommendations` 欄を主に活かす（AI生成の長めの所見がそのまま表示される）。
- レポート詳細（`/admin/reports`, 生徒の成長タブのレポート表示）に、`sessionDigest` / `activitySummary` / `documentSummary` の**軽い補助セクション**を追加（折り畳み or 小さめ）。表示コンポーネントは既存レポート表示に追記。

## 5. スコープ外（YAGNI）

- ちょこ添削/論理ドリル/要約ドリルの取り組みログのレポート反映（今回は対象外）
- セッション trans­cript 全文の反映（要約・アクションアイテム・次回アジェンダまで）
- 一括生成での AI 総合所見（コスト理由でスキップ）
- 生徒版/管理者版でのセッション内容の出し分け（今回は反映＝共通）

## 6. 影響ファイル

変更:
- `src/lib/types/growth-report.ts`（`GrowthReport` 拡張）
- `src/lib/ai/prompts/growth-report.ts`（`buildComprehensiveAssessmentPrompt` 追加）
- `src/app/api/admin/reports/generate/route.ts`（データ収集拡張＋AI総合所見呼び出し＋スキーマ充填）
- `src/lib/growth/report.ts`（`generateGrowthReport` が新フィールドを受け取り格納。ルールベース所見はフォールバック用に維持）
- レポート表示コンポーネント（`/admin/reports` と生徒側の成長レポート表示。補助セクション追加）

新規: なし（プロンプトは既存ファイルに追加）

## 7. 検証基準

- セッション・活動・書類がある生徒で個別生成 → `overallAssessment` に小論文/面接以外（面談の次アジェンダ、活動、書類締切等）が言及される。`sessionDigest`/`activitySummary`/`documentSummary` が埋まる。
- `ANTHROPIC_API_KEY` 未設定時 → ルールベース所見にフォールバックし、レポート生成自体は成功する。
- 一括生成（batch）→ 従来どおり（AI総合所見なし・軽量）で成功する。
- `npm run build` がパス。既存レポート（旧スキーマ）も表示が壊れない（新フィールドは任意）。

# 包括成長レポート Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development で1タスクずつ実装。各タスクは spec準拠レビュー→コード品質レビューを通す。

**Goal:** 成長レポートを小論文＋面接中心から、生徒の全アクティビティ（面談セッション・活動実績・出願書類・自己分析）を対象にし、AIが全データを読んで総合所見を1本化する包括レポートにする。

**Architecture:** 個別生成API（`api/admin/reports/generate`）でデータ収集を拡張し、新プロンプトで haiku に総合所見＋推奨を生成させる。AI失敗/キー無しは既存ルールベースにフォールバック。一括生成（batch）は従来の軽量のまま。スキーマ拡張は全て任意で後方互換。

**Tech Stack:** Next.js 16 / TypeScript / Firebase Admin SDK / Anthropic SDK (`claude-haiku-4-5`)

**検証:** 単体テスト基盤なし。`npm run build`（`rm -rf .next && validate:data && next build`）＋ `npx eslint <file>` ＋ 実挙動確認。リポジトリに無関係な既存lintエラー約126件あり（対象ファイルのみクリーンでOK）。無関係な未コミット変更（CLAUDE.md等）は `git add <path>` で絶対に巻き込まない。設計書: `docs/superpowers/specs/2026-07-19-comprehensive-growth-report-design.md`。

---

### Task 1: GrowthReport スキーマ拡張

**Files:** Modify `src/lib/types/growth-report.ts`

`GrowthReport` インターフェース（`sessionSummary?` の近く）に、以下を任意フィールドとして追加。既存フィールドは変更しない。

```ts
  /** 面談セッションの反映（要約・アクションアイテム・次回アジェンダ）。個別生成で付与。 */
  sessionDigest?: {
    totalCount: number;
    sessions: {
      date: string;
      goal?: string;
      summaryPoints: string[];
      actionItems: string[];
      nextAgenda?: string;
    }[];
  };
  /** 活動実績の集計（直近分）。 */
  activitySummary?: {
    totalCount: number;
    highlights: string[];
  };
  /** 出願書類の状況。 */
  documentSummary?: {
    total: number;
    completed: number;
    inProgress: number;
    upcomingDeadlines: { title: string; deadline: string }[];
  };
```

- [ ] Step1: 上記フィールドを追加。
- [ ] Step2: `npm run build` でパス確認。
- [ ] Step3: commit `feat(reports): 包括レポート用のスキーマ(sessionDigest/activitySummary/documentSummary)を追加`（`src/lib/types/growth-report.ts` のみ）。

---

### Task 2: AI総合所見プロンプト

**Files:** Modify `src/lib/ai/prompts/growth-report.ts`（既存プロンプトの追記）

`buildComprehensiveAssessmentPrompt(input)` を追加。`input` は収集データの要約（studentName、期間、essayStats/interviewStats の要点、weaknessProgress、sessionDigest、activitySummary、documentSummary、自己分析/志望校/MBTI/資格）を含むプレーンオブジェクト。既存プロンプトのスタイル（厳密JSON要求、日本語）に合わせる。

出力JSON:
```json
{ "overallAssessment": "この期間の全体像・成長・つまずき・次の一手を300〜500字の散文で", "recommendations": ["全データ横断の具体的な推奨アクション3〜5件"] }
```

プロンプトは、小論文/面接だけでなく、面談の次アジェンダ・アクションアイテム、活動実績、出願書類の締切/進捗、自己分析/志望校適合を**明示的に横断参照**するよう指示する。総合型選抜の文脈（自分の言葉・体験・AP合致）を評価軸に含める。

- [ ] Step1: 既存 `src/lib/ai/prompts/growth-report.ts` を読み、export スタイルを踏襲して関数追加。引数の型（`ComprehensiveAssessmentInput`）も同ファイルに export。
- [ ] Step2: `npm run build` パス。
- [ ] Step3: commit `feat(reports): AI総合所見プロンプト(buildComprehensiveAssessmentPrompt)を追加`。

---

### Task 3: データ収集の拡張（セッションdigest・活動・書類）

**Files:** Modify `src/app/api/admin/reports/generate/route.ts`（＋必要なら `src/lib/growth/report.ts` の `generateGrowthReport` 引数拡張）

既存の sessions 取得結果から `sessionDigest` を構築（各セッションの `summary.points`／`summary.actionItems`／`prepPlan.goal`／`debrief.nextAgendaSeed`／`scheduledAt`）。`loadStudentContext` の `recentActivities` から `activitySummary` を構築。`documents` コレクションを `where("userId","==",studentId)` で取得し `documentSummary`（total/completed(status==="final")/inProgress/締切近い順の upcomingDeadlines）を構築。

`generateGrowthReport` の入力に `sessionDigest`/`activitySummary`/`documentSummary` を渡し、返り値（report）に格納する（`report.ts` 側は受け取ってそのまま `GrowthReport` に載せるだけ。ルールベース所見は維持）。

- [ ] Step1: `generate/route.ts` と `src/lib/growth/report.ts`（`GenerateGrowthReportParams` と `generateGrowthReport`）と Session 型（`summary`/`actionItems`/`prepPlan.goal`/`debrief.nextAgendaSeed`）を読む。
- [ ] Step2: セッション map で `sessionDigest` を構築（既存 `sessions` 変数を活用。actionItems は `ActionItem` のテキストフィールドを使う）。
- [ ] Step3: `loadStudentContext` の結果から `activitySummary`（recentActivities の見出し）を構築。
- [ ] Step4: `documents` を取得し `documentSummary` を構築（締切は昇順 top3）。失敗時は undefined（レポートは継続）。
- [ ] Step5: `generateGrowthReport` にこれら3つを渡し、`report.ts` で `GrowthReport` に格納。
- [ ] Step6: `npx eslint` 対象ファイル＋`npm run build` パス。
- [ ] Step7: commit `feat(reports): レポート生成でセッションdigest・活動実績・出願書類を収集`。

---

### Task 4: AI総合所見の統合（個別のみ・フォールバック）

**Files:** Modify `src/app/api/admin/reports/generate/route.ts`（＋必要なら `report.ts`）

Task3 で集めた要約と既存の essayStats/interviewStats/weaknessProgress を `buildComprehensiveAssessmentPrompt` に渡し、haiku で `overallAssessment`＋`recommendations` を生成。成功時は report のこれらを AI 値で上書き。`ANTHROPIC_API_KEY` 未設定 or 例外 or JSONパース失敗時は、既存のルールベース値（`generateGrowthReport` が既に入れている）をそのまま使う（ログ出力）。

**重要:** これは**個別生成API（`generate/route.ts`）のみ**。一括生成（`api/admin/reports/batch`）には**追加しない**（従来の軽量のまま）。

- [ ] Step1: `generate/route.ts` の report 生成後、AIブロックを追加（`practiceQuestions` 生成と同じ try/catch・model=`claude-haiku-4-5`・max_tokens 1500）。
- [ ] Step2: AI成功時 `report.overallAssessment` と `report.recommendations` を上書き。失敗時は既存値維持（ルールベース）。
- [ ] Step3: `batch/route.ts` を読み、AI総合所見が入っていないこと（従来のまま）を確認。変更しない。
- [ ] Step4: `npm run build` パス。
- [ ] Step5: commit `feat(reports): 個別生成でAI総合所見(全データ横断)を生成しフォールバック付きで反映`。

---

### Task 5: レポート表示に補助セクションを追加

**Files:** Modify レポート表示コンポーネント（`/admin/reports` のレポート詳細表示、および生徒側の成長レポート表示。実ファイルは grep で特定）

`overallAssessment`／`recommendations` の表示は既存のまま活かす。追加で `sessionDigest`／`activitySummary`／`documentSummary` が存在する場合の**小さめの補助セクション**（折り畳み可でも可）を追加。無い場合（旧レポート）は非表示。

- [ ] Step1: `grep -rn "overallAssessment\|weaknessProgress\|sessionSummary" src/app src/components` でレポート表示箇所を特定。
- [ ] Step2: 管理者レポート詳細に3セクションの表示を追加（件数・見出し・締切・アクションアイテム等をコンパクトに）。
- [ ] Step3: 生徒側の成長レポート表示にも同様に追加（生徒に見せてよい範囲＝要約・アクションアイテム・次回アジェンダ・活動・書類状況）。
- [ ] Step4: `npx eslint` 対象＋`npm run build` パス。旧レポート（新フィールド無し）でも壊れないこと。
- [ ] Step5: commit `feat(reports): 成長レポートにセッション/活動/書類の補助セクションを表示`。

---

## Self-Review

- **Spec coverage:** データ収集拡張=Task3 ✓ / AI総合所見=Task2+4 ✓ / スキーマ=Task1 ✓ / UI=Task5 ✓ / 個別のみAI・batch据置=Task4 ✓ / フォールバック=Task4 ✓。
- **型整合:** `sessionDigest`/`activitySummary`/`documentSummary` を Task1 で定義し、Task3/4/5 で同名参照。`buildComprehensiveAssessmentPrompt` を Task2 で定義し Task4 で使用。
- **プレースホルダ:** 具体の行番号は実装時に各実装者がファイルを読んで特定する方針（このリポジトリは巨大ファイルが多く、行番号がずれやすいため）。各タスクに読むべきファイルと構築するデータ形状・出力形を明記済み。
- **注意:** 巨大ファイルへの並列編集は禁止。各タスクは直列・単一ファイル中心。

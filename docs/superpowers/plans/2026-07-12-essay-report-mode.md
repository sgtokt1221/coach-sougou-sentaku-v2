# 添削レポートモード 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添削（essay）に「約1万字の学部別課題文を読んでレポートを書く」レポートモードを追加する。UIは添削を再利用し、5観点採点は据え置き、レポート専用フィードバック（reportInsights）を追加する。

**Architecture:** レポートは `questionType:"report"` ＋ `sourceText:<課題文body>` として既存レビュー経路（`/api/essay/review` → `reviewEssayCore`）を流用。AI指示とreportInsightsパースは clean な `review-core.ts` に閉じ込める（pre-modified の `prompts/essay.ts` は触らない）。課題文はキュレートデータ（本計画で Claude が執筆・同梱）。実行時AI生成はしない。

**Tech Stack:** Next.js 16 / TypeScript / `@anthropic-ai/sdk`（`claude-sonnet-4-6`）/ firebase-admin。認証は既存 essay API 流儀。

**設計書:** `docs/superpowers/specs/2026-07-12-essay-report-mode-design.md`

**前提（コードベース確認済み）:**
- **pre-modified（絶対に混ぜない・触らない）**: `CLAUDE.md`, `firestore.rules`, `src/app/api/essay/coach/route.ts`, `src/lib/ai/prompts/essay.ts`。→ report のプロンプト拡張は `prompts/essay.ts` ではなく `review-core.ts` 側で行う。各コミットは対象ファイルのみ `git add`。
- `review-core.ts`（clean）: `reviewEssayCore(input)`。`input.questionType!=="essay"` で questionContext を作り `buildEssayReviewPrompt` に渡す。questionContext の型は `"english-reading"|"data-analysis"|"mixed"|"lecture"`。userMessage は `【出題資料(英文)】\n${sourceText}` を差し込む。`max_tokens:4096`。parse で `feedback` を組み立て（Firestore は undefined 不可＝条件付き spread）。
- `review/route.ts`（clean）: body から `questionType/sourceText` 等を取り出し `reviewEssayCore` に渡す。essay ドキュメント作成時に `sourceType`（homework 等）を設定。
- `essay/new/page.tsx`（clean, main版）: `inputMode`・テーマ/過去問選択・提出（`/api/essay/review`）。
- `essay/[id]/page.tsx`（clean, 1448行）: 結果描画。ローカルな feedback 型（goodPoints/improvements/languageCorrections/topicInsights/quantitativeAnalysis 等）を持ち `result.feedback.*` を描画。
- 型 `src/lib/types/essay.ts`: `EssayReviewRequest.questionType`, `Essay.sourceType`, `EssayScores`(5観点), `EssayFeedback`。
- field 分類（essay-themes と共通）: society/economy/education/environment/international/law/medical/politics/technology。

**規約:** JSDocコメント必須。絵文字禁止。既存スタイル準拠。触るのは必要な箇所のみ。既存デッドコード削除しない。

---

## File Structure

| ファイル | 責務 | 種別 |
|----------|------|------|
| `src/lib/types/essay.ts` | questionType/sourceType に report、`ReportInsights`＋`EssayFeedback.reportInsights` | 変更 |
| `src/data/essay-report-materials.ts` | 課題文データ＋アクセサ（本文は本計画で執筆） | 新規 |
| `scripts/validate-report-materials.ts` | 本数・字数・field 検証 | 新規 |
| `src/lib/essay/review-core.ts` | report 分岐（ラベル一般化・report指示・reportInsightsパース・max_tokens） | 変更 |
| `src/app/api/essay/review/route.ts` | report 時 sourceType="report" 設定・受け渡し | 変更 |
| `src/app/api/essay/report/materials/route.ts` | field で課題文一覧 | 新規 |
| `src/app/api/essay/report/materials/[id]/route.ts` | 課題文1件全文 | 新規 |
| `src/components/essay/ReportSourcePane.tsx` | 課題文読解ペイン | 新規 |
| `src/app/student/essay/new/page.tsx` | レポートモード切替・課題文選択・提出配線 | 変更 |
| `src/app/student/essay/[id]/page.tsx` | reportInsights ブロック描画 | 変更 |

**進め方:** 型（T1）→ データ構造＋検証（T2）→ 課題文執筆（T3: 医療/教育/社会 各1万字）→ review-core（T4）→ review route（T5）→ API（T6）→ 読解ペイン（T7）→ essay/new 配線（T8）→ 結果UI（T9）。

---

## Task 1: 型拡張

**Files:** Modify `src/lib/types/essay.ts`

- [ ] **Step 1: 型を追加/拡張**

1. `EssayReviewRequest.questionType` のユニオンに `"report"` を追加:
   ```ts
   questionType?: "essay" | "english-reading" | "data-analysis" | "mixed" | "lecture" | "report";
   ```
   （`questionType` を参照する他の箇所、例 `EssayReviewRequest["questionType"]` を使う型も自動追従する）
2. `Essay.sourceType` のユニオンに `"report"` を追加:
   ```ts
   sourceType?: "manual" | "homework" | "skill_check" | "lecture" | "report";
   ```
3. `ReportInsights` を追加し、`EssayFeedback` に `reportInsights?` を追加:
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
   ```
   `EssayFeedback` に追記:
   ```ts
     /** レポート課題専用の講評（report のときのみ） */
     reportInsights?: ReportInsights;
   ```

- [ ] **Step 2: 型チェック** — Run: `npx tsc --noEmit` Expected: PASS
- [ ] **Step 3: Commit**
   ```bash
   git add src/lib/types/essay.ts
   git commit -m "feat(essay): add report questionType/sourceType and ReportInsights"
   ```

---

## Task 2: 課題文データ構造＋検証スクリプト

**Files:** Create `src/data/essay-report-materials.ts`, `scripts/validate-report-materials.ts`

- [ ] **Step 1: データ構造とアクセサ（本文は空で開始）**

```ts
/** レポートモードの課題文（約1万字, 講義代わりに読む長文）。 */
export interface ReportMaterial {
  id: string;
  field: string;                 // essay-themes と同じ 9系統
  fieldLabel: string;
  title: string;
  /** 約8,000〜12,000字の課題文本文 */
  body: string;
  /** レポートで問う観点（AI採点のヒント・生徒への課題提示） */
  focusPoints: string[];
  /** 推奨レポート字数 */
  recommendedWordLimit: number;
  difficulty: 1 | 2 | 3;
}

/** 課題文一覧。本文は各執筆タスクで追加する。 */
export const reportMaterials: ReportMaterial[] = [];

/** field で絞り込む。 */
export function getReportMaterialsByField(field: string): ReportMaterial[] {
  return reportMaterials.filter((m) => m.field === field);
}

/** id で1件取得。 */
export function getReportMaterialById(id: string): ReportMaterial | undefined {
  return reportMaterials.find((m) => m.id === id);
}
```

- [ ] **Step 2: 検証スクリプト**

`scripts/validate-report-materials.ts`（assert 失敗で exit 1）:
```ts
import assert from "node:assert/strict";
import { reportMaterials } from "@/data/essay-report-materials";

const VALID_FIELDS = new Set([
  "society", "economy", "education", "environment",
  "international", "law", "medical", "politics", "technology",
]);

function validate() {
  const ids = new Set<string>();
  for (const m of reportMaterials) {
    assert.ok(m.id && !ids.has(m.id), `id 重複または空: ${m.id}`);
    ids.add(m.id);
    assert.ok(VALID_FIELDS.has(m.field), `不正な field: ${m.field}`);
    assert.ok(m.title.length > 0, `title 空: ${m.id}`);
    assert.ok(
      m.body.length >= 8000 && m.body.length <= 13000,
      `body 字数が範囲外(${m.body.length}): ${m.id}`,
    );
    assert.ok(m.focusPoints.length >= 3, `focusPoints は3つ以上: ${m.id}`);
    assert.ok(m.recommendedWordLimit > 0, `recommendedWordLimit 不正: ${m.id}`);
  }
  console.log(`[validate-report-materials] OK (${reportMaterials.length}件)`);
}

validate();
```

- [ ] **Step 3: validate:data に連結**

`package.json` の `validate:data` スクリプト末尾に ` && tsx scripts/validate-report-materials.ts` を追加する（既存の連結スタイルに合わせる）。

- [ ] **Step 4: 検証** — Run: `npx tsx scripts/validate-report-materials.ts`（0件でも OK ログ）＋ `npx tsc --noEmit` PASS。
- [ ] **Step 5: Commit**
   ```bash
   git add src/data/essay-report-materials.ts scripts/validate-report-materials.ts package.json
   git commit -m "feat(essay): add report material data structure and validator"
   ```

---

## Task 3: 課題文の執筆（医療 / 教育 / 社会 の3本, 各約1万字）

**Files:** Modify `src/data/essay-report-materials.ts`（`reportMaterials` 配列に3件追加）

各課題文は**独立したサブエージェントで1本ずつ執筆**する（品質確保）。3件を配列に追加。

**執筆要件（3本共通）:**
- 本文 `body` は **8,000〜12,000字の日本語**。総合型選抜の課題文にふさわしい説明的・論説的な長文。
- 構成: 背景 → 論点提示 → 複数の立場/視点 → 具体例・データの位置づけ → 含意・残る問い。見出しや段落で読みやすく。
- **事実性の注意（重要）**: 精密な統計・固有の数値を「確定した事実」として捏造しない。数値に触れる場合は「一般に〜とされる」「〜という指摘がある」等の一般化・帰属表現にするか、明示的に例示とわかる書き方にする。実在人物・団体への虚偽帰属をしない。
- 中立的・多面的に書き、断定的な政治的主張は避ける（レポートで生徒が自分の立場を書けるよう論点を開いておく）。
- `focusPoints`: レポートで問う観点を3〜5個（例: 「課題文の主要な論点を要約せよ」「賛否両論を整理し自分の立場を根拠づけよ」等）。
- `recommendedWordLimit`: 1200 程度。`difficulty`: 2。

**3本の割当:**
- **T3a 医療**（field:"medical", fieldLabel:"医療"）: 例「医療資源の配分と優先順位づけ（トリアージ・世代間公平・QOL）」。id: `report-medical-01`。
- **T3b 教育**（field:"education", fieldLabel:"教育"）: 例「学力の測定と評価をめぐる論点（標準テスト・非認知能力・公平性）」。id: `report-education-01`。
- **T3c 社会**（field:"society", fieldLabel:"社会"）: 例「都市化と地域コミュニティの再構築（つながり・孤立・共助）」。id: `report-society-01`。

- [ ] **Step 1 (T3a): 医療の課題文を執筆し配列に追加**（上記要件、約1万字）。
- [ ] **Step 2 (T3a): 検証** — `npx tsx scripts/validate-report-materials.ts`（body 字数レンジ内）＋ `npx tsc --noEmit` PASS。
- [ ] **Step 3 (T3a): Commit** — `git add src/data/essay-report-materials.ts && git commit -m "content(essay): add medical report material"`
- [ ] **Step 4 (T3b): 教育の課題文を追加** → 検証 → `git commit -m "content(essay): add education report material"`
- [ ] **Step 5 (T3c): 社会の課題文を追加** → 検証 → `git commit -m "content(essay): add society report material"`

---

## Task 4: review-core に report 分岐

**Files:** Modify `src/lib/essay/review-core.ts`（clean。`prompts/essay.ts` は触らない）

- [ ] **Step 1: report を扱う**

1. questionContext の生成条件で report を除外（report は questionContext に流さない＝`buildEssayReviewPrompt` の型を触らないため）。`const isReport = input.questionType === "report";` を先頭付近に定義。questionContext 生成は `input.questionType && input.questionType !== "essay" && !isReport` の条件にする。
2. userMessage のラベルを一般化: `sourceText` 差し込みを、report なら `【課題文】`、それ以外は従来 `【出題資料(英文)】` にする:
   ```ts
   if (input.sourceText) {
     const label = isReport ? "【課題文】" : "【出題資料(英文)】";
     userMessage += `${label}\n${input.sourceText}\n\n`;
   }
   ```
3. report のとき、reportInsights を出力させる追加指示を **userMessage 末尾**に付ける（system=prompts/essay.ts は触らない）:
   ```ts
   if (isReport) {
     userMessage +=
       "\n\nこれは上記【課題文】を読んで書く『レポート』です。5観点スコアと通常のfeedbackに加えて、" +
       "JSONの feedback に必ず \"reportInsights\" を含めてください。reportInsights は次のキーを持つオブジェクトです: " +
       "sourceComprehension(課題文の理解度・要点把握), summaryAccuracy(要約・言い換えの正確さ), " +
       "citationAppropriateness(引用/参照の妥当さ), analysisDepth(自分の考察の深さ・独自性), " +
       "sourceConnection(課題文と自論の接続), misreadings(課題文の誤読・事実誤認を指摘する文字列配列)。" +
       "各文字列は具体的な講評にしてください。";
   }
   ```
4. `max_tokens` を report のとき増やす（reportInsights ぶん）: `max_tokens: isReport ? 6000 : 4096`。
5. パースに reportInsights を追加（Firestore undefined 不可＝条件付き spread）。`feedback` 構築に追記:
   ```ts
   const reportInsights = parsed.feedback?.reportInsights
     ? {
         sourceComprehension: parsed.feedback.reportInsights.sourceComprehension ?? "",
         summaryAccuracy: parsed.feedback.reportInsights.summaryAccuracy ?? "",
         citationAppropriateness: parsed.feedback.reportInsights.citationAppropriateness ?? "",
         analysisDepth: parsed.feedback.reportInsights.analysisDepth ?? "",
         sourceConnection: parsed.feedback.reportInsights.sourceConnection ?? "",
         misreadings: parsed.feedback.reportInsights.misreadings ?? [],
       }
     : undefined;
   ```
   そして `feedback` オブジェクトに `...(reportInsights ? { reportInsights } : {})` を追加。`ReportInsights` 型を import に追加。

- [ ] **Step 2: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/lib/essay/review-core.ts` PASS。
- [ ] **Step 3: Commit**
   ```bash
   git add src/lib/essay/review-core.ts
   git commit -m "feat(essay): review-core report branch generating reportInsights"
   ```

---

## Task 5: review route で report を受け渡し

**Files:** Modify `src/app/api/essay/review/route.ts`（clean）

- [ ] **Step 1: sourceType=report を設定**

ファイルを読み、essay ドキュメント作成箇所（homework 用に `sourceType: "homework"` を設定している付近）で、`questionType === "report"` のとき `sourceType: "report"` を essay ドキュメントに設定する。既に `questionType`/`sourceText` は body から取り出して `reviewEssayCore` に渡っているため、AI 経路は Task 4 で完結する。ここでは**保存時の sourceType 区別**だけ追加する。
- 具体: 現行の sourceType 決定ロジック（homework 優先など）に、`questionType==="report"` の分岐を足す（homework でなく report なら `"report"`）。既存 manual/homework の挙動は変えない。
- 必要なら body から `sourceType` を明示的に受けてもよいが、`questionType==="report"` からの導出で十分。

- [ ] **Step 2: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/app/api/essay/review/route.ts` PASS。
- [ ] **Step 3: Commit**
   ```bash
   git add src/app/api/essay/review/route.ts
   git commit -m "feat(essay): mark report submissions with sourceType=report"
   ```

---

## Task 6: 課題文 API

**Files:** Create `src/app/api/essay/report/materials/route.ts`, `src/app/api/essay/report/materials/[id]/route.ts`

- [ ] **Step 1: 一覧 API（field 絞り込み, body は返さない軽量版）**

`materials/route.ts`。既存 essay API の認証流儀（`verifyAuthToken`）に合わせる。まず1つ既存の essay GET ルートを読んで認証・エラー形式を踏襲すること。
```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";
import { getReportMaterialsByField, reportMaterials } from "@/data/essay-report-materials";

/** レポート課題文の一覧（field で絞り込み可）。body は含めない軽量版。 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const field = new URL(request.url).searchParams.get("field");
  const list = field ? getReportMaterialsByField(field) : reportMaterials;
  const items = list.map(({ id, field, fieldLabel, title, focusPoints, recommendedWordLimit, difficulty }) => ({
    id, field, fieldLabel, title, focusPoints, recommendedWordLimit, difficulty,
  }));
  return NextResponse.json({ materials: items });
}
```

- [ ] **Step 2: 1件 API（全文 body 含む）**

`materials/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";
import { getReportMaterialById } from "@/data/essay-report-materials";

/** レポート課題文1件の全文（body 含む）。 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAuthToken(request);
  if (!auth) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const material = getReportMaterialById(id);
  if (!material) return NextResponse.json({ error: "課題文が見つかりません" }, { status: 404 });
  return NextResponse.json(material);
}
```
（`verifyAuthToken` の import パス・使い方は既存 essay ルートに合わせて調整。dev バイパスの要否も既存流儀に従う。）

- [ ] **Step 3: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/app/api/essay/report` PASS。
- [ ] **Step 4: Commit**
   ```bash
   git add src/app/api/essay/report
   git commit -m "feat(essay): report material list and detail APIs"
   ```

---

## Task 7: 課題文読解ペイン

**Files:** Create `src/components/essay/ReportSourcePane.tsx`

- [ ] **Step 1: 読解ペインコンポーネント**

```tsx
"use client";

/** レポート課題文の読解ペイン。約1万字をスクロール表示し、focusPoints を明示する。 */
export function ReportSourcePane({
  title,
  body,
  focusPoints,
}: {
  title: string;
  body: string;
  focusPoints: string[];
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        {focusPoints.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {focusPoints.map((p, i) => (
              <li key={i} className="flex gap-1">
                <span>・</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="max-h-[50vh] overflow-y-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {body}
      </div>
    </div>
  );
}
```
（既存 UI コンポーネント（Card 等）があれば流儀に合わせてよい。スタイルは essay 系の既存スタイルに寄せる。）

- [ ] **Step 2: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/components/essay/ReportSourcePane.tsx` PASS。
- [ ] **Step 3: Commit**
   ```bash
   git add src/components/essay/ReportSourcePane.tsx
   git commit -m "feat(essay): add ReportSourcePane reading component"
   ```

---

## Task 8: essay/new にレポートモード配線

**Files:** Modify `src/app/student/essay/new/page.tsx`（巨大ファイル。外科的に）

ページを読んで最小差分で結線する。契約:

- [ ] **Step 1: モード切替と課題文選択**
- レポートモードの state を追加: `const [reportMode, setReportMode] = useState(false);` と、選択課題文 `const [reportMaterial, setReportMaterial] = useState<ReportMaterial | null>(null);`、field 選択・一覧 state。
- 入力画面の上部に「通常の小論文 / レポート（課題文を読んで書く）」トグルを追加（既存の inputMode 切替 UI の近くに、既存スタイルで）。
- レポートON時: field 選択 → `GET /api/essay/report/materials?field=` で一覧取得（`authFetch`）。**一覧が空の field は「準備中」表示で選択不可**。課題文を選ぶと `GET /api/essay/report/materials/${id}` で全文取得し `reportMaterial` に格納、`ReportSourcePane` を入力エリアの上に表示。
- レポートON時は inputMode を "text" に固定（画像/音読は無効化）。

- [ ] **Step 2: 提出配線**
- 既存の提出（`/api/essay/review` を叩く関数）で、`reportMode && reportMaterial` のとき body に次を上乗せする:
  ```ts
  questionType: "report",
  sourceText: reportMaterial.body,
  topic: reportMaterial.title,
  wordLimit: reportMaterial.recommendedWordLimit,
  ```
  （既存の topic/wordLimit/questionType を持つ提出経路にレポート用の値を載せる。通常モードの挙動は不変。）
- レポートモードでは下書き保存（essayDrafts）は無効/非表示にする（本リリース非対応）。

- [ ] **Step 3: 検証** — `npx tsc --noEmit` PASS、`npx eslint src/app/student/essay/new/page.tsx` 新規エラー増分ゼロ（git stash で HEAD 比較）。`npm run dev` でレポートモード→課題文表示→提出、を目視（controller 確認）。
- [ ] **Step 4: Commit**
   ```bash
   git add src/app/student/essay/new/page.tsx
   git commit -m "feat(essay): report mode selection and submission wiring"
   ```

---

## Task 9: 結果UIに reportInsights ブロック

**Files:** Modify `src/app/student/essay/[id]/page.tsx`

- [ ] **Step 1: reportInsights 描画**
- ファイル内のローカル feedback 型（`goodPoints`/`languageCorrections` 等を持つ interface, 91行付近）に `reportInsights?: ReportInsights;` を追加（型は `@/lib/types/essay` から import、または同型をローカル定義）。
- `result.feedback.reportInsights` が存在するときのみ「レポート観点」ブロックを、既存の goodPoints/improvements ブロックの近く（同じカード/セクションのスタイル）で描画する。表示項目: 課題文理解度(sourceComprehension) / 要約の正確さ(summaryAccuracy) / 引用の妥当性(citationAppropriateness) / 考察の深さ(analysisDepth) / 課題文との接続(sourceConnection) / 誤読の指摘(misreadings: 箇条書き)。
- 5観点レーダーや他の既存ブロックは一切変更しない。

- [ ] **Step 2: 履歴バッジ（任意・同ファイルor履歴一覧）**
- 履歴一覧で `sourceType==="report"` を「レポート」バッジで区別（既存 sourceType 表示に倣う）。履歴一覧の場所（`essay/history` 等）を grep で特定し、既存バッジ表示に1分岐追加。無理なら本 Step はスキップし報告に明記。

- [ ] **Step 3: 検証** — `npx tsc --noEmit` PASS、`npx eslint 'src/app/student/essay/[id]/page.tsx'` 新規エラー増分ゼロ。
- [ ] **Step 4: Commit**
   ```bash
   git add 'src/app/student/essay/[id]/page.tsx'
   git commit -m "feat(essay): render reportInsights block in result view"
   ```

---

## Self-Review（計画者チェック）

**Spec coverage:**
- レポートモード追加（essay/new） → T8。読解ペイン → T7。
- キュレート課題文（執筆同梱） → T2(構造)＋T3(本文3本)。AI実行時生成なし → 設計通り不実装。
- questionType=report＋sourceTextで既存レビュー流用 → T4(review-core)＋T5(route)＋T8(提出)。
- 5観点維持＋reportInsights → T1(型)＋T4(生成)＋T9(表示)。
- pre-modified回避（prompts/essay.ts不触） → T4はreview-coreに閉じる。
- 準備中/下書き非対応 → T8。履歴バッジ → T9。

**Placeholder scan:** コード（T1/T2/T4/T6/T7）は実コード。T3は執筆要件を明示（本文はサブエージェントが生成）。T5/T8/T9は既存巨大ファイルへの結線契約。

**Type consistency:** `ReportInsights`(6キー)/`reportInsights`/`questionType:"report"`/`sourceType:"report"` を T1/T4/T9 で統一。`ReportMaterial`(id/field/fieldLabel/title/body/focusPoints/recommendedWordLimit/difficulty) を T2/T3/T6/T8 で統一。API 形（materials一覧=body無し, [id]=body有り）を T6/T8 で一致。

**未解決（実装時確認）:**
- essay API の `verifyAuthToken` import パス・dev バイパス流儀（T6 で既存ルート踏襲）。
- essay/new の既存提出関数の変数名・inputMode 切替 UI 位置（T8 で読解して適合）。
- 履歴一覧の場所（T9 Step2）。

---

## Execution Handoff

計画を `docs/superpowers/plans/2026-07-12-essay-report-mode.md` に保存。実行は Subagent-Driven（推奨）。課題文執筆（T3）は1本ずつ専用サブエージェントで。

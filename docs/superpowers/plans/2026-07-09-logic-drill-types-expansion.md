# 論理ドリル 型拡張（+6型）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 論理ドリルに6型を追加し全8型に。追加した型はローテーションに入り、ロジカルツアーの論理ドリル駅でも自動で出る。

**Architecture:** 既存 v1（`flaw_finder` / `quick_logic`）の判別ユニオン方式を踏襲。5型はAI3軸採点、`alexandra`(係り受け4択)は**決定的採点(AI不使用)**。型を `LOGIC_DRILL_TYPES` に足すだけでローテーション/ツアーに反映される。

**Tech Stack:** Next.js 16, React 19, TS, Anthropic(既存パターン), Firebase Admin。テストランナー無し→バンク/ロジックは `tsx` 検証スクリプト、他は `tsc`+`eslint`+実機。

**参照する既存実装（拡張対象）:**
- 型: `src/lib/types/logic-drill.ts`
- バンク: `src/data/logic-drills.ts`
- プロンプト: `src/lib/ai/prompts/logic-drill.ts`
- 評価API: `src/app/api/essay/logic-drill/evaluate/route.ts`
- 画面: `src/app/student/essay/logic-drill/page.tsx`（型別の入力UI・result表示）
- 検証: `scripts/validate-logic-drills.ts`
- 設計(v1): `docs/superpowers/specs/2026-07-08-logic-drill-design.md`

**追加する6型（設計）:**
| key | ラベル | 形式 | 採点 |
|---|---|---|---|
| `skeleton` | 骨組み穴埋め | 記述4枠(主張/根拠/具体例/反論応答) | AI3軸 |
| `abstraction` | 具体↔抽象変換 | 記述1（direction指定） | AI3軸 |
| `rebuttal` | 反論想定と応答 | 記述2（最強反論/再反論） | AI3軸 |
| `compare` | 比較・対比して選ぶ | 記述（対比＋選択＋理由） | AI3軸 |
| `question_framing` | 問い(論点)の明確化 | 記述2（立てた問い/理由） | AI3軸 |
| `alexandra` | アレクサンドラ構文(係り受け4択) | 4択(正解あり) | **決定的(AI不使用)** |

---

## Task 1: 型定義の拡張

**Files:** Modify `src/lib/types/logic-drill.ts`

- [ ] **Step 1: 型を拡張**

`LogicDrillType` に6型を追加、ラベルを追加、`LogicDrillItem`/`LogicDrillAnswer` の判別ユニオンに各型を追加、`LogicDrillFeedback` に `mcqCorrect?: boolean` を追加。

```ts
export type LogicDrillType =
  | "flaw_finder"
  | "quick_logic"
  | "skeleton"
  | "abstraction"
  | "rebuttal"
  | "compare"
  | "question_framing"
  | "alexandra";

export const LOGIC_DRILL_TYPES: LogicDrillType[] = [
  "flaw_finder", "quick_logic", "skeleton", "abstraction",
  "rebuttal", "compare", "question_framing", "alexandra",
];

export const LOGIC_DRILL_TYPE_LABELS: Record<LogicDrillType, string> = {
  flaw_finder: "論理の穴さがし",
  quick_logic: "即興ロジック",
  skeleton: "骨組み穴埋め",
  abstraction: "具体↔抽象変換",
  rebuttal: "反論想定と応答",
  compare: "比較・対比して選ぶ",
  question_framing: "問いの明確化",
  alexandra: "アレクサンドラ構文",
};
```

`LogicDrillItem` に追加するメンバー（既存2型はそのまま）:
```ts
  | { id: string; type: "skeleton"; prompt: string /* テーマ */ }
  | { id: string; type: "abstraction"; prompt: string; direction: "concretize" | "abstract" }
  | { id: string; type: "rebuttal"; prompt: string /* 自分の主張/テーマ */ }
  | { id: string; type: "compare"; prompt: string; optionA: string; optionB: string }
  | { id: string; type: "question_framing"; prompt: string /* 曖昧テーマ */ }
  | { id: string; type: "alexandra"; prompt: string /* 難文＋空欄設問 */; choices: string[]; answerIndex: number; explanation: string }
```

`LogicDrillAnswer` に追加するメンバー:
```ts
  | { type: "skeleton"; claim: string; grounds: string; example: string; rebuttal: string }
  | { type: "abstraction"; text: string }
  | { type: "rebuttal"; counterArgument: string; response: string }
  | { type: "compare"; contrast: string; choice: "A" | "B"; reason: string }
  | { type: "question_framing"; question: string; why: string }
  | { type: "alexandra"; selectedIndex: number }
```

`LogicDrillFeedback` に `mcqCorrect?: boolean;`（alexandra 用。flawCorrect と同様）を追加。

- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -iE "logic-drill" | head`（既存の flaw_finder/quick_logic を使う箇所が exhaustive で壊れないか確認）。**exhaustive switch が壊れたら、それは Task 3/4/5 で対応するので、この時点では型定義のみ確認**（型ファイル単体はエラーなし）。
- [ ] **Step 3:** commit `feat(logic-drill): 型定義を6型に拡張`

---

## Task 2: 問題バンクの追加

**Files:** Modify `src/data/logic-drills.ts`

各新型 **10問以上**を追加。既存の `FLAW_FINDER_ITEMS` / `QUICK_LOGIC_ITEMS` に倣い、型別配列を作り `ALL_LOGIC_DRILL_ITEMS` に連結する。

- [ ] **Step 1: 各型の配列を追加**（実装者が中身を執筆。総合型選抜の小論文・面接に資する日本語）
  - `SKELETON_ITEMS`（≥10）: `prompt` = 論じるテーマ（例「地方創生に若者の力は不可欠か」）
  - `ABSTRACTION_ITEMS`（≥10）: `prompt` ＋ `direction`。concretize(抽象→具体) と abstract(具体→抽象) を両方含める
  - `REBUTTAL_ITEMS`（≥10）: `prompt` = 主張/テーマ
  - `COMPARE_ITEMS`（≥10）: `prompt`（問い）＋ `optionA` ＋ `optionB`
  - `QUESTION_FRAMING_ITEMS`（≥10）: `prompt` = 曖昧なテーマ（例「AIと教育」）
  - `ALEXANDRA_ITEMS`（≥10）: `prompt` = 係り受けが紛らわしい文＋空欄設問、`choices`（4つ）、`answerIndex`(0-3)、`explanation`。**係り受けの正確な読解**を問う（例: 「AはBの愛称でもCの愛称でもある。Bの愛称は（　）」→正解を4択で）
- [ ] **Step 2:** `ALL_LOGIC_DRILL_ITEMS` と `getLogicDrillItemsByType` が新型を含むことを確認（既存の連結に追記）
- [ ] **Step 3:** `npx tsc --noEmit 2>&1 | grep -i "data/logic-drills" || echo clean` → clean（Task 4 の検証で件数チェック）
- [ ] **Step 4:** commit `feat(logic-drill): 6型の問題バンクを追加`

---

## Task 3: 検証スクリプトの拡張

**Files:** Modify `scripts/validate-logic-drills.ts`

- [ ] **Step 1: 全8型のチェックを追加**
  - 全型 `getLogicDrillItemsByType(type).length >= 10`
  - `alexandra`: 各 item の `choices.length === 4` かつ `0 <= answerIndex < 4` かつ `explanation` 非空
  - `abstraction`: 各 item の `direction` が "concretize" | "abstract"
  - `compare`: `optionA`/`optionB` 非空
  - 既存の flaw_finder 被覆チェックは維持
- [ ] **Step 2:** `npx tsx scripts/validate-logic-drills.ts` → PASS（不足なら Task 2 のバンクを補充）
- [ ] **Step 3:** commit `feat(logic-drill): 検証を8型に拡張`

---

## Task 4: 採点プロンプト＋評価APIの拡張

**Files:** Modify `src/lib/ai/prompts/logic-drill.ts`, `src/app/api/essay/logic-drill/evaluate/route.ts`

- [ ] **Step 1: プロンプトビルダに5型を追加**（`skeleton`/`abstraction`/`rebuttal`/`compare`/`question_framing`）
  - 既存 `buildLogicDrillPrompt(item, answer)` の分岐に各型を追加。共通の3軸JSON（consistency/validity/structure）＋型別の採点観点・`modelAnswer` を返させる。`alexandra` はこの関数に来ない（下記でAPI側が決定的処理）。
- [ ] **Step 2: 評価APIに alexandra の決定的分岐を追加**
  - `drillType === "alexandra"` の場合、**Anthropicを呼ばず**、`answer.selectedIndex === item.answerIndex` を判定。
  - 返却/保存する `LogicDrillResult`:
    - `scores` = 正解なら `{consistency:5, validity:5, structure:5}`、不正解なら `{consistency:0, validity:0, structure:0}`（履歴/ヒートマップの整合のため固定）
    - `feedback` = `{ good: 正解時の一言, improve: 不正解時の指摘, mcqCorrect: <boolean>, modelAnswer: item.explanation }`
  - それ以外の型は従来どおり `buildLogicDrillPrompt` → Anthropic 採点。
  - 既存の `users/{uid}/logicDrills` 保存はそのまま（型が増えても record 形状は同一）。
- [ ] **Step 3:** `npx tsc --noEmit` 0エラー / 該当ファイル eslint クリーン
- [ ] **Step 4:** commit `feat(logic-drill): 採点プロンプト5型＋アレクサンドラ決定的採点を追加`

---

## Task 5: 画面（入力UI＋結果）の拡張

**Files:** Modify `src/app/student/essay/logic-drill/page.tsx`

既存の `step === "drill"` 型別ブロック（flaw_finder/quick_logic）に倣い、各新型の入力UIと `answer` 構築を追加。`step === "result"` に alexandra の正誤表示を追加。

- [ ] **Step 1: 各型の入力UIを追加**
  - `skeleton`: テーマ表示＋4つの Textarea（主張/根拠/具体例/反論応答）→ answer 構築
  - `abstraction`: `direction` に応じた指示文＋1 Textarea（concretize=「この抽象論を具体例で」/abstract=「この事例を一般化して主張化」）
  - `rebuttal`: テーマ表示＋2 Textarea（最強の反論/それへの応答）
  - `compare`: 問い＋optionA/optionB 表示＋対比 Textarea＋A/B トグル＋理由 Textarea
  - `question_framing`: 曖昧テーマ表示＋2 Textarea（立てた問い/なぜその問いか）
  - `alexandra`: 難文＋設問表示＋**4択ラジオ**（選択のみ）
  - `answer` の useMemo 分岐に各型を追加（未入力時は null＝送信不可）
- [ ] **Step 2: result 表示に alexandra を追加**
  - `feedback.mcqCorrect !== undefined` のとき、**正解/不正解バッジ＋解説(modelAnswer)** を目立たせる（3軸スコアは 5/0 固定なので、alexandra では簡易表示にしてもよい）。他型は従来の3軸表示。
- [ ] **Step 3:** `npx tsc --noEmit` 0エラー / 該当ファイル eslint 新規エラーなし
- [ ] **Step 4:** commit `feat(logic-drill): 6型の入力UIとアレクサンドラ結果表示を追加`

---

## Task 6: 総合検証（ローテーション/ツアー自動反映の確認）

- [ ] **Step 1:** `npx tsx scripts/validate-logic-drills.ts` → PASS（全8型≥10問）
- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -c "error TS"` → 0
- [ ] **Step 3:** 触った全ファイル eslint → 新規エラーなし
- [ ] **Step 4: ローテーション/ツアー確認（コード）**: `LOGIC_DRILL_TYPES` に8型入っている＝`getRotatedLogicDrillType` が8型を巡回＝ツアーの論理ドリル駅(`?tour=1`)でも8型が出る（追加のコード変更不要）。`src/lib/logic-drill/rotation.ts` は型数非依存で動くことを確認。
- [ ] **Step 5: 実機スモーク（デプロイ後）**
  1. 論理ドリルの select に8型が並ぶ／今日のおすすめが日替わりで変わる
  2. 各型で入力→採点→結果が出る（記述5型は3軸＋赤ペン、alexandra は正誤＋解説）
  3. alexandra は選択→即座に正誤判定（AI待ちなし）
  4. `?type=<新型>` 直リンクで各型に直行
  5. ツアーの論理ドリル駅で新型も出る
  6. 履歴・活動状況ヒートマップに記録される
- [ ] **Step 6:** 残差分あれば commit `chore(logic-drill): 総合検証と微修正`

---

## Self-Review（計画の自己点検）

**1. 要件網羅:** 6型追加（記述5＋4択1）→ Task1(型)/2(バンク)/3(検証)/4(採点)/5(UI) ✅。ツアー反映は `LOGIC_DRILL_TYPES` 追加で自動（Task6で確認）✅。アレクサンドラは決定的採点でAIコスト0・即時 ✅。

**2. プレースホルダ走査:** 型定義（Task1）は完全コード。バンク中身（Task2）は「≥10問・構造指定」を検証スクリプト(Task3)が機械強制。プロンプト/UI(Task4/5)は既存2型の実パターンを名指しで踏襲＋型別の具体指示。曖昧放置なし。

**3. 型整合:** `LogicDrillType`(8) / `LogicDrillItem` / `LogicDrillAnswer` の判別ユニオンは Task1 で一括定義し、Task2(item)/4(answer消費)/5(answer構築) で同名参照。`LogicDrillRecord` 形状は不変（型が増えても scores/feedback は共通）。`mcqCorrect` は `flawCorrect` と同じ扱いで追加。

**留意点（実装者向け）:**
- Task1後、既存の exhaustive な `switch(type)` や `Record<LogicDrillType,...>`（例: ラベルmap、adminのヒートマップ系にlogicDrill色等）で**新キー不足のts:2741が出る箇所**は Task4/5 で対応。Task1単体commit時点でtscに型網羅エラーが出るのは想定内（後続タスクで解消）。
- alexandra の `scores` 5/0 固定は「活動量/履歴の整合」目的。将来、読解専用の指標を足すなら別途。

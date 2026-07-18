# 出願書類: 削除ボタン一般化 + AIっぽさチェッカー Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 出願書類の削除ボタンを全書類に出せるようにし、下書きに「AIっぽさチェッカー（Claude判定）」と提出時のソフト警告を追加する。

**Architecture:** 削除はUIガードの一般化のみ（API変更なし）。AIっぽさは既存のAI添削（`/review`）と同じ Anthropic 呼び出しパターンで新API `/ai-check` を追加し、結果を `documents/{id}.aiLikeness` に永続化。生徒エディタの `ReviewPanel` に判定カードを足し、ステータスを draft→in_review に変える瞬間だけソフト警告ダイアログを出す。管理者一覧にもスコアを表示する。

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript / Tailwind + shadcn/ui / Firebase Admin SDK / Anthropic SDK (`claude-sonnet-4-6`)

**検証方針:** このリポジトリには単体テストのフレームワークがない（Playwrightの依存のみ・テスト未使用）。CLAUDE.md の完了条件（`npm run build` 成功・`npm run lint`・実画面での挙動確認）に従い、純ロジックのみ `scripts/` の tsx 検証スクリプト（既存 `verify:choco` と同系）で確認する。

---

## File Structure

新規:
- `src/app/api/documents/[id]/ai-check/route.ts` — AIっぽさ判定API（Anthropic呼び出し + 永続化）
- `src/lib/ai/prompts/ai-likeness.ts` — 判定プロンプト生成
- `scripts/verify-ai-likeness-level.ts` — `aiLikenessLevel` の純ロジック検証

変更:
- `src/lib/types/document.ts` — `DocumentAiLikeness` 型 + `aiLikenessLevel()` + `AI_LIKENESS_SUBMIT_THRESHOLD`
- `src/app/student/documents/page.tsx` — 削除ボタンを全書類に一般化
- `src/app/student/documents/[id]/page.tsx` — AIっぽさカード + 配線 + 提出ソフト警告ゲート
- `src/app/api/admin/students/[id]/documents/route.ts` — レスポンスに `aiLikeness` を含める
- `src/components/admin/DocumentsSection.tsx` — `aiLikeness` を表示

各タスクは独立してビルドが通る単位。Task 1（削除）は他と依存なし。Task 2→3→4→5→6 はAIっぽさ機能の積み上げ。Task 7 は管理者表示。

---

### Task 1: 削除ボタンを全書類に一般化

**Files:**
- Modify: `src/app/student/documents/page.tsx:230-276`（削除ボタンの表示ガードと文言）

作成途中だけに出ていた削除（破棄）ボタンを、所有者の全書類に出す。既存の2段階インライン確認UIと `handleDiscard` はそのまま使い、表示ガード `isWizardIncomplete(doc) &&` を外して文言だけ状態で切り替える。`isWizardIncomplete` 関数自体はバッジ/リンク先切替で使い続けるので残す。

- [ ] **Step 1: 削除ボタンの文言ヘルパーを追加**

`src/app/student/documents/page.tsx` の `isWizardIncomplete` 定義（48行目）の直後に、状態別の文言ヘルパーを追加する。

```tsx
  /** 削除ボタン・確認文の文言を書類の状態で出し分ける。 */
  const deleteLabels = (d: Document) => {
    if (isWizardIncomplete(d)) {
      return { action: "破棄", confirm: "破棄しますか？", running: "破棄中..." };
    }
    if (d.status === "in_review" || d.status === "reviewed" || d.status === "final") {
      return {
        action: "削除",
        confirm: "提出済みの書類です。削除すると元に戻せません。削除しますか？",
        running: "削除中...",
      };
    }
    return { action: "削除", confirm: "削除しますか？", running: "削除中..." };
  };
```

- [ ] **Step 2: 表示ガードを外して全書類にボタンを出す**

`src/app/student/documents/page.tsx:230-276` の削除ブロックを、以下で置き換える（先頭の `{isWizardIncomplete(doc) &&` ガードを撤去し、`deleteLabels(doc)` の文言を使う）。直前の `{doc.status === "final" && (<CheckCircle .../>) }` ブロック（227-229行）は変更しない。

```tsx
                          {(() => {
                            const labels = deleteLabels(doc);
                            return confirmingDiscardId === doc.id ? (
                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-xs text-muted-foreground">{labels.confirm}</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={discardingId === doc.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleDiscard(doc.id);
                                  }}
                                >
                                  {discardingId === doc.id ? labels.running : `${labels.action}する`}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={discardingId === doc.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmingDiscardId(null);
                                  }}
                                >
                                  キャンセル
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                aria-label={labels.action}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setConfirmingDiscardId(doc.id);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            );
                          })()}
```

- [ ] **Step 3: ビルドとlintで確認**

Run: `npm run lint && npm run build`
Expected: エラーなく完了（`rm -rf .next && validate:data && next build` が成功）

- [ ] **Step 4: 実画面で挙動確認**

Run: `npm run dev` → `/student/documents` を開く
Expected: 本文入りの下書き・レビュー中の書類カードにもゴミ箱アイコンが出る。クリックで確認文（提出済みは警告文）が出て、「削除する」で一覧から消える。「キャンセル」で戻る。

- [ ] **Step 5: コミット**

```bash
git add src/app/student/documents/page.tsx
git commit -m "feat(documents): 削除ボタンを全書類に表示（作成途中限定を撤廃）"
```

---

### Task 2: AIっぽさ型と level ヘルパー + 検証スクリプト

**Files:**
- Modify: `src/lib/types/document.ts`（末尾に型・ヘルパー・定数を追加）
- Create: `scripts/verify-ai-likeness-level.ts`

- [ ] **Step 1: 型・ヘルパー・閾値を追加**

`src/lib/types/document.ts` の末尾（107行目、`DOCUMENT_REVIEW_LABELS` の閉じ括弧の後）に追加する。

```ts

export type DocumentAiLikenessLevel = "low" | "medium" | "high";

/**
 * 下書きの「AIっぽさ」判定結果（最新1件のみ保持）。
 * score が高いほどAIっぽい。level は score から機械的に導出する。
 */
export interface DocumentAiLikeness {
  /** 0-100。高いほどAIっぽい */
  score: number;
  /** low 0-39 / medium 40-69 / high 70-100 */
  level: DocumentAiLikenessLevel;
  /** AIっぽいと判定した根拠（生徒向けの平易な日本語） */
  reasons: string[];
  /** 人間らしくする具体的な直し方 */
  suggestions: string[];
  /** 判定実行時刻（ISO文字列） */
  checkedAt: string;
  /** 判定時の本文文字数。現在の wordCount と異なれば「再チェック推奨」を出す */
  checkedWordCount: number;
}

/** score から AIっぽさ level を導出する。境界: 40, 70。 */
export function aiLikenessLevel(score: number): DocumentAiLikenessLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** 提出（draft→in_review）時にソフト警告を出す AIっぽさスコアの閾値。 */
export const AI_LIKENESS_SUBMIT_THRESHOLD = 60;

export const AI_LIKENESS_LEVEL_LABELS: Record<DocumentAiLikenessLevel, string> = {
  low: "人間らしい",
  medium: "要改善",
  high: "AIっぽい",
};
```

そして `Document` インターフェース（44行目 `status: DocumentStatus;` の直後）に1行追加する。

```ts
  /** AIっぽさ判定の最新結果 */
  aiLikeness?: DocumentAiLikeness;
```

- [ ] **Step 2: 検証スクリプトを書く**

Create `scripts/verify-ai-likeness-level.ts`:

```ts
/**
 * aiLikenessLevel の境界値を検証する簡易スクリプト。
 * 実行: npx tsx scripts/verify-ai-likeness-level.ts
 */
import { aiLikenessLevel, AI_LIKENESS_SUBMIT_THRESHOLD } from "../src/lib/types/document";

const cases: [number, "low" | "medium" | "high"][] = [
  [0, "low"],
  [39, "low"],
  [40, "medium"],
  [69, "medium"],
  [70, "high"],
  [100, "high"],
];

let failed = 0;
for (const [score, expected] of cases) {
  const actual = aiLikenessLevel(score);
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} score=${score} -> ${actual} (expected ${expected})`);
}

// 閾値 60 は medium 帯に入っていること（設計整合）
const thresholdLevel = aiLikenessLevel(AI_LIKENESS_SUBMIT_THRESHOLD);
const thresholdOk = thresholdLevel === "medium";
if (!thresholdOk) failed++;
console.log(
  `${thresholdOk ? "PASS" : "FAIL"} threshold=${AI_LIKENESS_SUBMIT_THRESHOLD} -> ${thresholdLevel} (expected medium)`
);

if (failed > 0) {
  console.error(`\n${failed} 件失敗`);
  process.exit(1);
}
console.log("\nすべてPASS");
```

- [ ] **Step 3: 検証スクリプトを実行**

Run: `npx tsx scripts/verify-ai-likeness-level.ts`
Expected: すべて `PASS` と出て「すべてPASS」で終了（exit 0）

- [ ] **Step 4: 型チェック（ビルド）**

Run: `npm run build`
Expected: エラーなく完了

- [ ] **Step 5: コミット**

```bash
git add src/lib/types/document.ts scripts/verify-ai-likeness-level.ts
git commit -m "feat(documents): AIっぽさ判定の型・level導出・閾値を追加"
```

---

### Task 3: AIっぽさ判定プロンプト

**Files:**
- Create: `src/lib/ai/prompts/ai-likeness.ts`

- [ ] **Step 1: プロンプト生成関数を書く**

Create `src/lib/ai/prompts/ai-likeness.ts`:

```ts
/**
 * 出願書類の「AIっぽさ」を判定するシステムプロンプトを生成する。
 * 総合型選抜では自分の体験・言葉が評価されるため、AI生成に典型的な特徴を検出し、
 * 人間らしく直すための具体的な提案を返させる。出力は厳密なJSON。
 * @param documentType 書類タイプ（志望理由書 等）
 * @param universityName 大学名
 * @param facultyName 学部名
 */
export function buildAiLikenessPrompt(
  documentType: string,
  universityName: string,
  facultyName: string
): string {
  return `あなたは総合型選抜（旧AO入試）の出願書類を長年見てきた添削者です。
提出されたのは「${universityName} ${facultyName}」向けの「${documentType}」の下書きです。

あなたの仕事は、この文章が「AIが生成したような没個性的な文章」になっていないかを判定することです。
合否そのものではなく、「本人の体験・言葉で書けているか（人間らしさ）」だけを見てください。

# AIっぽさの主な観点（高いほどAIっぽい）
1. 具体的な自分の体験・エピソードの欠如（固有名詞・数値・その人固有の状況が乏しい）
2. テンプレ的・汎用的な言い回しの多用（誰にでも書ける一般論）
3. 抽象語・バズワードへの依存（例:「多角的な視点」「深く学びたい」「貢献したい」の中身が空）
4. 文の長さ・リズムが均一で機械的に整いすぎている
5. 一人称の実感・当事者性の薄さ（感情や葛藤、具体的な行動が見えない）

# スコアリング
- 0-39: 人間らしい（自分の体験・言葉で書けている）
- 40-69: 要改善（部分的にAIっぽい／一般論が混じる）
- 70-100: AIっぽい（没個性・テンプレ的で本人が見えない）

# 出力形式（厳密なJSONのみ。前後に説明文を付けない）
\`\`\`json
{
  "score": 0から100の整数,
  "reasons": ["AIっぽいと判定した根拠を生徒に分かる平易な日本語で3〜5個"],
  "suggestions": ["どの部分をどう自分の言葉・体験に直すか、具体的な行動を3〜5個"]
}
\`\`\`

reasons と suggestions は必ず日本語。suggestions は「〜という一文を、実際にあった出来事に置き換える」のように具体的に書くこと。`;
}
```

- [ ] **Step 2: 型チェック（ビルド）**

Run: `npm run build`
Expected: エラーなく完了（未使用でもエクスポートは通る）

- [ ] **Step 3: コミット**

```bash
git add src/lib/ai/prompts/ai-likeness.ts
git commit -m "feat(documents): AIっぽさ判定プロンプトを追加"
```

---

### Task 4: AIっぽさ判定API

**Files:**
- Create: `src/app/api/documents/[id]/ai-check/route.ts`

`/review` の Anthropic 呼び出し + `[id]/route.ts` の adminDb 所有者チェックを組み合わせる。結果を `documents/{id}.aiLikeness` に永続化してから返す。

- [ ] **Step 1: APIルートを書く**

Create `src/app/api/documents/[id]/ai-check/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildAiLikenessPrompt } from "@/lib/ai/prompts/ai-likeness";
import { aiLikenessLevel } from "@/lib/types/document";
import type { DocumentAiLikeness } from "@/lib/types/document";

/**
 * 指定書類の本文の「AIっぽさ」を判定し、結果を documents/{id}.aiLikeness に保存して返す。
 * グローバル documents コレクション + userId 所有者チェック。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { id } = await params;
    const docRef = adminDb.doc(`documents/${id}`);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }
    const data = existing.data();
    if (data?.userId !== auth.uid) {
      return NextResponse.json({ error: "この書類へのアクセス権がありません" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const content: string = typeof body.content === "string" ? body.content : (data?.content ?? "");
    if (!content.trim()) {
      return NextResponse.json({ error: "content は必須です" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const client = new Anthropic();
    const systemPrompt = buildAiLikenessPrompt(
      data?.type ?? "出願書類",
      data?.universityName ?? "未指定",
      data?.facultyName ?? "未指定"
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.error("Could not parse AI likeness response:", rawText);
      return NextResponse.json({ error: "AIレスポンスの解析に失敗しました" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const aiLikeness: DocumentAiLikeness = {
      score,
      level: aiLikenessLevel(score),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 8).map(String) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 8).map(String) : [],
      checkedAt: new Date().toISOString(),
      checkedWordCount: content.length,
    };

    await docRef.update({ aiLikeness });

    return NextResponse.json({ aiLikeness, documentId: id });
  } catch (error) {
    console.error("Document ai-likeness error:", error);
    return NextResponse.json(
      { error: "AIっぽさ判定中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 型チェック（ビルド）**

Run: `npm run build`
Expected: エラーなく完了

- [ ] **Step 3: コミット**

```bash
git add "src/app/api/documents/[id]/ai-check/route.ts"
git commit -m "feat(documents): AIっぽさ判定API /ai-check を追加"
```

---

### Task 5: 生徒UI — AIっぽさカード + 配線

**Files:**
- Modify: `src/app/student/documents/[id]/page.tsx`（state・handler・ReviewPanel props・カード）

- [ ] **Step 1: import に型・定数・アイコンを追加**

`src/app/student/documents/[id]/page.tsx` の import を修正する。

26行目を置き換え:
```tsx
import type { Document, DocumentFeedback, DocumentStatus, DocumentAiLikeness } from "@/lib/types/document";
```
27行目を置き換え:
```tsx
import { DOCUMENT_STATUS_LABELS, AI_LIKENESS_LEVEL_LABELS, AI_LIKENESS_SUBMIT_THRESHOLD } from "@/lib/types/document";
```
lucide-react の import（18-25行）に `ShieldCheck` を追加:
```tsx
import {
  ArrowLeft,
  Save,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
```

- [ ] **Step 2: AIっぽさ用の state を追加**

`const [mobileTab, ...]`（69行目）の直後に追加:
```tsx
  const [aiLikeness, setAiLikeness] = useState<DocumentAiLikeness | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
```

- [ ] **Step 3: loadDocument で aiLikeness を復元**

`setContent(data.content);`（78行目）の直後に追加:
```tsx
      setAiLikeness(data.aiLikeness ?? null);
```

- [ ] **Step 4: handleAiCheck を追加**

`handleReview` 関数（151-176行）の閉じ括弧の直後に追加:
```tsx

  async function handleAiCheck() {
    if (!doc || !content.trim()) return;
    setAiChecking(true);
    try {
      const res = await authFetch(`/api/documents/${id}/ai-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiLikeness(data.aiLikeness);
      }
    } catch {
      // silent
    } finally {
      setAiChecking(false);
    }
  }
```

- [ ] **Step 5: 提出ゲート用の state を追加**

Step 2 で足した2つの state の直後に追加:
```tsx
  const [submitGateOpen, setSubmitGateOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DocumentStatus | null>(null);
```

- [ ] **Step 6: handleStatusChange を提出ゲート対応に置き換え**

`handleStatusChange`（178-190行）を、次の2関数で置き換える。`wordCount` は関数内では未定義なので `content.length` を使う。

```tsx
  async function commitStatus(status: DocumentStatus) {
    if (!doc) return;
    try {
      await authFetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setDoc({ ...doc, status });
    } catch {
      // silent
    }
  }

  /**
   * ステータス変更。draft→in_review（提出）のときだけ AIっぽさをソフト警告する。
   * 未チェック / 本文がチェック後に変わった / スコアが閾値以上 のいずれかで確認ダイアログを出す。
   */
  async function handleStatusChange(next: DocumentStatus) {
    if (!doc) return;
    if (doc.status === "draft" && next === "in_review") {
      const stale = aiLikeness != null && aiLikeness.checkedWordCount !== content.length;
      const risky = aiLikeness == null || stale || aiLikeness.score >= AI_LIKENESS_SUBMIT_THRESHOLD;
      if (risky) {
        setPendingStatus(next);
        setSubmitGateOpen(true);
        return;
      }
    }
    await commitStatus(next);
  }
```

- [ ] **Step 7: Dialog を import**

import 群の末尾（`import { authFetch } ...` の後、30行目付近）に追加:
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
```

- [ ] **Step 8: 提出ゲートのダイアログを描画**

`return (` 直後の最外 `<div ...>`（219行目）の中、いちばん最後（315行目付近、Desktop layout の `</div>` の後・最外 `</div>` の前）に追加:
```tsx
      <Dialog open={submitGateOpen} onOpenChange={setSubmitGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>このまま提出しますか？</DialogTitle>
            <DialogDescription>
              AIっぽさが高いまま、または未チェックです。自分の体験や言葉を加えてから提出することをおすすめします。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitGateOpen(false);
                setPendingStatus(null);
              }}
            >
              戻って直す
            </Button>
            <Button
              onClick={() => {
                setSubmitGateOpen(false);
                if (pendingStatus) void commitStatus(pendingStatus);
                setPendingStatus(null);
              }}
            >
              このまま提出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 9: ReviewPanel の呼び出し2箇所に props を追加**

モバイル用（276-284行）とデスクトップ用（305-313行）の `<ReviewPanel ... />` それぞれに、以下3つの props を追加する（両方に同じ内容）。
```tsx
            aiLikeness={aiLikeness}
            aiChecking={aiChecking}
            onAiCheck={handleAiCheck}
            currentWordCount={wordCount}
```

- [ ] **Step 10: ReviewPanel の型に props を追加**

`ReviewPanel` の関数シグネチャ（398-414行）の props 型に追加する。既存の型定義:
```tsx
function ReviewPanel({
  feedback,
  reviewing,
  onReview,
  contentEmpty,
  versions,
  showVersions,
  setShowVersions,
}: {
  feedback: DocumentFeedback | null;
  reviewing: boolean;
  onReview: () => void;
  contentEmpty: boolean;
  versions: Document["versions"];
  showVersions: boolean;
  setShowVersions: (v: boolean) => void;
}) {
```
を、次で置き換える:
```tsx
function ReviewPanel({
  feedback,
  reviewing,
  onReview,
  contentEmpty,
  versions,
  showVersions,
  setShowVersions,
  aiLikeness,
  aiChecking,
  onAiCheck,
  currentWordCount,
}: {
  feedback: DocumentFeedback | null;
  reviewing: boolean;
  onReview: () => void;
  contentEmpty: boolean;
  versions: Document["versions"];
  showVersions: boolean;
  setShowVersions: (v: boolean) => void;
  aiLikeness: DocumentAiLikeness | null;
  aiChecking: boolean;
  onAiCheck: () => void;
  currentWordCount: number;
}) {
```

- [ ] **Step 11: AIっぽさカードを ReviewPanel に追加**

`ReviewPanel` の `return (<div className="space-y-4">` の中、「AI Review」カード（`{/* AI Review */}` の Card）の閉じタグ `</Card>` の直後（480行目付近、Version History の Card の前）に、AIっぽさカードを挿入する。

```tsx
      {/* AIっぽさチェック */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4" />
            AIっぽさチェック
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={onAiCheck}
            disabled={aiChecking || contentEmpty}
          >
            <ShieldCheck className="size-4 mr-2" />
            {aiChecking ? "チェック中..." : "AIっぽさをチェック"}
          </Button>

          {aiLikeness && (
            <>
              <Separator />
              {aiLikeness.checkedWordCount !== currentWordCount && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  本文が変わりました。もう一度チェックしてください。
                </p>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>AIっぽさ</span>
                  <span className="font-medium">
                    {aiLikeness.score}/100（{AI_LIKENESS_LEVEL_LABELS[aiLikeness.level]}）
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={
                      "rounded-full h-2 transition-all " +
                      (aiLikeness.level === "high"
                        ? "bg-rose-500"
                        : aiLikeness.level === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500")
                    }
                    style={{ width: `${aiLikeness.score}%` }}
                  />
                </div>
              </div>

              {aiLikeness.reasons.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">AIっぽいと判定した理由</p>
                    <ul className="space-y-1">
                      {aiLikeness.reasons.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-rose-500 shrink-0">-</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {aiLikeness.suggestions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">人間らしくする直し方</p>
                    <ul className="space-y-1">
                      {aiLikeness.suggestions.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-emerald-500 shrink-0">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
```

- [ ] **Step 12: ビルドとlintで確認**

Run: `npm run lint && npm run build`
Expected: エラーなく完了

- [ ] **Step 13: 実画面で挙動確認**

Run: `npm run dev` → 適当な書類の `/student/documents/{id}` を開く
Expected:
- ReviewPanel に「AIっぽさチェック」カードが出る。実行するとスコア・理由・直し方が出る（`ANTHROPIC_API_KEY` 未設定環境では503でスコアは出ない＝挙動確認は本番/キー設定環境で行う）。
- チェック後に本文を編集すると「本文が変わりました」が出る。
- ステータスを「下書き」→「レビュー中」に変えると、未チェック/高スコア時に確認ダイアログが出る。「このまま提出」でレビュー中になり、「戻って直す」で下書きのまま。

- [ ] **Step 14: コミット**

```bash
git add "src/app/student/documents/[id]/page.tsx"
git commit -m "feat(documents): AIっぽさチェックUIと提出ソフト警告を追加"
```

---

### Task 6: 管理者一覧に AIっぽさを表示

**Files:**
- Modify: `src/app/api/admin/students/[id]/documents/route.ts`（レスポンスに `aiLikeness` を追加）
- Modify: `src/components/admin/DocumentsSection.tsx`（型と表示）

- [ ] **Step 1: 管理者APIの型とマッピングに aiLikeness を追加**

`src/app/api/admin/students/[id]/documents/route.ts` の import（5行目）に型を追加:
```ts
import type { DocumentStatus, DocumentReview, DocumentAiLikeness } from "@/lib/types/document";
```
`DocumentListItem` interface の `aiScore?` ブロックの直後（`}` の前）に追加:
```ts
  aiLikeness?: DocumentAiLikeness;
```
`documents` の map で返すオブジェクト（`aiScore: feedback ? {...} : undefined,` の直後）に追加:
```ts
        aiLikeness: (data.aiLikeness as DocumentAiLikeness) ?? undefined,
```

- [ ] **Step 2: DocumentsSection の型に aiLikeness を追加**

`src/components/admin/DocumentsSection.tsx` の import に型を足す。ファイル冒頭の document 型 import 行（`DocumentStatus, DocumentReview` を import している箇所）に `DocumentAiLikeness` と `AI_LIKENESS_LEVEL_LABELS` を追加する。該当行を確認して:
```tsx
import type { DocumentStatus, DocumentReview, DocumentAiLikeness } from "@/lib/types/document";
import { AI_LIKENESS_LEVEL_LABELS } from "@/lib/types/document";
```
（既存の import 形に合わせる。既に `AI_LIKENESS_LEVEL_LABELS` を value import する行がなければ新規追加。）

`DocumentListItem` interface（28-41行）の `aiScore?` ブロックの直後に追加:
```tsx
  aiLikeness?: {
    score: number;
    level: "low" | "medium" | "high";
    reasons: string[];
    suggestions: string[];
    checkedAt: string;
    checkedWordCount: number;
  };
```

- [ ] **Step 3: AIっぽさを一覧セルに表示**

`src/components/admin/DocumentsSection.tsx` の aiScore 表示セル（225-233行）を、AIっぽさ表示を足した次の内容で置き換える。

```tsx
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {doc.aiScore ? (
                            <span className="text-xs">
                              AP:{doc.aiScore.apAlignment} 構成:{doc.aiScore.structure} 独自:{doc.aiScore.originality}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          {doc.aiLikeness && (
                            <span
                              className={
                                "block text-[10px] mt-0.5 " +
                                (doc.aiLikeness.level === "high"
                                  ? "text-rose-500"
                                  : doc.aiLikeness.level === "medium"
                                    ? "text-amber-500"
                                    : "text-emerald-500")
                              }
                            >
                              AI度:{doc.aiLikeness.score}（{AI_LIKENESS_LEVEL_LABELS[doc.aiLikeness.level]}）
                            </span>
                          )}
                        </td>
```

- [ ] **Step 4: ビルドとlintで確認**

Run: `npm run lint && npm run build`
Expected: エラーなく完了

- [ ] **Step 5: 実画面で挙動確認**

Run: `npm run dev` → 管理者で `/admin/students/{id}` を開く
Expected: 書類一覧のスコア列に、AIっぽさチェック済みの書類は「AI度:NN（ラベル）」が色付きで出る。未チェックは何も出ない。

- [ ] **Step 6: コミット**

```bash
git add "src/app/api/admin/students/[id]/documents/route.ts" src/components/admin/DocumentsSection.tsx
git commit -m "feat(documents): 管理者一覧にAIっぽさスコアを表示"
```

---

## Self-Review

- **Spec coverage:**
  - A 削除ボタン一般化 → Task 1 ✓
  - B データモデル → Task 2 ✓ / プロンプト → Task 3 ✓ / API → Task 4 ✓ / 生徒UI → Task 5 ✓ / 管理者表示 → Task 6 ✓
  - C 提出ソフト警告ゲート → Task 5（Step 5-8）✓
  - スコア帯 low/medium/high（40,70境界）と閾値60（medium帯）→ Task 2 で定義・検証 ✓
- **型整合:** `aiLikenessLevel`・`DocumentAiLikeness`・`AI_LIKENESS_SUBMIT_THRESHOLD`・`AI_LIKENESS_LEVEL_LABELS` を Task 2 で定義し、Task 4/5/6 で同名参照。API・クライアント・管理者で `aiLikeness` フィールド名一致。
- **プレースホルダ:** なし（全ステップに実コードと具体コマンド）。
- **既知の前提:** AIっぽさ判定は `ANTHROPIC_API_KEY` 設定環境でのみ実スコアが返る（未設定は503）。既存 `/review` と同じ制約。
```

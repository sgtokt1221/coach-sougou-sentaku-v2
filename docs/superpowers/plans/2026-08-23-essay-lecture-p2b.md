# 小論文講座リニューアル P2b 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 文のドリルを「自分が実際に間違えた文で、自分で直す」形にする。あわせて関連ドリルへの導線と、管理者が「どの講で詰まっているか」を見る画面を足す。

**Architecture:** 個人最適化と書き直し式は**同じ機能の裏表**なので1つにまとめる。本添削が既に出している赤ペン（`feedback.languageCorrections` の `original` / `suggestion` / `type` / `reason`）を素材にすれば、選択肢を作る必要がない。生徒は自分の文を直し、AI は「元の文・AIの直し案・生徒の直し」を突き合わせて判定する。**5問ぶんを1回のAI呼び出しでまとめて判定**してコストを抑える。

**Tech Stack:** Next.js 16 / TypeScript strict / Firebase Admin SDK / `@anthropic-ai/sdk`（`messages.parse` + zod スキーマ）/ 検証は `tsx` スクリプト＋`node:assert`

**設計書:** `docs/superpowers/specs/2026-08-23-essay-lecture-curriculum-design.md`（5章「出題ソース」）
**前提:** P1・P2a・P3 は実装・push 済み（講座20講、ドリル6種102問、全問4択）

---

## 決めたこと

| 論点 | 決定 | 理由 |
|---|---|---|
| 書き直し式の素材 | 本人の赤ペン履歴のみ | 静的バンクで書き直しをやらせても、AI判定のコストに見合う学びが薄い。自分の文なら「なぜ自分がそう書いたか」を思い出せる |
| 判定のまとめ方 | 3問を1回のAI呼び出しで判定 | 1問ずつ呼ぶと反復のたびに課金が積む。3問まとめなら1ラウンド1回 |
| どこに出すか | 講義の静的ドリルの**後**に「あなたの答案から」ラウンドを足す | 型を練習した直後が一番効く。新しい導線を増やさない（P1でドリルは講義に埋め込むと決めている） |
| 素材が足りないとき | ラウンドごと出さない | 「まだ答案が少ないので出せません」と出すより、静かに省くほうがよい |
| モデル | `claude-opus-5` / `effort: "low"` | 短文3件の突き合わせは軽い判定。効率よりコストを優先して安いモデルへ落とすのは利用者の判断なので、既定の最上位を使い effort で絞る |

---

### Task 1: 赤ペン履歴を集める

**Files:**
- Create: `src/lib/sentence-drill/personal.ts`
- Create: `scripts/verify-personal-drill.ts`

`languageCorrections` は `essays/{id}.feedback.languageCorrections` に溜まっている
（`{ location, original, suggestion, type, reason }`、type は `typo | grammar | connector | expression | redundancy`）。

- [ ] **Step 1: 検証スクリプトを書く**

`scripts/verify-personal-drill.ts`:

```ts
import assert from "node:assert";
import {
  correctionKey,
  pickPersonalItems,
  type RawCorrection,
} from "../src/lib/sentence-drill/personal";

const base: RawCorrection[] = [
  { original: "この制度はとても良いと思います。", suggestion: "この制度は有効である。", type: "expression", reason: "話し言葉", essayId: "e1", submittedAt: 3 },
  { original: "利用することができる。", suggestion: "利用できる。", type: "redundancy", reason: "冗長", essayId: "e1", submittedAt: 3 },
  { original: "私の夢は医師になりたい。", suggestion: "私の夢は医師になることである。", type: "grammar", reason: "主述", essayId: "e2", submittedAt: 2 },
  { original: "しかし、また、さらに。", suggestion: "さらに。", type: "connector", reason: "接続過多", essayId: "e2", submittedAt: 2 },
];

// キーは元の文から決まる（同じ文は同じキー）
assert.equal(correctionKey(base[0]), correctionKey({ ...base[0], essayId: "other" }));
assert.notEqual(correctionKey(base[0]), correctionKey(base[1]));

// 新しい答案のものから順に、指定件数だけ取る
const picked = pickPersonalItems(base, new Set(), 3);
assert.equal(picked.length, 3);
assert.equal(picked[0].original, base[0].original, "新しい順になっていない");

// 出題済みは除く
const used = new Set([correctionKey(base[0]), correctionKey(base[1])]);
assert.deepEqual(
  pickPersonalItems(base, used, 3).map((i) => i.original),
  [base[2].original, base[3].original]
);

// typo（誤字）は書き直し練習に向かないので除く
const withTypo: RawCorrection[] = [
  { original: "貴学を志望しす。", suggestion: "貴学を志望します。", type: "typo", reason: "脱字", essayId: "e3", submittedAt: 9 },
  ...base,
];
assert.ok(
  pickPersonalItems(withTypo, new Set(), 4).every((i) => i.type !== "typo"),
  "typo を除いていない"
);

// 同じ文が複数の答案に出ても1回だけ
const dup = [...base, { ...base[0], essayId: "e9", submittedAt: 9 }];
const keys = pickPersonalItems(dup, new Set(), 10).map(correctionKey);
assert.equal(new Set(keys).size, keys.length, "重複を除いていない");

// 素材が足りなければ空を返す（呼び出し側でラウンドごと省く）
assert.deepEqual(pickPersonalItems([], new Set(), 3), []);

console.log("personal drill OK");
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx tsx scripts/verify-personal-drill.ts` → FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

`src/lib/sentence-drill/personal.ts`:

```ts
import type { LanguageCorrection } from "@/lib/types/essay";

/**
 * 本人の答案から集めた赤ペン1件。書き直しドリルの素材になる。
 *
 * 静的な問題バンク（4択）と違い、これは「自分が実際に書いた文」なので、
 * なぜそう書いたかを思い出せる。選択肢を作る必要もない（自分で直す）。
 */
export interface RawCorrection {
  original: string;
  suggestion: string;
  type: LanguageCorrection["type"];
  reason: string;
  essayId: string;
  /** 並べ替え用。答案の提出時刻(ms) */
  submittedAt: number;
}

/**
 * 誤字（typo）は書き直し練習に向かない。直し方を考える余地がなく、
 * 見つけて直すだけの作業になるため（誤字は19講の推敲で扱う）。
 */
const EXCLUDED_TYPES: LanguageCorrection["type"][] = ["typo"];

/** 出題済みかどうかを判定するキー。元の文が同じなら同じ問題とみなす。 */
export function correctionKey(c: Pick<RawCorrection, "original">): string {
  return c.original.trim().replace(/\s+/g, "");
}

/**
 * 出題する赤ペンを選ぶ。新しい答案のものから順に、まだ出していないものを取る。
 * 素材が足りなければ取れただけ返す（呼び出し側でラウンドごと省く）。
 */
export function pickPersonalItems(
  corrections: RawCorrection[],
  usedKeys: Set<string>,
  count: number
): RawCorrection[] {
  const seen = new Set<string>();
  return corrections
    .filter((c) => !EXCLUDED_TYPES.includes(c.type))
    .filter((c) => c.original.trim().length >= 8)
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .filter((c) => {
      const key = correctionKey(c);
      if (usedKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);
}
```

- [ ] **Step 4: 通す**

Run: `npx tsx scripts/verify-personal-drill.ts` → `personal drill OK`

- [ ] **Step 5: コミット**

```bash
git add src/lib/sentence-drill/personal.ts scripts/verify-personal-drill.ts
git commit -m "feat(essay): 本人の赤ペン履歴から出題する素材を選ぶ"
```

---

### Task 2: 書き直しの判定スキーマと API

**Files:**
- Create: `src/lib/ai/schemas/sentence-rewrite.ts`
- Create: `src/lib/ai/prompts/sentence-rewrite.ts`
- Create: `src/app/api/essay/lecture/rewrite/route.ts`

- [ ] **Step 1: スキーマを書く**

`src/lib/ai/schemas/sentence-rewrite.ts`:

```ts
import { z } from "zod";

/**
 * 書き直しドリルの判定。3件をまとめて1回で返させる。
 *
 * 上限は「壊れた出力を弾く歯止め」として置く（document-review.ts と同じ考え方）。
 * 厳しくしすぎると、判定自体は正しいのに parse が失敗してドリルが丸ごと落ちる。
 */
export const SentenceRewriteJudgeSchema = z.object({
  results: z
    .array(
      z.object({
        /** 何番目の問題か（0始まり） */
        index: z.number().int().min(0).max(9),
        /** 直せているか */
        ok: z.boolean(),
        /** なぜそう判定したか。生徒に見せる1〜2文 */
        comment: z.string().max(300),
        /** ok=false のときだけ。直し方の見本 */
        betterExample: z.string().max(300).nullable(),
      })
    )
    .max(10),
  /** 3件を通して見えた癖。空文字なら出さない */
  overall: z.string().max(300),
});

export type SentenceRewriteJudge = z.infer<typeof SentenceRewriteJudgeSchema>;
```

- [ ] **Step 2: プロンプトを書く**

`src/lib/ai/prompts/sentence-rewrite.ts`:

```ts
import type { RawCorrection } from "@/lib/sentence-drill/personal";

/**
 * 生徒が自分の文を直した結果を判定させる。
 *
 * AI の直し案（suggestion）は「正解」ではなく参考として渡す。
 * 言い回しが違っても、指摘された問題が解消していれば ok とする。
 * ここを「suggestion と一致するか」にすると、生徒は言い換えを覚えるだけになる。
 */
export function buildSentenceRewritePrompt(
  items: { correction: RawCorrection; answer: string }[]
): string {
  const list = items
    .map((it, i) =>
      [
        `【${i}】`,
        `元の文: ${it.correction.original}`,
        `指摘された問題: ${it.correction.reason}（種別: ${it.correction.type}）`,
        `添削AIの直し案（参考）: ${it.correction.suggestion}`,
        `生徒の直し: ${it.answer}`,
      ].join("\n")
    )
    .join("\n\n");

  return `あなたは高校生の小論文を指導する講師です。
生徒が、自分の答案で指摘された文を書き直しました。1件ずつ判定してください。

判定の基準:
- 指摘された問題が解消していれば ok=true とする
- 直し案と言い回しが違っても、問題が解消していれば ok=true とする
- 問題は解消したが別の問題（話し言葉・主述のねじれ・冗長）が入った場合は ok=false とし、何が入ったかを書く
- 元の文とほとんど変わっていない場合は ok=false とする
- 意味が変わってしまった場合は ok=false とし、元の意味を保つ直し方を示す

comment は生徒に見せます。1〜2文で、どこがどう良く（悪く）なったかを具体的に書いてください。
「良いですね」「もう少しです」のような中身のない評価はしないこと。

overall には、3件を通して見えるこの生徒の癖を1文で書いてください。
癖が読み取れなければ空文字にしてください。

${list}`;
}
```

- [ ] **Step 3: API を書く**

`src/app/api/essay/lecture/rewrite/route.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildSentenceRewritePrompt } from "@/lib/ai/prompts/sentence-rewrite";
import { SentenceRewriteJudgeSchema } from "@/lib/ai/schemas/sentence-rewrite";
import { correctionKey, type RawCorrection } from "@/lib/sentence-drill/personal";

/**
 * POST /api/essay/lecture/rewrite
 *
 * 「あなたの答案から」ラウンドの判定。3件を1回のAI呼び出しでまとめて判定する。
 * 1件ずつ呼ぶと、反復するほど課金が積み上がる。
 *
 * 出題済みキーは users/{uid}/sentenceDrillState/personal に貯め、次回から出さない。
 */
interface RewriteBody {
  lectureId: string;
  items: { correction: RawCorrection; answer: string }[];
}

/** 出題済みキーの保持上限。古いものから捨てる（無限に伸ばさない） */
const MAX_USED_KEYS = 300;

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const body = (await request.json().catch(() => null)) as RewriteBody | null;
  if (!body?.items?.length || body.items.length > 5) {
    return NextResponse.json(
      { error: "items は1〜5件で指定してください" },
      { status: 400 }
    );
  }
  // 空回答は判定させない（AI呼び出しの無駄）
  if (body.items.some((it) => !it.answer?.trim())) {
    return NextResponse.json(
      { error: "すべての問題に回答してください" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 503 }
    );
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    // 短文3件の突き合わせ。thinking と本文で共有するので余裕を持たせる
    max_tokens: 8000,
    messages: [
      { role: "user", content: buildSentenceRewritePrompt(body.items) },
    ],
    output_config: {
      format: zodOutputFormat(SentenceRewriteJudgeSchema),
      // 判定基準が明確な軽い作業。深く考えさせる必要はない
      effort: "low",
    },
  });

  if (response.stop_reason === "max_tokens") {
    return NextResponse.json(
      { error: "判定が途中で終了しました。もう一度お試しください" },
      { status: 500 }
    );
  }
  const judge = response.parsed_output;
  if (!judge) {
    return NextResponse.json(
      { error: "判定結果を読み取れませんでした" },
      { status: 500 }
    );
  }

  // 保存は失敗しても判定は返す（生徒の学習を止めない）
  if (adminDb) {
    try {
      const stateRef = adminDb.doc(`users/${uid}/sentenceDrillState/personal`);
      const snap = await stateRef.get();
      const prev: string[] = snap.exists ? (snap.data()?.usedKeys ?? []) : [];
      const next = [
        ...prev,
        ...body.items.map((it) => correctionKey(it.correction)),
      ].slice(-MAX_USED_KEYS);
      await stateRef.set(
        { usedKeys: next, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      await adminDb.collection(`users/${uid}/sentenceDrills`).add({
        userId: uid,
        lectureId: body.lectureId,
        kind: "personal_rewrite",
        correct: judge.results.filter((r) => r.ok).length,
        total: body.items.length,
        results: judge.results,
        completedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn("[lecture/rewrite] failed to save", err);
    }
  }

  return NextResponse.json(judge);
}
```

- [ ] **Step 4: 型が通ることを確認する**

Run: `npx tsc --noEmit` → エラーなし

`zodOutputFormat` の import パスが既存と違う場合は、`src/lib/essay/review-core.ts` の
import に合わせること（この repo で既に使っている書き方が正）。

- [ ] **Step 5: コミット**

```bash
git add src/lib/ai/schemas/sentence-rewrite.ts src/lib/ai/prompts/sentence-rewrite.ts src/app/api/essay/lecture/rewrite/route.ts
git commit -m "feat(essay): 書き直しドリルの判定API（3件まとめて1回）"
```

---

### Task 3: 出題する素材を返す API

**Files:**
- Create: `src/app/api/essay/lecture/personal-items/route.ts`

- [ ] **Step 1: 実装する**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { pickPersonalItems, type RawCorrection } from "@/lib/sentence-drill/personal";
import type { LanguageCorrection } from "@/lib/types/essay";

/**
 * GET /api/essay/lecture/personal-items?count=3
 *
 * 「あなたの答案から」ラウンドの出題。直近の答案の赤ペンから、まだ出していないものを返す。
 * 素材が足りなければ空配列を返す（画面はラウンドごと省く）。
 *
 * essays の userId+submittedAt は既存の複合インデックスを使う
 * （/api/admin/students と同じクエリ形）。
 */
const RECENT_ESSAYS = 10;

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) return NextResponse.json([]);

  const count = Math.min(
    5,
    Math.max(1, Number(new URL(request.url).searchParams.get("count") ?? 3))
  );

  const [essaySnap, stateSnap] = await Promise.all([
    adminDb
      .collection("essays")
      .where("userId", "==", uid)
      .orderBy("submittedAt", "desc")
      .limit(RECENT_ESSAYS)
      .get(),
    adminDb.doc(`users/${uid}/sentenceDrillState/personal`).get(),
  ]);

  const corrections: RawCorrection[] = [];
  for (const doc of essaySnap.docs) {
    const data = doc.data();
    const list: LanguageCorrection[] = data.feedback?.languageCorrections ?? [];
    const submittedAt =
      data.submittedAt?.toDate?.()?.getTime() ??
      new Date(data.submittedAt ?? 0).getTime();
    for (const c of list) {
      if (!c?.original || !c?.suggestion) continue;
      corrections.push({
        original: c.original,
        suggestion: c.suggestion,
        type: c.type,
        reason: c.reason ?? "",
        essayId: doc.id,
        submittedAt: Number.isFinite(submittedAt) ? submittedAt : 0,
      });
    }
  }

  const usedKeys = new Set<string>(stateSnap.data()?.usedKeys ?? []);
  return NextResponse.json(pickPersonalItems(corrections, usedKeys, count));
}
```

- [ ] **Step 2: 型が通ることを確認する**

Run: `npx tsc --noEmit`

- [ ] **Step 3: コミット**

```bash
git add src/app/api/essay/lecture/personal-items/route.ts
git commit -m "feat(essay): 本人の赤ペンから出題素材を返すAPI"
```

---

### Task 4: 書き直しラウンドの UI

**Files:**
- Create: `src/components/essay/lecture/PersonalRewriteRound.tsx`
- Modify: `src/app/student/essay/lectures/[id]/page.tsx`

- [ ] **Step 1: コンポーネントを書く**

`src/components/essay/lecture/PersonalRewriteRound.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, PenLine } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { RawCorrection } from "@/lib/sentence-drill/personal";
import type { SentenceRewriteJudge } from "@/lib/ai/schemas/sentence-rewrite";

/**
 * 「あなたの答案から」ラウンド。自分が実際に書いた文を、自分で直す。
 *
 * 4択と違い、全部書いてからまとめて判定する（AI呼び出しを1回に抑えるため）。
 * 判定を待つ間があるので、静的ドリルの後ろに置いている。
 */
export function PersonalRewriteRound({
  lectureId,
  items,
  onFinish,
}: {
  lectureId: string;
  items: RawCorrection[];
  onFinish: () => void;
}) {
  const [answers, setAnswers] = useState<string[]>(() => items.map(() => ""));
  const [judging, setJudging] = useState(false);
  const [judge, setJudge] = useState<SentenceRewriteJudge | null>(null);

  const allFilled = answers.every((a) => a.trim().length > 0);

  async function submit() {
    setJudging(true);
    try {
      const res = await authFetch("/api/essay/lecture/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId,
          items: items.map((correction, i) => ({
            correction,
            answer: answers[i].trim(),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "判定に失敗しました");
        return;
      }
      setJudge(data as SentenceRewriteJudge);
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setJudging(false);
    }
  }

  if (judge) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <PenLine className="size-4" />
          あなたの答案からの直し
        </h2>
        {items.map((item, i) => {
          const r = judge.results.find((x) => x.index === i);
          return (
            <div key={i} className="space-y-1 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs line-through">
                {item.original}
              </p>
              <p className="text-sm">{answers[i]}</p>
              {r && (
                <div className="flex items-start gap-2 pt-1 text-xs">
                  {r.ok ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-rose-600" />
                  )}
                  <div className="space-y-1">
                    <p>{r.comment}</p>
                    {r.betterExample && (
                      <p className="text-muted-foreground">
                        直し方の例: {r.betterExample}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {judge.overall && (
          <p className="bg-muted/60 rounded-lg p-3 text-sm">{judge.overall}</p>
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={onFinish}>
            課題へ進む
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <PenLine className="size-4" />
          あなたの答案から
        </h2>
        <p className="text-muted-foreground text-xs">
          これまでの添削で指摘された、あなた自身の文です。自分で直してみましょう。
        </p>
      </div>

      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <p className="text-sm">{item.original}</p>
          <p className="text-muted-foreground text-xs">
            指摘: {item.reason}
          </p>
          <Textarea
            value={answers[i]}
            onChange={(e) =>
              setAnswers((prev) =>
                prev.map((a, j) => (j === i ? e.target.value : a))
              )
            }
            placeholder="直した文を書いてください"
            className="min-h-16"
          />
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onFinish}>
          とばす
        </Button>
        <Button size="sm" onClick={submit} disabled={!allFilled || judging}>
          {judging ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              判定中...
            </>
          ) : (
            "判定する"
          )}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 講義ページに差し込む**

`src/app/student/essay/lectures/[id]/page.tsx`:

`Step` に `"personal"` を足す:

```ts
type Step = "lecture" | "drill" | "personal" | "exercise" | "result";
```

state を足す（コンポーネント冒頭の useState 群の下）:

```tsx
  const [personalItems, setPersonalItems] = useState<RawCorrection[]>([]);
```

静的ドリルの `onFinish` を差し替える（4択が終わったら素材を取りに行き、
あれば書き直しラウンドへ、無ければ課題へ）:

```tsx
          onFinish={async (selected) => {
            // 保存に失敗しても先へ進ませる（ドリルは本体ではない）
            try {
              await authFetch("/api/essay/lecture/drill", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lectureId: lecture.id, selected }),
              });
            } catch {
              toast.error("ドリルの結果を保存できませんでした");
            }
            // 本人の赤ペンが3件そろっていれば「あなたの答案から」へ
            try {
              const res = await authFetch(
                "/api/essay/lecture/personal-items?count=3"
              );
              const items = res.ok ? ((await res.json()) as RawCorrection[]) : [];
              if (items.length >= 3) {
                setPersonalItems(items);
                setStep("personal");
                return;
              }
            } catch {
              // 取れなければ黙って課題へ進む
            }
            setStep("exercise");
          }}
```

`step === "personal"` の描画を足す（ドリルの描画の下）:

```tsx
  // ===== あなたの答案から（書き直し） =====
  if (step === "personal" && personalItems.length > 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 lg:px-6 lg:py-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("lecture")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-bold">あなたの答案から</h1>
        </div>
        <PersonalRewriteRound
          lectureId={lecture.id}
          items={personalItems}
          onFinish={() => setStep("exercise")}
        />
      </div>
    );
  }
```

import を足す:

```tsx
import { PersonalRewriteRound } from "@/components/essay/lecture/PersonalRewriteRound";
import type { RawCorrection } from "@/lib/sentence-drill/personal";
```

- [ ] **Step 3: 検証**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 4: コミット**

```bash
git add src/components/essay/lecture/PersonalRewriteRound.tsx "src/app/student/essay/lectures/[id]/page.tsx"
git commit -m "feat(essay): 自分の答案の文を自分で直すラウンドを足す"
```

---

### Task 5: 関連ドリルへの導線

講義で扱った力を、既存のドリルで続けて練習できるようにする。

**Files:**
- Modify: `src/data/essay-lectures/types.ts`
- Modify: `src/data/essay-lectures/lessons.ts`
- Modify: `src/app/student/essay/lectures/[id]/page.tsx`
- Modify: `scripts/validate-essay-lectures.ts`

- [ ] **Step 1: 型を足す**

`EssayLecture` に:

```ts
  /** 講義の内容を続けて練習できる既存のドリルへの導線 */
  relatedPractice?: { label: string; href: string; note: string };
```

- [ ] **Step 2: 講義データに足す**

| order | id | relatedPractice |
|---|---|---|
| 5 | essay-basics-09（根拠・具体例） | label「ちょこ添削」/ href `/student/essay/choco` / note「1段落だけ書いて、根拠の書き方を試せます」 |
| 9 | essay-basics-12（事実と意見） | label「論理ドリル」/ href `/student/essay/logic-drill` / note「因果の取り違えや飛躍を見つける練習ができます」 |
| 10 | essay-basics-13（抽象語を具体に） | label「論理ドリル」/ href `/student/essay/logic-drill` / note「具体と抽象を行き来する型があります」 |
| 13 | essay-basics-02（課題文の読み方） | label「要約ドリル」/ href `/student/essay/summary-drill` / note「要約だけを繰り返し練習できます」 |

- [ ] **Step 3: 結果画面に出す**

`step === "result"` の描画、講評カードの下に:

```tsx
        {lecture.relatedPractice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">次にやると効く練習</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-sm">
                {lecture.relatedPractice.note}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={lecture.relatedPractice.href}>
                  {lecture.relatedPractice.label}へ
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
```

- [ ] **Step 4: 検証を足す**

`scripts/validate-essay-lectures.ts` に:

```ts
  if (l.relatedPractice) {
    if (!l.relatedPractice.href.startsWith("/student/")) {
      fail(`relatedPractice href must be an app path: ${l.id}`);
    }
    if (l.relatedPractice.note.trim().length < 10) {
      fail(`short relatedPractice note: ${l.id}`);
    }
  }
```

- [ ] **Step 5: 検証とコミット**

Run: `npx tsx scripts/validate-essay-lectures.ts && npm run build`

```bash
git add src/data/essay-lectures scripts/validate-essay-lectures.ts "src/app/student/essay/lectures/[id]/page.tsx"
git commit -m "feat(essay): 講義から関連ドリルへの導線を足す"
```

---

### Task 6: 管理者API（講座の進み）

**Files:**
- Create: `src/app/api/admin/students/[id]/lecture-progress/route.ts`

- [ ] **Step 1: 実装する**

既存の管理者APIと同じく `requireRole` + `managedBy` スコーピングを通すこと
（`src/app/api/admin/students/[id]/route.ts` の書き方に合わせる。**自分の担当生徒以外を見せない**）。

返すもの（講ごと）:

```ts
export interface LectureProgressRow {
  lectureId: string;
  order: number;
  title: string;
  /** 提出回数（0なら未受講） */
  attempts: number;
  /** 最高得点。未受講は null */
  bestTotal: number | null;
  /** 最終提出日（ISO）。未受講は null */
  lastAt: string | null;
  /** 文のドリルの正答率(%)。未実施は null */
  drillRate: number | null;
  /**
   * 詰まっているか。次のどちらか:
   *   - 3回以上提出して最高得点が満点の6割未満
   *   - 直前の講まで進んでいるのに、この講だけ2週間以上手つかず
   */
  stuck: boolean;
}
```

データ元:
- `essays` … `where("userId","==",uid).where("sourceType","==","lecture")`（`lectureId` で集計）
- `users/{uid}/sentenceDrills` … `lectureId` ごとに `correct/total` を合計

`getAllLectures()` を回して全20講ぶんの行を作る（未受講の講も返す。
「どこで止まったか」を見るのが目的なので、受講済みだけ返すと分からない）。

- [ ] **Step 2: 型が通ることを確認してコミット**

Run: `npx tsc --noEmit`

```bash
git add "src/app/api/admin/students/[id]/lecture-progress/route.ts"
git commit -m "feat(admin): 生徒の講座の進みを返すAPI"
```

---

### Task 7: 管理者UI（どの講で詰まっているか）

**Files:**
- Create: `src/components/admin/LectureProgressSection.tsx`
- Modify: `src/app/admin/students/[id]/page.tsx`

- [ ] **Step 1: セクションを作る**

- 20講を order 順に並べ、未受講はグレー、受講済みは点数、`stuck` は警告色にする
- ヘッダに「受講 N/20」と「詰まっている講 M件」を出す
- 既存の `ExamResultsSection` / `DocumentsSection` と同じ体裁（折りたたみ、`authFetch` で取得）にする
- 生徒詳細の「成績・弱点」タブに置く（添削履歴の上）

- [ ] **Step 2: 検証**

Run: `npm run build`

- [ ] **Step 3: コミット**

```bash
git add src/components/admin/LectureProgressSection.tsx "src/app/admin/students/[id]/page.tsx"
git commit -m "feat(admin): 生徒詳細に講座の進みを出す"
```

---

### Task 8: エミュレータで通しで確認する

- [ ] **Step 1: 素材を仕込む**

書き直しラウンドは赤ペンが3件必要。`scripts/seed-emulator.ts` に、
`languageCorrections` を3件以上持つ添削済み答案を1件足す（既存の `emu-essay-reviewed` に足してよい）。

- [ ] **Step 2: 確認項目**

- [ ] 講義のドリル（4択5問）の後に「あなたの答案から」が出る
- [ ] 自分の文が3件出て、直して「判定する」で結果が返る（AI呼び出しは1回だけ）
- [ ] 判定が「言い回しが違っても問題が解消していれば ok」になっている
- [ ] 「とばす」で課題へ進める
- [ ] 2回目に同じ講を受けると、**同じ文は出ない**（出題済みが除かれている）
- [ ] 赤ペンが3件に満たない生徒では、このラウンドが出ずに課題へ進む
- [ ] 13講の結果画面に「要約ドリルへ」が出る
- [ ] 管理者の生徒詳細に講座の進みが出て、未受講の講も並ぶ

- [ ] **Step 3: 全検証と push**

```bash
npm run validate:data && npm run build
npx tsx scripts/verify-essay-blocks.ts
npx tsx scripts/verify-essay-forms.ts
npx tsx scripts/verify-sentence-drill.ts
npx tsx scripts/verify-personal-drill.ts
npx tsx scripts/verify-lecture-types.ts
git push
```

---

## 完了の定義

- 講義のドリルの後に、本人の赤ペンから3問の書き直しラウンドが出る（素材があるときだけ）
- 判定は3件まとめて1回のAI呼び出しで返る
- 一度出した文は次回から出ない
- 4講から関連ドリル（ちょこ添削・論理ドリル・要約ドリル）へ導線がある
- 管理者が生徒ごとに20講の進みと「詰まっている講」を見られる

## P2b に入れないもの

- 静的バンクの書き直し化（自分の文でやるので不要）
- 講座の修了証・進捗バッジ
- 管理者から生徒へ「この講をやって」と指示を送る機能

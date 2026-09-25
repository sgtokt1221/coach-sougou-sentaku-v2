# 重点弱点の組み直し（弱点タクソノミー v2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重点弱点を、文章の層（文／構成／論証／成熟度／設問対応／AP）と面接に分けた、重なりと漏れの無い一覧にし、生徒・講師の画面に1行の説明つきで出す。

**Architecture:** 正本は `src/lib/growth/weakness-taxonomy.ts` の `WEAKNESS_TAXONOMY`。まとめた旧 ID と旧ラベルは別名として引けるようにする。添削結果の判定欄（文の点検・設問の充足・読み違い・知識・字数）から弱点を作る処理を `src/lib/essay/derive-weakness-issues.ts` の1関数にし、書き込み・作り直し・集計・表示の全部がそれを通る。画面は API がタクソノミーから付けた `description` と `group` を出す。

**Tech Stack:** Next.js 16 (App Router) / TypeScript / Firestore (firebase-admin) / 検証は `npx tsx scripts/verify-*.ts`（node:assert。テストランナーは無い）

**設計書:** `docs/superpowers/specs/2026-09-26-weakness-taxonomy-v2-design.md`

**守ること（CLAUDE.md より）**
- 弱点DBの読み書きは `src/lib/growth/weakness-store.ts` を通す
- 本番データの書き換え（rebuild `--apply`）は実行前にユーザーの確認を取る
- 作業が終わったら `npm run build` を通して main へ push してよい（App Hosting の本番デプロイが走る）
- UI 変更は画面を開いて確認してから完了とする

---

## ファイル構成

| ファイル | 役割 | 変更 |
|---|---|---|
| `src/lib/growth/weakness-taxonomy.ts` | 弱点の正本。エントリ・別名・振り分け・表示用の群 | 修正 |
| `src/lib/essay/derive-weakness-issues.ts` | 添削結果の判定欄から弱点を作る唯一の関数 | 新規 |
| `src/lib/essay/review-core.ts` | 添削コア。`withSentenceCheckIssues` を削り、derive を呼ぶ | 修正 |
| `src/app/api/essay/lecture/submit/route.ts` | 講座のブロック課題で `partial` を渡す | 修正 |
| `src/lib/growth/analyze.ts` | `updateWeaknessRecords` が domain を resolve に渡す | 修正 |
| `src/lib/growth/weakness-aggregate.ts` | `weaknessKeysOf` が derive を使う | 修正 |
| `scripts/rebuild-weaknesses.ts` / `scripts/audit-weaknesses.ts` / `scripts/backfill-sentence-check.ts` | derive を使う | 修正 |
| `src/app/api/essay/[id]/route.ts` / `src/app/api/admin/students/[id]/essays/[essayId]/route.ts` | 表示時に derive を通す | 修正 |
| `src/app/api/growth/weaknesses/route.ts` | `description`・`group` を付ける。`context=all` を足す | 修正 |
| `src/app/api/admin/students/[id]/route.ts` | 弱点に `description`・`group` を付ける | 修正 |
| `src/lib/types/growth.ts` | `WeaknessRecord` に表示用の任意項目 | 修正 |
| `src/components/growth/WeaknessReminderCard.tsx` / `WeaknessReminderBanner.tsx` | 説明を出す | 修正 |
| `src/app/student/growth/page.tsx` / `src/app/student/dashboard/page.tsx` | 説明を出す。解決済みを取る | 修正 |
| `src/components/admin/WeaknessTopChart.tsx` / `src/app/admin/students/[id]/page.tsx` | 群（層＋面接）で並べる | 修正 |
| `scripts/verify-weakness-label.ts` / `scripts/verify-weakness-records.ts` | 期待値の更新 | 修正 |
| `scripts/verify-derive-issues.ts` | derive の検査 | 新規 |
| `package.json` | `validate:data` に verify-derive-issues を連結 | 修正 |

---

### Task 1: タクソノミーを v2 に置き換える

**Files:**
- Modify: `src/lib/growth/weakness-taxonomy.ts`
- Modify: `scripts/verify-weakness-label.ts`
- Modify: `scripts/verify-weakness-records.ts`

- [ ] **Step 1: 検査を先に書き換える（失敗させる）**

`scripts/verify-weakness-label.ts` の `console.log("[verify-weakness-label] OK");` の直前に足す。

```ts
// --- タクソノミー v2（2026-09-26） -------------------------------------------
import {
  WEAKNESS_TAXONOMY,
  getTaxonomyEntry,
  canonicalLabel,
  weaknessGroupOf,
  weaknessDescriptionOf,
} from "../src/lib/growth/weakness-taxonomy";

// まとめた旧 ID は正本へ寄る
for (const [old, now] of [
  ["originality.no_experience", "logic.weak_evidence"],
  ["originality.abstract", "logic.weak_evidence"],
  ["logic.causal_error", "logic.leap"],
  ["expression.ambiguous", "expression.grammar"],
] as const) {
  assert.equal(getTaxonomyEntry(old)?.id, now, `${old} → ${now}`);
  assert.equal(
    resolveCanonical("何でもよい", { aiCanonicalId: old })?.id,
    now
  );
}
// 旧ラベル（保存済みの area）は正本へ寄る
for (const [oldLabel, now] of [
  ["結論が不明確・欠落している", "structure.no_conclusion"],
  ["段落のつながり・論述の流れが弱い", "structure.weak_flow"],
  ["根拠・データが不足している", "logic.weak_evidence"],
  ["根拠が一般論で具体に乏しい", "logic.weak_evidence"],
  ["抽象的で具体性に欠ける", "logic.weak_evidence"],
  ["誤字脱字・文法ミスがある", "expression.grammar"],
  ["主張に矛盾・一貫性の欠如がある", "logic.contradiction"],
  ["設問・テーマから論点がずれている", "structure.off_topic"],
] as const) {
  assert.equal(resolveCanonical(oldLabel)?.id, now, `${oldLabel} → ${now}`);
}
// 正規ラベルは自分自身へ戻り、全エントリに説明がある
for (const e of WEAKNESS_TAXONOMY) {
  assert.equal(resolveCanonical(e.label)?.id, e.id, `自分へ戻らない: ${e.label}`);
  assert.ok(e.description.length > 0, `説明が無い: ${e.id}`);
  assert.equal(canonicalLabel(e.id), e.label);
}
// 小論文の弱点は面接の ID に寄らない
assert.equal(
  resolveCanonical("具体的なエピソードの欠如", { domain: "essay" })?.id.startsWith("iv."),
  false
);
assert.equal(
  resolveCanonical("具体的なエピソードの欠如", { domain: "interview" })?.id,
  "iv.no_episode"
);
// 群: 面接の ID は interview、それ以外は層（採点の軸）
assert.equal(weaknessGroupOf({ area: "結論から話せていない", canonicalId: "iv.clarity.unstructured" }), "interview");
assert.equal(weaknessGroupOf({ area: "主語と述語が噛み合わない文がある" }), "expression");
assert.equal(
  weaknessDescriptionOf({ area: "根拠・データが不足している" }),
  getTaxonomyEntry("logic.weak_evidence")!.description
);
// 新しい弱点
assert.equal(resolveCanonical("高齢者と低所得者を一括りにしている", { categoryHint: "logic" })?.id, "logic.overgeneralize");
assert.equal(resolveCanonical("1つの段落に話題が混在している", { categoryHint: "structure" })?.id, "structure.mixed_paragraph");
```

同じファイルの既存の `cases` の期待値を v2 に合わせる（ID は変わらないものがほとんど）。変えるのは次の2行だけ。

```ts
  // 「自分の経験との結びつき」: v2 でも ap.no_link（変更なし）
  // 「結論の明確さ」+ 繰り返し → structure.conclusion_restates（変更なし）
```

（既存の `cases` はそのまま通るはず。通らなければ Step 4 で原因を見る。）

`scripts/verify-weakness-records.ts:79-81` の `NOEXP`（別名になって消える）を、別の正規エントリに替える。

```ts
const NOEXP = WEAKNESS_TAXONOMY.find((e) => e.id === "logic.leap")!;
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx tsx scripts/verify-weakness-label.ts`
Expected: FAIL（`weaknessGroupOf` が export されていない等の型エラー、または `originality.no_experience → logic.weak_evidence` の assert）

- [ ] **Step 3: `TaxonomyEntry` と `WEAKNESS_TAXONOMY` を置き換える**

`src/lib/growth/weakness-taxonomy.ts` の `export interface TaxonomyEntry { ... }` を次に置き換える。

```ts
/** 正規タクソノミーの 1 エントリ */
export interface TaxonomyEntry {
  /** 安定スラッグ。統合の一意キー (例: "logic.leap") */
  id: string;
  /** 層 = 採点の軸（面接の iv.* は群を interview にする。weaknessGroupOf） */
  category: EssayCategoryKey;
  /** 表示用の安定日本語ラベル。統合後はこれを WeaknessRecord.area に採用 */
  label: string;
  /** 生徒・講師のカードに出す1行の説明 */
  description: string;
  /** 決定論マッピング用の語彙 (text に部分一致したらヒット) */
  keywords: string[];
  /** v2 でこのエントリにまとめた旧 ID（保存済みの canonicalId を寄せる） */
  aliases?: string[];
  /** 旧ラベル（保存済みの area を寄せる） */
  oldLabels?: string[];
}
```

`export const WEAKNESS_TAXONOMY ... ] as const;` 全体を次に置き換える（並び順は同点時の優先順）。

```ts
/**
 * 固定タクソノミー v2（2026-09-26）。小論文は層（文／構成／論証／成熟度／設問対応／AP）、
 * 面接は iv.* で分ける。設計: docs/superpowers/specs/2026-09-26-weakness-taxonomy-v2-design.md
 * 並び順は resolve のタイブレーク（同点時は先頭優先）に影響する。
 */
export const WEAKNESS_TAXONOMY: readonly TaxonomyEntry[] = [
  // ---- 構成 (structure) ----
  {
    id: "structure.no_conclusion",
    category: "structure",
    label: "結論で立場を言い切れていない",
    description: "結論が無い、または「大切だ」で終わっている",
    keywords: ["結論", "締め", "結びの", "結びが", "まとめ方", "落としどころ"],
    oldLabels: ["結論が不明確・欠落している"],
  },
  {
    // 「結論」と「繰り返し」の両方が当たる（2点）ときにこちらへ来る。
    // 「結論」1語だけなら同点で上の no_conclusion が先に取る
    id: "structure.conclusion_restates",
    category: "structure",
    label: "結論が本論・序論の繰り返しにとどまる",
    description: "結論で新しい到達点を示していない",
    keywords: ["結論", "繰り返し", "言い換え", "言い直し", "焼き直し", "同じ内容", "重複"],
  },
  {
    id: "structure.mixed_paragraph",
    category: "structure",
    label: "1つの段落に複数の話題が混ざっている",
    description: "段落の区切りと話題の切れ目が合っていない",
    keywords: ["話題が混在", "複数の話題", "話題が混ざ", "段落構成", "段落分け", "段落の区切り", "一段落"],
  },
  {
    // v2 で「段落」単独を外した（構成の指摘がすべて集まっていた）
    id: "structure.weak_flow",
    category: "structure",
    label: "段落どうしのつながりが示されていない",
    description: "前の段落から次の段落へ移る理由が書かれていない",
    keywords: ["流れ", "つながり", "繋がり", "接続", "展開", "橋渡し", "つなぎ"],
    oldLabels: ["段落のつながり・論述の流れが弱い"],
  },
  {
    id: "structure.unbalanced",
    category: "structure",
    label: "序論・本論・結論の配分が偏っている",
    description: "序論や具体例に字数を取られ、論じる部分が薄い",
    keywords: ["序論", "本論", "バランス", "配分", "比率", "構成のバランス"],
    oldLabels: ["序論・本論・結論の構成バランスが悪い"],
  },

  // ---- 設問対応 (responsiveness) ----
  {
    // id は保存済みなので変えない（v23 でカテゴリだけ responsiveness へ移した）
    id: "structure.off_topic",
    category: "responsiveness",
    label: "設問の主題からずれている",
    description: "問われたことと別の話題が中心になっている",
    keywords: ["設問", "テーマからずれ", "論点がずれ", "逸脱", "外れ", "趣旨", "すり替え", "主題がずれ", "主題のずれ"],
    oldLabels: ["設問・テーマから論点がずれている"],
  },
  {
    id: "responsiveness.missing_requirement",
    category: "responsiveness",
    label: "設問が求めた要素が欠けている",
    description: "「比較せよ」「二つ挙げよ」などの要求に答えていない",
    keywords: ["設問が求め", "求められている", "問われている", "問いに答え", "答えていな", "比較していな", "触れていない", "条件を満た", "指定された"],
    oldLabels: ["設問が求めた要素に答えていない"],
  },
  {
    id: "responsiveness.misread",
    category: "responsiveness",
    label: "課題文・資料を読み違えている",
    description: "筆者の主張や資料の数値を取り違えている",
    keywords: ["読み違", "誤読", "読み誤", "資料の数値"],
  },
  {
    id: "responsiveness.knowledge_error",
    category: "responsiveness",
    label: "専門用語・知識を取り違えている",
    description: "基礎の定義や仕組みが誤っている（口頭試問型）",
    keywords: ["知識の誤り", "用語の誤り", "定義が誤", "事実誤認", "専門用語"],
  },
  {
    id: "responsiveness.too_short",
    category: "responsiveness",
    label: "字数が大きく足りない",
    description: "指定字数の7割に届いていない",
    keywords: ["字数不足", "字数が足り", "分量が足り"],
  },

  // ---- 論証 (logic) ----
  {
    id: "logic.weak_evidence",
    category: "logic",
    label: "根拠が一般論で具体性がない",
    description: "誰でも書ける理由にとどまり、事実・例・仕組みがない",
    keywords: [
      "根拠", "裏付け", "裏づけ", "データ", "証拠", "説得力", "エビデンス", "理由が薄", "理由づけ", "理由付け",
      "具体例", "事例", "具体性がな", "一般論", "抽象", "漠然", "ぼんやり", "観念的",
      "具体性の欠如", "具体性が不足", "具体性に欠け", "具体策", "具体的な制度",
    ],
    aliases: ["originality.no_experience", "originality.abstract"],
    oldLabels: ["根拠・データが不足している", "根拠が一般論で具体に乏しい", "抽象的で具体性に欠ける"],
  },
  {
    id: "logic.leap",
    category: "logic",
    label: "理由から主張への筋道が飛んでいる",
    description: "間の説明が抜けている、または因果を取り違えている",
    keywords: ["飛躍", "短絡", "唐突", "主張と理由", "論理が飛", "つながらない", "因果", "原因と結果", "結果の関係"],
    aliases: ["logic.causal_error"],
    oldLabels: ["主張と理由が飛躍している", "因果関係を取り違えている"],
  },
  {
    id: "logic.overgeneralize",
    category: "logic",
    label: "一部の例から全体を言い切っている",
    description: "違うものを一括りにして論じている",
    keywords: ["一括り", "ひとくくり", "一般化", "決めつけ"],
  },
  {
    id: "logic.contradiction",
    category: "logic",
    label: "主張どうしが食い違っている",
    description: "前と後ろで逆の立場を取っている",
    keywords: ["矛盾", "一貫", "整合", "ぶれ", "筋が通", "食い違"],
    oldLabels: ["主張に矛盾・一貫性の欠如がある"],
  },

  // ---- 議論の成熟度 (reasoningMaturity) ----
  {
    // id は保存済みなので変えない（カテゴリだけ成熟度へ移した）
    id: "logic.one_sided",
    category: "reasoningMaturity",
    label: "反対意見・別の立場を扱っていない",
    description: "自分と違う見方に触れていない",
    keywords: ["反対意見", "反論", "一面的", "多面", "視野", "偏り", "片側"],
    oldLabels: ["反対意見・多面的な視点への配慮が不足している"],
  },
  {
    id: "reasoning.weak_rebuttal",
    category: "reasoningMaturity",
    label: "反論への応答が弱い",
    description: "反論を挙げたが、なぜ退けられるかを示していない",
    keywords: ["再反論", "反駁", "反論への", "反論に答え", "反論を退け", "反論の処理"],
    oldLabels: ["反論への再反論が弱い"],
  },
  {
    id: "reasoning.oversimplified",
    category: "reasoningMaturity",
    label: "問題を単一の原因で単純化している",
    description: "原因や立場を1つに絞って片付けている",
    keywords: ["単純化", "単一の原因", "単一原因", "一つの原因", "二項対立"],
    oldLabels: ["問題を単一の原因・視点で単純化している"],
  },
  {
    id: "reasoning.no_constraints",
    category: "reasoningMaturity",
    label: "解決策の実行面を考えていない",
    description: "誰がやるか、制約、副作用に触れていない",
    keywords: ["実行主体", "実現可能", "実行可能", "副作用", "制約", "財源", "誰が実行", "トレードオフ"],
    oldLabels: ["実行主体・制約・副作用を検討していない"],
  },

  // ---- 文 (expression) ----
  {
    id: "expression.twist",
    category: "expression",
    label: "主語と述語が噛み合わない文がある",
    description: "文頭の「〜は」と文末が対応していない",
    keywords: ["主述", "ねじれ", "主語と述語", "述語"],
  },
  {
    id: "expression.grammar",
    category: "expression",
    label: "助詞や語の使い方が誤っている",
    description: "助詞の選び違い、語の組み合わせ、語の抜けで意味が取りにくい",
    keywords: ["文法", "てにをは", "助詞", "語の使い方", "言葉の使い方", "語の組み合わせ", "意味が取れ", "読めない", "曖昧", "あいまい", "わかりにくい", "伝わらな"],
    aliases: ["expression.ambiguous"],
    oldLabels: ["誤字脱字・文法ミスがある", "曖昧で意味が伝わりにくい"],
  },
  {
    id: "expression.typo",
    category: "expression",
    label: "誤字・脱字が多い",
    description: "漢字や送り仮名の誤り、字の重なりがある",
    keywords: ["誤字", "脱字", "誤変換", "送り仮名", "表記"],
  },
  {
    id: "expression.long_sentence",
    category: "expression",
    label: "一文が長く読みにくい",
    description: "読点で節をつなぎ続け、80字を超える文がある",
    keywords: ["一文が長", "一文の長さ", "長文", "読点", "80字", "文が長", "長い文"],
  },
  {
    id: "expression.verbose",
    category: "expression",
    label: "同じ言葉や言い回しが重なっている",
    description: "同じ語・同じ結論を繰り返している、回りくどい",
    keywords: ["冗長", "回りくど", "くどい", "簡潔", "話が長い", "長すぎ", "重複", "同じフレーズ", "同じ表現", "同じ言葉"],
    oldLabels: ["冗長・回りくどく簡潔さに欠ける"],
  },
  {
    id: "expression.tone",
    category: "expression",
    label: "文体・文末が整っていない",
    description: "常体と敬体の混在、「〜と考える」の連発、話し言葉",
    keywords: ["文体", "文末", "語彙", "言い回し", "口語", "話し言葉", "敬体", "常体", "稚拙", "言葉遣い", "言語表現", "表現の適切", "表現の正確"],
    oldLabels: ["文体・語彙が不適切"],
  },

  // ---- AP (apAlignment) ----
  {
    id: "ap.weak_motivation",
    category: "apAlignment",
    label: "志望理由・動機が浅い",
    description: "なぜこの大学・学部かが言えていない",
    keywords: ["志望理由", "志望動機", "動機が浅", "動機が弱", "なぜこの大学", "なぜこの学部", "でなければならない", "この大学を選"],
  },
  {
    id: "ap.no_link",
    category: "apAlignment",
    label: "アドミッションポリシーとの結びつきが弱い",
    description: "AP が求める力と答案の論点が対応していない",
    keywords: ["アドミ", "ポリシー", "AP", "合致", "結びつき", "大学の求める", "学部の特色"],
  },
  {
    id: "ap.generic",
    category: "apAlignment",
    label: "どの大学にも言える一般論にとどまる",
    description: "志望先の特色に触れていない",
    keywords: ["ありきたりな志望", "どこでも", "抽象的な志望", "汎用的"],
  },

  // ---- 旧・独自性 (v23 で廃止。旧データの表示用。新しくは付かない) ----
  {
    id: "originality.cliche",
    category: "originality",
    label: "視点がありきたりで独自性に欠ける",
    description: "（旧軸）視点が一般的で独自性に欠ける",
    keywords: ["ありきたり", "平凡", "月並み", "借り物", "独自性", "個性", "ありがち"],
  },

  // ---- 面接 (iv.*。群は interview) ----
  {
    id: "iv.clarity.unstructured",
    category: "structure",
    label: "結論から話せていない",
    description: "答えの要点が最初に来ない",
    keywords: ["結論ファースト", "要点", "結論から", "構造化", "PREP", "話の組み立て", "自己紹介"],
    oldLabels: ["結論ファーストでなく要点が不明瞭"],
  },
  {
    id: "iv.answer_depth",
    category: "logic",
    label: "質問に正面から答えていない",
    description: "聞かれたことと別のことを話している",
    keywords: ["質問への応答", "深掘り耐性", "質問に答え", "応答がずれ", "質問とずれ", "自己の見解", "自分の考えを示さ"],
    oldLabels: ["質問に正面から答えられていない"],
  },
  {
    id: "iv.no_episode",
    category: "other",
    label: "具体的なエピソードが出てこない",
    description: "いつ・どこで・何をしたかが語られない",
    keywords: ["エピソード", "具体的な経験", "いつ・どこで"],
  },
  {
    id: "iv.enthusiasm.low",
    category: "other",
    label: "熱意・主体性が伝わらない",
    description: "志望の強さや自分から動いた話が出ない",
    keywords: ["熱意", "意欲", "主体性", "積極性", "やる気", "志望度", "受け身"],
  },
  {
    id: "iv.manner",
    category: "other",
    label: "面接中の言動・マナーに問題がある",
    description: "開始前後の発言や呼び間違いなど",
    keywords: ["マナー", "態度", "言動", "呼び間違", "名前の誤認"],
  },
  {
    id: "iv.no_answer",
    category: "other",
    label: "面接が成立していない",
    description: "回答がほとんど記録されていない",
    keywords: ["回答の不在", "回答がな", "面接不成立", "回答の不成立", "無回答"],
    oldLabels: ["面接が成立していない（回答がない）"],
  },
  {
    id: "iv.body.eye_contact",
    category: "other",
    label: "視線が散漫・アイコンタクトが弱い",
    description: "面接官を見て話せていない（動画解析）",
    keywords: ["視線", "アイコンタクト", "目線", "目を合わせ"],
  },
  {
    id: "iv.body.expression",
    category: "other",
    label: "表情が硬い",
    description: "表情の変化が少ない（動画解析）",
    keywords: ["表情", "笑顔", "硬い表情", "無表情"],
  },
  {
    id: "iv.body.posture",
    category: "other",
    label: "姿勢・身だしなみに改善余地",
    description: "姿勢や身だしなみに気になる点がある（動画解析）",
    keywords: ["姿勢", "身だしなみ", "服装", "首が傾", "猫背"],
  },
  {
    id: "iv.body.delivery",
    category: "other",
    label: "話し方(フィラー・話速・声)に課題",
    description: "「えー」の多さ、話す速さ、声の大きさに課題がある",
    keywords: ["フィラー", "話速", "早口", "うなずき", "声が小さ", "滑舌", "間の取り方"],
  },
] as const;
```

- [ ] **Step 4: 索引・resolve・群の関数を直す**

同じファイルで、`BY_ID` と `BY_LABEL` を別名込みにする。

```ts
/** id（別名を含む）→ エントリの索引 */
const BY_ID = new Map<string, TaxonomyEntry>(
  WEAKNESS_TAXONOMY.flatMap((e) =>
    [e.id, ...(e.aliases ?? [])].map((id) => [id, e] as const)
  )
);
```

```ts
const BY_LABEL = new Map<string, TaxonomyEntry>(
  WEAKNESS_TAXONOMY.flatMap((e) =>
    [e.label, ...(e.oldLabels ?? [])].map((l) => [l, e] as const)
  )
);
```

`ResolveOptions` に足す。

```ts
  /**
   * どの提出の弱点か。essay のときは面接の iv.* を候補にしない
   * （「具体的なエピソード」等の語が面接の弱点に寄るのを防ぐ）。
   * interview / 省略のときは全部が候補。
   */
  domain?: "essay" | "interview";
```

`resolveCanonical` の先頭（`isKnownCanonicalId` の直後）で候補を決め、キーワード判定の3関数（`matchByKeywords` / `matchHeading` / `hasAnyKeyword`）に候補の配列を渡す形にする。

```ts
  const candidates =
    opts.domain === "essay"
      ? WEAKNESS_TAXONOMY.filter((e) => !e.id.startsWith("iv."))
      : WEAKNESS_TAXONOMY;
```

- `matchByKeywords(text, categoryHint, minScore, onlyHintCategory = false, entries = WEAKNESS_TAXONOMY)` — ループを `for (const entry of entries)` にする
- `matchHeading(label, support, categoryHint, entries = WEAKNESS_TAXONOMY)` — 同様
- `hasAnyKeyword(text, entries = WEAKNESS_TAXONOMY)` — 同様
- `resolveCanonical` 内の各呼び出しに `candidates` を渡す。`BY_LABEL.get` の完全一致も、`domain === "essay"` で `iv.` のエントリなら採らない

ファイル末尾に、表示用の群を足す。

```ts
/** 重点弱点の表示の群。小論文は層（採点の軸）、面接は interview */
export type WeaknessGroupKey = EssayCategoryKey | "interview";

/** 表示順: 文 → 構成 → 論証 → 成熟度 → 設問対応 → AP → 旧軸 → その他 → 面接 */
export const WEAKNESS_GROUP_ORDER: readonly WeaknessGroupKey[] = [
  "expression",
  "structure",
  "logic",
  "reasoningMaturity",
  "responsiveness",
  "apAlignment",
  "originality",
  "other",
  "interview",
];

export const WEAKNESS_GROUP_LABELS: Record<WeaknessGroupKey, string> = {
  expression: "文（表現力）",
  structure: "構成",
  logic: "論証",
  reasoningMaturity: "議論の成熟度",
  responsiveness: "設問対応",
  apAlignment: "AP合致",
  originality: "独自性（旧軸）",
  other: "その他",
  interview: "面接",
};

function entryOf(w: { area: string; canonicalId?: string | null }) {
  return (
    (w.canonicalId ? BY_ID.get(w.canonicalId) : undefined) ??
    BY_LABEL.get(w.area.trim())
  );
}

/** 表示の群。面接の弱点（iv.*）は小論文の層と分ける */
export function weaknessGroupOf(w: {
  area: string;
  canonicalId?: string | null;
  categoryId?: string | null;
}): WeaknessGroupKey {
  const entry = entryOf(w);
  if (entry?.id.startsWith("iv.")) return "interview";
  return weaknessCategoryOf(w);
}

/** カードに出す1行の説明。正規タクソノミーに無い弱点は空文字 */
export function weaknessDescriptionOf(w: {
  area: string;
  canonicalId?: string | null;
}): string {
  return entryOf(w)?.description ?? "";
}
```

`weaknessCategoryOf` の中の `entry` の取得も `entryOf(w)` に置き換える。

- [ ] **Step 5: `updateWeaknessRecords` から domain を渡す**

`src/lib/growth/analyze.ts` の `updateWeaknessRecords` 内、`resolveCanonical(tag, { ... })` の呼び出しに `domain` を足す（`newSource` は `"essay" | "interview" | "skill_check"` 等）。

```ts
    const entry = resolveCanonical(tag, {
      categoryHint: resolveCategory(tag),
      aiCanonicalId: canonicalHints?.get(tag) ?? null,
      supportText: detail,
      domain: newSource === "interview" ? "interview" : "essay",
    });
```

- [ ] **Step 6: 検査を通す**

Run: `npx tsc --noEmit -p . && npx tsx scripts/verify-weakness-label.ts && npx tsx scripts/verify-weakness-records.ts`
Expected: `[verify-weakness-label] OK` と `verify-weakness-records: 10 checks passed`

通らないときは、落ちたケースのラベル・説明文をキーワードと突き合わせ、キーワードを直す（検査の期待値は設計書 3 章が正）。

- [ ] **Step 7: Commit**

```bash
git add src/lib/growth/weakness-taxonomy.ts src/lib/growth/analyze.ts scripts/verify-weakness-label.ts scripts/verify-weakness-records.ts
git commit -m "feat(weakness): 弱点タクソノミー v2（層で組み直し、重なりをまとめ、説明と群を持たせる）"
```

---

### Task 2: 判定欄から弱点を作る関数（derive-weakness-issues）

**Files:**
- Create: `src/lib/essay/derive-weakness-issues.ts`
- Create: `scripts/verify-derive-issues.ts`
- Modify: `package.json`（`validate:data` の末尾に `&& tsx scripts/verify-derive-issues.ts`）

- [ ] **Step 1: 検査を書く**

`scripts/verify-derive-issues.ts`

```ts
/**
 * deriveWeaknessIssues の検査。添削結果の判定欄から、設計書 3.1 の弱点が
 * 期待どおり積まれるか（AI が同じ弱点を挙げていれば足さないか）を見る。
 */
import assert from "node:assert";
import { deriveWeaknessIssues } from "../src/lib/essay/derive-weakness-issues";
import { canonicalLabel } from "../src/lib/growth/weakness-taxonomy";
import type { SentenceCheckResult } from "../src/lib/essay/sentence-check-judge";

const L = canonicalLabel;
const broken = (kind: SentenceCheckResult["brokenSentences"][number]["kind"], n: number) =>
  Array.from({ length: n }, (_, i) => ({
    original: `文${kind}${i}。`,
    location: `第1段落 ${i + 1}文目`,
    kind,
    problem: "p",
    rewrite: "r",
  }));
const areas = (xs: { area: string }[]) => xs.map((x) => x.area).sort();

// 文の点検: ねじれ2文 → twist、助詞1文＋語1文 → grammar、誤字3文 → typo、矛盾 → contradiction
{
  const out = deriveWeaknessIssues(
    { repeatedIssues: [] },
    {
      brokenSentences: [...broken("twist", 2), ...broken("particle", 1), ...broken("collocation", 1), ...broken("typo", 3)],
      contradictions: [{ first: "A。", second: "B。", explanation: "e" }],
    }
  );
  assert.deepEqual(
    areas(out),
    [L("expression.twist"), L("expression.grammar"), L("expression.typo"), L("logic.contradiction")].sort()
  );
}
// 閾値未満は積まない
{
  const out = deriveWeaknessIssues(
    { repeatedIssues: [] },
    { brokenSentences: [...broken("twist", 1), ...broken("typo", 2)], contradictions: [] }
  );
  assert.deepEqual(out, []);
}
// 判定欄: 主題ずれ・要求の欠落・読み違い・知識の誤り・字数不足
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: false,
        subjectMatch: "narrower",
        requirements: [{ requirement: "二つ挙げよ", status: "missing", evidence: "" }],
        note: "n",
      },
      reportInsights: { misreadings: ["筆者の主張を逆に読んでいる"] } as never,
      knowledgeInsights: { basis: "b", errors: [{ claim: "c", correction: "x", severity: "critical" }] } as never,
      quantitativeAnalysis: { fillRate: 55 } as never,
    },
    null
  );
  assert.deepEqual(
    areas(out),
    [
      L("structure.off_topic"),
      L("responsiveness.missing_requirement"),
      L("responsiveness.misread"),
      L("responsiveness.knowledge_error"),
      L("responsiveness.too_short"),
    ].sort()
  );
}
// ブロック課題（partial）は字数不足と要求の欠落を積まない
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [],
      taskFulfillment: {
        answersQuestion: true,
        subjectMatch: "same",
        requirements: [{ requirement: "r", status: "missing", evidence: "" }],
        note: "",
      },
      quantitativeAnalysis: { fillRate: 20 } as never,
    },
    null,
    { partial: true }
  );
  assert.deepEqual(out, []);
}
// AI が同じ弱点を挙げていれば足さない（場所ラベルでも説明文から同じ弱点に寄るなら重複）
{
  const out = deriveWeaknessIssues(
    {
      repeatedIssues: [
        { area: "第1段落・第3段落", category: "expression", count: 1, message: "一文が長く主語と述語がねじれている" },
      ],
    },
    { brokenSentences: broken("twist", 3), contradictions: [] }
  );
  assert.equal(out.length, 1, "twist を二重に積まない");
}
// 冪等: 出力をもう一度通しても増えない
{
  const fb = {
    repeatedIssues: [],
    quantitativeAnalysis: { fillRate: 50 } as never,
  };
  const once = deriveWeaknessIssues(fb, { brokenSentences: broken("twist", 2), contradictions: [] });
  const twice = deriveWeaknessIssues({ ...fb, repeatedIssues: once }, { brokenSentences: broken("twist", 2), contradictions: [] });
  assert.equal(twice.length, once.length);
}
console.log("[verify-derive-issues] OK");
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx tsx scripts/verify-derive-issues.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

`src/lib/essay/derive-weakness-issues.ts`

```ts
/**
 * 添削結果の判定欄から弱点（repeatedIssues）を足す、唯一の関数。
 *
 * AI の repeatedIssues だけだと、添削で見つけている「要求の欠落」「読み違い」
 * 「知識の誤り」「字数不足」「崩れた文」が重点弱点に届かなかった（2026-09-26 の
 * 点検で、要求の欠落15本・読み違い5件・知識の誤り6件・語の誤り18文が漏れていた）。
 *
 * 書き込み（review-core）・作り直し（rebuild-weaknesses）・集計（weakness-aggregate）・
 * 表示（添削結果の API）が全部これを通る。材料か規則がずれると、弱点DB・レポート・
 * 添削結果で回数が食い違う。
 *
 * 足す弱点の area は正規ラベルそのもの。AI が同じ弱点（正本の ID）を既に挙げていれば足さない。
 * 設計: docs/superpowers/specs/2026-09-26-weakness-taxonomy-v2-design.md
 */
import type { EssayFeedback, RepeatedIssue } from "@/lib/types/essay";
import type { SentenceCheckResult } from "@/lib/essay/sentence-check-judge";
import {
  resolveCanonical,
  canonicalLabel,
  getTaxonomyEntry,
} from "@/lib/growth/weakness-taxonomy";
import { categorizeWeakness } from "@/lib/growth/weakness-category";

/** derive が読む判定欄（古い答案では欠けていることがある） */
export type DerivableFeedback = Pick<EssayFeedback, "repeatedIssues"> &
  Partial<
    Pick<
      EssayFeedback,
      "taskFulfillment" | "reportInsights" | "knowledgeInsights" | "quantitativeAnalysis" | "claimChecks"
    >
  >;

export interface DeriveOptions {
  /**
   * 講座のブロック課題（1ブロックだけ書く）。答案全体を前提にした
   * 字数不足・要求の欠落は当てはまらないので足さない
   */
  partial?: boolean;
}

/** 文の点検から弱点を積む閾値（1文だけは書き損じの可能性がある） */
const TWIST_MIN = 2;
const GRAMMAR_MIN = 2;
const TYPO_MIN = 3;
/** 字数が指定の何%未満で「大きく足りない」とするか */
const TOO_SHORT_RATE = 70;

export function deriveWeaknessIssues(
  feedback: DerivableFeedback,
  check: SentenceCheckResult | null | undefined,
  opts: DeriveOptions = {}
): RepeatedIssue[] {
  const issues = [...(feedback.repeatedIssues ?? [])];
  const present = new Set<string>();
  for (const i of issues) {
    const e = resolveCanonical(i.area ?? "", {
      categoryHint: i.category ?? categorizeWeakness(i.area ?? ""),
      supportText: i.message,
      domain: "essay",
    });
    if (e) present.add(e.id);
  }
  const add = (id: string, message: string) => {
    if (present.has(id)) return;
    present.add(id);
    issues.push({
      area: canonicalLabel(id),
      category: getTaxonomyEntry(id)!.category as RepeatedIssue["category"],
      count: 1,
      message,
    });
  };

  // --- 文の点検 ---
  const broken = check?.brokenSentences ?? [];
  const twists = broken.filter((b) => b.kind === "twist");
  const grammar = broken.filter((b) => b.kind === "particle" || b.kind === "collocation" || b.kind === "unreadable");
  const typos = broken.filter((b) => b.kind === "typo");
  if (twists.length >= TWIST_MIN)
    add("expression.twist", `「${twists[0].original}」など、主語と述語が噛み合わない文が${twists.length}文あります。`);
  if (grammar.length >= GRAMMAR_MIN)
    add("expression.grammar", `「${grammar[0].original}」など、助詞や語の使い方が崩れた文が${grammar.length}文あります。`);
  if (typos.length >= TYPO_MIN)
    add("expression.typo", `「${typos[0].original}」など、誤字・脱字のある文が${typos.length}文あります。`);
  const contradiction = check?.contradictions?.[0];
  if (contradiction)
    add("logic.contradiction", `「${contradiction.first}」と「${contradiction.second}」が食い違っている。`);

  // --- 判定欄 ---
  const task = feedback.taskFulfillment;
  if (task && task.subjectMatch && task.subjectMatch !== "same")
    add("structure.off_topic", task.note || "設問の主題と答案の中心がずれている。");
  if (!opts.partial) {
    const missing = (task?.requirements ?? []).filter((r) => r.status === "missing");
    if (missing.length > 0)
      add("responsiveness.missing_requirement", `設問の「${missing.map((r) => r.requirement).join("」「")}」に答えていない。`);
    const fillRate = feedback.quantitativeAnalysis?.fillRate;
    if (typeof fillRate === "number" && fillRate < TOO_SHORT_RATE)
      add("responsiveness.too_short", `指定字数の${Math.round(fillRate)}%にとどまっている。`);
  }
  const misreadings = feedback.reportInsights?.misreadings ?? [];
  const contradicted = (feedback.claimChecks ?? []).filter((c) => c.status === "contradicted");
  if (misreadings.length > 0) add("responsiveness.misread", misreadings[0]);
  else if (contradicted.length > 0)
    add("responsiveness.misread", `「${contradicted[0].claim}」が資料と食い違っている。`);
  const critical = (feedback.knowledgeInsights?.errors ?? []).filter((e) => e.severity === "critical");
  if (critical.length > 0)
    add("responsiveness.knowledge_error", `「${critical[0].claim}」— ${critical[0].correction}`);

  return issues;
}
```

`package.json` の `validate:data` の末尾に ` && tsx scripts/verify-derive-issues.ts` を足す。

- [ ] **Step 4: 通す**

Run: `npx tsc --noEmit -p . && npx tsx scripts/verify-derive-issues.ts`
Expected: `[verify-derive-issues] OK`

- [ ] **Step 5: Commit**

```bash
git add src/lib/essay/derive-weakness-issues.ts scripts/verify-derive-issues.ts package.json
git commit -m "feat(weakness): 添削の判定欄から弱点を作る deriveWeaknessIssues"
```

---

### Task 3: 書き込み経路と表示 API を derive に切り替える

**Files:**
- Modify: `src/lib/essay/review-core.ts`
- Modify: `src/app/api/essay/lecture/submit/route.ts:156-168`
- Modify: `src/app/api/essay/[id]/route.ts:1,57`
- Modify: `src/app/api/admin/students/[id]/essays/[essayId]/route.ts:1,173`

- [ ] **Step 1: review-core に `partial` を足し、repeatedIssues を derive で作る**

`EssayReviewCoreInput` に足す。

```ts
  /** 講座のブロック課題（1ブロックだけ書く）。字数不足・要求の欠落を弱点にしない */
  partial?: boolean;
```

`const feedback: EssayFeedback = { ... }` の中の `repeatedIssues: withSentenceCheckIssues(...)` を、AI の repeatedIssues だけにする。

```ts
    repeatedIssues: parsed.feedback.repeatedIssues.filter(
      (issue) => hasAdmissionPolicy || issue.category !== "apAlignment"
    ),
```

`const feedback` の組み立ての直後（`return { scores, feedback, ... }` の前）に足す。

```ts
  // 判定欄（文の点検・設問の充足・読み違い・知識・字数）から弱点を足す。
  // 作り直し・集計・表示と同じ関数（derive-weakness-issues.ts）
  feedback.repeatedIssues = deriveWeaknessIssues(feedback, sentenceCheck, {
    partial: input.partial,
  });
```

import を足す: `import { deriveWeaknessIssues } from "@/lib/essay/derive-weakness-issues";`

`withSentenceCheckIssues` 関数を削除する。`feedbackWithSentenceCheck` を次に置き換える（名前を `feedbackWithDerivedIssues` に変える）。

```ts
/**
 * 表示時に、後から付けた1文ずつの点検と判定欄の弱点を添削結果へ合流させる。
 * 弱点DBと添削結果で弱点が食い違わないように、書き込みと同じ derive を通す。
 * 点数は採点当時のまま変えない。
 */
export function feedbackWithDerivedIssues<
  F extends DerivableFeedback & {
    languageCorrections?: LanguageCorrection[] | null;
    improvements?: string[] | null;
  },
>(feedback: F, check: SentenceCheckResult | null | undefined, opts: DeriveOptions = {}): F {
  const improvements = feedback.improvements ?? [];
  const extra = check
    ? contradictionImprovements(check).filter(
        (t) => !improvements.some((i) => i.includes(t.slice(1, 20)))
      )
    : [];
  return {
    ...feedback,
    languageCorrections: check
      ? mergeSentenceCorrections(feedback.languageCorrections ?? [], check)
      : feedback.languageCorrections,
    repeatedIssues: deriveWeaknessIssues(feedback, check, opts),
    improvements: [...extra, ...improvements],
  };
}
```

import に `type DerivableFeedback, type DeriveOptions` を足す。

- [ ] **Step 2: 講座の提出で partial を渡す**

`src/app/api/essay/lecture/submit/route.ts` の `reviewEssayCore({ ... weaknessList, })` に1行足す。

```ts
        weaknessList,
        // 1ブロックだけ書く課題は、答案全体を前提にした判定（字数・要求の欠落）を弱点にしない
        partial: Boolean(lecture.exercise.blockId),
```

- [ ] **Step 3: 添削結果の API を切り替える**

`src/app/api/essay/[id]/route.ts` と `src/app/api/admin/students/[id]/essays/[essayId]/route.ts` の import と呼び出しを `feedbackWithDerivedIssues` にする。partial は答案から判定する。

```ts
import { feedbackWithDerivedIssues } from "@/lib/essay/review-core";
import { isPartialEssay } from "@/lib/essay/derive-weakness-issues";
```

```ts
    const feedback = feedbackWithDerivedIssues(
      (data.feedback ?? {}) as EssayFeedback,
      data.sentenceCheck,
      { partial: isPartialEssay(data) }
    );
```

（管理者側は `data.feedback ? feedbackWithDerivedIssues(data.feedback, data.sentenceCheck, { partial: isPartialEssay(data) }) : undefined`）

`src/lib/essay/derive-weakness-issues.ts` に足す。

```ts
import { getLectureById } from "@/data/essay-lectures";

/** 保存済みの答案が講座のブロック課題か（sourceType=lecture かつ課題が1ブロック） */
export function isPartialEssay(data: Record<string, unknown>): boolean {
  if (data.sourceType !== "lecture" || typeof data.lectureId !== "string") return false;
  return Boolean(getLectureById(data.lectureId)?.exercise.blockId);
}
```

- [ ] **Step 4: 型を通す**

Run: `npx tsc --noEmit -p .`
Expected: エラーは `withSentenceCheckIssues` を使っている残りの箇所（weakness-aggregate / scripts）だけ。Task 4 で直す。

- [ ] **Step 5: Commit**（Task 4 と一緒に型が通ってから）

---

### Task 4: 集計・作り直し・点検・後付けスクリプトを derive に切り替える

**Files:**
- Modify: `src/lib/growth/weakness-aggregate.ts:40-75`
- Modify: `scripts/rebuild-weaknesses.ts:140-150`
- Modify: `scripts/backfill-sentence-check.ts:125-135`

- [ ] **Step 1: weaknessKeysOf を derive で書き直す**

`src/lib/growth/weakness-aggregate.ts` の `weaknessKeysOf` を次にする（import の `withSentenceCheckIssues` は `deriveWeaknessIssues, isPartialEssay` に替える）。

```ts
export function weaknessKeysOf(data: Record<string, unknown>): string[] {
  const isInterview = "completedAt" in data || "mode" in data;
  const feedback = (data.feedback ?? {}) as DerivableFeedback;
  const issues = isInterview
    ? (feedback.repeatedIssues ?? [])
    : deriveWeaknessIssues(
        feedback,
        (data.sentenceCheck as SentenceCheckResult | undefined) ?? null,
        { partial: isPartialEssay(data) }
      );
  const keys = new Set<string>();
  for (const issue of issues) {
    const area = issue.area?.trim();
    if (!area || !isWeaknessLabel(area)) continue;
    const entry = resolveCanonical(area, {
      categoryHint: (issue.category as EssayCategoryKey | undefined) ?? categorizeWeakness(area),
      supportText: issue.message,
      domain: isInterview ? "interview" : "essay",
    });
    if (entry) keys.add(canonicalLabel(entry.id));
    else if (!isLocationOnlyLabel(area)) keys.add(area);
  }
  const saved = data.weaknessTags;
  if (Array.isArray(saved)) {
    for (const t of saved) {
      if (typeof t === "string" && VIDEO_WEAKNESS_TAG.test(t)) keys.add(aggregationKey(t));
    }
  }
  return [...keys];
}
```

面接の判別は、面接の文書にだけある項目で行う。実装前に `src/app/api/interview/end/route.ts` で保存している項目名を確認し、`completedAt` と `mode` が面接にだけあることを確かめる（小論文の答案に無いこと: `src/app/api/essay/review/route.ts` の保存項目）。違っていたら、呼び出し側（`collectWeaknessTags` を呼ぶレポート生成、audit）から種別を引数で渡す形に変える: `weaknessKeysOf(data, kind: "essay" | "interview")`。

- [ ] **Step 2: rebuild-weaknesses を derive にする**

`scripts/rebuild-weaknesses.ts` の答案の issues 作成を置き換える（import も `deriveWeaknessIssues` / `isPartialEssay` へ）。

```ts
    const issues: Issue[] = deriveWeaknessIssues(
      data.feedback,
      data.sentenceCheck ?? null,
      { partial: isPartialEssay(data) }
    );
```

- [ ] **Step 3: backfill-sentence-check の集計を derive にする**

```ts
      const added =
        deriveWeaknessIssues({ repeatedIssues: job.repeatedIssues }, result).length >
        job.repeatedIssues.length;
```

- [ ] **Step 4: 型と検査を通す**

Run: `npx tsc --noEmit -p . && npx tsx scripts/verify-weakness-label.ts && npx tsx scripts/verify-weakness-records.ts && npx tsx scripts/verify-derive-issues.ts && npx eslint src/lib/essay src/lib/growth scripts/rebuild-weaknesses.ts scripts/audit-weaknesses.ts scripts/backfill-sentence-check.ts`
Expected: すべて OK、lint エラー 0

- [ ] **Step 5: Commit**

```bash
git add src/lib/essay src/lib/growth src/app/api/essay src/app/api/admin/students scripts
git commit -m "refactor(weakness): 書き込み・作り直し・集計・表示を deriveWeaknessIssues に揃える"
```

---

### Task 5: 弱点 API に説明と群を付け、解決済みも返す

**Files:**
- Modify: `src/lib/types/growth.ts`（WeaknessRecord）
- Modify: `src/app/api/growth/weaknesses/route.ts:30-58`
- Modify: `src/app/api/admin/students/[id]/route.ts:245-261`

- [ ] **Step 1: WeaknessRecord に表示用の任意項目を足す**

```ts
  /** 表示用（API が付ける。保存しない）: カードに出す1行の説明 */
  description?: string;
  /** 表示用（API が付ける。保存しない）: 層か面接か */
  group?: import("@/lib/growth/weakness-taxonomy").WeaknessGroupKey;
```

`saveWeaknessRecords`（`src/lib/growth/weakness-store.ts`）が書き込む項目を確認し、`description` / `group` が保存されないことを確かめる。保存項目を列挙していなければ、書き込み直前に `const { description, group, ...rest } = w;` で除く。

- [ ] **Step 2: 生徒の弱点 API**

`src/app/api/growth/weaknesses/route.ts` の GET を次にする。

```ts
  const context = (searchParams.get("context") ?? "dashboard") as
    | "dashboard"
    | "essay_new"
    | "essay_result"
    | "all";
  ...
    const { records: weaknesses } = await loadWeaknessRecords(adminDb, userId);
    // all: 成長画面とダッシュボードの件数用。解決済みも含める（アーカイブ済みは除く）。
    // getRemindableWeaknesses は解決済みを返さないので、「解決済み」の列が常に0件だった
    const list =
      context === "all"
        ? weaknesses.filter((w) => !w.archivedAt)
        : getRemindableWeaknesses(weaknesses, context);
    const withDisplay = list.map((w) => ({
      ...w,
      description: weaknessDescriptionOf(w),
      group: weaknessGroupOf(w),
    }));
    return NextResponse.json({ weaknesses: withDisplay });
```

import: `import { weaknessDescriptionOf, weaknessGroupOf } from "@/lib/growth/weakness-taxonomy";`

- [ ] **Step 3: 管理者の生徒詳細 API**

`src/app/api/admin/students/[id]/route.ts` の weaknesses の map に足す。

```ts
          canonicalId: data.canonicalId,
          description: weaknessDescriptionOf({ area: data.area ?? "", canonicalId: data.canonicalId }),
          group: weaknessGroupOf({ area: data.area ?? "", canonicalId: data.canonicalId, categoryId: data.categoryId }),
```

- [ ] **Step 4: 型を通す**

Run: `npx tsc --noEmit -p .`
Expected: エラー 0

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/growth.ts src/lib/growth/weakness-store.ts src/app/api/growth/weaknesses/route.ts "src/app/api/admin/students/[id]/route.ts"
git commit -m "feat(weakness): 弱点 API が説明と群を返し、成長画面向けに解決済みも返す"
```

---

### Task 6: 画面（生徒）

**Files:**
- Modify: `src/components/growth/WeaknessReminderCard.tsx:103-115`
- Modify: `src/components/growth/WeaknessReminderBanner.tsx:154`
- Modify: `src/app/student/growth/page.tsx:127,206`
- Modify: `src/app/student/dashboard/page.tsx:341`

- [ ] **Step 1: カードに説明を出す**

WeaknessReminderCard: `{w.area}` の span の下、`直近:` の前に足す。

```tsx
              {w.description && (
                <p className="pl-[3.25rem] text-xs leading-relaxed text-amber-900/80">
                  {w.description}
                </p>
              )}
```

WeaknessReminderBanner: `<span className="text-sm font-medium">{w.area}</span>` を含む div の直後に足す。

```tsx
                {w.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{w.description}</p>
                )}
```

/student/growth の WeaknessColumn: `<p className="flex-1 text-sm font-medium">{w.area}</p>` を含む div の直後に足す。

```tsx
                {w.description && (
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {w.description}
                  </p>
                )}
```

- [ ] **Step 2: 解決済みを取る**

`src/app/student/growth/page.tsx:206` と `src/app/student/dashboard/page.tsx:341` の `context=dashboard` を `context=all` にする。成長画面の列分けが `getWeaknessReminderLevel` で解決済みを「解決済み」列に入れていることを確認する（`level === "resolved"`）。ダッシュボードの WeaknessSummaryCompact は `w.resolved` で数えているのでそのまま動く。

- [ ] **Step 3: 型とビルド**

Run: `npx tsc --noEmit -p . && npm run build`
Expected: エラー 0

- [ ] **Step 4: Commit**

```bash
git add src/components/growth src/app/student/growth/page.tsx src/app/student/dashboard/page.tsx
git commit -m "feat(weakness): 生徒の弱点カードに説明を出し、成長画面の解決済みを表示する"
```

---

### Task 7: 画面（管理者）— 群で並べ、面接を分ける

**Files:**
- Modify: `src/components/admin/WeaknessTopChart.tsx`
- Modify: `src/app/admin/students/[id]/page.tsx:187-330`

- [ ] **Step 1: WeaknessTopChart を群で集計する**

- `categorizeWeakness` / `weaknessCategoryOf` での分類を `weaknessGroupOf(w)` に替える
- `EssayCategoryKey` を `WeaknessGroupKey` に、`ESSAY_CATEGORY_ORDER` / `ESSAY_CATEGORY_LABELS` を `WEAKNESS_GROUP_ORDER` / `WEAKNESS_GROUP_LABELS` に替える
- `CATEGORY_COLORS` に `interview: { bg: "bg-fuchsia-500", hex: "#d946ef" }` を足す
- 展開した個別弱点の行で、`w.area` の下に `w.description` を小さく出す（`text-muted-foreground text-[11px]`）
- 並びは件数順のまま。凡例は `WEAKNESS_GROUP_ORDER` の順

- [ ] **Step 2: 生徒詳細の弱点一覧を群で並べる**

`WeaknessesByCategoryList` の `out` の初期値を `WEAKNESS_GROUP_ORDER` から作り、`out[weaknessGroupOf(w)].push(w)` にする。見出しは `WEAKNESS_GROUP_LABELS[cat]`、開閉の初期値も `WEAKNESS_GROUP_ORDER` 全部。表の弱点名セルに説明を足す。

```tsx
                          <p className="leading-snug break-words">{w.area}</p>
                          {w.description && (
                            <p className="text-muted-foreground mt-0.5 text-xs">{w.description}</p>
                          )}
```

- [ ] **Step 3: 型・lint・ビルド**

Run: `npx tsc --noEmit -p . && npx eslint src/components/admin/WeaknessTopChart.tsx && npm run build`
Expected: エラー 0（生徒詳細ページの既存の lint エラーは今回の変更外）

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/WeaknessTopChart.tsx "src/app/admin/students/[id]/page.tsx"
git commit -m "feat(weakness): 重点弱点と生徒詳細を層＋面接の群で並べ、説明を出す"
```

---

### Task 8: 本番データで確かめ、作り直す

- [ ] **Step 1: 本番の全指摘を v2 で分類し直す（読み取りのみ）**

一時スクリプト `scripts/_tmp_cov.ts` で、essays / interviews の全件を `weaknessKeysOf` と同じ規則で数え、正規ラベルごとの件数と、どれにも寄らなかった指摘を出す（2026-09-26 の点検と同じ形。終わったら消す）。

Expected: 漏れが「面接の自由記述」と「経験が無い」系（v23 で評価しないと決めたもの）だけ。新しい弱点（要求の欠落・読み違い・知識の誤り・語の誤り・誤字）に件数が付く。

- [ ] **Step 2: push**

```bash
npm run build && git push origin main
```

- [ ] **Step 3: 作り直しの確認モード**

Run: `npx tsx --env-file=.env.local scripts/rebuild-weaknesses.ts --detail --name=山内`
Expected: 層ごとの弱点が並び、「結論で立場を言い切れていない」「根拠が一般論で具体性がない」等の新ラベルになる

**ここでユーザーに差分を見せ、`--apply` の確認を取る。**

- [ ] **Step 4: 作り直し（確認が取れてから）**

Run: `npx tsx --env-file=.env.local scripts/rebuild-weaknesses.ts --apply`
続けて: `npx tsx --env-file=.env.local scripts/audit-weaknesses.ts`
Expected: 倍率 1.0 前後、同じ正規ラベルの重複 0組

- [ ] **Step 5: 画面で確認する**

本番（`coach-app--coach-sougou-sentaku.asia-east1.hosted.app`）のデプロイ完了後、またはエミュレータ（CLAUDE.md 6章の手順）で:
- 管理者: 生徒詳細の弱点一覧が「文（表現力）／構成／論証／…／面接」の順で並び、説明が出る。重点弱点のグラフに面接が別の群で出る
- 生徒: /student/growth の「解決済み」列に解決済みの弱点が出る。ダッシュボードの「解決」件数が0でない（解決済みがある生徒で）。弱点カードに説明が出る

- [ ] **Step 6: CLAUDE.md の弱点DBの行を更新する**

「弱点DB（`users/*/weaknesses`）の読み書きは…」の行の末尾に、1文足す（既存の文と重ねない）。

```
添削結果の判定欄から弱点を作るのは `deriveWeaknessIssues`（書き込み・作り直し・集計・表示の全部がこれを通る。別に書くと回数が食い違う）。
```

```bash
git add CLAUDE.md && git commit -m "docs: 弱点の判定の正本を CLAUDE.md に記す" && git push origin main
```

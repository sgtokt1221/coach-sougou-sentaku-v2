/**
 * 課題文型（report）の設問を「課題文を読まないと答えられない形」に書き換える下書きを作る。
 *
 * 監査（2026-09-09）で、課題文つき69件のうち63件が「課題文を読み、〜について
 * 論じなさい」型で、題材が設問側に書いてあるため読まずに書けることが分かった。
 * 課題文を実際に読ませて、その本文にしか無い情報（筆者の主張）を含む設問案を作る。
 *
 * **このスクリプトは自動で本体データを書き換えない。** 提案を別ファイルへ出すだけ。
 * 出題文は生徒の学習の質を直接決めるので、人が読んでから反映する。
 *
 * 使い方:
 *   npx tsx scripts/draft-passage-questions.ts --dry-run            # 3件だけ試す
 *   npx tsx scripts/draft-passage-questions.ts --out                # 全件を提案ファイルへ
 *   npx tsx scripts/draft-passage-questions.ts --out --limit=10
 *   npx tsx scripts/draft-passage-questions.ts --out --id=pq-toyo-phil-001
 *
 * 出力先: src/data/passage-question-drafts.json（人が確認して本体へ反映する）
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "node:fs";
import * as path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  PAST_QUESTIONS,
  resolveQuestionType,
  type PastQuestion,
} from "../src/data/essay-past-questions";
import { AI_MODEL_SONNET } from "../src/lib/ai/prompt-versions";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isOut = args.includes("--out");
const idArg = args.find((a) => a.startsWith("--id="))?.split("=")[1];
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? parseInt(limitArg, 10) : isDryRun ? 3 : Infinity;

if (!isDryRun && !isOut) {
  console.error("使い方: --dry-run か --out を指定してください");
  process.exit(1);
}

const OUT_FILE = path.resolve(
  __dirname,
  "../src/data/passage-question-drafts.json"
);
const PARALLELISM = 3;

const BINDS_TO_SOURCE =
  /筆者|著者の主張|傍線|下線|論旨|要約し|文中の|課題図書の内容|本文中/;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY が未設定です（.env.local）");
  process.exit(1);
}
const client = new Anthropic({ apiKey });

interface Draft {
  id: string;
  university: string;
  faculty: string;
  before: string;
  after: string;
  /** 設問が根拠にしている、課題文中の筆者の主張 */
  authorClaim: string;
}

function buildPrompt(pq: PastQuestion): string {
  return [
    "あなたは総合型選抜の小論文を出題する大学教員です。",
    "以下の課題文と現在の設問を読み、**課題文を読まないと答えられない設問**に書き直してください。",
    "",
    "## 現在の設問の問題点",
    "「課題文を読み、〇〇について論じなさい」の形だと、〇〇が設問に書いてあるため、",
    "課題文を読まずに一般論で書けてしまいます。実際に受験生はそう書いています。",
    "",
    "## 書き直しの条件",
    "1. 課題文の**筆者の主張を具体的に引いた上で**、それに対する応答を求める形にする",
    "   例: 「筆者は〈…〉と述べている。この主張を踏まえ、〜について論じなさい」",
    "2. 引く主張は、課題文を読まなければ書けない固有の内容にする（一般論は不可）",
    "3. 元の設問の主題・字数・試験形式（時間や選抜名）は変えない",
    "4. 設問は日本語で、200字以内",
    "",
    "## 出力",
    "次のJSONだけを返してください。前後に説明を書かないでください。",
    '{"authorClaim": "課題文における筆者の主張（60字以内）", "question": "書き直した設問"}',
    "",
    "## 現在の設問",
    String(pq.description ?? ""),
    "",
    "## 課題文",
    String(pq.sourceText ?? ""),
  ].join("\n");
}

async function draftOne(pq: PastQuestion): Promise<Draft | null> {
  try {
    const res = await client.messages.create({
      model: AI_MODEL_SONNET,
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPrompt(pq) }],
    });
    const text = res.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      console.warn(`  ! ${pq.id}: JSON が取れなかった`);
      return null;
    }
    const parsed = JSON.parse(m[0]) as {
      authorClaim?: string;
      question?: string;
    };
    if (!parsed.question) {
      console.warn(`  ! ${pq.id}: question が空`);
      return null;
    }
    if (!BINDS_TO_SOURCE.test(parsed.question)) {
      // 生成が条件を満たしていない。人が直す前提で残すが印を付ける
      console.warn(`  ! ${pq.id}: 生成された設問がまだ課題文に縛られていない`);
    }
    return {
      id: pq.id,
      university: pq.universityName,
      faculty: pq.facultyName,
      before: String(pq.description ?? ""),
      after: parsed.question,
      authorClaim: parsed.authorClaim ?? "",
    };
  } catch (err) {
    console.warn(`  ! ${pq.id}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function main() {
  let targets = PAST_QUESTIONS.filter(
    (pq) => resolveQuestionType(pq) === "report"
  ).filter((pq) => !BINDS_TO_SOURCE.test(String(pq.description ?? "")));

  if (idArg) targets = targets.filter((pq) => pq.id === idArg);
  targets = targets.slice(0, limit);

  console.log(`書き換え対象: ${targets.length}件`);
  if (targets.length === 0) return;

  const drafts: Draft[] = [];
  for (let i = 0; i < targets.length; i += PARALLELISM) {
    const batch = targets.slice(i, i + PARALLELISM);
    const results = await Promise.all(batch.map(draftOne));
    for (const r of results) if (r) drafts.push(r);
    console.log(
      `  ${Math.min(i + PARALLELISM, targets.length)}/${targets.length}`
    );
  }

  if (isDryRun) {
    for (const d of drafts) {
      console.log(`\n--- ${d.id}（${d.university} ${d.faculty}）`);
      console.log(`  筆者の主張: ${d.authorClaim}`);
      console.log(`  変更前: ${d.before}`);
      console.log(`  変更後: ${d.after}`);
    }
    console.log("\n（--dry-run のため書き出していません）");
    return;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(drafts, null, 2) + "\n", "utf-8");
  console.log(`\n${drafts.length}件を ${OUT_FILE} に書き出しました。`);
  console.log(
    "人が読んで確認したうえで、essay-past-questions.ts の description へ反映してください。"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

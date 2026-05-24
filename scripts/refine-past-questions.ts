/**
 * 過去問 helpfulContext AI バッチ生成スクリプト。
 *
 * sourceText が無く description が抽象的な過去問に対して、 Claude で
 * 「論述のための背景知識・主要事実・論点・構成ヒント」 を生成し、
 * src/data/past-question-helpful-contexts.ts に追記する。
 *
 * 使い方:
 *   tsx scripts/refine-past-questions.ts --dry-run
 *   tsx scripts/refine-past-questions.ts --dry-run --university=waseda-u
 *   tsx scripts/refine-past-questions.ts --dry-run --limit=3
 *   tsx scripts/refine-past-questions.ts --write --university=waseda-u
 *
 * 既補強分 (essay-past-questions.ts に inline 済 / past-question-helpful-contexts.ts に key 済)
 * は自動でスキップ (idempotent)。
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "node:fs";
import * as path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { PAST_QUESTIONS, type PastQuestion, type HelpfulContext } from "../src/data/essay-past-questions";
import { PAST_QUESTION_HELPFUL_CONTEXTS } from "../src/data/past-question-helpful-contexts";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isWrite = args.includes("--write");
const universityArg = args.find((a) => a.startsWith("--university="))?.split("=")[1];
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;

if (!isDryRun && !isWrite) {
  console.error("使い方: --dry-run か --write を指定してください");
  process.exit(1);
}

const PARALLELISM = 3;
const MODEL = "claude-sonnet-4-6";
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../src/data/past-question-helpful-contexts.ts",
);

/**
 * 補強対象判定。
 * - sourceText あり → 不要 (文脈十分)
 * - 既に inline helpfulContext あり → スキップ
 * - 既に外部マップに key あり → スキップ
 * - description が 100 字以上で具体的 → スキップ (今回は短いものに絞る)
 * - 数理・理学系の field は除外 (テキスト型補強と合わない)
 */
function shouldRefine(pq: PastQuestion): boolean {
  if (pq.sourceText) return false;
  if (pq.helpfulContext) return false;
  if (PAST_QUESTION_HELPFUL_CONTEXTS[pq.id]) return false;
  if (pq.description.length >= 200) return false;
  if (["科学", "数学", "物理", "化学", "工学"].includes(pq.field)) return false;
  return true;
}

function buildPrompt(pq: PastQuestion): string {
  return `あなたは総合型選抜・推薦入試の小論文指導のエキスパートです。
以下の過去問について、生徒が論述するための「背景知識・主要事実・論点・構成」 を JSON で出力してください。

大学: ${pq.universityName}
学部: ${pq.facultyName}
テーマ: ${pq.theme}
設問: ${pq.description}
出題年: ${pq.year}
推奨字数: ${pq.wordLimit ?? "未指定"}
分野: ${pq.field}

出力は以下の JSON のみ。 マークダウン記法・コードブロック・前置きの文章は一切付けないでください。

{
  "backgroundKnowledge": "題材の概要を2-4文で。関連する法律・歴史・定義などを含む",
  "keyFacts": ["主要な統計データ・事実1", "..."],
  "argumentAngles": ["論述で使える対立軸・視点1", "..."],
  "suggestedStructure": "序論→本論→結論の組み立て例を1-2文で"
}

ルール:
- 統計は2022年以降の最新値を中心に。 確度が低い数値は記載しない
- keyFacts は 3〜5 個
- argumentAngles は 3〜5 個
- 事実誤認の可能性が高い場合は記載しない (該当配列を空にしてOK)
- 答えそのものは書かず「考えるネタ」 に留める
- すべてプレーンテキスト (太字・箇条書きマーカー等は使わない)`;
}

async function generateOne(client: Anthropic, pq: PastQuestion): Promise<HelpfulContext | null> {
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: buildPrompt(pq) }],
    });
    const text =
      res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as HelpfulContext;
    return parsed;
  } catch (e) {
    console.error(`[${pq.id}] generation failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  poolSize: number,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: poolSize }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

function writeOutputFile(map: Record<string, HelpfulContext>): void {
  const sortedKeys = Object.keys(map).sort();
  const lines: string[] = [
    `import type { HelpfulContext } from "./essay-past-questions";`,
    ``,
    `/**`,
    ` * 過去問 id → 練習用に補完した「論述のための背景知識」マップ。`,
    ` *`,
    ` * AI バッチ (\`scripts/refine-past-questions.ts\`) で生成・追記する。`,
    ` * 静的データ \`essay-past-questions.ts\` 本体は触らないことでデータ管理を分離する。`,
    ` *`,
    ` * 優先順位 (essay-past-questions.ts の \`getEnrichedPastQuestions()\` で適用):`,
    ` * - inline \`helpfulContext\` (essay-past-questions.ts に直書き、 手作業実装分) を最優先`,
    ` * - inline が無い場合のみここの map を fallback として使用`,
    ` */`,
    `export const PAST_QUESTION_HELPFUL_CONTEXTS: Record<string, HelpfulContext> = {`,
  ];
  for (const id of sortedKeys) {
    const c = map[id];
    lines.push(`  ${JSON.stringify(id)}: {`);
    if (c.backgroundKnowledge) {
      lines.push(`    backgroundKnowledge: ${JSON.stringify(c.backgroundKnowledge)},`);
    }
    if (c.keyFacts && c.keyFacts.length > 0) {
      lines.push(`    keyFacts: [`);
      for (const f of c.keyFacts) {
        lines.push(`      ${JSON.stringify(f)},`);
      }
      lines.push(`    ],`);
    }
    if (c.argumentAngles && c.argumentAngles.length > 0) {
      lines.push(`    argumentAngles: [`);
      for (const a of c.argumentAngles) {
        lines.push(`      ${JSON.stringify(a)},`);
      }
      lines.push(`    ],`);
    }
    if (c.suggestedStructure) {
      lines.push(`    suggestedStructure: ${JSON.stringify(c.suggestedStructure)},`);
    }
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8");
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY が .env.local に設定されていません");
    process.exit(1);
  }

  const target = PAST_QUESTIONS.filter((pq) => {
    if (!shouldRefine(pq)) return false;
    if (universityArg && pq.universityId !== universityArg) return false;
    return true;
  }).slice(0, limit);

  console.log(`対象: ${target.length} 件 (大学: ${universityArg ?? "全て"})`);
  if (target.length === 0) {
    console.log("補強対象なし");
    return;
  }

  if (isDryRun) {
    console.log("\n=== Dry-run プレビュー ===\n");
    const client = new Anthropic({ apiKey });
    const results: Array<{ id: string; helpfulContext: HelpfulContext | null }> = [];
    await runPool(
      target,
      async (pq, i) => {
        process.stderr.write(`[${i + 1}/${target.length}] ${pq.id} ${pq.universityName} ${pq.theme}\n`);
        const helpfulContext = await generateOne(client, pq);
        results.push({ id: pq.id, helpfulContext });
      },
      PARALLELISM,
    );
    // 順序を id でソートして表示
    results.sort((a, b) => a.id.localeCompare(b.id));
    for (const { id, helpfulContext } of results) {
      const pq = PAST_QUESTIONS.find((q) => q.id === id)!;
      console.log(`\n## ${id} - ${pq.universityName} ${pq.facultyName}`);
      console.log(`テーマ: ${pq.theme}`);
      console.log(`設問: ${pq.description}`);
      if (!helpfulContext) {
        console.log("→ 生成失敗");
        continue;
      }
      console.log(`backgroundKnowledge: ${helpfulContext.backgroundKnowledge ?? ""}`);
      console.log(`keyFacts:`);
      for (const f of helpfulContext.keyFacts ?? []) console.log(`  - ${f}`);
      console.log(`argumentAngles:`);
      for (const a of helpfulContext.argumentAngles ?? []) console.log(`  - ${a}`);
      console.log(`suggestedStructure: ${helpfulContext.suggestedStructure ?? ""}`);
    }
    console.log(`\n完了: ${results.filter((r) => r.helpfulContext).length}/${target.length}`);
    return;
  }

  // write モード
  const client = new Anthropic({ apiKey });
  const merged: Record<string, HelpfulContext> = { ...PAST_QUESTION_HELPFUL_CONTEXTS };
  let succeeded = 0;
  let failed = 0;
  await runPool(
    target,
    async (pq, i) => {
      process.stderr.write(`[${i + 1}/${target.length}] ${pq.id} ${pq.universityName} ${pq.theme}\n`);
      const helpfulContext = await generateOne(client, pq);
      if (helpfulContext) {
        merged[pq.id] = helpfulContext;
        succeeded++;
      } else {
        failed++;
      }
    },
    PARALLELISM,
  );
  writeOutputFile(merged);
  console.log(`\n書き出し完了: ${OUTPUT_FILE}`);
  console.log(`成功: ${succeeded} / 失敗: ${failed} / 合計: ${target.length}`);
  console.log(`(マップ全体は ${Object.keys(merged).length} 件)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

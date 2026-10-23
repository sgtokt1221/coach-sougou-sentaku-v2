/**
 * 1文ずつの点検（src/lib/essay/sentence-check-judge.ts）だけを評価する（読み取りのみ）。
 *
 * 添削本体の評価（eval-essay-review.ts）は1回 $0.27 かかり、点検の変更を見るには重い。
 * 点検は表現の上限（崩れた文2つで4点）と弱点DBに直接効くので、取りこぼし（再現率）と
 * 正しい文を誤りにする誤検出の両方を、ここで別に測る。
 *
 *   npx tsx --env-file=.env.local scripts/eval-sentence-check.ts --reps=3 --variant=baseline
 *
 * 測るもの:
 *   - N6: 主述のねじれ3か所のうち何か所を挙げたか（多いほど良い）
 *   - S0: ねじれの無い答案で文法の誤り（誤字以外）を何件挙げたか（0が正解）
 *   - mustNotFlag: 誤りではないと確認した本番の文を挙げたか（0が正解）
 *   - 本番の答案: 文法の誤りの件数（減っても N6 が落ちなければ誤検出が減ったとみなす）
 * 出力: .claude/hillclimb/sentence-check/<variant>/（gitignore 済み。本番の本文を含む）
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { judgeSentences } from "../src/lib/essay/sentence-check-judge";
import { S0, TWISTS, withTwists } from "./eval/essay-review-cases";

const argv = process.argv.slice(2);
const opt = (name: string) =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const REPS = Number(opt("reps") ?? 3);
const VARIANT = opt("variant") ?? "baseline";
const PRODUCTION_LIMIT = Number(opt("production") ?? 12);

/**
 * 誤りではない文（本番の答案で点検が「ねじれ」と誤判定したもの）。
 * 本文は持たず、答案IDと文の書き出しだけを置く。
 */
const MUST_NOT_FLAG: { essayId: string; starts: string[] }[] = [
  {
    // 2026-10-23。3文とも誤りではないのに崩れた文として数えられ、表現が4点に抑えられた
    essayId: "essay_1792747638090_yzv8fgn",
    starts: [
      "しかし、AIが普及することで勉強の知識を伝えることは",
      "教師の本来の目的が見失われ",
      "具体的にはAIに勉強に必要な知識そのものを届けさせ",
    ],
  },
];

interface EvalCase {
  id: string;
  text: string;
  /** 挙げるべき文（N6） */
  mustFlag?: string[];
  /** 挙げてはいけない文の書き出し */
  mustNotFlag?: string[];
  /** 文法の誤りを1件も挙げてはいけない（S0） */
  clean?: boolean;
}

async function loadCases(): Promise<EvalCase[]> {
  const s0 = S0.join("\n");
  const cases: EvalCase[] = [
    { id: "S0-base", text: s0, clean: true },
    { id: "N6-twisted", text: withTwists(s0), mustFlag: TWISTS.map(([, to]) => to) },
  ];
  const { adminDb } = await import("../src/lib/firebase/admin");
  if (!adminDb) throw new Error("Firestore に接続できません");
  const text = async (id: string) =>
    ((await adminDb.doc(`essays/${id}`).get()).data()?.ocrText as string) ?? "";
  for (const m of MUST_NOT_FLAG) {
    cases.push({ id: m.essayId, text: await text(m.essayId), mustNotFlag: m.starts });
  }
  const production: { id: string }[] = JSON.parse(
    readFileSync("scripts/eval/essay-review-production.json", "utf8")
  );
  for (const p of production.slice(0, PRODUCTION_LIMIT)) {
    const t = await text(p.id);
    if (t.trim()) cases.push({ id: p.id, text: t });
  }
  return cases;
}

async function main() {
  const client = new Anthropic();
  const cases = await loadCases();
  const outDir = join(".claude/hillclimb/sentence-check", VARIANT);
  mkdirSync(outDir, { recursive: true });
  const rows: Record<string, unknown>[] = [];
  let failed = 0;
  await Promise.all(
    cases.flatMap((c) =>
      Array.from({ length: REPS }, async (_, rep) => {
        const r = await judgeSentences({ client, essayText: c.text });
        if (!r) {
          failed += 1;
          return;
        }
        const grammar = r.brokenSentences.filter((b) => b.kind !== "typo");
        rows.push({
          case: c.id,
          rep,
          grammar: grammar.length,
          caught: c.mustFlag
            ? c.mustFlag.filter((s) => r.brokenSentences.some((b) => b.original === s)).length
            : undefined,
          falseFlags: c.mustNotFlag
            ? c.mustNotFlag.filter((s) => r.brokenSentences.some((b) => b.original.startsWith(s))).length
            : c.clean
              ? grammar.length
              : undefined,
          flagged: r.brokenSentences.map((b) => `[${b.kind}] ${b.original} → ${b.rewrite} ／ ${b.problem}`),
        });
      })
    )
  );
  writeFileSync(join(outDir, "results.json"), JSON.stringify(rows, null, 2));

  const by = (id: string) => rows.filter((r) => r.case === id);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  const n6 = by("N6-twisted").map((r) => r.caught as number);
  const s0 = by("S0-base").map((r) => r.falseFlags as number);
  const mnf = rows.filter((r) => MUST_NOT_FLAG.some((m) => m.essayId === r.case)).map((r) => r.falseFlags as number);
  const prod = rows
    .filter((r) => !["N6-twisted", "S0-base"].includes(r.case as string) && !MUST_NOT_FLAG.some((m) => m.essayId === r.case))
    .map((r) => r.grammar as number);
  const lines = [
    `# 1文ずつの点検 ${VARIANT}（reps=${REPS}、失敗 ${failed}）`,
    `- N6 ねじれ3か所のうち挙げた数: 平均 ${avg(n6).toFixed(2)}（${n6.join(",")}）`,
    `- S0 文法の誤検出: 平均 ${avg(s0).toFixed(2)}（${s0.join(",")}）`,
    `- 誤りでない本番の文を挙げた数: 平均 ${avg(mnf).toFixed(2)}（${mnf.join(",")}）`,
    `- 本番 ${prod.length / REPS}通の文法の指摘: 1通あたり平均 ${avg(prod).toFixed(2)}`,
  ];
  writeFileSync(join(outDir, "summary.md"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  console.log(`詳細: ${outDir}/results.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

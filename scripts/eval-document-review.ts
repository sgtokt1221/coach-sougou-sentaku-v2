/**
 * 出願書類の添削を、作成書類で検証する（実APIを呼ぶ。Firestore には触らない）。
 *
 *   npx tsx --env-file=.env.local scripts/eval-document-review.ts --reps=3 --variant=v10 [--ids=D4-gap,D5-bridged] [--concurrency=4]
 *   npx tsx scripts/eval-document-review.ts --summarize --variant=v10
 *
 * 出力: .claude/hillclimb/document-review/<variant>/ に results.jsonl・traces/・summary.md
 * 書類の版を上げる前に回し、方向テストが落ちないことを確かめる（小論文の
 * eval-essay-review.ts と同じ考え方。ケースは scripts/eval/document-review-cases.ts）。
 */
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { runDocumentReview } from "@/lib/documents/review-core";
import { documentScoreLayout, documentTotal } from "@/lib/documents/score-axes";
import { getRankFromPercentage } from "@/lib/score-rank";
import type { DocumentFeedback } from "@/lib/types/document";
import { DOC_CASES, type DocCase, type DocExpectation } from "./eval/document-review-cases";

function opt(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const REPS = Number(opt("reps") ?? 1);
const VARIANT = opt("variant") ?? "baseline";
const CONCURRENCY = Number(opt("concurrency") ?? 4);
const IDS = opt("ids")?.split(",");
const SUMMARIZE = process.argv.includes("--summarize");
const OUT = `.claude/hillclimb/document-review/${VARIANT}`;

interface Row {
  id: string;
  rep: number;
  incomplete: boolean;
  percentage: number | null;
  rank: string | null;
  scores: Record<string, number | null>;
  priority: string;
  examples: string[];
  durationMs: number;
  usage: unknown;
}

/** 大学データ（JSON）から AP を引く。Firestore を見ずに本番と同じ整形をかける */
function loadAp(universityId: string, facultyId: string): string {
  for (const f of readdirSync("src/data/universities")) {
    if (!f.endsWith(".json")) continue;
    const path = `src/data/universities/${f}`;
    const data = JSON.parse(readFileSync(path, "utf8"));
    const list = Array.isArray(data) ? data : (data.universities ?? []);
    const uni = list.find((u: { id: string }) => u.id === universityId);
    const fac = uni?.faculties?.find((x: { id: string }) => x.id === facultyId);
    if (fac?.admissionPolicy) return prepareAdmissionPolicy(fac.admissionPolicy).text;
  }
  throw new Error(`AP が見つからない: ${universityId}/${facultyId}`);
}

function toRow(c: DocCase, rep: number, feedback: DocumentFeedback, durationMs: number, usage: unknown): Row {
  const layout = documentScoreLayout(feedback, c.input.type);
  const total = documentTotal(layout);
  return {
    id: c.id,
    rep,
    incomplete: layout.incomplete,
    percentage: layout.incomplete ? null : total.percentage,
    rank: layout.incomplete ? null : getRankFromPercentage(total.percentage),
    scores: Object.fromEntries(layout.axes.map((a) => [a.key, a.score])),
    priority: feedback.priorityImprovement ?? "",
    examples: (feedback.improvementDetails ?? []).map((d) => d.example ?? "").filter(Boolean),
    durationMs,
    usage,
  };
}

function mean(xs: number[]): number | null {
  return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
}

function axisMean(rows: Row[], axis: string): number | null {
  return mean(rows.map((r) => r.scores[axis]).filter((v): v is number => typeof v === "number"));
}

/** 1つの期待を、そのケースの全試行で判定する。通れば true */
function check(e: DocExpectation, rows: Row[], all: Row[]): { ok: boolean; detail: string } {
  switch (e.kind) {
    case "incomplete": {
      const n = rows.filter((r) => r.incomplete).length;
      return { ok: n === rows.length, detail: `${n}/${rows.length}回 書きかけ` };
    }
    case "percentMax": {
      const n = rows.filter((r) => r.percentage !== null && r.percentage <= e.value).length;
      return { ok: n === rows.length, detail: `${n}/${rows.length}回 ≤${e.value}% (${rows.map((r) => r.percentage).join(",")})` };
    }
    case "percentMin": {
      const n = rows.filter((r) => r.percentage !== null && r.percentage >= e.value).length;
      return { ok: n === rows.length, detail: `${n}/${rows.length}回 ≥${e.value}% (${rows.map((r) => r.percentage).join(",")})` };
    }
    case "axisMax": {
      const n = rows.filter((r) => (r.scores[e.axis] ?? 99) <= e.value).length;
      return { ok: n === rows.length, detail: `${e.axis} ≤${e.value}: ${n}/${rows.length}回 (${rows.map((r) => r.scores[e.axis]).join(",")})` };
    }
    case "priorityMentions": {
      const n = rows.filter((r) => e.words.some((w) => r.priority.includes(w))).length;
      return { ok: n === rows.length, detail: `今回の課題に「${e.words.join("/")}」: ${n}/${rows.length}回` };
    }
    case "axisAbove": {
      const other = all.filter((r) => r.id === e.caseId);
      const a = axisMean(rows, e.axis);
      const b = axisMean(other, e.axis);
      return { ok: a !== null && b !== null && a > b, detail: `${e.axis} 平均 ${a} vs ${e.caseId} ${b}` };
    }
    case "noInvented": {
      const hits = rows.flatMap((r) => r.examples.filter((x) => e.words.some((w) => x.includes(w))));
      return { ok: hits.length === 0, detail: hits.length ? `作り話の疑い: ${hits[0].slice(0, 60)}` : "例文に作り話なし" };
    }
  }
}

function summarize(): void {
  const rows: Row[] = readFileSync(`${OUT}/results.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const lines: string[] = [`# document-review eval: ${VARIANT}`, ""];
  const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b);
  lines.push(`- 試行 ${rows.length} / 所要 中央値 ${Math.round(durations[Math.floor(durations.length / 2)] / 1000)}秒・最大 ${Math.round(durations[durations.length - 1] / 1000)}秒`, "");
  lines.push("| ケース | 割合 | ランク | 軸の平均 |", "|---|---|---|---|");
  for (const c of DOC_CASES) {
    const rs = rows.filter((r) => r.id === c.id);
    if (!rs.length) continue;
    const axes = Object.keys(rs[0].scores).map((k) => `${k} ${axisMean(rs, k)}`).join(" / ");
    lines.push(`| ${c.id} ${c.label} | ${rs.map((r) => r.percentage ?? "書きかけ").join(", ")} | ${rs.map((r) => r.rank ?? "-").join(", ")} | ${axes} |`);
  }
  lines.push("", "## 方向テスト", "", "| ケース | 条件 | 結果 |", "|---|---|---|");
  let pass = 0;
  let total = 0;
  for (const c of DOC_CASES) {
    const rs = rows.filter((r) => r.id === c.id);
    if (!rs.length) continue;
    for (const e of c.expect) {
      const r = check(e, rs, rows);
      total++;
      if (r.ok) pass++;
      lines.push(`| ${c.id} | ${e.kind} | ${r.ok ? "○" : "×"} ${r.detail} |`);
    }
  }
  lines.push("", `方向テスト: **${pass}/${total}** 通過`, "", "## 今回の課題（1回目）", "");
  for (const c of DOC_CASES) {
    const r = rows.find((x) => x.id === c.id && x.rep === 0);
    if (r) lines.push(`- **${c.id}**: ${r.priority}`);
  }
  writeFileSync(`${OUT}/summary.md`, lines.join("\n"));
  console.log(lines.join("\n"));
}

async function main(): Promise<void> {
  if (SUMMARIZE) return summarize();
  mkdirSync(`${OUT}/traces`, { recursive: true });
  const cases = DOC_CASES.filter((c) => !IDS || IDS.includes(c.id));
  const jobs = cases.flatMap((c) => Array.from({ length: REPS }, (_, rep) => ({ c, rep })));
  let next = 0;
  async function worker(): Promise<void> {
    while (next < jobs.length) {
      const { c, rep } = jobs[next++];
      try {
        const { feedback, telemetry } = await runDocumentReview({
          content: c.input.content,
          documentType: c.input.type,
          universityName: "関西大学",
          facultyName: "法学部",
          admissionPolicy: loadAp(c.input.universityId, c.input.facultyId),
          selfAnalysis: null,
          activities: [],
          targetWordCount: c.input.targetWordCount,
          previous: null,
        });
        writeFileSync(`${OUT}/traces/${c.id}_rep${rep}.json`, JSON.stringify(feedback, null, 2));
        const row = toRow(c, rep, feedback, telemetry.durationMs, telemetry.usage);
        appendFileSync(`${OUT}/results.jsonl`, JSON.stringify(row) + "\n");
        console.log(c.id, rep, row.incomplete ? "書きかけ" : `${row.percentage}% ${row.rank}`, JSON.stringify(row.scores));
      } catch (err) {
        appendFileSync(`${OUT}/errors.jsonl`, JSON.stringify({ id: c.id, rep, error: String(err) }) + "\n");
        console.log(c.id, rep, "ERROR", String(err).slice(0, 200));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  summarize();
}

main();

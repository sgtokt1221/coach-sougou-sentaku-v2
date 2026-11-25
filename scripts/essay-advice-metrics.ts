/**
 * 小論文添削の「生徒が読む中身」の指標（AI を呼ばない。eval-essay-review.ts の traces を読むだけ）。
 *
 *   npx tsx scripts/essay-advice-metrics.ts --variant=v39-prod [--ids=a,b]
 *
 * eval-essay-review.ts は点の揺れ・方向・赤ペンの実在しか見ないため、2026-11-26 の点検で
 * 見つかった次の問題をここで数える。
 *   - 同じ答案の回どうしで、長所・改善点1件目の引用が一致するか（今回の課題が回ごとに変わる）
 *   - プロンプトの例文が写った言い回し（「今回は…を中心に」「論の芯」）
 *   - 1回の添削の中で敬体と常体が混ざる
 *   - 改善点に見本（「たとえば」か本文に無い10字以上の「」）があるか
 *   - 赤ペンの理由が二重につながっている・赤ペンの件数
 *   - 論理力が5点の回
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function opt(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const VARIANT = opt("variant") ?? "baseline";
const IDS = opt("ids")?.split(",");
const DIR = `.claude/hillclimb/essay-review/${VARIANT}/traces`;

interface Trace {
  caseId: string;
  essay: string;
  scores: Record<string, number>;
  fb: {
    goodPoints: string[];
    priorityImprovement: string;
    improvements: string[];
    languageCorrections: { reason: string }[];
  };
}

const traces: Trace[] = [];
for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const caseId = f.replace(/_rep\d+\.json$/, "");
  if (IDS && !IDS.includes(caseId)) continue;
  const d = JSON.parse(readFileSync(join(DIR, f), "utf8")) as { content: string }[];
  const out = JSON.parse(d[d.length - 1].content);
  traces.push({ caseId, essay: d[d.length - 2].content, scores: out.scores, fb: out.feedback });
}

const n = traces.length;
const count = (pred: (t: Trace) => boolean) => traces.filter(pred).length;
const quotes = (s: string) => [...s.matchAll(/「([^」]{6,})」/g)].map((m) => m[1]);
const overlap = (a: string[], b: string[]) =>
  a.some((x) => b.some((y) => x.includes(y.slice(0, 8)) || y.includes(x.slice(0, 8))));
const register = (s: string) =>
  /(です|ます|ません|ましょう|ください)。/.test(s) ? "desu" : "da";

// 同じ答案の回どうしの一致
const byCase = new Map<string, Trace[]>();
for (const t of traces) byCase.set(t.caseId, [...(byCase.get(t.caseId) ?? []), t]);
let pairs = 0;
let goodSame = 0;
let imp1Same = 0;
for (const ts of byCase.values()) {
  for (let i = 0; i < ts.length; i++)
    for (let j = i + 1; j < ts.length; j++) {
      pairs++;
      if (overlap(quotes(ts[i].fb.goodPoints[0] ?? ""), quotes(ts[j].fb.goodPoints[0] ?? ""))) goodSame++;
      if (overlap(quotes(ts[i].fb.improvements[0] ?? ""), quotes(ts[j].fb.improvements[0] ?? ""))) imp1Same++;
    }
}

const imps = traces.flatMap((t) => t.fb.improvements.map((s) => ({ s, essay: t.essay })));
const withExample = imps.filter(
  ({ s, essay }) => /たとえば/.test(s) || quotes(s).some((q) => q.length >= 10 && !essay.includes(q))
).length;
const corrections = traces.flatMap((t) => t.fb.languageCorrections ?? []);
const doubled = corrections.filter((c) => /。 \S/.test(c.reason)).length;
const perTrace = traces.map((t) => (t.fb.languageCorrections ?? []).length).sort((a, b) => a - b);
const median = perTrace[Math.floor(perTrace.length / 2)] ?? 0;

const lines = [
  `# 添削の中身の指標: ${VARIANT}（${n}回 / ${byCase.size}件）`,
  "",
  "| 指標 | 値 |",
  "| --- | --- |",
  `| 同じ答案の回どうしで長所の引用が一致 | ${goodSame}/${pairs} 組 |`,
  `| 同じ答案の回どうしで改善点1件目の引用が重なる | ${imp1Same}/${pairs} 組 |`,
  `| 今回の課題に「今回は…中心／軸／芯」 | ${count((t) => /今回は.*(中心|軸|芯)/.test(t.fb.priorityImprovement))}/${n} |`,
  `| 長所に「論の芯／中心に」 | ${count((t) => /論の芯|芯に|中心に/.test(t.fb.goodPoints[0] ?? ""))}/${n} |`,
  `| 長所が引用だけ（理由が無い） | ${count((t) => (t.fb.goodPoints[0] ?? "").replace(/「[\s\S]*」/, "").length < 8)}/${n} |`,
  `| 1回の添削で敬体と常体が混在 | ${count((t) => new Set([t.fb.goodPoints[0] ?? "", t.fb.priorityImprovement.split("\n")[0], ...t.fb.improvements.slice(0, 2)].map(register)).size > 1)}/${n} |`,
  `| 改善点に見本がある | ${withExample}/${imps.length} |`,
  `| 赤ペンの理由が二重 | ${doubled}/${corrections.length} |`,
  `| 赤ペン件数の中央値 | ${median} |`,
  `| 論理力5点 | ${count((t) => t.scores.logic === 5)}/${n} |`,
];
console.log(lines.join("\n"));

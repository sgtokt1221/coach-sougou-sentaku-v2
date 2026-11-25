/**
 * 志望理由書の下書き生成を、作成した生徒の材料で比べる（実APIを呼ぶ。Firestore には触らない）。
 *
 *   npx tsx --env-file=.env.local scripts/eval-statement-draft.ts --gen-model=claude-sonnet-5 --reps=2 --variant=gen-s5
 *   npx tsx scripts/eval-statement-draft.ts --summarize --variant=gen-s5
 *
 * 作る → 字数を合わせる（本番の generate-statement と同じ道）→ 添削に通す。
 * 添削のモデルは物差しなので固定する（--review-model、既定 claude-sonnet-5）。
 * 見るもの: 字数、添削の点、AP の写し・大学への賛辞・自己申告の強み、材料に無い数字。
 * 出力: .claude/hillclimb/statement-draft/<variant>/
 */
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { buildStatementDraftPrompt, type SelfAnalysisData } from "@/lib/ai/prompts/statement";
import { StatementDraftOutputSchema } from "@/lib/ai/schemas/statement";
import { fitStatementToTarget, joinStatementStructure } from "@/lib/documents/statement-length";
import { runDocumentReview } from "@/lib/documents/review-core";
import { documentScoreLayout, documentTotal } from "@/lib/documents/score-axes";
import type { ActivityContext } from "@/lib/documents/student-context";

function opt(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const REPS = Number(opt("reps") ?? 1);
const VARIANT = opt("variant") ?? "baseline";
const GEN_MODEL = opt("gen-model") ?? "claude-sonnet-5";
const REVIEW_MODEL = opt("review-model") ?? "claude-sonnet-5";
const SUMMARIZE = process.argv.includes("--summarize");
const OUT = `.claude/hillclimb/statement-draft/${VARIANT}`;
const TARGET = 800;

interface Profile {
  id: string;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  selfAnalysis: SelfAnalysisData;
  activities: ActivityContext[];
}

const PROFILES: Profile[] = [
  {
    id: "P1-law",
    universityId: "kansai-u",
    facultyId: "law",
    universityName: "関西大学",
    facultyName: "法学部",
    selfAnalysis: {
      values: ["弱い立場の人が泣き寝入りしない社会"],
      strengths: ["粘り強さ"],
      vision: "地域の人が法律相談にアクセスしやすい仕組みを作りたい",
      selfStatement: "",
      apConnection: "",
      experiences: ["祖父が近所の業者と土地の境界でもめたが、相談先が分からず諦めた"],
    },
    activities: [
      {
        id: "a1",
        title: "生徒会でのアルバイト実態アンケート",
        category: "leadership",
        period: "2025-06〜2025-09",
        description:
          "生徒会で全校にアルバイトの実態アンケートを取り、回答312件のうち雇用契約書をもらっていない生徒が4割いた。結果を校内新聞に載せ、労働基準監督署の資料を配った。",
      },
    ],
  },
  {
    id: "P2-nursing",
    universityId: "chiba-u",
    facultyId: "nursing",
    universityName: "千葉大学",
    facultyName: "看護学部",
    selfAnalysis: {
      values: ["その人がその人らしく暮らし続けられること"],
      strengths: ["人の話を最後まで聞く"],
      vision: "在宅で療養する高齢者を支える訪問看護師になりたい",
      selfStatement: "",
      apConnection: "",
      experiences: ["祖母が退院後に自宅で暮らしたいと言ったが、家族は介護の負担を心配して施設を勧めた"],
    },
    activities: [
      {
        id: "a2",
        title: "地域の高齢者サロンでのボランティア",
        category: "volunteer",
        period: "2024-10〜2026-03",
        description:
          "月2回、公民館の高齢者サロンで茶話会の準備と話し相手をした。参加者の一人が「家で最期まで過ごしたいが、家族に迷惑をかけたくない」と話していた。",
      },
    ],
  },
  {
    id: "P3-policy",
    universityId: "keio-u",
    facultyId: "policy",
    universityName: "慶應義塾大学",
    facultyName: "総合政策学部",
    selfAnalysis: {
      values: ["地元に人が戻ってこられる町"],
      strengths: ["データを集めて考える"],
      vision: "地方の商店街の空き店舗を、若い人が小さく試せる場所に変える仕組みを作りたい",
      selfStatement: "",
      apConnection: "",
      experiences: ["通学路の商店街で、3年間に5軒が閉店した"],
    },
    activities: [
      {
        id: "a3",
        title: "探究学習: 商店街の空き店舗調査",
        category: "research",
        period: "2025-04〜2026-01",
        description:
          "商店街の42店舗を歩いて調べ、11店舗が空き店舗だった。店主6人に聞き取りをし、貸したくても改装費と相続の問題で貸せない例が多いと分かった。市役所の商工課に報告した。",
      },
    ],
  },
];

function loadAp(universityId: string, facultyId: string): string {
  for (const f of readdirSync("src/data/universities")) {
    if (!f.endsWith(".json")) continue;
    const data = JSON.parse(readFileSync(`src/data/universities/${f}`, "utf8"));
    const list = Array.isArray(data) ? data : (data.universities ?? []);
    const fac = list
      .find((u: { id: string }) => u.id === universityId)
      ?.faculties?.find((x: { id: string }) => x.id === facultyId);
    if (fac?.admissionPolicy) return prepareAdmissionPolicy(fac.admissionPolicy).text;
  }
  throw new Error(`AP が見つからない: ${universityId}/${facultyId}`);
}

/** AP の中の12字の並びが、本文にそのまま出た数（AP の写し） */
function apCopies(draft: string, ap: string): number {
  const norm = (s: string) => s.replace(/[\s、。「」・]/g, "");
  const a = norm(ap);
  const d = norm(draft);
  const seen = new Set<string>();
  for (let i = 0; i + 12 <= a.length; i += 4) {
    const g = a.slice(i, i + 12);
    if (d.includes(g)) seen.add(g);
  }
  return seen.size;
}

/** 本文に出た数字のうち、材料（自己分析・活動）に無いもの */
function inventedNumbers(draft: string, p: Profile): string[] {
  const material = JSON.stringify([p.selfAnalysis, p.activities]);
  const nums = draft.match(/[0-9０-９]+/g) ?? [];
  return [...new Set(nums)].filter((n) => !material.includes(n));
}

interface Row {
  id: string;
  rep: number;
  genModel: string;
  len: number;
  fill: number;
  percentage: number | null;
  scores: Record<string, number | null>;
  apCopies: number;
  praise: boolean;
  selfClaim: boolean;
  invented: string[];
  genMs: number;
  totalMs: number;
}

function summarize(): void {
  const rows: Row[] = readFileSync(`${OUT}/results.jsonl`, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const mean = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
  const lines = [`# statement-draft eval: ${VARIANT}（生成 ${rows[0]?.genModel} / 添削 ${REVIEW_MODEL}）`, ""];
  lines.push("| 生徒 | 字数% | 合計% | 軸（筋/思考/大学/計画/読み） | AP写し | 賛辞 | 自己申告 | 材料に無い数字 | 生成秒 |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    lines.push(
      `| ${r.id}#${r.rep} | ${r.fill} | ${r.percentage ?? "-"} | ${Object.values(r.scores).join("/")} | ${r.apCopies} | ${r.praise ? "あり" : ""} | ${r.selfClaim ? "あり" : ""} | ${r.invented.join(",")} | ${Math.round(r.genMs / 1000)} |`
    );
  }
  const keys = Object.keys(rows[0]?.scores ?? {});
  lines.push(
    "",
    `- 合計% の平均: ${mean(rows.map((r) => r.percentage ?? 0))}`,
    `- 軸の平均: ${keys.map((k) => `${k} ${mean(rows.map((r) => r.scores[k] ?? 0))}`).join(" / ")}`,
    `- 字数が上限を超えた: ${rows.filter((r) => r.fill > 100).length}/${rows.length}`,
    `- AP の写しがある: ${rows.filter((r) => r.apCopies > 0).length}/${rows.length}、賛辞: ${rows.filter((r) => r.praise).length}、自己申告の強み: ${rows.filter((r) => r.selfClaim).length}`,
    `- 材料に無い数字: ${rows.filter((r) => r.invented.length).length}/${rows.length}`,
    `- 生成（字数合わせ込み）の中央値: ${Math.round([...rows.map((r) => r.genMs)].sort((a, b) => a - b)[Math.floor(rows.length / 2)] / 1000)}秒`
  );
  writeFileSync(`${OUT}/summary.md`, lines.join("\n"));
  console.log(lines.join("\n"));
}

async function runOne(client: Anthropic, p: Profile, rep: number): Promise<void> {
  const ap = loadAp(p.universityId, p.facultyId);
  const t0 = Date.now();
  const prompt = buildStatementDraftPrompt(
    p.universityName,
    p.facultyName,
    ap,
    p.selfAnalysis,
    TARGET,
    p.activities,
    "",
    "志望理由書"
  );
  const response = await client.messages.parse({
    model: GEN_MODEL,
    max_tokens: 16384,
    system: prompt,
    messages: [{ role: "user", content: "reference_dataに基づいて志望理由書を生成してください。" }],
    output_config: { format: zodOutputFormat(StatementDraftOutputSchema), effort: "low" },
  });
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error(`生成の構造化応答が不正: ${response.stop_reason}`);
  }
  const structure = await fitStatementToTarget(
    client,
    { ...response.parsed_output.structure },
    TARGET,
    "",
    "志望理由書",
    GEN_MODEL
  );
  const draft = joinStatementStructure(structure);
  const genMs = Date.now() - t0;
  const { feedback } = await runDocumentReview(
    {
      content: draft,
      documentType: "志望理由書",
      universityName: p.universityName,
      facultyName: p.facultyName,
      admissionPolicy: ap,
      selfAnalysis: p.selfAnalysis,
      activities: p.activities,
      targetWordCount: TARGET,
      previous: null,
      model: REVIEW_MODEL,
    },
    client
  );
  const layout = documentScoreLayout(feedback, "志望理由書");
  const total = documentTotal(layout);
  const row: Row = {
    id: p.id,
    rep,
    genModel: GEN_MODEL,
    len: draft.length,
    fill: Math.round((Array.from(draft.replace(/\s/g, "")).length / TARGET) * 100),
    percentage: layout.incomplete ? null : total.percentage,
    scores: Object.fromEntries(layout.axes.map((a) => [a.key, a.score])),
    apCopies: apCopies(draft, ap),
    praise: /共感|魅力を感じ|教育理念|理念に/.test(draft),
    selfClaim: /私の強みは/.test(draft),
    invented: inventedNumbers(draft, p),
    genMs,
    totalMs: Date.now() - t0,
  };
  writeFileSync(`${OUT}/traces/${p.id}_rep${rep}.json`, JSON.stringify({ draft, feedback }, null, 2));
  appendFileSync(`${OUT}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(p.id, rep, `${row.fill}%`, row.percentage, JSON.stringify(row.scores));
}

async function main(): Promise<void> {
  if (SUMMARIZE) return summarize();
  mkdirSync(`${OUT}/traces`, { recursive: true });
  const client = new Anthropic();
  const jobs = PROFILES.flatMap((p) => Array.from({ length: REPS }, (_, rep) => ({ p, rep })));
  await Promise.all(
    jobs.map(async ({ p, rep }) => {
      try {
        await runOne(client, p, rep);
      } catch (err) {
        appendFileSync(`${OUT}/errors.jsonl`, JSON.stringify({ id: p.id, rep, error: String(err) }) + "\n");
        console.log(p.id, rep, "ERROR", String(err).slice(0, 200));
      }
    })
  );
  summarize();
}

main();

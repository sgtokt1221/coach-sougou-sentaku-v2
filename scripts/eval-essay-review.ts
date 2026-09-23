/**
 * 小論文添削の精度検証（読み取りのみ。Firestore には書かない）。
 *
 * 設計: docs/superpowers/specs/2026-09-23-essay-review-accuracy-eval-design.md
 *
 * 測るもの（人手の正解は使わない。2026-09-23 の判断）:
 *   - 再現性: 同じ答案を reps 回採点したときの揺れ
 *   - 方向テスト: 欠陥を入れた作成答案で点が期待どおりに動くか
 *   - 指摘の実在率: 赤ペンを本文に無い文で作った件数、知識の誤りの引用が本文にあるか
 *   - 失敗: 途中終了・パース失敗・別呼び出しの null・別モデルの応答
 *
 * 使い方:
 *   # 1) 本番から層化して答案 ID を選ぶ（本番の読み取り。ID だけを書き出す）
 *   npx tsx --env-file=.env.local scripts/eval-essay-review.ts --select
 *   # 2) 実行（AI 呼び出しが発生する。1回あたり最大 $0.27 程度）
 *   npx tsx --env-file=.env.local scripts/eval-essay-review.ts --reps=3 [--only=synthetic|production] [--ids=a,b] [--variant=baseline]
 *   # 3) 集計だけやり直す（AI を呼ばない）
 *   npx tsx scripts/eval-essay-review.ts --summarize [--variant=baseline]
 *
 * 出力: .claude/hillclimb/essay-review/<variant>/
 *   results.jsonl  1行 = 1 (case, rep)。1件終わるごとに追記し、再実行では済んだものを飛ばす
 *   errors.jsonl   採点が得られなかった試行（0点として混ぜない）
 *   traces/        (case, rep) ごとの入力と出力
 *   summary.md     集計
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  reviewEssayCore,
  EssayReviewParseError,
  type EssayReviewCoreInput,
  type EssayReviewCoreOutput,
} from "../src/lib/essay/review-core";
import {
  AI_MODEL_REVIEW,
  AI_PROMPT_VERSIONS,
} from "../src/lib/ai/prompt-versions";
import { sumUsage } from "../src/lib/ai/call-record";
import { scoreToSkillRank } from "../src/lib/history-rank";
import {
  SYNTHETIC_CASES,
  type Axis,
  type Expectation,
} from "./eval/essay-review-cases";

// ---------------------------------------------------------------------------
// 引数
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string) =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const REPS = Number(opt("reps") ?? 3);
const ONLY = opt("only") as "synthetic" | "production" | undefined;
const IDS = (opt("ids") ?? "").split(",").filter(Boolean);
const VARIANT = opt("variant") ?? "baseline";
const CONCURRENCY = Number(opt("concurrency") ?? 3);
/** 1試行の上限。これを超えたら timeout として errors に入れる */
const CASE_TIMEOUT_MS = 5 * 60 * 1000;

const FLOW_DIR = ".claude/hillclimb/essay-review";
const OUT_DIR = join(FLOW_DIR, VARIANT);
const PRODUCTION_FILE = "scripts/eval/essay-review-production.json";

const AXES: Axis[] = [
  "structure",
  "logic",
  "expression",
  "responsiveness",
  "reasoningMaturity",
];

/** claude-sonnet-4-6 の単価（$/1M tok）。キャッシュ書き込み 1.25倍、読み出し 0.1倍 */
const PRICE = { input: 3, output: 15 };

// ---------------------------------------------------------------------------
// 検証ケース
// ---------------------------------------------------------------------------

interface EvalCase {
  id: string;
  kind: "synthetic" | "production";
  label: string;
  input: EssayReviewCoreInput;
  expect: Expectation[];
}

function syntheticCases(): EvalCase[] {
  return SYNTHETIC_CASES.map((c) => ({
    id: c.id,
    kind: "synthetic",
    label: c.label,
    input: {
      ...c.input,
      // 作成答案は AP を渡さない（AP 合致度は合計外。AP の有無で他の軸が動かないことは別途見る）
      weaknessList: "（過去の弱点なし）",
    },
    expect: c.expect,
  }));
}

interface ProductionEntry {
  id: string;
  stratum: string;
}

async function productionCases(): Promise<EvalCase[]> {
  if (!existsSync(PRODUCTION_FILE)) {
    console.warn(
      `${PRODUCTION_FILE} が無いので本番答案は飛ばす（--select で作る）`
    );
    return [];
  }
  const entries = JSON.parse(
    readFileSync(PRODUCTION_FILE, "utf8")
  ) as ProductionEntry[];
  const { adminDb } = await import("../src/lib/firebase/admin");
  if (!adminDb) throw new Error("Firestore に接続できません");
  const cases: EvalCase[] = [];
  for (const e of entries) {
    const doc = await adminDb.doc(`essays/${e.id}`).get();
    if (!doc.exists) {
      console.warn(`- ${e.id}: 答案が無い（削除された？）ので飛ばす`);
      continue;
    }
    const d = doc.data()!;
    const ctx = d.questionContext ?? {};
    cases.push({
      id: e.id,
      kind: "production",
      label: e.stratum,
      input: {
        ocrText: d.ocrText ?? "",
        topic: d.topic,
        questionType: ctx.questionType ?? undefined,
        sourceText: ctx.sourceText ?? undefined,
        chartDataSummary: ctx.chartDataSummary ?? undefined,
        lectureInfo: ctx.lectureInfo ?? undefined,
        wordLimit: ctx.wordLimit ?? undefined,
        admissionPolicy: await resolveAdmissionPolicy(
          adminDb,
          d.targetUniversity,
          d.targetFaculty
        ),
        // 本番は生徒の過去の弱点を渡すが、検証では揃えて外す
        // （calibrate-essay-review.ts と同じ条件）
        weaknessList: "（過去の弱点なし）",
      },
      expect: [],
    });
  }
  return cases;
}

async function resolveAdmissionPolicy(
  db: NonNullable<
    Awaited<typeof import("../src/lib/firebase/admin")>["adminDb"]
  >,
  universityId: string | undefined,
  facultyId: string | undefined
): Promise<string> {
  if (!universityId || !facultyId) return "";
  const { prepareAdmissionPolicy } =
    await import("../src/lib/ai/admission-policy");
  const uni = await db.doc(`universities/${universityId}`).get();
  if (!uni.exists) return "";
  const data = uni.data()!;
  const faculty = (data.faculties ?? []).find(
    (f: { id: string }) => f.id === facultyId
  );
  if (!faculty?.admissionPolicy) return "";
  const prepared = prepareAdmissionPolicy(faculty.admissionPolicy);
  return prepared.text
    ? `大学: ${data.name}\n学部: ${faculty.name}\nAP: ${prepared.text}`
    : "";
}

// ---------------------------------------------------------------------------
// --select: 本番から層化して ID を選ぶ（設計書 §4）
// ---------------------------------------------------------------------------

async function selectProduction() {
  const { adminDb } = await import("../src/lib/firebase/admin");
  if (!adminDb) throw new Error("Firestore に接続できません");
  const snap = await adminDb.collection("essays").get();
  type Row = {
    id: string;
    userId: string;
    total: number;
    type: string;
    parent?: string;
    submittedAt: number;
  };
  const rows: Row[] = [];
  for (const d of snap.docs) {
    const x = d.data();
    if (!x.scores || !(x.ocrText ?? "").trim()) continue;
    const type = x.questionContext?.questionType ?? "essay";
    // 設問が残っていない口頭試問型は再採点できない（作成答案 N9 で見る）
    if (type === "oral_exam" && !x.questionContext?.oralExam) continue;
    rows.push({
      id: d.id,
      userId: x.userId,
      total: x.scores.total,
      type,
      parent: x.parentEssayId,
      submittedAt: x.submittedAt?.toDate?.()?.getTime?.() ?? 0,
    });
  }
  // 新しい順。同じ層なら新しい答案を優先する（現行のフォームで書かれている）
  rows.sort((a, b) => b.submittedAt - a.submittedAt);

  const picked = new Map<string, string>();
  const take = (stratum: string, pool: Row[], n: number) => {
    // 生徒の偏りを薄めるため、まだ選ばれていない生徒を先に取る
    const usedUsers = () =>
      new Set(
        [...picked.keys()].map((id) => rows.find((r) => r.id === id)!.userId)
      );
    const fresh = pool.filter(
      (r) => !picked.has(r.id) && !usedUsers().has(r.userId)
    );
    const rest = pool.filter((r) => !picked.has(r.id));
    for (const r of [...fresh, ...rest]) {
      if ([...picked.values()].filter((s) => s === stratum).length >= n) break;
      if (!picked.has(r.id)) picked.set(r.id, stratum);
    }
  };

  const normal = rows.filter(
    (r) => r.type !== "report" && r.type !== "oral_exam"
  );
  // やり直しのペア（親子とも採点済み）
  const pairs = rows.filter(
    (r) => r.parent && rows.some((p) => p.id === r.parent)
  );
  for (const child of pairs.slice(0, 2)) {
    picked.set(child.id, "retry-child");
    picked.set(child.parent!, "retry-parent");
  }
  take(
    "report",
    rows.filter((r) => r.type === "report"),
    4
  );
  take(
    "low(<=22)",
    normal.filter((r) => r.total <= 22),
    5
  );
  take(
    "mid(23-29)",
    normal.filter((r) => r.total >= 23 && r.total <= 29),
    6
  );
  take(
    "high(>=30)",
    normal.filter((r) => r.total >= 30),
    4
  );

  // 7人全員から最低1件
  for (const u of new Set(rows.map((r) => r.userId))) {
    const has = [...picked.keys()].some(
      (id) => rows.find((r) => r.id === id)!.userId === u
    );
    if (!has) {
      const r = rows.find((x) => x.userId === u)!;
      picked.set(r.id, "coverage");
    }
  }

  const out: ProductionEntry[] = [...picked].map(([id, stratum]) => ({
    id,
    stratum,
  }));
  writeFileSync(PRODUCTION_FILE, JSON.stringify(out, null, 2) + "\n");
  const byStratum: Record<string, number> = {};
  for (const e of out) byStratum[e.stratum] = (byStratum[e.stratum] ?? 0) + 1;
  console.log(
    `${out.length}件を ${PRODUCTION_FILE} に書き出した（ID と層だけ）:`,
    byStratum
  );
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------

interface ResultRow {
  prompt_id: string;
  rep: number;
  prompt: string;
  tags: string[];
  status: "ok";
  stop_reason: string | null;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
  latency_s: number;
  grade: Record<string, number>;
  meta: {
    promptVersion: string;
    scores: Record<string, number | null>;
    total: number;
    scoreMaximum: number;
    rank: string;
    subjectMatch: string | null;
    answersQuestion: boolean | null;
    misreadings: number;
    claimChecks: { claim: string; status: string }[];
    corrections: string[];
    droppedCorrections: number;
    knowledge: {
      score: number;
      errors: { claim: string; severity: string; inText: boolean }[];
    } | null;
    calls: { name: string; ok: boolean; model: string }[];
  };
}

function toRow(
  c: EvalCase,
  rep: number,
  out: EssayReviewCoreOutput
): ResultRow {
  const { scores, feedback, telemetry } = out;
  const usage = sumUsage(telemetry.calls);
  const knowledgeErrors =
    feedback.knowledgeInsights?.errors.map((e) => ({
      claim: e.claim,
      severity: e.severity,
      inText: c.input.ocrText.includes(e.claim),
    })) ?? [];
  const max = feedback.scoreMaximum ?? 50;
  return {
    prompt_id: c.id,
    rep,
    prompt: `${c.input.topic ?? ""}\n\n${c.input.ocrText}`,
    tags: [c.kind, c.label, c.input.questionType ?? "essay"],
    status: "ok",
    stop_reason:
      telemetry.calls.find((x) => x.name === "review")?.stopReason ?? null,
    model: telemetry.calls.find((x) => x.name === "review")?.model ?? "",
    usage: {
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_read_input_tokens: usage.cacheReadInputTokens,
      cache_creation_input_tokens: usage.cacheCreationInputTokens,
    },
    latency_s: telemetry.durationMs / 1000,
    grade: {
      // 満点で割った合計。レポートの主指標（満点の違う口頭試問型も並べられる）
      total_ratio: scores.total / max,
      dropped_corrections: telemetry.droppedLanguageCorrections,
      knowledge_claims_in_text:
        knowledgeErrors.length === 0
          ? 1
          : knowledgeErrors.filter((e) => e.inText).length /
            knowledgeErrors.length,
      judge_failed: telemetry.calls.filter((x) => !x.ok).length,
    },
    meta: {
      promptVersion: feedback.aiMetadata?.promptVersion ?? "",
      scores: Object.fromEntries(
        AXES.map((a) => [a, (scores[a] as number | undefined) ?? null])
      ),
      total: scores.total,
      scoreMaximum: max,
      rank: scoreToSkillRank(scores.total, max),
      subjectMatch: feedback.taskFulfillment?.subjectMatch ?? null,
      answersQuestion: feedback.taskFulfillment?.answersQuestion ?? null,
      misreadings: feedback.reportInsights?.misreadings?.length ?? 0,
      claimChecks: (feedback.claimChecks ?? []).map((x) => ({
        claim: x.claim,
        status: x.status,
      })),
      corrections: (feedback.languageCorrections ?? []).map((x) => x.original),
      droppedCorrections: telemetry.droppedLanguageCorrections,
      knowledge:
        typeof scores.knowledgeAccuracy === "number"
          ? { score: scores.knowledgeAccuracy, errors: knowledgeErrors }
          : null,
      calls: telemetry.calls.map((x) => ({
        name: x.name,
        ok: x.ok,
        model: x.model,
      })),
    },
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
    ),
  ]);
}

function classify(err: unknown): string {
  if (err instanceof EssayReviewParseError) {
    return err.message.includes("最大トークン") ? "truncated" : "parse";
  }
  const msg = String(err);
  if (msg.includes("timeout")) return "timeout";
  if (/\b(429|529)\b|overloaded|rate/i.test(msg)) return "rate_limit";
  return "api_error";
}

async function runAll() {
  const cases = [
    ...(ONLY === "production" ? [] : syntheticCases()),
    ...(ONLY === "synthetic" ? [] : await productionCases()),
  ].filter((c) => IDS.length === 0 || IDS.includes(c.id));

  mkdirSync(join(OUT_DIR, "traces"), { recursive: true });
  const resultsPath = join(OUT_DIR, "results.jsonl");
  const errorsPath = join(OUT_DIR, "errors.jsonl");
  const done = new Set(
    readJsonl<ResultRow>(resultsPath).map((r) => `${r.prompt_id}#${r.rep}`)
  );

  const jobs = cases.flatMap((c) =>
    Array.from({ length: REPS }, (_, rep) => ({ c, rep }))
  );
  const todo = jobs.filter(({ c, rep }) => !done.has(`${c.id}#${rep}`));
  console.log(
    `${cases.length}件 × ${REPS}回 = ${jobs.length}試行（済み ${jobs.length - todo.length}、残り ${todo.length}）` +
      ` / ${AI_MODEL_REVIEW} / ${AI_PROMPT_VERSIONS.essayReview.promptVersion} / 同時 ${CONCURRENCY}`
  );

  let next = 0;
  let finished = 0;
  const startedAt = Date.now();
  const worker = async () => {
    while (next < todo.length) {
      const { c, rep } = todo[next++];
      try {
        const out = await withTimeout(
          reviewEssayCore(c.input),
          CASE_TIMEOUT_MS
        );
        // 別モデルの点を混ぜない（要求したモデルと応答のモデルが違えば失敗扱い）
        const wrong = out.telemetry.calls.find(
          (x) => x.model && !x.model.startsWith(AI_MODEL_REVIEW)
        );
        if (wrong) throw new Error(`model_mismatch: ${wrong.model}`);
        const row = toRow(c, rep, out);
        appendFileSync(resultsPath, JSON.stringify(row) + "\n");
        writeFileSync(
          join(OUT_DIR, "traces", `${c.id}_rep${rep}.json`),
          JSON.stringify(
            [
              {
                role: "system",
                content: `${AI_PROMPT_VERSIONS.essayReview.promptVersion}（プロンプト本文は src/lib/ai/prompts/essay.ts）`,
              },
              {
                role: "user",
                content: JSON.stringify(
                  { ...c.input, ocrText: undefined },
                  null,
                  2
                ),
              },
              { role: "user", content: c.input.ocrText },
              {
                role: "assistant",
                content: JSON.stringify(
                  { scores: out.scores, feedback: out.feedback },
                  null,
                  2
                ),
              },
            ],
            null,
            2
          )
        );
        finished++;
        console.log(
          `  ${c.id} #${rep}  ${out.scores.total}/${out.feedback.scoreMaximum ?? 50}` +
            `  ${(out.telemetry.durationMs / 1000).toFixed(0)}s  (${finished}/${todo.length})`
        );
      } catch (err) {
        const failure = String(err).startsWith("Error: model_mismatch")
          ? "model_mismatch"
          : classify(err);
        appendFileSync(
          errorsPath,
          JSON.stringify({
            prompt_id: c.id,
            rep,
            failure,
            message: String(err).slice(0, 500),
            at: new Date().toISOString(),
          }) + "\n"
        );
        console.log(`  ${c.id} #${rep}  失敗: ${failure}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(
    `完了 ${((Date.now() - startedAt) / 60000).toFixed(1)}分。集計する。\n`
  );
  summarize(cases);
}

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const range = (xs: number[]) =>
  xs.length ? Math.max(...xs) - Math.min(...xs) : NaN;

/** rep ごとに判定できる期待。direction は null を返し、平均で別に判定する */
function checkRep(e: Expectation, r: ResultRow): boolean | null {
  const m = r.meta;
  switch (e.type) {
    case "totalMax":
      return m.total <= e.value;
    case "axesMax":
      return e.axes.every((a) => (m.scores[a] ?? 0) <= e.value);
    case "subjectNotSame":
      return m.subjectMatch !== "same" || m.answersQuestion === false;
    case "flagsSentences": {
      const hit = e.sentences.filter((s) =>
        m.corrections.some((o) => s.includes(o) || o.includes(s.slice(0, 15)))
      ).length;
      return hit >= e.min;
    }
    case "claimFlagged":
      return m.claimChecks.some(
        (x) => x.claim.includes(e.contains) && x.status !== "verified"
      );
    case "misreadingOrLogicMax":
      return m.misreadings > 0 || (m.scores.logic ?? 0) <= e.value;
    case "knowledgeCriticalMax":
      return (
        !!m.knowledge &&
        m.knowledge.errors.filter((x) => x.severity === "critical").length <=
          e.value
      );
    case "knowledgeErrorsMin":
      return !!m.knowledge && m.knowledge.errors.length >= e.value;
    case "knowledgeScoreMin":
      return !!m.knowledge && m.knowledge.score >= e.value;
    case "knowledgeScoreMax":
      return !!m.knowledge && m.knowledge.score <= e.value;
    case "scoreMaximum":
      return m.scoreMaximum === e.value;
    default:
      return null;
  }
}

function describe(e: Expectation): string {
  switch (e.type) {
    case "totalMax":
      return `合計 ≤ ${e.value}`;
    case "axesMax":
      return `${e.axes.join("/")} ≤ ${e.value}`;
    case "subjectNotSame":
      return "主題ずれを検出";
    case "flagsSentences":
      return `ねじれ${e.sentences.length}文のうち ${e.min}文以上を赤ペン`;
    case "claimFlagged":
      return `「${e.contains}」を未確認として挙げる`;
    case "misreadingOrLogicMax":
      return `誤読を指摘 or 論理 ≤ ${e.value}`;
    case "knowledgeCriticalMax":
      return `知識の critical ≤ ${e.value}`;
    case "knowledgeErrorsMin":
      return `知識の誤り ≥ ${e.value}件`;
    case "knowledgeScoreMin":
      return `専門知識 ≥ ${e.value}`;
    case "knowledgeScoreMax":
      return `専門知識 ≤ ${e.value}`;
    case "scoreMaximum":
      return `満点 = ${e.value}`;
    case "totalBelow":
      return `合計の平均 < ${e.caseId}`;
    case "totalAbove":
      return `合計の平均 > ${e.caseId}`;
    case "totalNotAbove":
      return `合計の平均 ≤ ${e.caseId} + ${e.margin}`;
    case "axisBelow":
      return `${e.axis} の平均 < ${e.caseId}`;
  }
}

function summarize(knownCases?: EvalCase[]) {
  const rows = readJsonl<ResultRow>(join(OUT_DIR, "results.jsonl"));
  const errors = readJsonl<{ prompt_id: string; failure: string }>(
    join(OUT_DIR, "errors.jsonl")
  );
  if (rows.length === 0) {
    console.log("結果がまだ無い");
    return;
  }
  const byCase = new Map<string, ResultRow[]>();
  for (const r of rows) {
    if (!byCase.has(r.prompt_id)) byCase.set(r.prompt_id, []);
    byCase.get(r.prompt_id)!.push(r);
  }
  const expectOf = new Map(
    (knownCases ?? syntheticCases()).map((c) => [c.id, c.expect])
  );
  const totalMean = (id: string) =>
    mean((byCase.get(id) ?? []).map((r) => r.meta.total));
  const axisMean = (id: string, a: Axis) =>
    mean((byCase.get(id) ?? []).map((r) => r.meta.scores[a] ?? NaN));

  const lines: string[] = [];
  const versions = [...new Set(rows.map((r) => r.meta.promptVersion))];
  lines.push(`# 添削の検証: ${VARIANT}`, "");
  lines.push(
    `- ${byCase.size}件 / ${rows.length}試行 / 失敗 ${errors.length}試行 / 版 ${versions.join(", ")}`
  );

  // 費用
  const cost = rows.reduce(
    (s, r) =>
      s +
      (r.usage.input_tokens * PRICE.input +
        r.usage.output_tokens * PRICE.output +
        r.usage.cache_read_input_tokens * PRICE.input * 0.1 +
        r.usage.cache_creation_input_tokens * PRICE.input * 1.25) /
        1e6,
    0
  );
  const lat = rows.map((r) => r.latency_s).sort((a, b) => a - b);
  lines.push(
    `- 費用 $${cost.toFixed(2)}（1試行 平均 $${(cost / rows.length).toFixed(3)}）` +
      ` / 所要 中央値 ${lat[Math.floor(lat.length / 2)].toFixed(0)}秒・最大 ${lat[lat.length - 1].toFixed(0)}秒`,
    ""
  );

  // 再現性
  lines.push("## 再現性（同じ答案の揺れ）", "");
  lines.push(
    "| case | 回数 | 合計（各回） | 合計の幅 | 軸の最大幅 | ランク | 版 |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );
  const spreads: number[] = [];
  let rankFlips = 0;
  for (const [id, rs] of byCase) {
    const totals = rs.map((r) => r.meta.total);
    const axisSpread = Math.max(
      ...AXES.map((a) =>
        range(
          rs.map((r) => r.meta.scores[a]).filter((v): v is number => v != null)
        )
      ).filter((v) => !Number.isNaN(v))
    );
    const ranks = [...new Set(rs.map((r) => r.meta.rank))];
    if (rs.length > 1) spreads.push(range(totals));
    if (ranks.length > 1) rankFlips++;
    lines.push(
      `| ${id} | ${rs.length} | ${totals.join(" / ")}（/${rs[0].meta.scoreMaximum}） | ${range(totals)} | ${axisSpread} | ${ranks.join("→")} | ${rs[0].tags[1]} |`
    );
  }
  const within3 = spreads.filter((s) => s <= 3).length;
  lines.push(
    "",
    `合計の幅 ≤ 3点: **${within3}/${spreads.length}件**（目標: 全件） / ランクが回によって変わった: **${rankFlips}件**（目標: 1割以下）`,
    ""
  );

  // 方向テスト
  lines.push("## 方向テスト（作成答案）", "");
  lines.push("| case | 期待 | 結果 |", "| --- | --- | --- |");
  let pass = 0;
  let total = 0;
  for (const [id, expects] of expectOf) {
    const rs = byCase.get(id);
    if (!rs) continue;
    for (const e of expects) {
      total++;
      const perRep = rs.map((r) => checkRep(e, r));
      let ok: boolean;
      let detail: string;
      if (!("caseId" in e)) {
        const n = perRep.filter(Boolean).length;
        ok = n === rs.length;
        detail = `${n}/${rs.length}回`;
      } else {
        const a = e.type === "axisBelow" ? axisMean(id, e.axis) : totalMean(id);
        const b =
          e.type === "axisBelow"
            ? axisMean(e.caseId, e.axis)
            : totalMean(e.caseId);
        if (Number.isNaN(b)) {
          ok = false;
          detail = `比較先 ${e.caseId} の結果が無い`;
        } else {
          ok =
            e.type === "totalAbove"
              ? a > b
              : e.type === "totalNotAbove"
                ? a <= b + e.margin
                : a < b;
          detail = `${a.toFixed(1)} vs ${b.toFixed(1)}`;
        }
      }
      if (ok) pass++;
      lines.push(
        `| ${id} | ${describe(e)} | ${ok ? "○" : "**×**"} ${detail} |`
      );
    }
  }
  lines.push("", `方向テスト: **${pass}/${total}** 通過`, "");

  // 指摘の実在
  const dropped = rows.reduce((s, r) => s + r.meta.droppedCorrections, 0);
  const kErr = rows.flatMap((r) => r.meta.knowledge?.errors ?? []);
  lines.push("## 指摘の実在", "");
  lines.push(
    `- 赤ペンのうち本文に無い等で捨てた件数: **${dropped}件**（${rows.length}試行。保存される赤ペンは実在するものだけ）`,
    `- 知識の誤りの引用が本文にある率: **${kErr.length ? `${kErr.filter((e) => e.inText).length}/${kErr.length}` : "対象なし"}**`,
    ""
  );

  // 失敗
  const byFailure: Record<string, number> = {};
  for (const e of errors)
    byFailure[e.failure] = (byFailure[e.failure] ?? 0) + 1;
  const judgeFailed = rows.reduce((s, r) => s + (r.grade.judge_failed ?? 0), 0);
  lines.push("## 失敗", "");
  lines.push(
    `- 採点が得られなかった試行: ${errors.length}件 ${JSON.stringify(byFailure)}`,
    `- 採点は返ったが別呼び出しが失敗した回数: ${judgeFailed}回（課題文の読み込み判定・専門知識。失敗すると減点されない側に倒れる）`,
    ""
  );

  const md = lines.join("\n");
  writeFileSync(join(OUT_DIR, "summary.md"), md + "\n");
  // レポート生成器（scripts/eval/build-report-lite.mjs）が読む設定
  writeFileSync(
    join(FLOW_DIR, "_state.json"),
    JSON.stringify(
      {
        metrics: [
          { id: "total_ratio", label: "合計/満点", kind: "float" },
          { id: "dropped_corrections", label: "捨てた赤ペン", kind: "float" },
          {
            id: "knowledge_claims_in_text",
            label: "知識引用の実在",
            kind: "float",
          },
          { id: "judge_failed", label: "判定の失敗", kind: "float" },
        ],
      },
      null,
      2
    ) + "\n"
  );
  console.log(md);
  console.log(`\n→ ${join(OUT_DIR, "summary.md")}`);
}

// ---------------------------------------------------------------------------

async function main() {
  if (flag("select")) return selectProduction();
  if (flag("summarize")) return summarize();
  return runAll();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

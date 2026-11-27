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
import {
  buildAlternativeRule,
  buildStatementDraftPrompt,
  type AlternativeReason,
  type SelfAnalysisData,
} from "@/lib/ai/prompts/statement";
import { StatementDraftOutputSchema } from "@/lib/ai/schemas/statement";
import { fitStatementToTarget, joinStatementStructure } from "@/lib/documents/statement-length";
import { runDocumentReview } from "@/lib/documents/review-core";
import { documentScoreLayout, documentTotal } from "@/lib/documents/score-axes";
import type { ActivityContext } from "@/lib/documents/student-context";
import type { FacultyInfoForPrompt } from "@/lib/ai/prompts/shared";

function opt(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
const REPS = Number(opt("reps") ?? 1);
const VARIANT = opt("variant") ?? "baseline";
const GEN_MODEL = opt("gen-model") ?? "claude-sonnet-5";
const REVIEW_MODEL = opt("review-model") ?? "claude-sonnet-5";
/** 別の案を作る理由。指定すると --base の下書きを前の案として渡す */
const ALTERNATIVE = opt("alternative") as AlternativeReason | undefined;
const BASE = opt("base") ?? "gen-o55-v6";
/**
 * --emphasis を付けると、作成画面の「特に熱く書いてほしい点・方向性」を生徒ごとに渡す。
 * 指示が効いたかは、指示の語が最初の段に出るか（emphasisInIntro）と本文を読んで見る
 */
const EMPHASIS = process.argv.includes("--emphasis");
/** --research を付けると、生徒が調べて書いた「この大学・学部のこと」を渡す（作成画面の任意の欄） */
const RESEARCH = process.argv.includes("--research");
/**
 * --faculty-info を付けると、scripts/research-faculty-info.ts の試し実行で取った
 * 公式サイトの学部の特色（.claude/hillclimb/faculty-info/<大学>__<学部>.json）を下書きと添削に渡す
 */
const FACULTY_INFO = process.argv.includes("--faculty-info");
function facultyInfoOf(p: { universityId: string; facultyId: string }): FacultyInfoForPrompt[] {
  if (!FACULTY_INFO) return [];
  const path = `.claude/hillclimb/faculty-info/${p.universityId}__${p.facultyId}.json`;
  const d = JSON.parse(readFileSync(path, "utf8")) as { items: FacultyInfoForPrompt[] };
  return d.items.map((i) => ({ category: i.category, title: i.title, quote: i.quote }));
}
const RESEARCH_BY_ID: Record<string, string> = {
  "P1-law":
    "オープンキャンパスの模擬授業で、労働法の先生が「契約書が無くても労働契約は成立するが、条件を証明するのが難しくなる」と話していた。2年次から司法・行政・ビジネスなどのコースに分かれて学ぶと聞いた。",
  "P2-nursing":
    "オープンキャンパスで、1年次から地域での実習があると在学生が話していた。医学部や薬学部と一緒に学ぶ授業があるとパンフレットに書いてあった。",
  "P3-policy":
    "説明会で、1年次は学科に所属せずに基礎を広く学び、2年次に学科を選ぶと聞いた。企業や自治体と連携してキャンパスの外で調べる授業がある。",
};
const EMPHASIS_BY_ID: Record<string, { text: string; mark: RegExp }> = {
  "P1-law": {
    text: "生徒会のアルバイト調査で、契約書をもらっていない生徒が4割いたことに一番驚いた。そこを一番熱く書いてほしい。",
    mark: /4割|契約書/,
  },
  "P2-nursing": {
    text: "将来は訪問看護師より、病院で退院のときに本人と家族の話し合いを支える看護師になりたい。その方向で書いてほしい。",
    mark: /退院/,
  },
  "P3-policy": {
    text: "店主さんたちへの聞き取りで、相続の問題で貸したくても貸せないと知ったことを中心に書いてほしい。",
    mark: /相続/,
  },
};

/** 前の案と、12字の並びがどれだけ重なるか（0〜1）。写していれば高い */
function overlapWith(draft: string, prev: string): number {
  const grams = (t: string) => {
    const c = t.replace(/\s/g, "");
    const set = new Set<string>();
    for (let i = 0; i + 12 <= c.length; i++) set.add(c.slice(i, i + 12));
    return set;
  };
  const a = grams(draft);
  const b = grams(prev);
  if (a.size === 0) return 0;
  let hit = 0;
  for (const g of a) if (b.has(g)) hit++;
  return Math.round((hit / a.size) * 100) / 100;
}
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
    universityId: "kindai-u",
    facultyId: "nursing",
    universityName: "近畿大学",
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
    universityId: "kwansei-u",
    facultyId: "policy",
    universityName: "関西学院大学",
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
  /** 別の案のとき: 前の案との重なり（12字の並び）と、両方の1文目 */
  prevOverlap?: number;
  firstSentence?: string;
  prevFirstSentence?: string;
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
  emphasisInIntro?: boolean;
  /** 本文に出た教員・研究室らしき語の数（0 であること） */
  teacherNames: number;
  /** 学部情報の原文を半分以上そのまま写した項目の数 */
  quoteCopies: number;
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
  const previousDraft = ALTERNATIVE
    ? (JSON.parse(readFileSync(`.claude/hillclimb/statement-draft/${BASE}/traces/${p.id}_rep0.json`, "utf8")) as { draft: string }).draft
    : null;
  const prompt =
    buildStatementDraftPrompt(
      p.universityName,
      p.facultyName,
      ap,
      p.selfAnalysis,
      TARGET,
      p.activities,
      EMPHASIS ? (EMPHASIS_BY_ID[p.id]?.text ?? "") : "",
      "志望理由書",
      RESEARCH ? (RESEARCH_BY_ID[p.id] ?? "") : "",
      facultyInfoOf(p)
    ) +
    (ALTERNATIVE && previousDraft
      ? `\n\n${buildAlternativeRule({ reason: ALTERNATIVE, previousDraft })}`
      : "");
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
    EMPHASIS ? (EMPHASIS_BY_ID[p.id]?.text ?? "") : "",
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
      universityResearch: RESEARCH ? RESEARCH_BY_ID[p.id] : undefined,
      facultyInfo: facultyInfoOf(p),
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
    teacherNames: (draft.match(/教授|准教授|先生|研究室/g) ?? []).length,
    quoteCopies: facultyInfoOf(p).filter((i) => overlapWith(draft, i.quote) > 0.5).length,
    genMs,
    totalMs: Date.now() - t0,
    ...(EMPHASIS && EMPHASIS_BY_ID[p.id]
      ? { emphasisInIntro: EMPHASIS_BY_ID[p.id].mark.test(structure.intro) }
      : {}),
    ...(previousDraft
      ? {
          prevOverlap: overlapWith(draft, previousDraft),
          firstSentence: draft.split("。")[0],
          prevFirstSentence: previousDraft.split("。")[0],
        }
      : {}),
  };
  writeFileSync(`${OUT}/traces/${p.id}_rep${rep}.json`, JSON.stringify({ draft, feedback }, null, 2));
  appendFileSync(`${OUT}/results.jsonl`, JSON.stringify(row) + "\n");
  console.log(p.id, rep, `${row.fill}%`, row.percentage, JSON.stringify(row.scores));
}

/**
 * --pair: 志望理由書と自己推薦書の書き分け。志望理由書を作り、自己推薦書を「志望理由書を相手に渡す／渡さない」の
 * 2通りで作って、2通の12字の重なり・書き分けの判定・添削の点を比べる（結果は pair.jsonl）
 */
const PAIR = process.argv.includes("--pair");

async function generateDoc(
  client: Anthropic,
  p: Profile,
  documentType: string,
  others: { type: string; name: string; content: string; question?: string }[],
  brief: { customName?: string; question?: string } = {}
): Promise<string> {
  const ap = loadAp(p.universityId, p.facultyId);
  const prompt = buildStatementDraftPrompt(
    p.universityName,
    p.facultyName,
    ap,
    p.selfAnalysis,
    TARGET,
    p.activities,
    "",
    documentType,
    RESEARCH ? (RESEARCH_BY_ID[p.id] ?? "") : "",
    facultyInfoOf(p),
    others,
    brief
  );
  const response = await client.messages.parse({
    model: GEN_MODEL,
    max_tokens: 16384,
    system: prompt,
    messages: [
      { role: "user", content: `reference_dataに基づいて${brief.customName || documentType}を生成してください。` },
    ],
    output_config: { format: zodOutputFormat(StatementDraftOutputSchema), effort: "low" },
  });
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error(`生成の構造化応答が不正: ${response.stop_reason}`);
  }
  const structure = await fitStatementToTarget(client, { ...response.parsed_output.structure }, TARGET, "", documentType, GEN_MODEL);
  return joinStatementStructure(structure);
}

async function runPair(client: Anthropic, p: Profile, rep: number): Promise<void> {
  const ap = loadAp(p.universityId, p.facultyId);
  const statement = await generateDoc(client, p, "志望理由書", []);
  const [paired, alone] = await Promise.all([
    generateDoc(client, p, "自己推薦書", [{ type: "志望理由書", name: "志望理由書", content: statement }]),
    generateDoc(client, p, "自己推薦書", []),
  ]);
  const companion = { id: "statement", type: "志望理由書", name: "志望理由書", title: "志望理由書", content: statement };
  const review = (content: string) =>
    runDocumentReview(
      {
        content,
        documentType: "自己推薦書",
        universityName: p.universityName,
        facultyName: p.facultyName,
        admissionPolicy: ap,
        universityResearch: RESEARCH ? RESEARCH_BY_ID[p.id] : undefined,
        facultyInfo: facultyInfoOf(p),
        selfAnalysis: p.selfAnalysis,
        activities: p.activities,
        targetWordCount: TARGET,
        previous: null,
        model: REVIEW_MODEL,
        others: [companion],
      },
      client
    );
  const [rp, ra] = await Promise.all([review(paired), review(alone)]);
  const pct = (fb: Parameters<typeof documentScoreLayout>[0]) => {
    const layout = documentScoreLayout(fb, "自己推薦書");
    return layout.incomplete ? null : documentTotal(layout).percentage;
  };
  const row = {
    id: p.id,
    rep,
    pairedOverlap: overlapWith(paired, statement),
    aloneOverlap: overlapWith(alone, statement),
    pairedOverlaps: rp.feedback.pairCheck?.overlaps.length ?? null,
    aloneOverlaps: ra.feedback.pairCheck?.overlaps.length ?? null,
    pairedPct: pct(rp.feedback),
    alonePct: pct(ra.feedback),
  };
  writeFileSync(
    `${OUT}/traces/${p.id}_pair${rep}.json`,
    JSON.stringify({ statement, paired, alone, pairedCheck: rp.feedback.pairCheck, aloneCheck: ra.feedback.pairCheck }, null, 2)
  );
  appendFileSync(`${OUT}/pair.jsonl`, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
}

/**
 * --set: 独自の書類を含むセット。志望理由書 → 自己推薦書（志望理由書を見る）→ 独自「活動報告書」（2通を見る）を作り、
 * 独自の書類を単独で作ったものと比べる（12字の重なり・書き分けの判定・添削の点。結果は set.jsonl）
 */
const SET = process.argv.includes("--set");
const CUSTOM_NAME = "活動報告書";
const CUSTOM_QUESTION =
  "高校時代に最も力を入れて取り組んだ活動について、取り組みの内容、あなたの役割、そこから得たことを具体的に述べてください。";

async function runSet(client: Anthropic, p: Profile, rep: number): Promise<void> {
  const ap = loadAp(p.universityId, p.facultyId);
  const statement = await generateDoc(client, p, "志望理由書", []);
  const shiDoc = { id: "statement", type: "志望理由書", name: "志望理由書", title: "志望理由書", content: statement };
  const selfRec = await generateDoc(client, p, "自己推薦書", [shiDoc]);
  const recDoc = { id: "selfrec", type: "自己推薦書", name: "自己推薦書", title: "自己推薦書", content: selfRec };
  const brief = { customName: CUSTOM_NAME, question: CUSTOM_QUESTION };
  const [inSet, alone] = await Promise.all([
    generateDoc(client, p, "独自書類", [shiDoc, recDoc], brief),
    generateDoc(client, p, "独自書類", [], brief),
  ]);
  const review = (content: string) =>
    runDocumentReview(
      {
        content,
        documentType: "独自書類",
        documentName: CUSTOM_NAME,
        question: CUSTOM_QUESTION,
        universityName: p.universityName,
        facultyName: p.facultyName,
        admissionPolicy: ap,
        universityResearch: RESEARCH ? RESEARCH_BY_ID[p.id] : undefined,
        facultyInfo: facultyInfoOf(p),
        selfAnalysis: p.selfAnalysis,
        activities: p.activities,
        targetWordCount: TARGET,
        previous: null,
        model: REVIEW_MODEL,
        others: [shiDoc, recDoc],
      },
      client
    );
  const [rs, ra] = await Promise.all([review(inSet), review(alone)]);
  const pct = (fb: Parameters<typeof documentScoreLayout>[0]) => {
    const layout = documentScoreLayout(fb, "独自書類");
    return layout.incomplete ? null : documentTotal(layout).percentage;
  };
  const count = (ids: (string | undefined)[], id: string) => ids.filter((x) => x === id).length;
  const setIds = rs.feedback.pairCheck?.overlaps.map((o) => o.otherId) ?? [];
  const aloneIds = ra.feedback.pairCheck?.overlaps.map((o) => o.otherId) ?? [];
  const row = {
    id: p.id,
    rep,
    setOverlapStatement: overlapWith(inSet, statement),
    setOverlapSelfRec: overlapWith(inSet, selfRec),
    aloneOverlapStatement: overlapWith(alone, statement),
    aloneOverlapSelfRec: overlapWith(alone, selfRec),
    recOverlapStatement: overlapWith(selfRec, statement),
    setOverlaps: { statement: count(setIds, "statement"), selfrec: count(setIds, "selfrec"), other: setIds.length - count(setIds, "statement") - count(setIds, "selfrec") },
    aloneOverlaps: { statement: count(aloneIds, "statement"), selfrec: count(aloneIds, "selfrec") },
    setPct: pct(rs.feedback),
    alonePct: pct(ra.feedback),
    setCoherence: rs.feedback.coherenceScore ?? null,
    aloneCoherence: ra.feedback.coherenceScore ?? null,
    setChars: inSet.length,
  };
  writeFileSync(
    `${OUT}/traces/${p.id}_set${rep}.json`,
    JSON.stringify(
      { statement, selfRec, inSet, alone, setCheck: rs.feedback.pairCheck, aloneCheck: ra.feedback.pairCheck, setFeedback: rs.feedback },
      null,
      2
    )
  );
  appendFileSync(`${OUT}/set.jsonl`, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
}

async function main(): Promise<void> {
  if (SUMMARIZE) return summarize();
  mkdirSync(`${OUT}/traces`, { recursive: true });
  const client = new Anthropic();
  if (SET) {
    await Promise.all(
      PROFILES.flatMap((p) => Array.from({ length: REPS }, (_, rep) => ({ p, rep }))).map(({ p, rep }) =>
        runSet(client, p, rep).catch((err) => console.log(p.id, rep, "ERROR", String(err).slice(0, 300)))
      )
    );
    return;
  }
  if (PAIR) {
    await Promise.all(
      PROFILES.flatMap((p) => Array.from({ length: REPS }, (_, rep) => ({ p, rep }))).map(({ p, rep }) =>
        runPair(client, p, rep).catch((err) => console.log(p.id, rep, "ERROR", String(err).slice(0, 300)))
      )
    );
    return;
  }
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

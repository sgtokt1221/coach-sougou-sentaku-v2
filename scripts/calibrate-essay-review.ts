/**
 * 小論文採点プロンプトを実答案で校正する。
 *
 * 保存済みの answers を、保存時と同じ条件（questionContext + 学部AP）で
 * 現在のプロンプトにかけ直し、旧スコアと並べて出す。**読み取りのみで、
 * Firestore は一切書き換えない**（AI 呼び出しは1答案につき1回発生する）。
 *
 * prompt-versions.ts に「校正は自作の答案ではなく実答案で行うこと」と
 * 書いてあるのを実行するためのもの。
 *
 * 使い方（既定は直近6件）:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *   npx tsx scripts/calibrate-essay-review.ts [件数]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";
import { reviewEssayCore } from "../src/lib/essay/review-core";
import { prepareAdmissionPolicy } from "../src/lib/ai/admission-policy";

const LIMIT = Number(process.argv[2]) || 6;

type Scores = {
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
  total: number;
};

const AXES = [
  "structure",
  "logic",
  "expression",
  "apAlignment",
  "originality",
] as const;

/** 答案の大学・学部から AP を組み立てる（/api/essay/review と同じ形） */
async function resolveAdmissionPolicy(
  universityId: string | undefined,
  facultyId: string | undefined,
): Promise<string> {
  if (!universityId || !facultyId) return "";
  const uni = await adminDb!.doc(`universities/${universityId}`).get();
  if (!uni.exists) return "";
  const data = uni.data()!;
  const faculty = (data.faculties ?? []).find(
    (f: { id: string }) => f.id === facultyId,
  );
  if (!faculty?.admissionPolicy) return "";
  const prepared = prepareAdmissionPolicy(faculty.admissionPolicy);
  return prepared.text
    ? `大学: ${data.name}\n学部: ${faculty.name}\nAP: ${prepared.text}`
    : "";
}

function fmt(s: Scores | null): string {
  if (!s) return "（採点なし）";
  return (
    AXES.map((a) => String(s[a]).padStart(2)).join("/") +
    ` = ${String(s.total).padStart(2)}`
  );
}

function diff(before: Scores | null, after: Scores): string {
  if (!before) return "";
  const d = after.total - before.total;
  const per = AXES.map((a) => {
    const x = after[a] - before[a];
    return x === 0 ? " ・" : (x > 0 ? "+" : "") + x;
  }).join("/");
  return `  差分 ${per} = ${d > 0 ? "+" : ""}${d}`;
}

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");

  const snap = await adminDb
    .collection("essays")
    .orderBy("submittedAt", "desc")
    .limit(LIMIT)
    .get();

  console.log(`対象 ${snap.size} 件（読み取りのみ・書き込みなし）\n`);

  const totals: { before: number; after: number }[] = [];

  for (const d of snap.docs) {
    const e = d.data();
    const ocrText: string = e.ocrText ?? e.originalText ?? "";
    if (!ocrText.trim()) {
      console.log(`- ${d.id}: 本文が無いので飛ばす`);
      continue;
    }
    const ctx = e.questionContext ?? {};
    const admissionPolicy = await resolveAdmissionPolicy(
      e.targetUniversity,
      e.targetFaculty,
    );

    let after: Scores;
    try {
      const out = await reviewEssayCore({
        ocrText,
        topic: e.topic,
        questionType: ctx.questionType ?? undefined,
        sourceText: ctx.sourceText ?? undefined,
        chartDataSummary: ctx.chartDataSummary ?? undefined,
        lectureInfo: ctx.lectureInfo ?? undefined,
        wordLimit: ctx.wordLimit ?? undefined,
        admissionPolicy,
        weaknessList: "（過去の弱点なし）",
      });
      after = out.scores as Scores;
    } catch (err) {
      console.log(`- ${d.id}: 採点に失敗 ${String(err)}`);
      continue;
    }

    const before = (e.scores ?? null) as Scores | null;
    const oldVersion = e.aiMetadata?.promptVersion ?? "不明";
    console.log(
      `${d.id}  ${String(e.topic ?? "(お題なし)").slice(0, 24)}  ` +
        `${ocrText.length}字 / 制限${ctx.wordLimit ?? "なし"} / ${ctx.questionType ?? "essay"}` +
        `${admissionPolicy ? "" : " / AP無し"}`,
    );
    console.log(`  旧(${oldVersion}) ${fmt(before)}`);
    console.log(`  新              ${fmt(after)}${diff(before, after)}`);
    console.log();

    if (before) totals.push({ before: before.total, after: after.total });
  }

  if (totals.length > 0) {
    const avg = (xs: number[]) =>
      (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);
    console.log(
      `合計点の平均: 旧 ${avg(totals.map((t) => t.before))} → ` +
        `新 ${avg(totals.map((t) => t.after))}（${totals.length}件）`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

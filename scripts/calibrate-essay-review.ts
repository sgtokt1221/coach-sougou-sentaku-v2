/**
 * 小論文添削プロンプトの校正を「本番の実答案」で行う。
 *
 * 自作した品質帯の答案だけで校正すると、実在の生徒が密集する帯に目盛りが
 * 無いことに気づけない（v4 がこれで失敗した: 自作校正では D17/C27/B37/A40 と
 * 分離していたのに、本番では6件中5件が25点に張り付いた）。
 *
 * Firestore に保存済みの答案を現行プロンプトで採点し直し、保存済みスコアと
 * 並べて表示する。書き込みは一切しない。
 *
 * Usage:
 *   npx tsx scripts/calibrate-essay-review.ts                       # 直近20件
 *   npx tsx scripts/calibrate-essay-review.ts --version essay-review-v4
 *   npx tsx scripts/calibrate-essay-review.ts --limit 6
 *
 * 注意:
 *  - 実際に Anthropic API を呼ぶ（1答案 = 1リクエスト）。
 *  - 採点当時の弱点リスト・自己分析は復元できないため、そこは既定値で流す。
 *    5軸のスコアはルーブリックが支配的なので比較には足りるが、完全な統制では
 *    ないことを踏まえて読むこと。
 */
import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { reviewEssayCore } from "../src/lib/essay/review-core";
import { prepareAdmissionPolicy } from "../src/lib/ai/admission-policy";
import { AI_PROMPT_VERSIONS } from "../src/lib/ai/prompt-versions";
import type { EssayScores } from "../src/lib/types/essay";

config({ path: resolve(process.cwd(), ".env.local") });

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const FILTER_VERSION = arg("version", "");
const LIMIT = Number(arg("limit", "20"));

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    }),
  });
}
const db = getFirestore();

const vec = (s: Partial<EssayScores>) =>
  `${s.structure}/${s.logic}/${s.expression}/${s.apAlignment}/${s.originality}`;

async function loadAdmissionPolicy(
  universityId: string | undefined,
  facultyId: string | undefined
): Promise<string> {
  if (!universityId) return "";
  const doc = await db.doc(`universities/${universityId}`).get();
  if (!doc.exists) return "";
  const data = doc.data()!;
  const faculty = data.faculties?.find(
    (f: { id: string; admissionPolicy?: string }) => f.id === facultyId
  );
  if (!faculty?.admissionPolicy) return "";
  const prepared = prepareAdmissionPolicy(faculty.admissionPolicy);
  return prepared.text
    ? `大学: ${data.name}\n学部: ${faculty.name}\nAP: ${prepared.text}`
    : "";
}

async function main() {
  const snap = await db.collection("essays").get();
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
    .filter((r) => {
      if (r.status !== "reviewed" || !r.scores) return false;
      if (!FILTER_VERSION) return true;
      const feedback = r.feedback as { aiMetadata?: { promptVersion?: string } };
      return feedback?.aiMetadata?.promptVersion === FILTER_VERSION;
    })
    .sort((a, b) => {
      const t = (x: unknown) =>
        (x as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
      return t(b.submittedAt) - t(a.submittedAt);
    })
    .slice(0, LIMIT);

  console.log(
    `対象 ${rows.length}件（現行版 ${AI_PROMPT_VERSIONS.essayReview.promptVersion} で採点し直す）\n`
  );

  const nameCache = new Map<string, string>();
  let moved = 0;
  // 本当に見たいのは「1本の答案の中で軸がばらけたか」ではなく、
  // 「同じ生徒の別の答案に別の点が付いたか」。後者が成長トラッキングの解像度。
  const perStudent = new Map<string, { before: string; after: string }[]>();

  for (const r of rows) {
    const before = r.scores as EssayScores;
    const retry = (r.retryContext ?? {}) as {
      wordLimit?: number | null;
      questionType?: string | null;
      sourceText?: string | null;
      chartDataSummary?: string | null;
    };

    const uid = r.userId as string;
    if (!nameCache.has(uid)) {
      const u = await db.doc(`users/${uid}`).get();
      nameCache.set(uid, (u.data()?.name as string) ?? uid.slice(0, 8));
    }

    const admissionPolicy = await loadAdmissionPolicy(
      r.targetUniversity as string | undefined,
      r.targetFaculty as string | undefined
    );

    let after: EssayScores;
    try {
      const result = await reviewEssayCore({
        ocrText: r.ocrText as string,
        topic: r.topic as string | undefined,
        questionType: retry.questionType ?? undefined,
        sourceText: retry.sourceText ?? undefined,
        chartDataSummary: retry.chartDataSummary ?? undefined,
        wordLimit: retry.wordLimit ?? undefined,
        admissionPolicy,
        weaknessList: "（過去の弱点なし）",
      });
      after = result.scores;
    } catch (e) {
      console.log(`${nameCache.get(uid)}  ${r.id}  採点失敗: ${String(e)}`);
      continue;
    }

    if (vec(before) !== vec(after)) moved++;
    perStudent.set(uid, [
      ...(perStudent.get(uid) ?? []),
      { before: vec(before), after: vec(after) },
    ]);

    console.log(
      `${nameCache.get(uid)!.padEnd(8)} ${String(r.topic ?? "").slice(0, 18).padEnd(20)}` +
        `  旧 ${vec(before)} = ${String(before.total).padStart(2)}` +
        `  →  新 ${vec(after)} = ${String(after.total).padStart(2)}` +
        `  (${after.total - before.total >= 0 ? "+" : ""}${after.total - before.total})`
    );
  }

  console.log(`\nベクトルが動いた: ${moved}/${rows.length}`);
  console.log("\n生徒ごとの解像度（答案2本以上の生徒のみ）:");
  for (const [uid, list] of perStudent) {
    if (list.length < 2) continue;
    const b = new Set(list.map((x) => x.before)).size;
    const a = new Set(list.map((x) => x.after)).size;
    console.log(
      `  ${nameCache.get(uid)}: ${list.length}本 → 異なるベクトル 旧${b}種 / 新${a}種` +
        (a > b ? "  ✓改善" : a === b ? "  =変化なし" : "  ✗悪化")
    );
  }
  console.log(
    "\n読み方: 同じ生徒の複数答案に異なる点が付くかが本質。" +
      "1本の中で軸がばらけても、答案間で同じなら推移グラフは平らなまま。"
  );
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);

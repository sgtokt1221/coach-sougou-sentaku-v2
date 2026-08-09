/**
 * 過去の添削を現行プロンプトで採点し直し、essays の scores / feedback を更新する。
 *
 * プロンプトのアンカーを変えるとスコア水準が動くため、古い版で付いた点と
 * 新しい版で付いた点が同じグラフに並ぶと推移が嘘になる。全件を同じ版で
 * 揃え直すためのスクリプト。
 *
 * Usage:
 *   npx tsx scripts/backfill-essay-rescore.ts            # dry-run（既定）
 *   npx tsx scripts/backfill-essay-rescore.ts --write    # 実書き込み
 *   npx tsx scripts/backfill-essay-rescore.ts --user <uid>
 *
 * 更新するもの: essays/{id} の scores, feedback（aiMetadata 含む）
 * 更新しないもの:
 *   - 弱点DB（users 配下の weaknesses。累積の履歴なので再導出すると出現回数が二重に増える）
 *   - BigQuery の essay_submissions（提出時点のログなので遡って書き換えない）
 *   これらは旧版の採点に基づいた値のまま残る。
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

const isWrite = process.argv.includes("--write");
const userIdx = process.argv.indexOf("--user");
const ONLY_USER = userIdx >= 0 ? process.argv[userIdx + 1] : null;
// 単一の答案を版フィルタを無視して採点し直す（採点し直しの失敗を修復する用）
const essayIdx = process.argv.indexOf("--essay");
const ONLY_ESSAY = essayIdx >= 0 ? process.argv[essayIdx + 1] : null;
const TARGET_VERSION = AI_PROMPT_VERSIONS.essayReview.promptVersion;

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
      if (r.status !== "reviewed" || !r.scores || !r.ocrText) return false;
      if (ONLY_ESSAY) return r.id === ONLY_ESSAY;
      if (ONLY_USER && r.userId !== ONLY_USER) return false;
      const fb = r.feedback as { aiMetadata?: { promptVersion?: string } };
      // 既に現行版で採点済みのものは触らない
      return fb?.aiMetadata?.promptVersion !== TARGET_VERSION;
    })
    .sort((a, b) => {
      const t = (x: unknown) =>
        (x as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
      return t(a.submittedAt) - t(b.submittedAt);
    });

  console.log(
    `${isWrite ? "【実書き込み】" : "【dry-run】"} 対象 ${rows.length}件 → ${TARGET_VERSION} で採点し直す\n`
  );

  const nameCache = new Map<string, string>();
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of rows) {
    const uid = r.userId as string;
    if (!nameCache.has(uid)) {
      const u = await db.doc(`users/${uid}`).get();
      nameCache.set(uid, (u.data()?.name as string) ?? uid.slice(0, 8));
    }

    const before = r.scores as EssayScores;
    const retry = (r.retryContext ?? {}) as {
      wordLimit?: number | null;
      questionType?: string | null;
      sourceText?: string | null;
      chartDataSummary?: string | null;
    };

    try {
      const admissionPolicy = await loadAdmissionPolicy(
        r.targetUniversity as string | undefined,
        r.targetFaculty as string | undefined
      );

      // 元はAPを評価できていたのに今は引けない答案を採点し直すと、apAlignment が
      // 0 で上書きされる（AP未提供時の値）。それは採点のやり直しではなく破壊なので
      // 触らない。大学データ側が直ってから改めて対象にする。
      //
      // 判定は「元の apAlignment が 0 より大きいか」で行う。feedback.apAlignmentAssessable
      // で判定した最初の版は、このフィールドを持たない古い答案で undefined === true が
      // false になり素通りした（実際に2件を AP=0 で上書きしてしまった）。
      const wasAssessable = (before.apAlignment ?? 0) > 0;
      if (wasAssessable && !admissionPolicy) {
        console.log(
          `${nameCache.get(uid)!.padEnd(8)} ${r.id}  スキップ: APを再取得できない` +
            `（university=${r.targetUniversity ?? "-"} faculty=${r.targetFaculty ?? "-"}）`
        );
        skipped++;
        continue;
      }

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

      console.log(
        `${nameCache.get(uid)!.padEnd(8)} ${r.id}  ` +
          `旧 ${vec(before)}=${before.total}  →  新 ${vec(result.scores)}=${result.scores.total}`
      );

      if (isWrite) {
        await db.doc(`essays/${r.id}`).set(
          {
            scores: result.scores,
            feedback: result.feedback,
            rescoredAt: new Date(),
          },
          { merge: true }
        );
      }
      ok++;
    } catch (e) {
      console.log(`${nameCache.get(uid)} ${r.id}  失敗: ${String(e)}`);
      failed++;
    }
  }

  console.log(`\n成功 ${ok}件 / スキップ ${skipped}件 / 失敗 ${failed}件`);
  if (!isWrite) {
    console.log("dry-run のため書き込みはしていない。実行するには --write を付ける。");
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);

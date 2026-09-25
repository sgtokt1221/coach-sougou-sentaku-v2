/**
 * 既存の答案を、いまの採点軸で採点し直す。
 *
 * 軸が変わるたびに使う。混ざったままだと平均・ランク・成長グラフが比較不能になる。
 *   v7:  AP合致度を合計から外し、議論の成熟度を足した
 *   v14: 軸ごとに配点を付けた（構成12/論理12/表現11/独自性5/成熟度10）
 *   v23: 独自性をやめ、回答力（設問に答えているか）に置き換えた
 *        （構成12/論理12/表現11/回答力10/成熟度5）
 *
 * 保存時と同じ条件（questionContext + 学部AP）で採点し直し、
 * scores / feedback を上書きする。旧スコアは scoresBeforeV7 に退避するので
 * 元に戻せる。
 *
 * 使い方（既定は確認のみ。--apply で書き込み）:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *   npx tsx scripts/rescore-essays.ts [--apply] [--limit=20] [--names=岡本,長谷川]
 *
 * --names は生徒の表示名の部分一致。指定するとその生徒の答案だけを対象にする。
 * --limit は新しい順に N 件。--names と併せると「その生徒の直近N件」になる。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase/admin";
import {
  reviewEssayCore,
  sentenceCheckFields,
} from "../src/lib/essay/review-core";
import { isPartialEssay } from "../src/lib/essay/derive-weakness-issues";
import { prepareAdmissionPolicy } from "../src/lib/ai/admission-policy";
import { AI_PROMPT_VERSIONS } from "../src/lib/ai/prompt-versions";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0
);
const TARGET_VERSION = AI_PROMPT_VERSIONS.essayReview.promptVersion;
const NAMES = (
  process.argv.find((a) => a.startsWith("--names="))?.split("=")[1] ?? ""
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

async function resolveAdmissionPolicy(
  universityId: string | undefined,
  facultyId: string | undefined
): Promise<string> {
  if (!universityId || !facultyId) return "";
  const uni = await adminDb!.doc(`universities/${universityId}`).get();
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

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");

  const snap = await adminDb
    .collection("essays")
    .orderBy("submittedAt", "desc")
    .get();

  /** 表示名で絞る場合に使う uid の集合 */
  let allowedUids: Set<string> | null = null;
  if (NAMES.length > 0) {
    const users = await adminDb.collection("users").get();
    allowedUids = new Set(
      users.docs
        .filter((u) => {
          const name = String(u.data().displayName ?? "");
          return NAMES.some((n) => name.includes(n));
        })
        .map((u) => u.id)
    );
    const names = users.docs
      .filter((u) => allowedUids!.has(u.id))
      .map((u) => String(u.data().displayName ?? u.id));
    console.log(`対象の生徒: ${names.join(" / ") || "（該当なし）"}`);
  }

  const targets = snap.docs.filter((d) => {
    const e = d.data();
    if (!(e.ocrText ?? e.originalText ?? "").trim()) return false;
    if (!e.scores) return false;
    if (allowedUids && !allowedUids.has(e.userId)) return false;
    // すでに新版で採点済みなら飛ばす（再実行しても二重に課金しない）
    return e.feedback?.aiMetadata?.promptVersion !== TARGET_VERSION;
  });

  const list = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
  console.log(
    `全 ${snap.size} 件 / 対象 ${targets.length} 件 / 今回処理 ${list.length} 件` +
      `${APPLY ? "" : "（確認のみ。--apply で書き込み）"}\n`
  );

  let ok = 0;
  let failed = 0;

  for (const d of list) {
    const e = d.data();
    const ocrText: string = e.ocrText ?? e.originalText ?? "";
    const ctx = e.questionContext ?? {};
    const admissionPolicy = await resolveAdmissionPolicy(
      e.targetUniversity,
      e.targetFaculty
    );

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
        partial: isPartialEssay(e),
      });

      const before = e.scores;
      const after = out.scores;
      console.log(
        `${d.id}  ${String(e.topic ?? "(お題なし)").slice(0, 20)}\n` +
          `  旧 ${before.total}点（AP ${before.apAlignment ?? "-"}）\n` +
          `  新 ${after.total}点（回答力 ${after.responsiveness} / 成熟度 ${after.reasoningMaturity} / AP ${after.apAlignment ?? "未評価"}）`
      );

      if (APPLY) {
        await d.ref.set(
          {
            scores: after,
            feedback: out.feedback,
            // 点検が取れなければ前回の点検を消す（新しい feedback と食い違って残さない）
            ...sentenceCheckFields(
              out.sentenceCheck,
              "rescore",
              FieldValue.delete()
            ),
            // 元に戻せるよう旧スコアを退避（既にあれば上書きしない）
            ...(e.scoresBeforeV7 ? {} : { scoresBeforeV7: before }),
            // v14（配点の重み付け）の直前スコア。v7 の退避とは別に持つ
            ...(e.scoresBeforeV14 ? {} : { scoresBeforeV14: before }),
            // v23（独自性→回答力）の直前スコア。旧軸の値はここにだけ残る
            ...(e.scoresBeforeV23 ? {} : { scoresBeforeV23: before }),
            rescoredAt: new Date().toISOString(),
          },
          { merge: true }
        );
        /**
         * merge:true は scores のキーを合成するため、旧軸の originality が残る。
         * 残すと履歴グラフが「独自性（旧軸）」の線を復活させ、再採点済みの答案に
         * 古い軸の点を並べて描いてしまう。同じ set の中でドット記法と map を
         * 混ぜると Firestore が同一フィールドの二重指定で弾くので、別 update で消す。
         */
        if (typeof e.scores?.originality === "number") {
          await d.ref.update({ "scores.originality": FieldValue.delete() });
        }
      }
      ok++;
    } catch (err) {
      console.log(`${d.id}: 失敗 ${String(err).slice(0, 120)}`);
      failed++;
    }
  }

  console.log(`\n成功 ${ok} 件 / 失敗 ${failed} 件`);
  if (!APPLY) console.log("--- 確認のみ。--apply で書き込む ---");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

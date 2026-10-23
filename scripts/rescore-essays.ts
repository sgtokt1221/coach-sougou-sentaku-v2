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
 *
 * 期間で直す（点検や採点の不具合の後始末。v36: 2026-10-24）:
 *   1) --since=2026-10-22 で、その日（日本時間）以降の提出を採点し直し、結果を
 *      .claude/rescore-essays-<since>.json に保存する（Firestore には書かない）
 *   2) --since=2026-10-22 --apply で、1) のファイルから書き込む（AI は呼ばない。
 *      1) と 2) で別々に AI を呼ぶと、確認した結果と書き込む結果が別物になるため）
 *   本番の添削と同じく、その生徒の弱点リストと、書き直しなら前回の答案と課題を渡す
 *   （渡さないと「前回の課題が直ったか」と「前から続いている課題」の声かけが消える）。
 *   古い順に処理し、書き直しの子には採点し直した親の課題を渡す。
 *   弱点DBは書き換えないので、書き込んだ後に rebuild-weaknesses.ts --name=… を流す。
 */
import { resolveQuestionSource } from "../src/lib/essay/lecture-info";
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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pickFocus } from "../src/lib/essay/result-focus";
import { isMachineOnlyWeakness } from "../src/lib/essay/derive-weakness-issues";
import {
  activeWeaknesses,
  loadWeaknessRecords,
} from "../src/lib/growth/weakness-store";
import { hintsFromIssues } from "../src/lib/growth/analyze";

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

const SINCE = process.argv.find((a) => a.startsWith("--since="))?.split("=")[1];

async function resolveAdmissionPolicy(
  universityId: string | undefined,
  facultyId: string | undefined,
  /** 過去問の学部名。本番の添削と同じく、こちらの学部のAPを優先する */
  pastQuestionFacultyName?: string | null
): Promise<string> {
  if (!universityId) return "";
  const uni = await adminDb!.doc(`universities/${universityId}`).get();
  if (!uni.exists) return "";
  const data = uni.data()!;
  type Faculty = { id: string; name: string; admissionPolicy?: string };
  const faculties: Faculty[] = data.faculties ?? [];
  const faculty =
    (pastQuestionFacultyName
      ? faculties.find(
          (f) =>
            f.name === pastQuestionFacultyName ||
            pastQuestionFacultyName.includes(f.name)
        )
      : undefined) ?? faculties.find((f) => f.id === facultyId);
  if (!faculty?.admissionPolicy) return "";
  const prepared = prepareAdmissionPolicy(faculty.admissionPolicy);
  return prepared.text
    ? `大学: ${data.name}\n学部: ${faculty.name}\nAP: ${prepared.text}`
    : "";
}

/** 本番の添削（/api/essay/review）と同じ弱点リスト */
async function weaknessListOf(uid: string): Promise<string> {
  const loaded = await loadWeaknessRecords(adminDb!, uid);
  const forAi = activeWeaknesses(loaded.records).filter(
    (w) => !isMachineOnlyWeakness(w)
  );
  return forAi.length > 0
    ? forAi.map((w) => `- ${w.area}（${w.count}回指摘）`).join("\n")
    : "（過去の弱点なし）";
}

interface SinceResult {
  id: string;
  userId: string;
  topic: string;
  before: Record<string, unknown>;
  scores: Record<string, unknown>;
  feedback: Record<string, unknown>;
  sentenceCheck: unknown;
}

/** --since: 期間内の提出を、本番と同じ入力で古い順に採点し直す */
async function rescoreSince(since: string) {
  const file = `.claude/rescore-essays-${since}.json`;
  if (APPLY) {
    if (!existsSync(file)) throw new Error(`${file} が無い。先に --apply なしで流す`);
    const results: SinceResult[] = JSON.parse(readFileSync(file, "utf8"));
    for (const r of results) {
      const ref = adminDb!.doc(`essays/${r.id}`);
      const cur = (await ref.get()).data()!;
      // update はフィールドごと置き換える（set+merge だと feedback の中の古い項目が残る）
      await ref.update(
        {
          scores: r.scores,
          feedback: r.feedback,
          // 本番の添削と同じく repeatedIssues から作る（古いタグが残ると答案一覧の弱点表示がずれる）
          weaknessTags: hintsFromIssues(
            (r.feedback.repeatedIssues ?? []) as Parameters<typeof hintsFromIssues>[0]
          ).tags,
          ...sentenceCheckFields(
            r.sentenceCheck as Parameters<typeof sentenceCheckFields>[0],
            "rescore",
            FieldValue.delete()
          ),
          // 元に戻せるよう、採点し直す直前の点と添削結果を退避する（既にあれば上書きしない）
          ...(cur.scoresBeforeV36 ? {} : { scoresBeforeV36: cur.scores }),
          ...(cur.feedbackBeforeV36 ? {} : { feedbackBeforeV36: cur.feedback }),
          rescoredAt: new Date().toISOString(),
        }
      );
    }
    console.log(`${results.length} 件を書き込んだ`);
    return;
  }

  const from = new Date(`${since}T00:00:00+09:00`);
  const snap = await adminDb!
    .collection("essays")
    .where("submittedAt", ">=", from)
    .get();
  const docs = snap.docs
    .filter((d) => {
      const e = d.data();
      return (
        (e.ocrText ?? "").trim() &&
        e.scores &&
        e.feedback?.aiMetadata?.promptVersion !== TARGET_VERSION
      );
    })
    .sort(
      (a, b) =>
        a.data().submittedAt.toMillis() - b.data().submittedAt.toMillis()
    );
  console.log(`${since} 以降の対象 ${docs.length} 件（確認のみ。結果は ${file}）\n`);

  const weaknessCache = new Map<string, string>();
  const done = new Map<string, SinceResult>();
  const results: SinceResult[] = [];
  for (const d of docs) {
    const e = d.data();
    const ctx = e.questionContext ?? {};
    const partial = isPartialEssay(e);
    if (!weaknessCache.has(e.userId))
      weaknessCache.set(e.userId, await weaknessListOf(e.userId));
    // 書き直しなら前回の答案と課題。親も採点し直した場合は新しい課題を使う
    let previousAttempt: { essayText: string; focus: string } | undefined;
    if (e.parentEssayId) {
      const parent = done.get(e.parentEssayId);
      const pdata = parent
        ? null
        : (await adminDb!.doc(`essays/${e.parentEssayId}`).get()).data();
      const pText = parent
        ? (docs.find((x) => x.id === e.parentEssayId)!.data().ocrText as string)
        : (pdata?.ocrText as string | undefined);
      const pFeedback = parent ? parent.feedback : pdata?.feedback;
      const focus = pFeedback ? pickFocus(pFeedback)?.text : null;
      if (pText && focus) previousAttempt = { essayText: pText, focus };
    }
    try {
      const out = await reviewEssayCore({
        ocrText: e.ocrText,
        topic: e.topic,
        questionType: ctx.questionType ?? undefined,
        sourceText: ctx.sourceText ?? undefined,
        chartDataSummary: ctx.chartDataSummary ?? undefined,
        lectureInfo:
          resolveQuestionSource(ctx).lectureInfo ?? ctx.lectureInfo ?? undefined,
        wordLimit: ctx.wordLimit ?? undefined,
        admissionPolicy: await resolveAdmissionPolicy(
          e.targetUniversity,
          e.targetFaculty,
          ctx.pastQuestionFacultyName
        ),
        weaknessList: weaknessCache.get(e.userId)!,
        partial,
        ...(previousAttempt ? { previousAttempt } : {}),
      });
      const r: SinceResult = {
        id: d.id,
        userId: e.userId,
        topic: String(e.topic ?? "").split("\n")[0].slice(0, 24),
        before: e.scores,
        scores: out.scores as unknown as Record<string, unknown>,
        feedback: out.feedback as unknown as Record<string, unknown>,
        sentenceCheck: out.sentenceCheck,
      };
      done.set(d.id, r);
      results.push(r);
      const axes = ["structure", "logic", "expression", "responsiveness", "reasoningMaturity"];
      console.log(
        `${d.id} ${r.topic}\n  ${axes.map((k) => `${e.scores[k] ?? "-"}→${r.scores[k]}`).join(" ")}  合計 ${e.scores.total}→${r.scores.total}` +
          `  崩れた文 ${(e.sentenceCheck?.brokenSentences ?? []).length}→${out.sentenceCheck?.brokenSentences.length ?? "-"}`
      );
    } catch (err) {
      console.log(`${d.id}: 失敗 ${String(err).slice(0, 120)}`);
    }
    // 1件ごとに書き出す（途中で落ちても済んだ分を失わない）
    writeFileSync(file, JSON.stringify(results, null, 2));
  }
  console.log(`\n成功 ${results.length} / ${docs.length} 件。--apply で書き込む`);
}

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");
  if (SINCE) return rescoreSince(SINCE);

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
      e.targetFaculty,
      ctx.pastQuestionFacultyName
    );

    try {
      const out = await reviewEssayCore({
        ocrText,
        topic: e.topic,
        questionType: ctx.questionType ?? undefined,
        sourceText: ctx.sourceText ?? undefined,
        chartDataSummary: ctx.chartDataSummary ?? undefined,
        // TED の書き起こしは保存していないので出題元から引き直す
        lectureInfo:
          resolveQuestionSource(ctx).lectureInfo ?? ctx.lectureInfo ?? undefined,
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

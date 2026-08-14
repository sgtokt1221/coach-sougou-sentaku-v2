/**
 * 既存のスキルチェック結果を、新しい採点軸（skill-check-v3）で採点し直す。
 *
 * v3 で軸構成が変わったため、古い結果とは合計の意味が違う:
 *   旧: 構成/論理性/表現力/系統適合/独自性 の単純合計 = 50点
 *   新: 構成12/論理性12/表現力11/独自性5/議論の成熟度10 の重み付け = 50点
 *       （系統適合は採点しない。系統別の期待水準は logic の中で見る）
 *
 * スキルチェックの合計は SC×0.4 + 練習平均×0.6 で合成され（skill-check/aggregate）、
 * users/{uid}.currentSkillScore → 生徒一覧のランク → BigQuery まで伝播する。
 * 混ざったままだとランクも成長グラフも比較不能になる。
 *
 * 保存済みの essayText と questionId で採点し直し、scores / rank / feedback を
 * 上書きする。旧スコアは scoresBeforeV3 に退避するので元に戻せる。
 * 生徒ごとに最新の結果で lastSkillCheckScore / lastSkillCheckRank も更新し、
 * currentSkillScore を再計算する（ここを忘れると一覧に旧尺度が残る）。
 *
 * 使い方（既定は確認のみ。--apply で書き込み）:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *   npx tsx scripts/rescore-skill-checks.ts [--apply] [--limit=20] [--names=岡本,長谷川]
 *
 * --names は生徒の表示名の部分一致。--limit は新しい順に N 件。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";
import { reviewWithClaude } from "../src/lib/ai/essay-reviewer";
import { buildSkillCheckPrompt } from "../src/lib/ai/prompts/skill-check";
import { getQuestionById } from "../src/lib/skill-check/questions";
import { calculateRank } from "../src/lib/skill-check/rank";
import { calculateFillRate } from "../src/lib/essay/review-metrics";
import { refreshEssayAggregateCache } from "../src/lib/skill-check/aggregate";
import { AI_PROMPT_VERSIONS, AI_MODEL_REVIEW } from "../src/lib/ai/prompt-versions";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0,
);
const TARGET_VERSION = AI_PROMPT_VERSIONS.skillCheck.promptVersion;
const NAMES = (
  process.argv.find((a) => a.startsWith("--names="))?.split("=")[1] ?? ""
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

/** Firestore は undefined を許容しないので除去 */
const sanitize = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function toDate(v: unknown): Date {
  const withToDate = v as { toDate?: () => Date } | null;
  if (withToDate?.toDate) return withToDate.toDate();
  return new Date(String(v ?? 0));
}

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");

  const users = await adminDb.collection("users").get();
  const nameByUid = new Map<string, string>();
  users.docs.forEach((u) =>
    nameByUid.set(u.id, String(u.data().displayName ?? u.data().name ?? u.id)),
  );

  let allowedUids: Set<string> | null = null;
  if (NAMES.length > 0) {
    allowedUids = new Set(
      [...nameByUid.entries()]
        .filter(([, name]) => NAMES.some((n) => name.includes(n)))
        .map(([uid]) => uid),
    );
    console.log(
      `対象の生徒: ${[...allowedUids].map((u) => nameByUid.get(u)).join(" / ") || "（該当なし）"}`,
    );
  }

  const snap = await adminDb.collectionGroup("skillChecks").get();
  const all = snap.docs
    .map((d) => ({ doc: d, data: d.data() }))
    .filter(({ data }) => {
      if (!String(data.essayText ?? "").trim()) return false;
      if (!data.scores) return false;
      if (allowedUids && !allowedUids.has(data.userId)) return false;
      // すでに新版で採点済みなら飛ばす（再実行しても二重に課金しない）
      return data.aiMetadata?.promptVersion !== TARGET_VERSION;
    })
    .sort((a, b) => +toDate(b.data.takenAt) - +toDate(a.data.takenAt));

  const list = LIMIT > 0 ? all.slice(0, LIMIT) : all;
  console.log(
    `全 ${snap.size} 件 / 対象 ${all.length} 件 / 今回処理 ${list.length} 件` +
      `${APPLY ? "" : "（確認のみ。--apply で書き込み）"}\n`,
  );

  let ok = 0;
  let failed = 0;
  let rankChanged = 0;
  /** 生徒ごとの最新結果（デノーマライズ値の更新に使う） */
  const latestByUid = new Map<string, { takenAt: Date; total: number; rank: string }>();

  for (const { doc, data } of list) {
    const question = getQuestionById(data.questionId);
    if (!question) {
      console.log(`${doc.id}: 問題 ${data.questionId} が見つからないため飛ばします`);
      failed++;
      continue;
    }

    const essayText: string = data.essayText;
    const fillRate = calculateFillRate(essayText, question.wordLimit);
    const systemPrompt = buildSkillCheckPrompt(question, { fillRate });
    const userMessage = `【問題】${question.title}\n${question.prompt}\n\n<essay_under_review>\n${essayText}\n</essay_under_review>`;

    try {
      const { scores, feedback } = await reviewWithClaude({
        systemPrompt,
        userMessage,
      });
      const rank = calculateRank(scores.total);
      const before = data.scores;
      const beforeRank: string = data.rank;

      if (rank !== beforeRank) rankChanged++;
      console.log(
        `${doc.id}  ${nameByUid.get(data.userId) ?? data.userId}  ${question.title.slice(0, 18)}\n` +
          `  旧 ${before.total}点 ${beforeRank}（系統適合 ${before.apAlignment ?? "-"}）\n` +
          `  新 ${scores.total}点 ${rank}（成熟度 ${scores.reasoningMaturity}）`,
      );

      const takenAt = toDate(data.takenAt);
      const prev = latestByUid.get(data.userId);
      if (!prev || takenAt > prev.takenAt) {
        latestByUid.set(data.userId, { takenAt, total: scores.total, rank });
      }

      if (APPLY) {
        await doc.ref.set(
          {
            scores: sanitize(scores),
            rank,
            feedback: sanitize(feedback),
            // 元に戻せるよう旧スコアを退避（既にあれば上書きしない）
            ...(data.scoresBeforeV3 ? {} : { scoresBeforeV3: before }),
            rescoredAt: new Date().toISOString(),
            aiMetadata: {
              ...AI_PROMPT_VERSIONS.skillCheck,
              model: AI_MODEL_REVIEW,
            },
          },
          { merge: true },
        );
      }
      ok++;
    } catch (err) {
      console.log(`${doc.id}: 失敗 ${String(err).slice(0, 160)}`);
      failed++;
    }
  }

  if (APPLY) {
    // デノーマライズ値の更新。ここを飛ばすと生徒一覧のランクが旧尺度のまま残る
    for (const [uid, latest] of latestByUid) {
      await adminDb.doc(`users/${uid}`).set(
        { lastSkillCheckScore: latest.total, lastSkillCheckRank: latest.rank },
        { merge: true },
      );
      await refreshEssayAggregateCache(uid);
      console.log(`${nameByUid.get(uid) ?? uid}: lastSkillCheckScore を ${latest.total} に更新`);
    }
  }

  console.log(
    `\n成功 ${ok} 件 / 失敗 ${failed} 件 / ランクが変わった結果 ${rankChanged} 件`,
  );
  if (!APPLY) console.log("--- 確認のみ。--apply で書き込む ---");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

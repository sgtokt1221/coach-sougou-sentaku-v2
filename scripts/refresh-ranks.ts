/**
 * 保存済みのランク（users.currentSkillRank / currentInterviewRank）を付け直す。
 *
 * 2026-09-23 にランクを「スキルチェック 40% ＋ 練習の平均 60%」から
 * 「直近10件の提出の平均」に変えた。users に保存されたキャッシュは次の提出まで
 * 古い値のままなので、全生徒分を今の計算で書き直す。面接は満点のずれの修正
 * （一律 ×40/50 → 答案ごとの満点）でも値が変わる。
 *
 * 確認のみ（既定）: npx tsx --env-file=.env.local scripts/refresh-ranks.ts
 * 書き込む:          npx tsx --env-file=.env.local scripts/refresh-ranks.ts --apply
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
} from "../src/lib/skill-check/aggregate";

const APPLY = process.argv.includes("--apply");

async function main() {
  const db = adminDb;
  if (!db) throw new Error("Firestore に接続できません");
  const users = await db
    .collection("users")
    .where("role", "==", "student")
    .get();
  let changed = 0;
  for (const u of users.docs) {
    const d = u.data();
    const [essay, interview] = await Promise.all([
      computeEssayAggregate(u.id),
      computeInterviewAggregate(u.id),
    ]);
    const before = `${d.currentSkillRank ?? "-"}/${d.currentInterviewRank ?? "-"}`;
    const after = `${essay.compositeRank ?? "-"}/${interview.compositeRank ?? "-"}`;
    if (before !== after) changed++;
    console.log(
      `${d.displayName ?? u.id}  小論文/面接 ${before} → ${after}` +
        `  (小論文 ${essay.compositeScore ?? "-"}・${essay.practiceCount}件 / 面接 ${interview.compositeScore ?? "-"}・${interview.practiceCount}件)`
    );
    if (APPLY) {
      await u.ref.update({
        currentSkillScore: essay.compositeScore,
        currentSkillRank: essay.compositeRank,
        currentInterviewScore: interview.compositeScore,
        currentInterviewRank: interview.compositeRank,
      });
    }
  }
  console.log(
    `\n${APPLY ? "【書き換えた】" : "【確認のみ・書き込みなし】"} ${users.size}人中 ${changed}人のランクが変わる`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

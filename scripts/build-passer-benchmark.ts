/**
 * 合格者ライン（passedStudentData/{段}）を手で作り直す。
 * ふだんは受験結果の登録と採点の版の変更をきっかけに自動で動く（src/lib/benchmark/passer-rebuild.ts）。
 *
 * 使い方（既定は件数の確認のみで AI を呼ばない。--write で採点して書き込む。本番への --write は確認を取ってから）:
 *   npx tsx --env-file=.env.local scripts/build-passer-benchmark.ts [--write]
 *   エミュレータ: NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-coach FIRESTORE_EMULATOR_HOST=127.0.0.1:8581 \
 *     npx tsx --env-file=.env.local scripts/build-passer-benchmark.ts --use-stored --write
 *
 * --use-stored  採点し直さず保存済みの点を使う（エミュレータでの画面確認用。本番では使わない）
 */
import { adminDb } from "../src/lib/firebase/admin";
import {
  loadPasserStates,
  pendingEssays,
  runPasserRebuildStep,
  writeLinesFromStoredScores,
} from "../src/lib/benchmark/passer-rebuild";
import type { PasserRebuildContinuation } from "../src/lib/benchmark/passer-rebuild-request";

const WRITE = process.argv.includes("--write");
const USE_STORED = process.argv.includes("--use-stored");

async function main() {
  const db = adminDb!;
  if (!WRITE) {
    const states = await loadPasserStates(db);
    // 名前は出さない（ログにも残さない）
    console.log(`合格者 ${states.length} 人 / 採点し直す答案 ${pendingEssays(states, new Set()).length} 件`);
    return;
  }
  if (USE_STORED) {
    console.log("書いた段:", await writeLinesFromStoredScores(db));
    return;
  }
  let next: PasserRebuildContinuation | undefined;
  for (;;) {
    const result = await runPasserRebuildStep(db, next);
    console.log(JSON.stringify(result.status === "continue" ? { ...result, next: undefined } : result));
    if (result.status !== "continue") return;
    next = result.next;
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

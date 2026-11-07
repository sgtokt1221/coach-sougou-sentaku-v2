/**
 * 合格者ラインの作り直しをタスクキューに積む。
 * 合否を書く画面からも呼ぶので、AI の処理（passer-rebuild.ts）はここから読まない。
 */
import {
  appBaseUrl,
  enqueueHttpTask,
  isCloudTasksConfigured,
  taskNameFor,
} from "@/lib/gcp/cloud-tasks";
import { AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";

const REBUILD_PATH = "/api/cron/passer-benchmark";
const SETTLE_MS = 10 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface PasserRebuildContinuation {
  runId: string;
  seq: number;
  failedIds: string[];
}

async function enqueue(name: string, scheduleTime: Date, body: unknown): Promise<void> {
  // エミュレータから本番の URL へタスクを積まない
  if (process.env.FIRESTORE_EMULATOR_HOST || !isCloudTasksConfigured()) return;
  try {
    await enqueueHttpTask({
      name: taskNameFor(name),
      url: `${appBaseUrl()}${REBUILD_PATH}`,
      scheduleTime,
      body,
      headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
    });
  } catch (err) {
    // 同じ名前のタスクが既にある = もう頼んである
    if (err instanceof Error && err.message.includes(" 409 ")) return;
    throw err;
  }
}

/**
 * 作り直しを頼む。受験結果は10〜20分後に実行し、続けて登録・訂正しても1回にまとめる。
 * 失敗しても呼び出し元（受験結果の保存や画面の表示）は失敗させない。
 */
export async function requestPasserBenchmarkRebuild(
  reason: "exam-result" | "prompt-version"
): Promise<void> {
  try {
    const now = Date.now();
    if (reason === "exam-result") {
      const slot = Math.floor(now / SETTLE_MS);
      await enqueue(`passer-benchmark-${slot}`, new Date((slot + 2) * SETTLE_MS), {});
    } else {
      const version = AI_PROMPT_VERSIONS.essayReview.promptVersion;
      const slot = Math.floor(now / HOUR_MS);
      await enqueue(`passer-benchmark-${version}-${slot}`, new Date(now), {});
    }
  } catch (err) {
    console.error("[passer-benchmark] 作り直しを頼めなかった:", err);
  }
}

/** 残りの答案を次のタスクで続ける。失敗したら例外を投げ、Cloud Tasks に再試行させる */
export async function enqueuePasserRebuildContinuation(
  next: PasserRebuildContinuation
): Promise<void> {
  await enqueue(`passer-benchmark-run-${next.runId}-${next.seq}`, new Date(), next);
}

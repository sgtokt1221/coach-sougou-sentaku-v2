import { NextRequest, NextResponse } from "next/server";
import { enqueuePasserRebuildContinuation } from "@/lib/benchmark/passer-rebuild-request";
import type { PasserRebuildContinuation } from "@/lib/benchmark/passer-rebuild-request";

export const maxDuration = 300;

/**
 * POST /api/cron/passer-benchmark
 * 合格者ラインの作り直しを1回分進める。Cloud Tasks が呼ぶ。
 * `x-cron-secret: $CRON_SECRET` が無ければ 401。5xx を返すと Cloud Tasks が再試行する。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Partial<PasserRebuildContinuation> | null;
  const prev: PasserRebuildContinuation | undefined =
    typeof body?.runId === "string" && typeof body.seq === "number" && Array.isArray(body.failedIds)
      ? { runId: body.runId, seq: body.seq, failedIds: body.failedIds.map(String) }
      : undefined;

  try {
    const { runPasserRebuildStep } = await import("@/lib/benchmark/passer-rebuild");
    const result = await runPasserRebuildStep(adminDb, prev);
    if (result.status === "continue") {
      await enqueuePasserRebuildContinuation(result.next);
    }
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[cron/passer-benchmark] error:", err);
    return NextResponse.json({ error: "失敗しました" }, { status: 500 });
  }
}

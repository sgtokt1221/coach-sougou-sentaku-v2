import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

/**
 * POST /api/cron/faculty-info
 * 1学部の公式サイトを調べて facultyInfo に保存する。Cloud Tasks が呼ぶ。
 * `x-cron-secret: $CRON_SECRET` が無ければ 401。
 * 想定内の失敗（上限・ページが読めない・AI の失敗）も 200 で返す。5xx を返すと Cloud Tasks が再試行し、検索代をもう一度払う。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { adminDb } = await import("@/lib/firebase/admin");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!adminDb || !apiKey) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 200 });
  }
  const body = (await request.json().catch(() => null)) as {
    universityId?: unknown;
    facultyId?: unknown;
  } | null;
  if (typeof body?.universityId !== "string" || typeof body.facultyId !== "string") {
    return NextResponse.json({ error: "universityId, facultyId は必須です" }, { status: 200 });
  }
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { runFacultyInfoJob } = await import("@/lib/universities/faculty-info-research");
    const outcome = await runFacultyInfoJob(
      adminDb,
      body.universityId,
      body.facultyId,
      new Anthropic({ apiKey })
    );
    return NextResponse.json({ outcome });
  } catch (err) {
    console.error("[cron/faculty-info] error:", err);
    return NextResponse.json({ error: "失敗しました" }, { status: 200 });
  }
}

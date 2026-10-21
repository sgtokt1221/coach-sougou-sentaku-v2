import { NextRequest, NextResponse } from "next/server";
import { listPendingScheduledFeedback } from "@/lib/chat/scheduled-feedback";
import { authorizeScheduledAccess } from "./access";

/**
 * GET /api/admin/students/[id]/feedback/scheduled
 * まだ送っていない予約の一覧（予約時刻の早い順）。targetId で絞れる
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await authorizeScheduledAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    const targetId = new URL(request.url).searchParams.get("targetId");
    const items = await listPendingScheduledFeedback(access.db, id, targetId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Scheduled feedback GET error:", error);
    return NextResponse.json(
      { error: "予約の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

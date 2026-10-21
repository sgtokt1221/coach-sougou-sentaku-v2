import { NextRequest, NextResponse } from "next/server";
import { cancelScheduledFeedback } from "@/lib/chat/scheduled-feedback";
import { authorizeScheduledAccess } from "../access";

/**
 * DELETE /api/admin/students/[id]/feedback/scheduled/[scheduledId]
 * 予約の取り消し。送信済みなら 409
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduledId: string }> }
) {
  const { id, scheduledId } = await params;
  const access = await authorizeScheduledAccess(request, id);
  if (access instanceof NextResponse) return access;

  try {
    const result = await cancelScheduledFeedback(access.db, id, scheduledId);
    if (result === "not_found") {
      return NextResponse.json({ error: "予約がありません" }, { status: 404 });
    }
    if (result === "already_sent") {
      return NextResponse.json(
        { error: "すでに送信済みです" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scheduled feedback DELETE error:", error);
    return NextResponse.json(
      { error: "予約の取り消し中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { deleteTokens, loadTokens } from "@/lib/google/token-store";
import { revokeTokens } from "@/lib/google/calendar-client";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const tokens = await loadTokens(adminDb, auth.uid);
    if (tokens) {
      await revokeTokens(tokens).catch(() => undefined);
    }
    await deleteTokens(adminDb, auth.uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[google/disconnect] failed:", err);
    return NextResponse.json(
      { error: "連携解除に失敗しました" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { loadTokens } from "@/lib/google/token-store";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const tokens = await loadTokens(adminDb, auth.uid);
  if (!tokens) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    email: tokens.email,
    connectedAt: tokens.connectedAt,
  });
}

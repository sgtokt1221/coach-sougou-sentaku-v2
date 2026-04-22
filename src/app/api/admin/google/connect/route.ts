import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { generateAuthUrl } from "@/lib/google/calendar-client";
import { signState } from "@/lib/google/oauth-state";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const state = signState(auth.uid);
    const url = generateAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[google/connect] failed:", err);
    return NextResponse.json(
      {
        error:
          "Google OAuth 連携の初期化に失敗しました。環境変数を確認してください",
      },
      { status: 500 },
    );
  }
}

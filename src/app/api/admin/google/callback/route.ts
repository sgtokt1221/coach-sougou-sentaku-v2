import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google/calendar-client";
import { saveTokens } from "@/lib/google/token-store";
import { verifyState } from "@/lib/google/oauth-state";

function settingsUrl(request: NextRequest, params: Record<string, string>): URL {
  const url = new URL("/admin/settings", request.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      settingsUrl(request, { google_error: error }),
    );
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(
      settingsUrl(request, { google_error: "missing_code_or_state" }),
    );
  }
  const verified = verifyState(stateRaw);
  if (!verified) {
    return NextResponse.redirect(
      settingsUrl(request, { google_error: "invalid_state" }),
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.redirect(
      settingsUrl(request, { google_error: "server_config" }),
    );
  }

  try {
    const { tokens } = await exchangeCodeForTokens(code);
    await saveTokens(adminDb, verified.uid, tokens);
    return NextResponse.redirect(
      settingsUrl(request, { google_connected: "1" }),
    );
  } catch (err) {
    console.error("[google/callback] token exchange failed:", err);
    return NextResponse.redirect(
      settingsUrl(request, { google_error: "token_exchange_failed" }),
    );
  }
}

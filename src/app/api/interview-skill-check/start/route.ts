import { NextRequest, NextResponse } from "next/server";

/**
 * 面接スキルチェック: セッション開始
 * - クライアントはこの sessionId を保持して以降のやり取りを続ける
 * - 大学AP非依存なので軽量
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      }
    } catch {}
  }
  if (!userId && process.env.NODE_ENV === "development") {
    userId = "dev-user";
  }
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const sessionId = `isc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const openingMessage =
    "こんにちは。これから5分ほどの短い面接を行います。まずは簡単な自己紹介と、最近関心を持っている社会的なテーマを一つ聞かせてください。";

  return NextResponse.json({
    sessionId,
    openingMessage,
    maxTurns: 5,
    userId,
  });
}

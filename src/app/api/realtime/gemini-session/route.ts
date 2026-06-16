/**
 * 汎用音声チャット用 Gemini Live ephemeral token を発行する。
 * OpenAI 版（./session/route.ts）と対になるエンドポイント。
 * クライアントから instructions を直接渡し、Gemini Live トークンを返す。
 *
 * セキュリティ: authenticated student/admin/superadmin のみ。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  GEMINI_LIVE_MODEL,
  GEMINI_INDIVIDUAL_VOICE,
  getGeminiClient,
  issueGeminiLiveToken,
} from "@/lib/interview/gemini-live-token";

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  let body: { instructions?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }
  const { instructions } = body;
  if (!instructions || typeof instructions !== "string") {
    return NextResponse.json({ error: "instructions は必須です" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 503 });
  }

  try {
    const ai = getGeminiClient(apiKey);
    // voice は Gemini の prebuilt 名に固定（OpenAI の alloy 等は無関係）
    const token = await issueGeminiLiveToken(ai, instructions, GEMINI_INDIVIDUAL_VOICE);
    if (!token) {
      return NextResponse.json(
        { provider: "gemini", error: "Gemini Live セッションの確立に失敗しました" },
        { status: 502 },
      );
    }
    return NextResponse.json({ provider: "gemini", model: GEMINI_LIVE_MODEL, token: token.value });
  } catch (err) {
    console.error("[realtime/gemini-session] token creation failed", err);
    return NextResponse.json(
      { provider: "gemini", error: "Gemini Live トークンの発行に失敗しました" },
      { status: 502 },
    );
  }
}

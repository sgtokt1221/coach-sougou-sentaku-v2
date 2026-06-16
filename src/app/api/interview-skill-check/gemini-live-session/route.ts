/**
 * 面接スキルチェック用 Gemini Live ephemeral token を発行する。
 * OpenAI 版（../realtime-session/route.ts）と対になるエンドポイント。
 * 専用レート枠（lastSkillCheckRealtimeAt）と skill-check 用 instructions を使う。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { checkRealtimeRateLimit } from "@/lib/interview/rate-limit";
import { buildRealtimeSkillCheckInstructions } from "@/lib/ai/prompts/interview-skill-check-realtime";
import {
  GEMINI_LIVE_MODEL,
  GEMINI_INDIVIDUAL_VOICE,
  getGeminiClient,
  issueGeminiLiveToken,
} from "@/lib/interview/gemini-live-token";

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  // 専用レート枠（模擬面接とは別フィールド）
  let lastAt: Date | null = null;
  let realtimeUnlocked = false;
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const data = (await adminDb.doc(`users/${uid}`).get()).data();
      if (data?.lastSkillCheckRealtimeAt?.toDate) lastAt = data.lastSkillCheckRealtimeAt.toDate();
      if (data?.realtimeUnlocked === true) realtimeUnlocked = true;
    }
  } catch (err) {
    console.warn("[skill-check gemini-live] failed to read lastSkillCheckRealtimeAt", err);
  }

  const rate = checkRealtimeRateLimit(role, lastAt, realtimeUnlocked);
  if (!rate.allowed) {
    return NextResponse.json({
      rateLimited: true,
      nextAvailableAt: rate.nextAvailableAt,
      reason: rate.reason,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 503 });
  }

  try {
    const ai = getGeminiClient(apiKey);
    const token = await issueGeminiLiveToken(
      ai,
      buildRealtimeSkillCheckInstructions(),
      GEMINI_INDIVIDUAL_VOICE,
    );
    if (!token) {
      return NextResponse.json(
        { provider: "gemini", error: "Gemini Live セッションの確立に失敗しました" },
        { status: 502 },
      );
    }

    // 学生のみレート枠を消費
    if (role === "student" && !realtimeUnlocked) {
      try {
        const { adminDb } = await import("@/lib/firebase/admin");
        const { FieldValue } = await import("firebase-admin/firestore");
        if (adminDb) {
          await adminDb.doc(`users/${uid}`).set(
            { lastSkillCheckRealtimeAt: FieldValue.serverTimestamp() },
            { merge: true },
          );
        }
      } catch (err) {
        console.warn("[skill-check gemini-live] failed to update lastSkillCheckRealtimeAt", err);
      }
    }

    return NextResponse.json({
      provider: "gemini",
      model: GEMINI_LIVE_MODEL,
      tokens: [{ speaker: "interviewer", voice: GEMINI_INDIVIDUAL_VOICE, token: token.value, expiresAt: token.expiresAt }],
    });
  } catch (err) {
    console.error("[skill-check gemini-live] token creation failed", err);
    return NextResponse.json(
      { provider: "gemini", error: "Gemini Live トークンの発行に失敗しました" },
      { status: 502 },
    );
  }
}

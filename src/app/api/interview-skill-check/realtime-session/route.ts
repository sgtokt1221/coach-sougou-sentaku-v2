/**
 * 面接スキルチェック（音声 / Realtime）用の ephemeral token 発行。
 * 模擬面接の /api/interview/realtime-session と同方式だが、
 * - 大学/AP 非依存の専用 instructions を使う
 * - レート枠を専用フィールド `lastSkillCheckRealtimeAt` で別カウント（模擬面接と独立）
 * トークン発行ロジックは稼働中の模擬面接ルートを壊さないため本ファイルに自己完結で持つ。
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { checkRealtimeRateLimit } from "@/lib/interview/rate-limit";
import { buildRealtimeSkillCheckInstructions } from "@/lib/ai/prompts/interview-skill-check-realtime";

const REALTIME_MODEL_CANDIDATES = ["gpt-realtime-2", "gpt-realtime", "gpt-realtime-mini"];

interface EphemeralTokenResponse {
  client_secret?: { value: string; expires_at: number };
  value?: string;
  expires_at?: number;
}

function extractToken(data: EphemeralTokenResponse): { value: string; expiresAt: number } | null {
  const value = data.client_secret?.value ?? data.value;
  const expiresAt = data.client_secret?.expires_at ?? data.expires_at;
  if (!value || typeof expiresAt !== "number") return null;
  return { value, expiresAt };
}

async function issueEphemeralToken(
  apiKey: string,
  instructions: string,
  voice: string,
): Promise<{ token: { value: string; expiresAt: number } | null; model?: string }> {
  for (const model of REALTIME_MODEL_CANDIDATES) {
    try {
      const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model,
            instructions,
            output_modalities: ["audio"],
            audio: {
              input: {
                transcription: { model: "gpt-4o-mini-transcribe", language: "ja" },
                // semantic_vad: 咳払い・呼吸音などの非言語音で発話終了を誤検知しない。
                // eagerness:"low" = 割り込みに消極的＝ユーザーが言い終わるまで待つ。
                turn_detection: {
                  type: "semantic_vad",
                  eagerness: "low",
                  create_response: false,
                },
              },
              output: { voice },
            },
          },
        }),
      });
      if (res.ok) {
        const token = extractToken((await res.json()) as EphemeralTokenResponse);
        if (token) return { token, model };
      } else {
        const body = await res.text().catch(() => "");
        console.warn(`[skill-check realtime] model ${model} failed: ${res.status} ${body.slice(0, 300)}`);
        if (res.status === 401 || res.status === 403) return { token: null };
      }
    } catch (err) {
      console.error(`[skill-check realtime] model ${model} exception`, err);
    }
  }
  return { token: null };
}

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
    console.warn("[skill-check realtime] failed to read lastSkillCheckRealtimeAt", err);
  }

  const rate = checkRealtimeRateLimit(role, lastAt, realtimeUnlocked);
  if (!rate.allowed) {
    return NextResponse.json({
      rateLimited: true,
      nextAvailableAt: rate.nextAvailableAt,
      reason: rate.reason,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY が設定されていません" }, { status: 503 });
  }

  const voice = "shimmer";
  const { token, model } = await issueEphemeralToken(
    apiKey,
    buildRealtimeSkillCheckInstructions(),
    voice,
  );
  if (!token) {
    return NextResponse.json(
      { error: "Realtime セッションの確立に失敗しました" },
      { status: 502 },
    );
  }

  // 学生のみレート枠を消費（admin/teacher/superadmin・unlock は記録しない）
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
      console.warn("[skill-check realtime] failed to update lastSkillCheckRealtimeAt", err);
    }
  }

  return NextResponse.json({
    model,
    tokens: [{ speaker: "interviewer", voice, token: token.value, expiresAt: token.expiresAt }],
  });
}

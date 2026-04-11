/**
 * OpenAI Realtime API 用の ephemeral token を発行する。
 *
 * クライアントはこのエンドポイントを叩いて短命トークンを受け取り、
 * 直接 OpenAI WebRTC にハンドシェイクする。音声ストリーム本体は
 * Firebase/Next.js サーバーを経由しない。
 *
 * - 個人/プレゼン/口頭試問: 1 セッション分のトークンを返す
 * - 集団討論 (GD): 6 話者分のトークンを並列発行して返す
 * - GD のみレート制限: 2 ヶ月に 1 回 (管理者除く)
 * - レート超過時は `{ rateLimited: true, nextAvailableAt }` を返す
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { checkRealtimeRateLimit } from "@/lib/interview/rate-limit";
import {
  buildRealtimeIndividualInstructions,
  buildRealtimeGdSpeakerInstructions,
  type GdSpeakerKey,
} from "@/lib/ai/prompts/interview-realtime";
import type { InterviewMode } from "@/lib/types/interview";

const REALTIME_MODEL = "gpt-4o-mini-realtime-preview-2024-12-17";

const GD_SPEAKERS: { key: GdSpeakerKey; voice: string }[] = [
  { key: "moderator", voice: "nova" },
  { key: "professor_logic", voice: "onyx" },
  { key: "professor_practical", voice: "echo" },
  { key: "peer_bold", voice: "fable" },
  { key: "peer_careful", voice: "shimmer" },
  { key: "peer_creative", voice: "alloy" },
];

interface CreateSessionParams {
  instructions: string;
  voice: string;
}

interface EphemeralTokenResponse {
  client_secret: { value: string; expires_at: number };
  id: string;
}

async function issueEphemeralToken(
  apiKey: string,
  params: CreateSessionParams,
): Promise<EphemeralTokenResponse | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: params.voice,
        instructions: params.instructions,
        modalities: ["audio", "text"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[realtime-session] OpenAI error", res.status, body);
      return null;
    }
    const data = (await res.json()) as EphemeralTokenResponse;
    return data;
  } catch (err) {
    console.error("[realtime-session] issue token failed", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  let body: {
    mode: InterviewMode;
    universityName?: string;
    facultyName?: string;
    admissionPolicy?: string;
    weaknessList?: string;
    presentationContent?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { mode, universityName = "", facultyName = "", admissionPolicy = "", weaknessList = "（過去の弱点なし）", presentationContent } = body;

  if (!mode) {
    return NextResponse.json({ error: "mode は必須です" }, { status: 400 });
  }

  // GD モードのレートリミット確認
  if (mode === "group_discussion") {
    let lastRealtimeGdAt: Date | null = null;
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        const userDoc = await adminDb.doc(`users/${uid}`).get();
        const data = userDoc.data();
        if (data?.lastRealtimeGdAt?.toDate) {
          lastRealtimeGdAt = data.lastRealtimeGdAt.toDate();
        }
      }
    } catch (err) {
      console.warn("[realtime-session] failed to read lastRealtimeGdAt", err);
    }

    const rate = checkRealtimeRateLimit(mode, role, lastRealtimeGdAt);
    if (!rate.allowed) {
      return NextResponse.json({
        rateLimited: true,
        nextAvailableAt: rate.nextAvailableAt,
        reason: rate.reason,
      });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません" },
      { status: 503 },
    );
  }

  // トークン発行
  if (mode === "group_discussion") {
    // GD: 6 話者分を並列発行
    const tokens = await Promise.all(
      GD_SPEAKERS.map(async ({ key, voice }) => {
        const instructions = buildRealtimeGdSpeakerInstructions(
          key,
          universityName,
          facultyName,
          admissionPolicy,
          weaknessList,
        );
        const token = await issueEphemeralToken(apiKey, { instructions, voice });
        return token ? { speaker: key, voice, token: token.client_secret.value, expiresAt: token.client_secret.expires_at } : null;
      }),
    );

    const successful = tokens.filter((t): t is NonNullable<typeof t> => t !== null);
    if (successful.length < 6) {
      // 6 本全部揃わなければフォールバック扱い
      return NextResponse.json({
        rateLimited: false,
        error: "Realtime セッションの確立に失敗しました",
        partial: successful.length,
      }, { status: 502 });
    }

    // 成功したら lastRealtimeGdAt を更新 (管理者以外)
    if (role !== "admin" && role !== "superadmin") {
      try {
        const { adminDb } = await import("@/lib/firebase/admin");
        const { FieldValue } = await import("firebase-admin/firestore");
        if (adminDb) {
          await adminDb.doc(`users/${uid}`).update({
            lastRealtimeGdAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn("[realtime-session] failed to update lastRealtimeGdAt", err);
      }
    }

    return NextResponse.json({
      mode: "group_discussion",
      model: REALTIME_MODEL,
      tokens: successful,
    });
  }

  // 個人 / プレゼン / 口頭試問: 1 セッション
  const instructions = buildRealtimeIndividualInstructions(
    mode,
    universityName,
    facultyName,
    admissionPolicy,
    weaknessList,
    undefined,
    presentationContent,
  );
  const voice = "nova"; // 個人モードはデフォルト nova
  const token = await issueEphemeralToken(apiKey, { instructions, voice });
  if (!token) {
    return NextResponse.json(
      { error: "Realtime セッションの確立に失敗しました" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    mode,
    model: REALTIME_MODEL,
    tokens: [{
      speaker: "interviewer",
      voice,
      token: token.client_secret.value,
      expiresAt: token.client_secret.expires_at,
    }],
  });
}

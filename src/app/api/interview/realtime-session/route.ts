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

/** モデル名のフォールバックチェーン。上から順に試す。 */
const REALTIME_MODEL_CANDIDATES = [
  "gpt-4o-mini-realtime-preview-2024-12-17",
  "gpt-4o-mini-realtime-preview",
  "gpt-4o-realtime-preview-2024-12-17",
  "gpt-4o-realtime-preview",
];

// Realtime API がサポートする voice: alloy / ash / ballad / coral / echo / sage / shimmer / verse
// GD は 3 話者構成: 教授 1 + 受験生 2 (ユーザー = 受験生D)
const GD_SPEAKERS: { key: GdSpeakerKey; voice: string }[] = [
  { key: "moderator", voice: "sage" },         // 教授 (進行役 + 鋭い質問)
  { key: "peer_bold", voice: "ballad" },       // 健太 (積極派・リーダー型)
  { key: "peer_careful", voice: "shimmer" },   // 美咲 (慎重派・データ重視)
];

interface CreateSessionParams {
  instructions: string;
  voice: string;
}

interface EphemeralTokenResponse {
  client_secret: { value: string; expires_at: number };
  id: string;
}

interface IssueResult {
  token: EphemeralTokenResponse | null;
  model?: string;
  debugErrors: Array<{ model: string; status: number; body: string }>;
}

/**
 * 最小リクエストで ephemeral token を発行。
 * 複数モデルをフォールバックチェーンで順に試し、最初に成功したものを返す。
 * 失敗したモデルのエラー詳細は debugErrors で蓄積する。
 */
async function issueEphemeralToken(
  apiKey: string,
  params: CreateSessionParams,
): Promise<IssueResult> {
  const debugErrors: IssueResult["debugErrors"] = [];

  for (const model of REALTIME_MODEL_CANDIDATES) {
    try {
      const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          voice: params.voice,
          instructions: params.instructions,
          // ユーザー発話を whisper で文字起こしする (これがないと画面に出ない)
          input_audio_transcription: { model: "whisper-1" },
          // サーバー VAD でユーザーの発話終了を検知して即応答生成
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as EphemeralTokenResponse;
        console.log(`[realtime-session] success with model ${model}`);
        return { token: data, model, debugErrors };
      }
      const body = await res.text().catch(() => "");
      console.warn(`[realtime-session] model ${model} failed: ${res.status} ${body.slice(0, 500)}`);
      debugErrors.push({ model, status: res.status, body: body.slice(0, 500) });
      // 401/403 は全モデル共通の問題なので即打ち切り
      if (res.status === 401 || res.status === 403) {
        return { token: null, debugErrors };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[realtime-session] model ${model} exception`, msg);
      debugErrors.push({ model, status: 0, body: msg });
    }
  }
  return { token: null, debugErrors };
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
    const results = await Promise.all(
      GD_SPEAKERS.map(async ({ key, voice }) => {
        const instructions = buildRealtimeGdSpeakerInstructions(
          key,
          universityName,
          facultyName,
          admissionPolicy,
          weaknessList,
        );
        const issueResult = await issueEphemeralToken(apiKey, { instructions, voice });
        return { key, voice, issueResult };
      }),
    );

    const successful = results
      .filter((r) => r.issueResult.token !== null)
      .map((r) => ({
        speaker: r.key,
        voice: r.voice,
        token: r.issueResult.token!.client_secret.value,
        expiresAt: r.issueResult.token!.client_secret.expires_at,
      }));

    if (successful.length < GD_SPEAKERS.length) {
      // 全話者分揃わなければフォールバック扱い
      const debug = results.flatMap((r) => r.issueResult.debugErrors);
      return NextResponse.json({
        rateLimited: false,
        error: "Realtime セッションの確立に失敗しました",
        partial: successful.length,
        debug,
      }, { status: 502 });
    }

    const usedModel = results[0].issueResult.model;

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
      model: usedModel,
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
  const voice = "alloy"; // 個人モードはニュートラルな alloy
  const issueResult = await issueEphemeralToken(apiKey, { instructions, voice });
  if (!issueResult.token) {
    return NextResponse.json(
      {
        error: "Realtime セッションの確立に失敗しました",
        debug: issueResult.debugErrors,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    mode,
    model: issueResult.model,
    tokens: [{
      speaker: "interviewer",
      voice,
      token: issueResult.token.client_secret.value,
      expiresAt: issueResult.token.client_secret.expires_at,
    }],
  });
}

/**
 * 汎用 OpenAI Realtime ephemeral token 発行エンドポイント。
 *
 * /api/interview/realtime-session が面接専用だったのに対し、こちらは
 * 自己分析・志望校マッチング・その他あらゆる音声チャット用途で
 * クライアントから instructions を直接渡してトークンを発行する汎用版。
 *
 * セキュリティ: authenticated student のみ。instructions はサーバー側で検閲しないが
 * ephemeral token は 60 秒しか有効でないためリプレイ攻撃のリスクは小さい。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";

// 自己分析・マッチング等の汎用音声チャット用。コスト重視で mini 系を優先。
// (面接 individual と違い、長時間使用される可能性があるため)
const REALTIME_MODEL_CANDIDATES = [
  "gpt-realtime-mini",
  "gpt-4o-mini-realtime-preview-2024-12-17",
  "gpt-realtime-1.5",
  "gpt-4o-realtime-preview-2024-12-17",
];

interface EphemeralTokenResponse {
  client_secret: { value: string; expires_at: number };
  id: string;
}

interface IssueResult {
  token: EphemeralTokenResponse | null;
  model?: string;
  debugErrors: Array<{ model: string; status: number; body: string }>;
}

async function issueEphemeralToken(
  apiKey: string,
  instructions: string,
  voice: string,
  transcriptionPrompt?: string,
): Promise<IssueResult> {
  const debugErrors: IssueResult["debugErrors"] = [];

  const transcriptionConfig: Record<string, unknown> = {
    model: "gpt-4o-mini-transcribe",
    language: "ja",
  };

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
          voice,
          instructions,
          input_audio_transcription: transcriptionConfig,
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
        return { token: data, model, debugErrors };
      }
      const body = await res.text().catch(() => "");
      console.warn(`[realtime/session] model ${model} failed: ${res.status} ${body.slice(0, 300)}`);
      debugErrors.push({ model, status: res.status, body: body.slice(0, 300) });
      if (res.status === 401 || res.status === 403) {
        return { token: null, debugErrors };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[realtime/session] model ${model} exception`, msg);
      debugErrors.push({ model, status: 0, body: msg });
    }
  }
  return { token: null, debugErrors };
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  let body: { instructions?: string; voice?: string; transcriptionHint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { instructions, voice = "alloy", transcriptionHint } = body;
  if (!instructions || typeof instructions !== "string") {
    return NextResponse.json({ error: "instructions は必須です" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません" },
      { status: 503 },
    );
  }

  const issueResult = await issueEphemeralToken(apiKey, instructions, voice, transcriptionHint);
  if (!issueResult.token) {
    return NextResponse.json(
      { error: "Realtime セッションの確立に失敗しました", debug: issueResult.debugErrors },
      { status: 502 },
    );
  }

  return NextResponse.json({
    model: issueResult.model,
    token: issueResult.token.client_secret.value,
    expiresAt: issueResult.token.client_secret.expires_at,
  });
}

/**
 * Gemini Live API 用の ephemeral auth token を発行する。
 *
 * OpenAI 版（../realtime-session/route.ts）と対になるエンドポイント。
 * クライアントはここで短命トークンを受け取り、@google/genai の ai.live.connect で
 * Gemini に直接 WebSocket 接続する（API キー本体はサーバーに留める）。
 *
 * - 個人/プレゼン/口頭試問: 1 セッション分のトークンを返す
 * - 集団討論 (GD): 6 話者分のトークンを並列発行して返す
 * - レート制限・文脈取得は OpenAI 版と同一ポリシー（共通の lastRealtimeAt を使う）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  GEMINI_LIVE_MODEL,
  GEMINI_INDIVIDUAL_VOICE,
  getGeminiClient,
  issueGeminiLiveToken,
} from "@/lib/interview/gemini-live-token";
import { checkRealtimeRateLimit } from "@/lib/interview/rate-limit";
import {
  buildRealtimeIndividualInstructions,
  buildRealtimeGdSpeakerInstructions,
  buildRealtimeGdSpeakerContextMessage,
  type GdSpeakerKey,
  type SelfAnalysisContext,
} from "@/lib/ai/prompts/interview-realtime";
import type { InterviewMode } from "@/lib/types/interview";
import type { InterviewTendency } from "@/lib/types/university";

/**
 * GD 6 話者構成（OpenAI 版の GD_SPEAKERS と同じ役割割当、voice は Gemini の prebuilt 名）。
 * Gemini Live native audio は 30 HD voices を持つ。話者を聞き分けられるよう別ボイスを割当。
 */
const GD_SPEAKERS: { key: GdSpeakerKey; voice: string }[] = [
  { key: "moderator", voice: "Charon" },
  { key: "professor_logic", voice: "Fenrir" },
  { key: "professor_practical", voice: "Orus" },
  { key: "peer_bold", voice: "Puck" },
  { key: "peer_careful", voice: "Aoede" },
  { key: "peer_creative", voice: "Zephyr" },
];

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  let body: {
    mode: InterviewMode;
    universityId?: string;
    facultyId?: string;
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

  const {
    mode,
    universityId,
    facultyId,
    universityName = "",
    facultyName = "",
    admissionPolicy = "",
    weaknessList = "（過去の弱点なし）",
    presentationContent,
  } = body;

  if (!mode) {
    return NextResponse.json({ error: "mode は必須です" }, { status: 400 });
  }

  // 面接傾向（interviewTendency）取得
  let interviewTendency: InterviewTendency | undefined;
  if (universityId && facultyId) {
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        const universityDoc = await adminDb.doc(`universities/${universityId}`).get();
        if (universityDoc.exists) {
          const universityData = universityDoc.data()!;
          const faculty = universityData.faculties?.find(
            (f: { id: string; interviewTendency?: InterviewTendency }) => f.id === facultyId,
          );
          if (faculty?.interviewTendency) interviewTendency = faculty.interviewTendency;
        }
      }
    } catch (err) {
      console.warn("[gemini-live-session] failed to fetch interviewTendency", err);
    }
  }

  // 自己分析データ取得
  let selfAnalysis: SelfAnalysisContext | undefined;
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const saDoc = await adminDb.doc(`selfAnalysis/${uid}`).get();
      if (saDoc.exists) {
        const sa = saDoc.data()!;
        selfAnalysis = {
          values: sa.values?.coreValues,
          strengths: sa.strengths?.strengths,
          vision: sa.vision?.longTermVision,
          selfStatement: sa.identity?.selfStatement,
        };
      }
    }
  } catch (err) {
    console.warn("[gemini-live-session] failed to fetch selfAnalysis", err);
  }

  // レートリミット（OpenAI 版と共通の lastRealtimeAt を使う）
  let lastRealtimeAt: Date | null = null;
  let realtimeUnlocked = false;
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const userDoc = await adminDb.doc(`users/${uid}`).get();
      const data = userDoc.data();
      if (data?.lastRealtimeAt?.toDate) lastRealtimeAt = data.lastRealtimeAt.toDate();
      if (data?.realtimeUnlocked === true) realtimeUnlocked = true;
    }
  } catch (err) {
    console.warn("[gemini-live-session] failed to read lastRealtimeAt", err);
  }

  const rate = checkRealtimeRateLimit(role, lastRealtimeAt, realtimeUnlocked);
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
  const ai = getGeminiClient(apiKey);

  const gdContextMessage =
    mode === "group_discussion"
      ? buildRealtimeGdSpeakerContextMessage(
          universityName,
          facultyName,
          admissionPolicy,
          weaknessList,
          interviewTendency,
        )
      : null;

  try {
    if (mode === "group_discussion") {
      // 6話者（no-mic・明示トリガで発話）＋「耳」セッション（mic・文字起こし専用）
      // 耳の instructions は最小限（返答音声は破棄するため何でもよいが、暴走しないよう端的に）
      const EARS_INSTRUCTIONS =
        "あなたは書記です。参加者の発言を聞き取るだけでよく、返答は不要です。求められたら「はい」とだけ言ってください。";
      const [results, earsToken] = await Promise.all([
        Promise.all(
          GD_SPEAKERS.map(async ({ key, voice }) => {
            const instructions = buildRealtimeGdSpeakerInstructions(key);
            const token = await issueGeminiLiveToken(ai, instructions, voice);
            return { speaker: key, voice, token };
          }),
        ),
        issueGeminiLiveToken(ai, EARS_INSTRUCTIONS, GEMINI_INDIVIDUAL_VOICE),
      ]);
      const successful = results
        .filter((r) => r.token !== null)
        .map((r) => ({ speaker: r.speaker, voice: r.voice, token: r.token!.value, expiresAt: r.token!.expiresAt }));

      if (successful.length < GD_SPEAKERS.length || !earsToken) {
        return NextResponse.json(
          { provider: "gemini", error: "Gemini Live セッションの確立に失敗しました", partial: successful.length },
          { status: 502 },
        );
      }

      if (!realtimeUnlocked) await updateLastRealtimeAt(uid, role);

      return NextResponse.json({
        provider: "gemini",
        mode: "group_discussion",
        model: GEMINI_LIVE_MODEL,
        tokens: successful,
        earsToken: { token: earsToken.value, expiresAt: earsToken.expiresAt },
        contextMessage: gdContextMessage,
      });
    }

    // 個人 / プレゼン / 口頭試問
    const instructions = buildRealtimeIndividualInstructions(
      mode,
      universityName,
      facultyName,
      admissionPolicy,
      weaknessList,
      interviewTendency,
      presentationContent,
      selfAnalysis,
    );
    const token = await issueGeminiLiveToken(ai, instructions, GEMINI_INDIVIDUAL_VOICE);
    if (!token) {
      return NextResponse.json(
        { provider: "gemini", error: "Gemini Live セッションの確立に失敗しました" },
        { status: 502 },
      );
    }

    if (!realtimeUnlocked) await updateLastRealtimeAt(uid, role);

    return NextResponse.json({
      provider: "gemini",
      mode,
      model: GEMINI_LIVE_MODEL,
      tokens: [{ speaker: "interviewer", voice: GEMINI_INDIVIDUAL_VOICE, token: token.value, expiresAt: token.expiresAt }],
    });
  } catch (err) {
    console.error("[gemini-live-session] token creation failed", err);
    return NextResponse.json(
      { provider: "gemini", error: "Gemini Live トークンの発行に失敗しました", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

/** OpenAI 版と同じく lastRealtimeAt を更新（管理者系はレート対象外） */
async function updateLastRealtimeAt(uid: string, role: string): Promise<void> {
  if (role === "admin" || role === "teacher" || role === "superadmin") return;
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { FieldValue } = await import("firebase-admin/firestore");
    if (adminDb) {
      await adminDb.doc(`users/${uid}`).update({ lastRealtimeAt: FieldValue.serverTimestamp() });
    }
  } catch (err) {
    console.warn("[gemini-live-session] failed to update lastRealtimeAt", err);
  }
}

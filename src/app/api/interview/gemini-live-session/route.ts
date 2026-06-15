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
import { GoogleGenAI, Modality } from "@google/genai";
import { requireRole } from "@/lib/api/auth";
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

/** ネイティブ音声モデル（env で差し替え可）。プレビュー系のため ID 変動前提。 */
const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-native-audio-preview-12-2025";

/** 個人モードの音声 */
const INDIVIDUAL_VOICE = "Kore";

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

/**
 * 1 トークンを発行する。session config（systemInstruction/voice/transcription/
 * resumption/compression）は liveConnectConstraints.config にサーバー側で封入する。
 */
async function issueGeminiToken(
  ai: GoogleGenAI,
  instructions: string,
  voice: string,
): Promise<{ value: string; expiresAt: number } | null> {
  const now = Date.now();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      liveConnectConstraints: {
        model: GEMINI_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: instructions }] },
          speechConfig: {
            languageCode: "ja-JP",
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          // 採点（Claude）が会話テキスト依存なので入出力とも文字起こしを有効化
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          // 長時間面接対策: 接続10分/音声15分の上限を resumption + 圧縮で吸収
          sessionResumption: {},
          contextWindowCompression: { slidingWindow: {} },
        },
      },
      httpOptions: { apiVersion: "v1alpha" },
    },
  });
  if (!token.name) return null;
  return { value: token.name, expiresAt: Date.parse(expireTime) };
}

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
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });

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
      const results = await Promise.all(
        GD_SPEAKERS.map(async ({ key, voice }) => {
          const instructions = buildRealtimeGdSpeakerInstructions(key);
          const token = await issueGeminiToken(ai, instructions, voice);
          return { speaker: key, voice, token };
        }),
      );
      const successful = results
        .filter((r) => r.token !== null)
        .map((r) => ({ speaker: r.speaker, voice: r.voice, token: r.token!.value, expiresAt: r.token!.expiresAt }));

      if (successful.length < GD_SPEAKERS.length) {
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
    const token = await issueGeminiToken(ai, instructions, INDIVIDUAL_VOICE);
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
      tokens: [{ speaker: "interviewer", voice: INDIVIDUAL_VOICE, token: token.value, expiresAt: token.expiresAt }],
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

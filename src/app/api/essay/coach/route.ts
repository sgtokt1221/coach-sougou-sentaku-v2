import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  buildEssayCoachSystemPrompt,
  type CoachSelfAnalysis,
} from "@/lib/ai/prompts/essay-coach";
import type {
  CoachMessage,
  CoachRequestBody,
  CoachResponseBody,
  CoachThread,
} from "@/lib/types/essay-coach";
import type { Activity } from "@/lib/types/activity";

export const maxDuration = 60;

const MAX_DRAFT_CHARS = 8000;
const MAX_HISTORY_TURNS = 10;
const MAX_ACTIVITIES = 5;

function truncateDraft(s: string): string {
  if (!s) return "";
  return s.length > MAX_DRAFT_CHARS ? s.slice(0, MAX_DRAFT_CHARS) : s;
}

function buildDraftSnapshot(s: string): string {
  if (!s) return "";
  if (s.length <= 1100) return s;
  return `${s.slice(0, 500)}\n\n……\n\n${s.slice(-500)}`;
}

function activitySummary(a: Activity): string {
  if (a.structuredData) {
    const sd = a.structuredData;
    const parts: string[] = [];
    if (sd.motivation) parts.push(`動機: ${sd.motivation}`);
    if (sd.actions?.length) parts.push(`行動: ${sd.actions.join("、")}`);
    if (sd.results?.length) parts.push(`結果: ${sd.results.join("、")}`);
    if (sd.learnings?.length) parts.push(`学び: ${sd.learnings.join("、")}`);
    return parts.join(" / ");
  }
  return a.description ?? "";
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const body = (await request.json().catch(() => null)) as CoachRequestBody | null;
  if (
    !body ||
    typeof body.userMessage !== "string" ||
    body.userMessage.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "userMessage は必須です" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI 機能は現在利用できません", available: false },
      { status: 503 }
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const draft = truncateDraft(body.draft ?? "");
  const topic = (body.topic ?? "").trim();
  const universityId = body.universityId?.trim();
  const facultyId = body.facultyId?.trim();

  // スレッド取得 or 新規作成
  const threadsCol = adminDb.collection(`users/${uid}/essayCoachThreads`);
  let threadDocRef = body.threadId
    ? threadsCol.doc(body.threadId)
    : threadsCol.doc();
  let existing: CoachThread | null = null;
  if (body.threadId) {
    const snap = await threadDocRef.get();
    if (snap.exists) {
      existing = snap.data() as CoachThread;
      // 他生徒のスレッドに干渉できないよう ownership 確認
      if (existing.studentId && existing.studentId !== uid) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    } else {
      // 指定 id が無ければ新規採番 (クライアントに同じ id を返す)
      threadDocRef = threadsCol.doc();
      existing = null;
    }
  }

  // 大学 AP 取得
  let admissionPolicy: string | undefined;
  let universityName: string | undefined;
  let facultyName: string | undefined;
  if (universityId) {
    try {
      const uniSnap = await adminDb.doc(`universities/${universityId}`).get();
      if (uniSnap.exists) {
        const uni = uniSnap.data() as {
          name?: string;
          faculties?: Array<{
            id: string;
            name?: string;
            admissionPolicy?: string;
          }>;
        };
        universityName = uni.name;
        const fac = uni.faculties?.find((f) => f.id === facultyId);
        if (fac) {
          facultyName = fac.name;
          admissionPolicy = fac.admissionPolicy;
        }
      }
    } catch (err) {
      console.warn("[essay/coach] university fetch failed:", err);
    }
  }

  // 活動実績取得 (最大 5 件、structuredData あり優先)
  let activities: Array<{ title: string; category?: string; summary: string }> = [];
  try {
    const snap = await adminDb.collection(`users/${uid}/activities`).get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Activity);
    all.sort((a, b) => {
      const ha = a.structuredData ? 0 : 1;
      const hb = b.structuredData ? 0 : 1;
      return ha - hb;
    });
    activities = all.slice(0, MAX_ACTIVITIES).map((a) => ({
      title: a.title,
      category: a.category,
      summary: activitySummary(a),
    }));
  } catch (err) {
    console.warn("[essay/coach] activities fetch failed:", err);
  }

  // 自己分析取得 (matching/chat と同じパターン)
  let selfAnalysis: CoachSelfAnalysis | undefined;
  try {
    const saSnap = await adminDb.doc(`selfAnalysis/${uid}`).get();
    if (saSnap.exists) {
      const sa = saSnap.data() as {
        values?: { coreValues?: string[]; valueOrigins?: string[] };
        strengths?: { strengths?: string[] };
        interests?: { fields?: string[] };
        vision?: { longTermVision?: string };
        identity?: { selfStatement?: string };
      };
      selfAnalysis = {
        coreValues: sa.values?.coreValues,
        valueOrigins: sa.values?.valueOrigins,
        strengths: sa.strengths?.strengths,
        interests: sa.interests?.fields,
        longTermVision: sa.vision?.longTermVision,
        selfStatement: sa.identity?.selfStatement,
      };
    }
  } catch (err) {
    console.warn("[essay/coach] selfAnalysis fetch failed:", err);
  }

  // 履歴 + 新規 user メッセージ
  const now = new Date().toISOString();
  const historyMessages: CoachMessage[] = existing?.messages ?? [];
  const trimmedHistory = historyMessages.slice(-MAX_HISTORY_TURNS * 2);
  const userMsg: CoachMessage = {
    role: "user",
    content: body.userMessage.trim(),
    at: now,
  };
  const turnCount = Math.floor(trimmedHistory.length / 2) + 1;

  const systemPrompt = buildEssayCoachSystemPrompt({
    topic,
    admissionPolicy,
    universityName,
    facultyName,
    activities,
    selfAnalysis,
    draft,
    turnCount,
  });

  // Claude 呼び出し
  let reply = "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        ...trimmedHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: userMsg.content },
      ],
    });
    reply =
      response.content[0]?.type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("[essay/coach] Claude call failed:", err);
    return NextResponse.json(
      { error: "AI 応答に失敗しました" },
      { status: 500 }
    );
  }

  if (!reply.trim()) {
    return NextResponse.json(
      { error: "AI が応答を生成できませんでした" },
      { status: 500 }
    );
  }

  const assistantMsg: CoachMessage = {
    role: "assistant",
    content: reply.trim(),
    at: new Date().toISOString(),
  };

  // スレッド upsert
  const nextMessages = [...historyMessages, userMsg, assistantMsg];
  const threadDoc: CoachThread = {
    id: threadDocRef.id,
    studentId: uid,
    topic,
    universityId: universityId || undefined,
    facultyId: facultyId || undefined,
    universityName,
    facultyName,
    messages: nextMessages,
    draftLength: draft.length,
    draftSnapshot: buildDraftSnapshot(draft),
    createdAt: existing?.createdAt ?? now,
    updatedAt: new Date().toISOString(),
  };
  // undefined フィールドを削除 (Firestore は undefined を拒否)
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(threadDoc)) {
    if (v !== undefined) clean[k] = v;
  }
  await threadDocRef.set(clean);

  const resBody: CoachResponseBody = {
    threadId: threadDocRef.id,
    reply: assistantMsg.content,
  };
  return NextResponse.json(resBody);
}

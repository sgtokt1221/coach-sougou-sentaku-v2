import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import { buildParentSummaryPrompt } from "@/lib/ai/prompts/parent-summary";
import type { Session } from "@/lib/types/session";

const SESSION_TYPE_LABEL: Record<string, string> = {
  coaching: "個別コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "面談",
  group_review: "グループ添削",
};

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI 機能は現在利用できません" },
      { status: 503 },
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  if (!session.debrief?.notes || session.debrief.notes.trim().length === 0) {
    return NextResponse.json(
      { error: "先に気づきメモを入力してください" },
      { status: 400 },
    );
  }

  const systemPrompt = buildParentSummaryPrompt({
    studentName: session.studentName || "生徒",
    sessionType: SESSION_TYPE_LABEL[session.type] ?? "授業",
    sessionDate: session.scheduledAt.slice(0, 10),
    prepGoal: session.prepPlan?.goal,
    debriefNotes: session.debrief.notes,
    nextAgendaSeed: session.debrief.nextAgendaSeed,
  });

  let text = "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: "user", content: "保護者向け文面を 150-250 字で書いてください。" },
      ],
    });
    text = resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";
  } catch (err) {
    console.error("[parent-summary] Claude call failed:", err);
    return NextResponse.json({ error: "AI 生成に失敗しました" }, { status: 500 });
  }

  if (!text) {
    return NextResponse.json({ error: "AI レスポンスが空でした" }, { status: 500 });
  }

  await ref.set(
    {
      debrief: {
        ...(session.debrief ?? {}),
        parentSummary: text,
        capturedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return NextResponse.json({ parentSummary: text });
}

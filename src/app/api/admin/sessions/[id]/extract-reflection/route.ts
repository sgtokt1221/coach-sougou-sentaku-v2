import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import { buildLessonReflectionPrompt } from "@/lib/ai/prompts/lesson-reflection";
import { extractJsonObject } from "@/lib/ai/extract-json";
import type { Session, LessonDebrief, SessionSummary } from "@/lib/types/session";
import { generateSessionSummary } from "@/lib/ai/generate-session-summary";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";

// 振り返りと報告書の2つを AI で作る
export const maxDuration = 120;

/**
 * POST /api/admin/sessions/[id]/extract-reflection
 *
 * 授業記録 (lessonTranscript) から AI で反省点/課題・次回やること・新弱点を抽出し、
 * debrief に下書き保存する。録音終了フローから自動で呼ばれる。
 * - reflectionPoints: 常に AI 結果で更新
 * - nextAgendaSeed / newWeaknessAreas: 空のときのみ下書き (講師の手編集を尊重)
 *
 * 生徒に見せる指導報告書 (summary) も同じ文字起こしから並行して下書きする。
 * 講師が保存した報告書 (source: "teacher") は上書きしない。
 */
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

  const transcript =
    session.lessonTranscript?.fullText?.trim() ||
    session.debrief?.notes?.trim() ||
    "";
  if (!transcript) {
    return NextResponse.json(
      { error: "文字起こし (授業記録) がありません" },
      { status: 400 },
    );
  }

  const systemPrompt = buildLessonReflectionPrompt({
    studentName: session.studentName || "生徒",
    lessonGoal: session.prepPlan?.goal,
    transcript,
  });

  const keepTeacherSummary = session.summary?.source === "teacher";
  const summaryPromise: Promise<SessionSummary | null> = keepTeacherSummary
    ? Promise.resolve(null)
    : generateSessionSummary({
        transcript: session.lessonTranscript?.fullText,
        notes: session.notes,
        type: session.type,
      }).catch((err) => {
        console.error("[extract-reflection] summary failed:", err);
        return null;
      });

  let parsed: {
    reflectionPoints?: string[];
    nextAgendaSeed?: string;
    newWeaknessAreas?: string[];
  } | null = null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: AI_MODEL_SONNET,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: "JSON のみを出力してください。" }],
    });
    const rawText = resp.content[0]?.type === "text" ? resp.content[0].text : "";
    const jsonStr = extractJsonObject(rawText);
    if (jsonStr) parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error("[extract-reflection] AI call failed:", err);
    return NextResponse.json({ error: "反省点の抽出に失敗しました" }, { status: 500 });
  }

  if (!parsed) {
    return NextResponse.json(
      { error: "AI レスポンスの解析に失敗しました" },
      { status: 500 },
    );
  }

  const clean = (v: unknown, maxItems: number, maxLen: number): string[] =>
    Array.isArray(v)
      ? v
          .map((x) => String(x).trim())
          .filter((x) => x.length > 0)
          .map((x) => x.slice(0, maxLen))
          .slice(0, maxItems)
      : [];

  const existing: Partial<LessonDebrief> = session.debrief ?? {};
  const reflectionPoints = clean(parsed.reflectionPoints, 6, 300);
  const newWeaknessAreas =
    existing.newWeaknessAreas && existing.newWeaknessAreas.length > 0
      ? existing.newWeaknessAreas
      : clean(parsed.newWeaknessAreas, 6, 100);
  const nextAgendaSeed =
    existing.nextAgendaSeed && existing.nextAgendaSeed.trim().length > 0
      ? existing.nextAgendaSeed
      : (typeof parsed.nextAgendaSeed === "string"
          ? parsed.nextAgendaSeed.slice(0, 1000)
          : "");

  const debrief: LessonDebrief = {
    notes: existing.notes ?? "",
    newWeaknessAreas,
    nextAgendaSeed,
    reflectionPoints,
    capturedAt: new Date().toISOString(),
  };

  // 生成に失敗すると空の報告書が返る。空で前の報告書を消さない
  const generated = await summaryPromise;
  const summary: SessionSummary | null =
    generated && generated.overview.trim()
      ? { ...generated, source: "ai" }
      : null;

  await ref.set(
    {
      debrief,
      ...(summary ? { summary } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return NextResponse.json({ debrief, summary });
}

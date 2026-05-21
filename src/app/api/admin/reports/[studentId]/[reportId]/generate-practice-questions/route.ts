import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildPracticeQuestionsPrompt } from "@/lib/ai/prompts/practice-questions";
import type { PracticeQuestion } from "@/lib/types/growth-report";

/**
 * POST /api/admin/reports/[studentId]/[reportId]/generate-practice-questions
 *
 * 既存の成長レポートに対し、AI で類題を後追い生成して practiceQuestions
 * フィールドだけ更新する。レポート本体や統計値には触らない。
 *
 * 古い (類題機能リリース前の) レポートや、AI が一度空を返した場合に
 * 「再生成」ボタンとして使う想定。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; reportId: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  let step = "start";

  try {
    step = "resolve_params";
    const { studentId, reportId } = await params;

    step = "init_check";
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firestore に接続できません", detail: "adminDb is not initialized", step },
        { status: 500 }
      );
    }

    step = "check_student_permission";
    const userDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    if (role !== "superadmin" && userData.managedBy !== uid) {
      return NextResponse.json(
        { error: "この生徒へのアクセス権がありません" },
        { status: 403 }
      );
    }

    step = "fetch_report";
    const reportRef = adminDb.doc(
      `users/${studentId}/growthReports/${reportId}`
    );
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
      return NextResponse.json(
        { error: "レポートが見つかりません" },
        { status: 404 }
      );
    }

    step = "check_api_key";
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "AI 機能は現在利用できません",
          detail: "ANTHROPIC_API_KEY is not set",
          step,
        },
        { status: 503 }
      );
    }

    step = "collect_context";
    // 弱点 / 過去テーマ / 過去面接質問を Firestore から収集
    const weaknessesSnap = await adminDb
      .collection(`users/${studentId}/weaknesses`)
      .get();
    const weaknessAreas = weaknessesSnap.docs
      .map((d) => (d.data() as { area?: string }).area)
      .filter((a): a is string => !!a && a.length > 0)
      .slice(0, 5);

    const essaysSnap = await adminDb
      .collection("essays")
      .where("userId", "==", studentId)
      .limit(30)
      .get()
      .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));
    const pastEssayTopics = essaysSnap.docs
      .map((d) => (d.data() as { topic?: string }).topic)
      .filter((t): t is string => !!t && t.length > 0)
      .slice(0, 10);

    const interviewsSnap = await adminDb
      .collection("interviews")
      .where("userId", "==", studentId)
      .limit(20)
      .get()
      .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));
    const pastInterviewQuestions: string[] = [];
    interviewsSnap.docs.forEach((d) => {
      const data = d.data() as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      data.messages
        ?.filter((m) => m?.role === "assistant" || m?.role === "ai")
        .forEach((m) => {
          const q = m.content?.split("\n")[0]?.slice(0, 80);
          if (q) pastInterviewQuestions.push(q);
        });
    });

    console.log(
      `[reports/generate-practice-questions] context for ${studentId}: weaknesses=${weaknessAreas.length} essayTopics=${pastEssayTopics.length} interviewQs=${pastInterviewQuestions.length}`,
    );

    step = "call_ai";
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const systemPrompt = buildPracticeQuestionsPrompt({
      studentName: userData.displayName ?? "生徒",
      weaknesses: weaknessAreas,
      pastEssayTopics,
      pastInterviewQuestions: pastInterviewQuestions.slice(0, 10),
    });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: "JSON のみを出力してください。" }],
    });
    const text =
      resp.content[0]?.type === "text" ? resp.content[0].text : "";

    step = "parse_ai_response";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        {
          error: "AI からの応答を解析できませんでした",
          detail: `response length=${text.length}, no JSON match`,
          step,
        },
        { status: 500 }
      );
    }
    const parsed = JSON.parse(match[0]) as {
      essayQuestions?: Array<Partial<PracticeQuestion>>;
      interviewQuestions?: Array<Partial<PracticeQuestion>>;
    };
    const now = Date.now();

    // undefined フィールドを Firestore に渡さないよう、条件付きで構築する
    const buildQuestion = (
      q: Partial<PracticeQuestion>,
      type: "essay" | "interview",
      idPrefix: string,
      i: number,
    ): PracticeQuestion => {
      const obj: PracticeQuestion = {
        id: q.id || `${idPrefix}_${now}_${i}`,
        type,
        title: q.title ?? "",
      };
      if (q.relatedWeakness) obj.relatedWeakness = q.relatedWeakness;
      if (q.relatedPastTopic) obj.relatedPastTopic = q.relatedPastTopic;
      return obj;
    };

    const combined: PracticeQuestion[] = [
      ...(parsed.essayQuestions ?? []).map((q, i) => buildQuestion(q, "essay", "pq_e", i)),
      ...(parsed.interviewQuestions ?? []).map((q, i) => buildQuestion(q, "interview", "pq_i", i)),
    ]
      .filter((q) => q.title.length > 0)
      .slice(0, 8);

    if (combined.length === 0) {
      return NextResponse.json(
        {
          error: "AI が類題を生成できませんでした (空配列)",
          detail:
            "プロンプトを見直すか、データ (弱点/過去テーマ) を増やしてください",
          step,
        },
        { status: 500 }
      );
    }

    step = "save_practice_questions";
    await reportRef.update({
      practiceQuestions: combined,
      editedBy: uid,
      editedAt: new Date().toISOString(),
    });

    step = "fetch_updated";
    const updatedSnap = await reportRef.get();
    return NextResponse.json({ id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error) {
    console.error(
      `[reports/generate-practice-questions] step=${step} error:`,
      error,
    );
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "類題の生成に失敗しました", detail, step },
      { status: 500 }
    );
  }
}

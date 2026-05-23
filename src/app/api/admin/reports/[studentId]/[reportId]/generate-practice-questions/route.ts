import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildPracticeQuestionsPrompt } from "@/lib/ai/prompts/practice-questions";
import type { PracticeQuestion } from "@/lib/types/growth-report";
import {
  computeThisWeekWeakItems,
  extractInterviewAssistantQuestions,
  buildPracticeQuestionsFromJson,
} from "@/lib/growth/practice-questions-helpers";
import { getPeriodRange } from "@/lib/growth/report";
import { queryWithRangeFilter } from "@/lib/admin/firestore-range-query";
import { loadStudentContext } from "@/lib/growth/student-context";
import { toDateSafe } from "@/lib/firebase/timestamp";

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
    // 既存レポートから期間を再構築 (today を基準にすると古いレポートでは今週がズレるため)
    // startDate / endDate の保存形式は Firestore Timestamp / Date / ISO string が混在しうるため
    // toDateSafe 経由で全形式に対応する。
    const reportData = reportSnap.data() as {
      period?: "weekly" | "monthly";
      startDate?: unknown;
      endDate?: unknown;
    };
    const period = reportData.period ?? "weekly";
    const sd = toDateSafe(reportData.startDate);
    const ed = toDateSafe(reportData.endDate);
    let startDate: Date;
    let endDate: Date;
    if (sd && ed) {
      startDate = sd;
      endDate = ed;
    } else {
      const range = getPeriodRange(period);
      startDate = range.start;
      endDate = range.end;
    }

    const weaknessesSnap = await adminDb
      .collection(`users/${studentId}/weaknesses`)
      .get();
    const chronicWeaknesses = weaknessesSnap.docs
      .map((d) => (d.data() as { area?: string }).area)
      .filter((a): a is string => !!a && a.length > 0)
      .slice(0, 5);

    // 今週 essay (期間内のみ): submittedAt で抽出して通常生成 (generate/route.ts) と揃える
    const periodEssaysSnap = await queryWithRangeFilter(
      adminDb.collection("essays"),
      "userId",
      studentId,
      "submittedAt",
      startDate,
      endDate,
    );

    // 過去 essay (期間外、重複回避用) — 同様に submittedAt 基準で「期間外」を判定
    const allEssaysSnap = await adminDb
      .collection("essays")
      .where("userId", "==", studentId)
      .limit(30)
      .get()
      .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));
    const startMs = startDate.getTime();
    const pastEssayDocs = allEssaysSnap.docs.filter((d) => {
      const data = d.data() as { submittedAt?: FirebaseFirestore.Timestamp };
      const ts = data.submittedAt?.toMillis?.();
      return typeof ts === "number" && ts < startMs;
    });

    const thisWeekEssayTopics = periodEssaysSnap.docs
      .map((d) => (d.data() as { topic?: string }).topic)
      .filter((t): t is string => !!t && t.length > 0)
      .slice(0, 5);
    const pastEssayTopics = pastEssayDocs
      .map((d) => (d.data() as { topic?: string }).topic)
      .filter((t): t is string => !!t && t.length > 0)
      .slice(0, 5);

    const thisWeekWeakItems = computeThisWeekWeakItems(periodEssaysSnap.docs);

    // 今週 interview: startedAt で抽出して通常生成 (generate/route.ts) と揃える
    const periodInterviewsSnap = await queryWithRangeFilter(
      adminDb.collection("interviews"),
      "userId",
      studentId,
      "startedAt",
      startDate,
      endDate,
    );
    const thisWeekInterviewQuestions = extractInterviewAssistantQuestions(
      periodInterviewsSnap.docs,
      5,
    );

    step = "load_student_context";
    const studentContext = await loadStudentContext(adminDb, studentId);

    console.log(
      `[reports/generate-practice-questions] context for ${studentId}: thisWeekWeakItems=${thisWeekWeakItems.length} thisWeekTopics=${thisWeekEssayTopics.length} thisWeekInterviews=${thisWeekInterviewQuestions.length} chronicWeaknesses=${chronicWeaknesses.length} pastTopics=${pastEssayTopics.length} targets=${studentContext.primaryTargets.length} hasSelfAnalysis=${!!studentContext.selfAnalysis} mbti=${studentContext.mbtiType ?? "none"} activities=${studentContext.recentActivities.length} certs=${studentContext.englishCerts.length}`,
    );

    step = "call_ai";
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const systemPrompt = buildPracticeQuestionsPrompt({
      studentName: userData.displayName ?? "生徒",
      thisWeekWeakItems,
      thisWeekEssayTopics,
      thisWeekInterviewQuestions,
      chronicWeaknesses,
      pastEssayTopics,
      studentContext,
    });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3500,
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
      primaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
      secondaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
    };

    const combined = buildPracticeQuestionsFromJson(parsed);

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

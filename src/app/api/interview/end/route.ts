import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildInterviewEvaluationPrompt } from "@/lib/ai/prompts/interview";
import type {
  InterviewEndRequest,
  InterviewEndResponse,
  InterviewScores,
  InterviewFeedback,
} from "@/lib/types/interview";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";
import type { WeaknessRecord } from "@/lib/types/growth";
import { logInterviewSession } from "@/lib/bigquery/logger";
import { logActivity } from "@/lib/firebase/activity-log";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body: InterviewEndRequest & { mode?: string; presentationContent?: string } = await request.json();
    const { sessionId, messages, duration, transcription, voiceAnalysis, videoAnalysis, appearanceAnalysis, mode, presentationContent } = body;

    // IDトークンからuserIdを取得
    let userId: string | null = body.userId ?? null;
    if (!userId) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { adminAuth } = await import("@/lib/firebase/admin");
          if (adminAuth) {
            const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
            userId = decoded.uid;
          } else {
            console.warn("[interview/end] adminAuth is null — Firebase Admin SDK not initialized");
          }
        } catch (authErr) {
          console.warn("[interview/end] Failed to verify ID token:", authErr);
        }
      } else {
        console.warn("[interview/end] No Authorization header found");
      }
    }
    console.log("[interview/end] Resolved userId:", userId);

    if (!sessionId || !messages || duration === undefined) {
      return NextResponse.json(
        { error: "sessionId, messages, duration は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      );
    }

    let existingWeaknesses: WeaknessRecord[] = [];
    let universityName = "（大学名未設定）";
    let facultyName = "（学部名未設定）";
    let admissionPolicy = "（AP未設定）";
    let selfAnalysisContext = "";
    let sessionUniversityId = "";
    let sessionFacultyId = "";
    let sessionMode = mode ?? "";

    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      try {
        // セッション情報から大学コンテキストを取得
        const sessionDoc = await adminDb.doc(`interviews/${sessionId}`).get();
        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data()!;
          sessionUniversityId = sessionData.universityId ?? "";
          sessionFacultyId = sessionData.facultyId ?? "";
          if (!sessionMode) sessionMode = sessionData.mode ?? "";
          const ctx = sessionData.universityContext;
          if (ctx) {
            universityName = ctx.universityName ?? universityName;
            facultyName = ctx.facultyName ?? facultyName;
            admissionPolicy = ctx.admissionPolicy ?? admissionPolicy;
          }
        }

        if (userId) {
          const weaknessDocs = await adminDb.collection(`users/${userId}/weaknesses`).where("resolved", "==", false).get();
          if (!weaknessDocs.empty) {
            existingWeaknesses = weaknessDocs.docs.map((d) => {
              const w = d.data();
              return {
                area: w.area,
                count: w.count,
                firstOccurred: w.firstOccurred?.toDate() ?? new Date(),
                lastOccurred: w.lastOccurred?.toDate() ?? new Date(),
                improving: w.improving ?? false,
                resolved: w.resolved ?? false,
                source: w.source ?? "interview",
                reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
              } satisfies WeaknessRecord;
            });
          }

          // 自己分析データ取得
          try {
            const saDoc = await adminDb.doc(`selfAnalysis/${userId}`).get();
            if (saDoc.exists) {
              const sa = saDoc.data()!;
              const parts: string[] = [];
              if (sa.values?.coreValues) parts.push(`価値観: ${sa.values.coreValues.join("、")}`);
              if (sa.strengths?.strengths) parts.push(`強み: ${sa.strengths.strengths.join("、")}`);
              if (sa.strengths?.evidences) parts.push(`強みの根拠: ${sa.strengths.evidences.join(" / ")}`);
              if (sa.weaknesses?.weaknesses) parts.push(`課題: ${sa.weaknesses.weaknesses.join("、")}`);
              if (sa.weaknesses?.growthStories) parts.push(`克服エピソード: ${sa.weaknesses.growthStories.join(" / ")}`);
              if (sa.interests?.fields) parts.push(`関心分野: ${sa.interests.fields.join("、")}`);
              if (sa.vision?.shortTermGoal) parts.push(`短期目標: ${sa.vision.shortTermGoal}`);
              if (sa.vision?.longTermVision) parts.push(`長期ビジョン: ${sa.vision.longTermVision}`);
              if (sa.identity?.selfStatement) parts.push(`自己像: ${sa.identity.selfStatement}`);
              if (sa.identity?.apConnection) parts.push(`AP接続: ${sa.identity.apConnection}`);
              if (parts.length > 0) {
                selfAnalysisContext = parts.join("\n");
              }
            }
          } catch {
            // 自己分析データなくても続行
          }
        }
      } catch (err) {
        console.warn("Failed to fetch data from Firestore:", err);
      }
    }

    const client = new Anthropic();

    // 会話をテキスト形式に変換
    const conversationText = messages
      .map((m) => `${m.role === "ai" ? "面接官" : "受験生"}: ${m.content}`)
      .join("\n");

    const evaluationPrompt = buildInterviewEvaluationPrompt(universityName, facultyName, admissionPolicy, mode, presentationContent);

    const selfAnalysisSection = selfAnalysisContext
      ? `\n\n## この生徒の自己分析データ（面接前に本人が整理した内容）\n${selfAnalysisContext}\n\n※ 上記の自己分析を踏まえて、「面接でこう答えるべきだった」「自己分析のこの強みをもっと活かすべきだった」等の具体的なアドバイスをimprovementsに含めてください。`
      : "";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${evaluationPrompt}${selfAnalysisSection}\n\n## 面接会話記録\n\n${conversationText}`,
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error("Could not parse AI evaluation response:", rawText);
      return NextResponse.json(
        { error: "AI評価結果のパースに失敗しました", rawResponse: rawText.slice(0, 500) },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const bodyLanguageScore = videoAnalysis?.overallVideoScore ?? 0;
    const scores: InterviewScores = {
      clarity: parsed.scores.clarity,
      apAlignment: parsed.scores.apAlignment,
      enthusiasm: parsed.scores.enthusiasm,
      specificity: parsed.scores.specificity,
      bodyLanguage: Math.round(bodyLanguageScore * 10) / 10,
      total: parsed.scores.clarity + parsed.scores.apAlignment + parsed.scores.enthusiasm + parsed.scores.specificity + Math.round(bodyLanguageScore * 10) / 10,
    };

    const feedback: InterviewFeedback = {
      overall: parsed.feedback.overall,
      goodPoints: parsed.feedback.goodPoints ?? [],
      improvements: parsed.feedback.improvements ?? [],
      repeatedIssues: parsed.feedback.repeatedIssues ?? [],
      improvementsSinceLast: parsed.feedback.improvementsSinceLast ?? [],
    };

    // 会話分析サマリー
    const conversationSummary = parsed.conversationSummary ?? {
      keyWeaknesses: [],
      strongPoints: [],
      criticalMoments: [],
      nextFocusAreas: [],
    };

    // 弱点タグを抽出（会話内容）
    const weaknessTags: string[] = [
      ...feedback.repeatedIssues.map((issue) => issue.area),
      ...feedback.improvements,
    ];

    // VideoAnalysis → 弱点タグ
    if (videoAnalysis) {
      if (videoAnalysis.eyeContactRate < 40) weaknessTags.push("視線が散漫");
      if (videoAnalysis.smileRate < 10) weaknessTags.push("表情が硬い");
      if (videoAnalysis.positionStability < 0.5) weaknessTags.push("姿勢が不安定");
      if (videoAnalysis.avgHeadTilt > 10) weaknessTags.push("首が傾きがち");
      if (videoAnalysis.nodRate < 2) weaknessTags.push("うなずきが少��い");
    }

    // AppearanceAnalysis → 弱点タグ（critical/warningのみ���
    if (appearanceAnalysis?.issues) {
      for (const issue of appearanceAnalysis.issues) {
        if (issue.severity === "critical" || issue.severity === "warning") {
          weaknessTags.push(`身だしなみ: ${issue.description}`);
        }
      }
    }

    const updatedWeaknesses = updateWeaknessRecords(existingWeaknesses, weaknessTags);
    const growthEvents = analyzeGrowth(weaknessTags, existingWeaknesses);

    if (scores.total >= 40) {
      growthEvents.unshift({
        type: "praise",
        area: "overall",
        message: "素晴らしい面接でした！全体的に高いレベルの回答ができています。",
      });
    }

    if (adminDb) {
      try {
        const { FieldValue } = await import("firebase-admin/firestore");
        await adminDb.doc(`interviews/${sessionId}`).update({
          scores,
          feedback,
          conversationSummary,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          weaknessTags,
          duration,
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          ...(transcription ? { transcription } : {}),
          ...(voiceAnalysis ? { voiceAnalysis } : {}),
          ...(videoAnalysis ? { videoAnalysis } : {}),
          ...(appearanceAnalysis ? { appearanceAnalysis } : {}),
        });

        if (userId) {
          for (const weakness of updatedWeaknesses) {
            await adminDb.doc(`users/${userId}/weaknesses/${weakness.area}`).set(
              {
                area: weakness.area,
                count: weakness.count,
                firstOccurred: weakness.firstOccurred,
                lastOccurred: weakness.lastOccurred,
                improving: weakness.improving,
                resolved: weakness.resolved,
                source: "interview",
                reminderDismissedAt: weakness.reminderDismissedAt,
              },
              { merge: true }
            );
          }
        }
      } catch (err) {
        console.warn("Failed to save interview results to Firestore:", err);
      }
    }

    // BigQueryログ（非同期 fire-and-forget）
    void logInterviewSession({
      interview_id: sessionId,
      user_id: userId ?? "unknown",
      university_id: sessionUniversityId,
      faculty_id: sessionFacultyId,
      started_at: new Date().toISOString(),
      duration_seconds: duration,
      mode: sessionMode,
      score_clarity: scores.clarity,
      score_ap_alignment: scores.apAlignment,
      score_enthusiasm: scores.enthusiasm,
      score_specificity: scores.specificity,
      score_total: scores.total,
      weakness_tags: weaknessTags,
      question_count: messages.filter((m) => m.role === "ai").length,
    });

    // Activity log
    let studentDisplayName = "不明";
    if (userId) {
      try {
        const { adminDb: aDb } = await import("@/lib/firebase/admin");
        if (aDb) {
          const userDoc = await aDb.doc(`users/${userId}`).get();
          studentDisplayName = userDoc.data()?.displayName ?? "不明";
        }
      } catch { /* ignore */ }
    }
    void logActivity("interview_complete", "模擬面接を完了しました", {
      studentName: studentDisplayName,
    });

    return NextResponse.json({
      interviewId: sessionId,
      scores,
      feedback,
      conversationSummary,
      growthEvents,
      ...(voiceAnalysis ? { voiceAnalysis } : {}),
      ...(videoAnalysis ? { videoAnalysis } : {}),
      ...(appearanceAnalysis ? { appearanceAnalysis } : {}),
      ...(transcription ? { transcription } : {}),
    });
  } catch (error) {
    console.error("Interview end error:", error);
    return NextResponse.json(
      { error: "面接終了処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

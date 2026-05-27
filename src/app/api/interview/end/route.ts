import { NextRequest, NextResponse } from "next/server";
import type {
  InterviewEndRequest,
  InterviewScores,
  InterviewFeedback,
} from "@/lib/types/interview";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";
import { categorizeWeakness } from "@/lib/growth/weakness-category";
import type { WeaknessRecord } from "@/lib/types/growth";
import { logInterviewSession } from "@/lib/bigquery/logger";
import { logActivity } from "@/lib/firebase/activity-log";
import {
  scoreInterviewCore,
  InterviewScoreParseError,
} from "@/lib/interview/score-core";

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
          }
        } catch (authErr) {
          console.warn("[interview/end] Failed to verify ID token:", authErr);
        }
      }
      // dev mode fallback
      if (!userId && process.env.NODE_ENV === "development") {
        const devRole = request.headers.get("X-Dev-Role");
        if (devRole) userId = "dev-user";
      }
    }

    if (!sessionId || !messages || duration === undefined) {
      return NextResponse.json(
        { error: "sessionId, messages, duration は必須です" },
        { status: 400 }
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
    let homeworkAssignmentIdFromSession: string | undefined;

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
          if (typeof sessionData.homeworkAssignmentId === "string") {
            homeworkAssignmentIdFromSession = sessionData.homeworkAssignmentId;
          }
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
            existingWeaknesses = weaknessDocs.docs
              .filter((d) => !d.data().archivedAt) // Phase 4: archive 済みは AI コンテキストから除外
              .map((d) => {
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
                  categoryId: w.categoryId,
                  archivedAt: w.archivedAt?.toDate?.() ?? w.archivedAt ?? null,
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

    // 面接スコアリングをコア関数経由で呼ぶ (宿題提出フローからも同じ関数を呼ぶ)
    let scores: InterviewScores;
    let feedback: InterviewFeedback;
    let conversationSummary: {
      keyWeaknesses: string[];
      strongPoints: string[];
      criticalMoments: string[];
      nextFocusAreas: string[];
    };
    try {
      const coreResult = await scoreInterviewCore({
        messages,
        universityName,
        facultyName,
        admissionPolicy,
        mode,
        presentationContent,
        selfAnalysisContext,
        videoAnalysis,
      });
      scores = coreResult.scores;
      feedback = coreResult.feedback;
      conversationSummary = coreResult.conversationSummary;
    } catch (coreErr) {
      if (coreErr instanceof InterviewScoreParseError) {
        console.error("Interview score parse failed. rawText head:", coreErr.rawText.slice(0, 800));
        return NextResponse.json(
          { error: "AI評価結果のパースに失敗しました", rawResponse: coreErr.rawText.slice(0, 500) },
          { status: 500 }
        );
      }
      if (coreErr instanceof Error && coreErr.message.includes("ANTHROPIC_API_KEY")) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEYが設定されていません" },
          { status: 500 }
        );
      }
      throw coreErr;
    }

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

    // AI が出力した category を hint として伝播
    const categoryHints = new Map<string, "structure" | "logic" | "expression" | "apAlignment" | "originality" | "other">();
    for (const issue of feedback.repeatedIssues ?? []) {
      const cat = (issue as { category?: string }).category;
      if (
        cat === "structure" ||
        cat === "logic" ||
        cat === "expression" ||
        cat === "apAlignment" ||
        cat === "originality" ||
        cat === "other"
      ) {
        categoryHints.set(issue.area, cat);
      }
    }

    const updatedWeaknesses = updateWeaknessRecords(
      existingWeaknesses,
      weaknessTags,
      "interview",
      categoryHints,
    );
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

        // 宿題経由のセッションなら HomeworkAssignment を submitted に更新
        if (userId && homeworkAssignmentIdFromSession) {
          await adminDb
            .doc(`users/${userId}/homeworkAssignments/${homeworkAssignmentIdFromSession}`)
            .update({
              status: "submitted",
              submittedInterviewId: sessionId,
              submittedAt: FieldValue.serverTimestamp(),
            })
            .catch((e) =>
              console.warn(
                `[interview/end] homework update failed (${homeworkAssignmentIdFromSession}):`,
                e,
              ),
            );
        }

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
                source: weakness.source,
                reminderDismissedAt: weakness.reminderDismissedAt,
                ...(weakness.categoryId ? { categoryId: weakness.categoryId } : {}),
              },
              { merge: true }
            );
          }
        }
      } catch (err) {
        console.warn("Failed to save interview results to Firestore:", err);
      }
    }

    // スキル aggregate cache 更新 (fire-and-forget)
    if (userId) {
      const userIdForAggregate = userId;
      void import("@/lib/skill-check/aggregate")
        .then(({ refreshInterviewAggregateCache }) =>
          refreshInterviewAggregateCache(userIdForAggregate),
        )
        .catch((e) =>
          console.warn("[interview/end] aggregate refresh failed:", e),
        );
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
      weakness_categories: weaknessTags.map(
        (tag) => categoryHints.get(tag) ?? categorizeWeakness(tag),
      ),
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

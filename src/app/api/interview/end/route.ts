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

const MOCK_END: InterviewEndResponse = {
  interviewId: "mock",
  scores: { clarity: 7, apAlignment: 6, enthusiasm: 8, specificity: 6, total: 27 },
  feedback: {
    overall:
      "全体的に誠実な印象で、志望理由が明確に伝えられていました。具体的なエピソードをより多く交えることで、さらに説得力が増すでしょう。",
    goodPoints: [
      "志望理由が明確で一貫性がある",
      "質問に対して誠実に回答できている",
    ],
    improvements: [
      "具体的なエピソードや数値データをもっと活用しましょう",
      "将来ビジョンをより具体的に述べましょう",
    ],
    repeatedIssues: [],
    improvementsSinceLast: [],
  },
  growthEvents: [],
};

export async function POST(request: NextRequest) {
  try {
    const body: InterviewEndRequest = await request.json();
    const { sessionId, messages, duration, userId, transcription, voiceAnalysis, videoAnalysis } = body;

    if (!sessionId || !messages || duration === undefined) {
      return NextResponse.json(
        { error: "sessionId, messages, duration は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(MOCK_END);
    }

    let existingWeaknesses: WeaknessRecord[] = [];
    let universityName = "（大学名未設定）";
    let facultyName = "（学部名未設定）";
    let admissionPolicy = "（AP未設定）";

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");

        // セッション情報から大学コンテキストを取得
        const sessionDoc = await getDoc(doc(db, "interviews", sessionId));
        if (sessionDoc.exists()) {
          const ctx = sessionDoc.data().universityContext;
          if (ctx) {
            universityName = ctx.universityName ?? universityName;
            facultyName = ctx.facultyName ?? facultyName;
            admissionPolicy = ctx.admissionPolicy ?? admissionPolicy;
          }
        }

        if (userId) {
          const weaknessQuery = query(
            collection(db, "users", userId, "weaknesses"),
            where("resolved", "==", false)
          );
          const weaknessDocs = await getDocs(weaknessQuery);
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

    const evaluationPrompt = buildInterviewEvaluationPrompt(universityName, facultyName, admissionPolicy);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${evaluationPrompt}\n\n## 面接会話記録\n\n${conversationText}`,
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
      return NextResponse.json(MOCK_END);
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const scores: InterviewScores = {
      clarity: parsed.scores.clarity,
      apAlignment: parsed.scores.apAlignment,
      enthusiasm: parsed.scores.enthusiasm,
      specificity: parsed.scores.specificity,
      total: parsed.scores.total,
    };

    const feedback: InterviewFeedback = {
      overall: parsed.feedback.overall,
      goodPoints: parsed.feedback.goodPoints ?? [],
      improvements: parsed.feedback.improvements ?? [],
      repeatedIssues: parsed.feedback.repeatedIssues ?? [],
      improvementsSinceLast: parsed.feedback.improvementsSinceLast ?? [],
    };

    // 弱点タグを抽出
    const weaknessTags: string[] = [
      ...feedback.repeatedIssues.map((issue) => issue.area),
      ...feedback.improvements,
    ];

    const updatedWeaknesses = updateWeaknessRecords(existingWeaknesses, weaknessTags);
    const growthEvents = analyzeGrowth(weaknessTags, existingWeaknesses);

    if (scores.total >= 32) {
      growthEvents.unshift({
        type: "praise",
        area: "overall",
        message: "素晴らしい面接でした！全体的に高いレベルの回答ができています。",
      });
    }

    if (db) {
      try {
        const { doc, updateDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
        await updateDoc(doc(db, "interviews", sessionId), {
          scores,
          feedback,
          weaknessTags,
          duration,
          status: "completed",
          completedAt: serverTimestamp(),
          ...(transcription ? { transcription } : {}),
          ...(voiceAnalysis ? { voiceAnalysis } : {}),
          ...(videoAnalysis ? { videoAnalysis } : {}),
        });

        if (userId) {
          for (const weakness of updatedWeaknesses) {
            await setDoc(
              doc(db, "users", userId, "weaknesses", weakness.area),
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
      university_id: "",
      faculty_id: "",
      started_at: new Date().toISOString(),
      duration_seconds: duration,
      mode: "",
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

    const result: InterviewEndResponse = {
      interviewId: sessionId,
      scores,
      feedback,
      growthEvents,
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview end error:", error);
    return NextResponse.json(
      { error: "面接終了処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

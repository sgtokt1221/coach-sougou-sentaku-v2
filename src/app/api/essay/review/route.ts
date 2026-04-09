import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildEssayReviewPrompt } from "@/lib/ai/prompts/essay";
import type { EssayReviewRequest, EssayScores, EssayFeedback, TopicInsights } from "@/lib/types/essay";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";
import type { WeaknessRecord } from "@/lib/types/growth";
import { logEssaySubmission } from "@/lib/bigquery/logger";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body: EssayReviewRequest = await request.json();
    const { essayId, ocrText, universityId, facultyId, topic, questionType, sourceText, chartDataSummary, pastQuestionFacultyName } = body;

    if (!essayId || !ocrText || !universityId || !facultyId) {
      return NextResponse.json(
        { error: "essayId, ocrText, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    // IDトークンからuserIdを取得
    let requestUserId: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { adminAuth } = await import("@/lib/firebase/admin");
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
          requestUserId = decoded.uid;
        }
      } catch {}
    }
    // dev mode fallback
    if (!requestUserId && process.env.NODE_ENV === "development") {
      const devRole = request.headers.get("X-Dev-Role");
      if (devRole) requestUserId = "dev-user";
    }

    // 大学・学部のAPを取得
    let admissionPolicy = "（大学情報未設定）";
    let weaknessList = "（過去の弱点なし）";
    let essayUserId: string | null = requestUserId;
    let existingWeaknesses: WeaknessRecord[] = [];

    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      try {
        // essayドキュメントが存在しなければ作成（初回保存）
        const existingEssay = await adminDb.doc(`essays/${essayId}`).get();
        if (!existingEssay.exists) {
          await adminDb.doc(`essays/${essayId}`).set({
            userId: requestUserId,
            ocrText,
            targetUniversity: universityId,
            targetFaculty: facultyId,
            topic: topic ?? "",
            imageUrl: "",
            status: "reviewing",
            submittedAt: new Date(),
          });
        } else {
          essayUserId = existingEssay.data()?.userId ?? requestUserId;
        }
        // AP取得（過去問の場合は過去問の学部APを優先）
        const universityDoc = await adminDb.doc(`universities/${universityId}`).get();
        if (universityDoc.exists) {
          const universityData = universityDoc.data()!;
          // 過去問の学部名でマッチを試みる（過去問練習時はその学部のAPで添削）
          let faculty = pastQuestionFacultyName
            ? universityData.faculties?.find(
                (f: { name: string; admissionPolicy?: string }) =>
                  f.name === pastQuestionFacultyName || pastQuestionFacultyName.includes(f.name)
              )
            : null;
          // 過去問学部が見つからなければ生徒の志望学部IDでフォールバック
          if (!faculty) {
            faculty = universityData.faculties?.find(
              (f: { id: string; admissionPolicy?: string }) => f.id === facultyId
            );
          }
          if (faculty?.admissionPolicy) {
            admissionPolicy = `大学: ${universityData.name}\n学部: ${faculty.name}\nAP: ${faculty.admissionPolicy}`;
          }
        }

        // 弱点リスト取得（essayIdからuserIdを引く）
        const essayDoc = await adminDb.doc(`essays/${essayId}`).get();
        if (essayDoc.exists) {
          const essayData = essayDoc.data()!;
          essayUserId = essayData.userId ?? null;
          if (essayUserId) {
            const weaknessDocs = await adminDb.collection(`users/${essayUserId}/weaknesses`).where("resolved", "==", false).get();
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
                  source: w.source ?? "essay",
                  reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
                } satisfies WeaknessRecord;
              });
              weaknessList = existingWeaknesses
                .map((w) => `- ${w.area}（${w.count}回指摘）`)
                .join("\n");
            }
          }
        }
      } catch (err) {
        console.warn("Firestore data fetch failed, using defaults:", err);
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      );
    }

    const client = new Anthropic();
    const questionContext = questionType && questionType !== "essay"
      ? { questionType: questionType as "english-reading" | "data-analysis" | "mixed", sourceText, chartDataSummary }
      : undefined;
    const systemPrompt = buildEssayReviewPrompt(admissionPolicy, weaknessList, undefined, questionContext, body.wordLimit);

    let userMessage = "";
    if (topic) userMessage += `【テーマ】${topic}\n\n`;
    if (sourceText) userMessage += `【出題資料（英文）】\n${sourceText}\n\n`;
    if (chartDataSummary) userMessage += `【資料データ】\n${chartDataSummary}\n\n`;
    userMessage += `【小論文本文】\n${ocrText}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // JSONを抽出してパース
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error("Could not parse AI response:", rawText);
      return NextResponse.json(
        { error: "AI添削結果のパースに失敗しました", rawResponse: rawText.slice(0, 500) },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const scores: EssayScores = {
      structure: parsed.scores.structure,
      logic: parsed.scores.logic,
      expression: parsed.scores.expression,
      apAlignment: parsed.scores.apAlignment,
      originality: parsed.scores.originality,
      total: parsed.scores.total,
    };

    const topicInsights: TopicInsights | undefined = parsed.feedback.topicInsights
      ? {
          background: parsed.feedback.topicInsights.background ?? "",
          relatedThemes: parsed.feedback.topicInsights.relatedThemes ?? [],
          deepDivePoints: parsed.feedback.topicInsights.deepDivePoints ?? [],
          recommendedAngle: parsed.feedback.topicInsights.recommendedAngle ?? "",
        }
      : undefined;

    const feedback: EssayFeedback = {
      overall: parsed.feedback.overall,
      goodPoints: parsed.feedback.goodPoints ?? [],
      improvements: parsed.feedback.improvements ?? [],
      repeatedIssues: parsed.feedback.repeatedIssues ?? [],
      improvementsSinceLast: parsed.feedback.improvementsSinceLast ?? [],
      topicInsights,
      brushedUpText: parsed.feedback.brushedUpText ?? undefined,
      languageCorrections: parsed.feedback.languageCorrections ?? [],
    };

    // 弱点タグを抽出
    const weaknessTags: string[] = [
      ...feedback.repeatedIssues.map((issue) => issue.area),
      ...feedback.improvements,
    ];

    // 弱点レコードを更新し成長イベントを生成
    const updatedWeaknesses = updateWeaknessRecords(existingWeaknesses, weaknessTags);
    const growthEvents = analyzeGrowth(weaknessTags, existingWeaknesses);

    if (scores.total >= 40) {
      growthEvents.unshift({
        type: "praise",
        area: "overall",
        message: "素晴らしい添削結果です！全体的に高いレベルの小論文が書けています。",
      });
    }

    // Firestoreに結果を保存
    if (adminDb) {
      try {
        const { FieldValue } = await import("firebase-admin/firestore");
        await adminDb.doc(`essays/${essayId}`).set({
          scores,
          feedback,
          weaknessTags,
          status: "reviewed",
          reviewedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        if (essayUserId) {
          for (const weakness of updatedWeaknesses) {
            await adminDb.doc(`users/${essayUserId}/weaknesses/${weakness.area}`).set(
              {
                area: weakness.area,
                count: weakness.count,
                firstOccurred: weakness.firstOccurred,
                lastOccurred: weakness.lastOccurred,
                improving: weakness.improving,
                resolved: weakness.resolved,
                source: weakness.source,
                reminderDismissedAt: weakness.reminderDismissedAt,
              },
              { merge: true }
            );
          }
        }
      } catch (err) {
        console.warn("Failed to save review results to Firestore:", err);
      }
    }

    // BigQueryログ（非同期 fire-and-forget）
    void logEssaySubmission({
      essay_id: essayId,
      user_id: essayUserId ?? "unknown",
      university_id: universityId,
      faculty_id: facultyId,
      submitted_at: new Date().toISOString(),
      score_structure: scores.structure,
      score_logic: scores.logic,
      score_expression: scores.expression,
      score_ap_alignment: scores.apAlignment,
      score_originality: scores.originality,
      score_total: scores.total,
      word_count: ocrText.length,
      topic: topic ?? "",
      weakness_tags: weaknessTags,
      improvement_tags: feedback.improvements,
    });

    const result = { essayId, ocrText, scores, feedback, growthEvents };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Essay review error:", error);
    return NextResponse.json(
      { error: "添削処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

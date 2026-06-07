import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildDrillQuestionPrompt,
  buildDrillEvaluationPrompt,
  DRILL_CATEGORIES,
  type DrillCategory
} from "@/lib/ai/prompts/interview-drill";

interface DrillQuestionRequest {
  action: "question";
  category: DrillCategory;
  universityId?: string;
  facultyId?: string;
}

interface DrillEvaluationRequest {
  action: "evaluate";
  category?: DrillCategory;
  question: string;
  answer: string;
  universityId?: string;
  facultyId?: string;
}

type DrillRequest = DrillQuestionRequest | DrillEvaluationRequest;

interface DrillQuestionResponse {
  question: string;
}

interface DrillEvaluationResponse {
  score: number;
  feedback: string;
  betterAnswer: string;
}

async function logInterviewDrill(authHeader: string | null, metadata: Record<string, unknown>) {
  if (!authHeader?.startsWith("Bearer ")) return;
  try {
    const { adminAuth, adminDb } = await import("@/lib/firebase/admin");
    if (!adminAuth || !adminDb) return;
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb.collection(`users/${decoded.uid}/activityLogs`).add({
      type: "interviewDrill",
      createdAt: FieldValue.serverTimestamp(),
      metadata,
    });
  } catch (err) {
    console.warn("[interview-drill] log failed:", err);
  }
}

/** ドリル採点結果を users/{uid}/interviewDrills に1件保存し、doc id を返す（保存トグル用） */
async function saveInterviewDrill(
  authHeader: string | null,
  data: {
    category?: DrillCategory;
    question: string;
    answer: string;
    score: number;
    feedback: string;
    betterAnswer: string;
    universityId?: string;
    facultyId?: string;
  },
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { adminAuth, adminDb } = await import("@/lib/firebase/admin");
    if (!adminAuth || !adminDb) return null;
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const { FieldValue } = await import("firebase-admin/firestore");
    const ref = await adminDb.collection(`users/${decoded.uid}/interviewDrills`).add({
      category: data.category ?? null,
      question: data.question,
      answer: data.answer,
      score: data.score,
      feedback: data.feedback,
      betterAnswer: data.betterAnswer,
      saved: false,
      universityId: data.universityId ?? null,
      facultyId: data.facultyId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.warn("[interview-drill] save failed:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  try {
    const body: DrillRequest = await request.json();
    const { action } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      );
    }

    // 大学・学部情報を取得
    let admissionPolicy = "探究心と意欲を持ち、社会に貢献できる人材を求めています。";
    let universityName = "志望大学";
    let facultyName = "志望学部";

    if (body.universityId && body.facultyId) {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        try {
          const universityDoc = await adminDb.doc(`universities/${body.universityId}`).get();
          if (universityDoc.exists) {
            const universityData = universityDoc.data()!;
            universityName = universityData.name ?? universityName;
            const faculty = universityData.faculties?.find(
              (f: { id: string; name?: string; admissionPolicy?: string }) => f.id === body.facultyId
            );
            if (faculty) {
              facultyName = faculty.name ?? facultyName;
              if (faculty.admissionPolicy) {
                admissionPolicy = faculty.admissionPolicy;
              }
            }
          }
        } catch (err) {
          console.warn("Firestore data fetch failed, using defaults:", err);
        }
      }
    }

    const client = new Anthropic();

    if (action === "question") {
      const { category } = body as DrillQuestionRequest;

      if (!DRILL_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: "無効なカテゴリです" },
          { status: 400 }
        );
      }

      const prompt = buildDrillQuestionPrompt(category, universityName, facultyName, admissionPolicy);

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const question = response.content[0].type === "text"
        ? response.content[0].text.trim()
        : `${category}について教えてください。`;

      const result: DrillQuestionResponse = { question };
      return NextResponse.json(result);

    } else if (action === "evaluate") {
      const { question, answer } = body as DrillEvaluationRequest;

      if (!question || !answer) {
        return NextResponse.json(
          { error: "質問と回答は必須です" },
          { status: 400 }
        );
      }

      const prompt = buildDrillEvaluationPrompt(question, answer, universityName, facultyName, admissionPolicy);

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText = response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "{}";

      try {
        // JSONレスポンスからコードブロックを除去
        const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || responseText.match(/^(\{[\s\S]*\})$/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;

        const evaluation = JSON.parse(jsonText);

        const result: DrillEvaluationResponse = {
          score: Math.max(1, Math.min(5, parseInt(evaluation.score) || 3)),
          feedback: evaluation.feedback || "回答をありがとうございました。",
          betterAnswer: evaluation.betterAnswer || "具体的なエピソードや経験を交えながら、より詳しく説明してみましょう。"
        };

        void logInterviewDrill(authHeader, { universityId: body.universityId, facultyId: body.facultyId });
        const drillId = await saveInterviewDrill(authHeader, {
          category: body.category,
          question,
          answer,
          score: result.score,
          feedback: result.feedback,
          betterAnswer: result.betterAnswer,
          universityId: body.universityId,
          facultyId: body.facultyId,
        });
        return NextResponse.json({ ...result, drillId });
      } catch (parseError) {
        console.error("JSON parse error:", parseError, responseText);

        // フォールバック評価
        const fallbackScore = answer.length < 20 ? 2 : answer.length < 100 ? 3 : 4;
        const result: DrillEvaluationResponse = {
          score: fallbackScore,
          feedback: "回答をありがとうございました。具体的なエピソードがあるとより良い回答になります。",
          betterAnswer: "実体験を交えながら、より詳細に説明することで説得力のある回答になります。"
        };

        void logInterviewDrill(authHeader, { universityId: body.universityId, facultyId: body.facultyId });
        const drillId = await saveInterviewDrill(authHeader, {
          category: body.category,
          question,
          answer,
          score: result.score,
          feedback: result.feedback,
          betterAnswer: result.betterAnswer,
          universityId: body.universityId,
          facultyId: body.facultyId,
        });
        return NextResponse.json({ ...result, drillId });
      }
    }

    return NextResponse.json(
      { error: "無効なアクションです" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Drill API error:", error);
    return NextResponse.json(
      { error: "ドリル処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
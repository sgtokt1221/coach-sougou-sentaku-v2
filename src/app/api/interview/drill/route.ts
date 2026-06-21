import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildDrillQuestionPrompt,
  buildDrillEvaluationPrompt,
  DRILL_CATEGORIES,
  type DrillCategory
} from "@/lib/ai/prompts/interview-drill";
import { getInterviewContent } from "@/lib/interview/content-store";

/** ドリルcategory → 面接コンテンツ・バンク(individual)のcategory 対応 */
const DRILL_TO_BANK_CATEGORY: Record<DrillCategory, string> = {
  "志望理由": "志望理由",
  "自己PR": "自己PR",
  "学問関心": "学問への関心",
  "将来ビジョン": "将来像",
  "時事問題": "時事",
};

interface DrillQuestionRequest {
  action: "question";
  category: DrillCategory;
  /** 指定すると同一質問を再出題（再挑戦） */
  questionId?: string;
  /** 指定すると別の質問を選ぶ（直前を回避） */
  excludeId?: string;
  universityId?: string;
  facultyId?: string;
}

interface DrillEvaluationRequest {
  action: "evaluate";
  category?: DrillCategory;
  question: string;
  answer: string;
  /** バンク質問のID（前回回答/ベストの突合キー）。自由質問はnull */
  questionId?: string;
  universityId?: string;
  facultyId?: string;
}

type DrillRequest = DrillQuestionRequest | DrillEvaluationRequest;

interface DrillQuestionResponse {
  question: string;
  questionId: string | null;
  category: DrillCategory;
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
    questionId?: string | null;
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
      questionId: data.questionId ?? null,
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
      const { category, questionId, excludeId } = body as DrillQuestionRequest;

      if (!DRILL_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: "無効なカテゴリです" },
          { status: 400 }
        );
      }

      // 固定の面接コンテンツ・バンク(individual)から出題（同一問題の突合のためID付き）
      const bankCat = DRILL_TO_BANK_CATEGORY[category];
      const all = await getInterviewContent("individual", { facultyName });
      const inCat = all.filter((i) => (i.category ?? "") === bankCat);

      // 再挑戦: 同一 questionId を再出題
      if (questionId) {
        const exact = all.find((i) => i.id === questionId);
        if (exact) {
          return NextResponse.json({ question: exact.title, questionId: exact.id, category } satisfies DrillQuestionResponse);
        }
      }
      // 通常: カテゴリ内から1問（直前を回避）
      if (inCat.length > 0) {
        const pool = excludeId ? inCat.filter((i) => i.id !== excludeId) : inCat;
        const list = pool.length > 0 ? pool : inCat;
        const pick = list[Math.floor(Math.random() * list.length)];
        return NextResponse.json({ question: pick.title, questionId: pick.id, category } satisfies DrillQuestionResponse);
      }

      // バンクが空の場合のみ従来どおりAI生成（questionId なし）
      const prompt = buildDrillQuestionPrompt(category, universityName, facultyName, admissionPolicy);
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      const question = response.content[0].type === "text"
        ? response.content[0].text.trim()
        : `${category}について教えてください。`;
      return NextResponse.json({ question, questionId: null, category } satisfies DrillQuestionResponse);

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
          questionId: body.questionId,
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
          questionId: body.questionId,
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
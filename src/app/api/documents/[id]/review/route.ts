import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireFeature } from "@/lib/api/subscription";
import { buildDocumentReviewPrompt } from "@/lib/ai/prompts/document";
import type { SelfAnalysisContext } from "@/lib/ai/prompts/document";
import type { DocumentFeedback } from "@/lib/types/document";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const { id } = await params;
    const body = await request.json();
    const { content, universityName, facultyName, documentType } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content は必須です" },
        { status: 400 }
      );
    }

    // AP取得
    let admissionPolicy = "";
    if (body.universityId) {
      const { db } = await import("@/lib/firebase/config");
      if (db) {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const uniDoc = await getDoc(doc(db, "universities", body.universityId));
          if (uniDoc.exists()) {
            const uniData = uniDoc.data();
            const faculty = uniData.faculties?.find(
              (f: { id: string; admissionPolicy?: string }) => f.id === body.facultyId
            );
            if (faculty?.admissionPolicy) {
              admissionPolicy = faculty.admissionPolicy;
            }
          }
        } catch (err) {
          console.warn("AP fetch failed:", err);
        }
      }
    }

    // Fetch self-analysis data if available
    let selfAnalysis: SelfAnalysisContext | undefined;
    try {
      const { db: saDb } = await import("@/lib/firebase/config");
      if (saDb && body.userId) {
        const { doc: saDoc, getDoc: saGetDoc, collection: saCollection, query: saQuery, getDocs: saGetDocs, limit: saLimit, orderBy: saOrderBy } = await import("firebase/firestore");
        const saQueryRef = saQuery(
          saCollection(saDb, `users/${body.userId}/selfAnalysis`),
          saOrderBy("updatedAt", "desc"),
          saLimit(1)
        );
        const saSnap = await saGetDocs(saQueryRef);
        if (!saSnap.empty) {
          const saData = saSnap.docs[0].data();
          if (saData.isComplete) {
            selfAnalysis = {
              values: saData.values?.coreValues,
              strengths: saData.strengths?.strengths,
              vision: saData.vision?.longTermVision,
              selfStatement: saData.identity?.selfStatement,
              uniqueNarrative: saData.identity?.uniqueNarrative,
            };
          }
        }
      }
    } catch {
      // Self-analysis data unavailable, continue without it
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const client = new Anthropic();
    const systemPrompt = buildDocumentReviewPrompt(
      universityName || "未指定",
      facultyName || "未指定",
      admissionPolicy,
      documentType || "出願書類",
      selfAnalysis
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error("Could not parse AI response:", rawText);
      return NextResponse.json(
        { error: "AIレスポンスの解析に失敗しました" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const feedback: DocumentFeedback = {
      apAlignmentScore: parsed.apAlignmentScore ?? 0,
      structureScore: parsed.structureScore ?? 0,
      originalityScore: parsed.originalityScore ?? 0,
      overallFeedback: parsed.overallFeedback ?? "",
      improvements: parsed.improvements ?? [],
      apSpecificNotes: parsed.apSpecificNotes ?? "",
    };

    return NextResponse.json({ feedback, documentId: id });
  } catch (error) {
    console.error("Document review error:", error);
    return NextResponse.json(
      { error: "添削処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

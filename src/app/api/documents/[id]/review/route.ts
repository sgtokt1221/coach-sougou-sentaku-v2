import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildDocumentReviewPrompt } from "@/lib/ai/prompts/document";
import type { SelfAnalysisContext } from "@/lib/ai/prompts/document";
import { DocumentReviewOutputSchema } from "@/lib/ai/schemas/document-review";
import type { DocumentFeedback } from "@/lib/types/document";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import {
  AI_PROMPT_VERSIONS,
  selectDocumentModel,
} from "@/lib/ai/prompt-versions";

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapSelfAnalysis(raw: Record<string, unknown>): SelfAnalysisContext {
  const values =
    raw.values && typeof raw.values === "object"
      ? (raw.values as Record<string, unknown>)
      : {};
  const strengths =
    raw.strengths && typeof raw.strengths === "object"
      ? (raw.strengths as Record<string, unknown>)
      : {};
  const vision =
    raw.vision && typeof raw.vision === "object"
      ? (raw.vision as Record<string, unknown>)
      : {};
  const identity =
    raw.identity && typeof raw.identity === "object"
      ? (raw.identity as Record<string, unknown>)
      : {};

  return {
    values: stringArray(values.coreValues),
    strengths: stringArray(strengths.strengths),
    vision: stringValue(vision.longTermVision),
    selfStatement: stringValue(identity.selfStatement),
    uniqueNarrative: stringValue(identity.uniqueNarrative),
  };
}

function matchingEvidence(content: string, values: string[]): string[] {
  return values.filter((value) => value.length > 0 && content.includes(value));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;
    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const documentSnap = await adminDb.doc(`documents/${id}`).get();
    if (!documentSnap.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }
    const documentData = documentSnap.data()!;
    if (documentData.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const content =
      typeof body.content === "string" ? body.content : documentData.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "content は必須です" },
        { status: 400 }
      );
    }

    let admissionPolicy = "";
    const universityId = documentData.universityId;
    const facultyId = documentData.facultyId;
    if (typeof universityId === "string" && universityId) {
      const universitySnap = await adminDb
        .doc(`universities/${universityId}`)
        .get();
      if (universitySnap.exists) {
        const universityData = universitySnap.data()!;
        const faculty = Array.isArray(universityData.faculties)
          ? universityData.faculties.find(
              (item: { id?: string }) => item.id === facultyId
            )
          : undefined;
        if (typeof faculty?.admissionPolicy === "string") {
          admissionPolicy = prepareAdmissionPolicy(
            faculty.admissionPolicy
          ).text;
        }
      }
    }

    let selfAnalysis: SelfAnalysisContext | undefined;
    let selfAnalysisSnap = await adminDb.doc(`selfAnalysis/${auth.uid}`).get();
    if (!selfAnalysisSnap.exists) {
      selfAnalysisSnap = await adminDb
        .doc(`users/${auth.uid}/selfAnalysis/current`)
        .get();
    }
    if (selfAnalysisSnap.exists) {
      selfAnalysis = mapSelfAnalysis(selfAnalysisSnap.data()!);
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const client = new Anthropic();
    const hasAdmissionPolicy = admissionPolicy.length > 0;
    const reviewModel = selectDocumentModel(documentData.type);
    const systemPrompt = buildDocumentReviewPrompt({
      hasAdmissionPolicy,
      documentType: documentData.type,
    });
    const referenceData = {
      universityName: documentData.universityName ?? "未指定",
      facultyName: documentData.facultyName ?? "未指定",
      documentType: documentData.type ?? "出願書類",
      admissionPolicy: hasAdmissionPolicy ? admissionPolicy : null,
      selfAnalysis: selfAnalysis ?? null,
    };

    const response = await client.messages.parse({
      model: reviewModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `<reference_data>
${JSON.stringify(referenceData)}
</reference_data>
<document_under_review>
${content}
</document_under_review>`,
        },
      ],
      output_config: {
        format: zodOutputFormat(DocumentReviewOutputSchema),
      },
    });

    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return NextResponse.json(
        { error: "AIレスポンスの検証に失敗しました" },
        { status: 502 }
      );
    }

    const parsed = response.parsed_output;
    if (hasAdmissionPolicy && parsed.apAlignmentScore === null) {
      return NextResponse.json(
        { error: "AP合致度の評価結果を検証できませんでした" },
        { status: 502 }
      );
    }
    const feedback: DocumentFeedback = {
      apAlignmentScore: hasAdmissionPolicy ? parsed.apAlignmentScore : null,
      apAlignmentAssessability: hasAdmissionPolicy
        ? "assessable"
        : "insufficient_context",
      structureScore: parsed.structureScore,
      originalityScore: parsed.originalityScore,
      overallFeedback: parsed.overallFeedback,
      improvements: parsed.improvements,
      apSpecificNotes: hasAdmissionPolicy
        ? parsed.apSpecificNotes
        : "アドミッションポリシーを取得できなかったため、AP合致度は評価していません。",
      scoreEvidence: {
        apAlignment: hasAdmissionPolicy
          ? matchingEvidence(content, parsed.scoreEvidence.apAlignment)
          : [],
        structure: matchingEvidence(content, parsed.scoreEvidence.structure),
        originality: matchingEvidence(
          content,
          parsed.scoreEvidence.originality
        ),
      },
      aiMetadata: {
        ...AI_PROMPT_VERSIONS.documentReview,
        model: reviewModel,
      },
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

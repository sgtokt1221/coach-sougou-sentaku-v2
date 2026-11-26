import { NextRequest, NextResponse } from "next/server";
import type { DraftGenerateRequest } from "@/lib/types/template";
import { getFrameworkByType } from "@/lib/templates/frameworks";
import { adminDb } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import {
  normalizeStudentEmphasis,
  normalizeStudentResearch,
} from "@/lib/ai/prompts/shared";
import {
  DraftInputError,
  DraftOutputError,
  loadTemplateMaterial,
  writeTemplateDraft,
} from "@/lib/documents/draft-generation";

// 生成に加えて字数超過時の圧縮リライトが走るため、既定の実行時間では足りない。
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    const body: DraftGenerateRequest = await request.json();

    if (
      !body.documentType ||
      !body.frameworkType ||
      !body.universityId ||
      !body.facultyId
    ) {
      return NextResponse.json(
        {
          error:
            "documentType, frameworkType, universityId, facultyId は必須です",
        },
        { status: 400 }
      );
    }

    const framework = getFrameworkByType(body.frameworkType);
    if (!framework) {
      return NextResponse.json(
        { error: "無効なフレームワークタイプです" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "データベースに接続できません" },
        { status: 500 }
      );
    }

    const requestedIds = Array.isArray(body.activityIds)
      ? body.activityIds.filter((id): id is string => typeof id === "string")
      : null;
    const material = await loadTemplateMaterial(
      auth.uid,
      body.universityId,
      body.facultyId,
      requestedIds,
      { universityName: body.universityName, facultyName: body.facultyName }
    );

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const result = await writeTemplateDraft(
      new Anthropic({ apiKey }),
      material,
      {
        framework,
        frameworkType: body.frameworkType,
        documentType: body.documentType,
        targetWordCount: body.targetWordCount || 800,
        emphasis: normalizeStudentEmphasis(body.emphasis),
        universityResearch: normalizeStudentResearch(body.universityResearch),
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DraftInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof DraftOutputError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Draft generation error:", error);
    return NextResponse.json(
      { error: "下書きの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import type {
  DraftGenerateRequest,
  DraftGenerateResponse,
} from "@/lib/types/template";
import { getFrameworkByType } from "@/lib/templates/frameworks";
import { buildTemplateDraftPrompt } from "@/lib/ai/prompts/template-draft";
import { fitToCharLimit } from "@/lib/ai/fit-char-limit";
import { TemplateDraftOutputSchema } from "@/lib/ai/schemas/template-draft";
import { adminDb } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import {
  AI_PROMPT_VERSIONS,
  selectDocumentModel,
} from "@/lib/ai/prompt-versions";

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

    // Fetch real activities from Firestore
    if (!adminDb) {
      return NextResponse.json(
        { error: "データベースに接続できません" },
        { status: 500 }
      );
    }

    const activitiesSnap = await adminDb
      .collection(`users/${auth.uid}/activities`)
      .get();

    const requestedIds = Array.isArray(body.activityIds)
      ? new Set(
          body.activityIds.filter((id): id is string => typeof id === "string")
        )
      : null;
    const activities = activitiesSnap.docs
      .filter((doc) => requestedIds === null || requestedIds.has(doc.id))
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: typeof data.title === "string" ? data.title : "活動実績",
          structuredData: data.structuredData,
        };
      });

    const universitySnap = await adminDb
      .doc(`universities/${body.universityId}`)
      .get();
    if (!universitySnap.exists) {
      return NextResponse.json(
        { error: "大学が見つかりません" },
        { status: 404 }
      );
    }
    const universityData = universitySnap.data()!;
    const faculty = Array.isArray(universityData.faculties)
      ? universityData.faculties.find(
          (item: { id?: string }) => item.id === body.facultyId
        )
      : undefined;
    if (!faculty) {
      return NextResponse.json(
        { error: "学部が見つかりません" },
        { status: 404 }
      );
    }
    const universityName =
      typeof universityData.name === "string"
        ? universityData.name
        : body.universityName;
    const facultyName =
      typeof faculty.name === "string" ? faculty.name : body.facultyName;
    const admissionPolicy = prepareAdmissionPolicy(
      faculty.admissionPolicy
    ).text;

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const generationModel = selectDocumentModel(body.documentType);

    const systemPrompt = buildTemplateDraftPrompt(
      framework,
      universityName,
      facultyName,
      admissionPolicy,
      body.documentType,
      body.targetWordCount || 800,
      activities
    );

    const message = await client.messages.parse({
      model: generationModel,
      // 拡張思考が有効なモデルでは max_tokens を thinking と本文で分け合う。
      // 4096 だと思考だけで使い切って本文が0トークンになり生成が失敗する。
      max_tokens: 16384,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "reference_dataに基づいて下書きを生成してください。",
        },
      ],
      output_config: {
        format: zodOutputFormat(TemplateDraftOutputSchema),
      },
    });

    if (message.stop_reason === "max_tokens" || !message.parsed_output) {
      // usage には thinking の内訳も入る（max_tokens を思考で使い切ったかの判別用）
      console.error("[generate-draft] 構造化応答が不正", {
        stop_reason: message.stop_reason,
        usage: message.usage,
      });
      return NextResponse.json(
        { error: "AIからの応答を検証できませんでした" },
        { status: 502 }
      );
    }

    const sectionsById = new Map(
      message.parsed_output.sections.map((section) => [section.id, section])
    );
    const sections = framework.sections.map((s) => {
      const generated = sectionsById.get(s.id);
      return {
        id: s.id,
        title: generated?.title || s.title,
        content: generated?.content || "",
        placeholder: `【${s.guidingQuestion}】\n${s.placeholder ?? "ここに記入してください。"}`,
      };
    });

    const limit = Math.round((body.targetWordCount || 800) * 1.1);
    let draft = sections
      .map((section) => section.content)
      .filter((content) => content.trim())
      .join("\n\n");
    if (draft.length > limit) {
      const populated = sections.filter((section) => section.content.trim());
      const separatorLength = Math.max(0, populated.length - 1) * 2;
      const contentBudget = Math.max(1, limit - separatorLength);
      const originalContentLength = populated.reduce(
        (sum, section) => sum + section.content.length,
        0
      );
      // セクションは互いに独立なので並列で圧縮する（直列だとセクション数だけ待ち時間が積み上がる）
      await Promise.all(
        populated.map(async (section) => {
          const sectionLimit = Math.max(
            20,
            Math.floor(
              contentBudget * (section.content.length / originalContentLength)
            )
          );
          section.content = await fitToCharLimit(
            client,
            section.content,
            sectionLimit
          );
        })
      );
      draft = sections
        .map((section) => section.content)
        .filter((content) => content.trim())
        .join("\n\n");
    }

    if (draft.length > limit) {
      return NextResponse.json(
        {
          error:
            "下書きを指定文字数内に収められませんでした。目標文字数を増やすか、活動数を減らしてください。",
        },
        { status: 502 }
      );
    }

    const result: DraftGenerateResponse = {
      draft,
      frameworkType: body.frameworkType,
      sections,
      wordCount: draft.length,
      aiMetadata: {
        ...AI_PROMPT_VERSIONS.templateDraft,
        model: generationModel,
      },
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Draft generation error:", error);
    return NextResponse.json(
      { error: "下書きの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

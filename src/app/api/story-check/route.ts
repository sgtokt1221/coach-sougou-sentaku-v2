import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildStoryCheckPrompt,
  type StoryCheckMaterials,
} from "@/lib/ai/prompts/story-check";
import { StoryCheckOutputSchema } from "@/lib/ai/schemas/story-check";
import type { StoryCheckReport } from "@/lib/types/story-check";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { AI_MODEL_SONNET, AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;
    if (!adminDb) {
      return NextResponse.json(
        { error: "データベースに接続できません" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const universityId =
      typeof body.universityId === "string" ? body.universityId : "";
    const facultyId = typeof body.facultyId === "string" ? body.facultyId : "";
    if (!universityId || !facultyId) {
      return NextResponse.json(
        { error: "universityId と facultyId は必須です" },
        { status: 400 }
      );
    }

    const universitySnap = await adminDb
      .doc(`universities/${universityId}`)
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
          (item: { id?: string }) => item.id === facultyId
        )
      : undefined;
    if (!faculty) {
      return NextResponse.json(
        { error: "学部が見つかりません" },
        { status: 404 }
      );
    }
    const universityName = text(universityData.name) || "未指定";
    const facultyName = text(faculty.name) || "未指定";
    const admissionPolicy = prepareAdmissionPolicy(
      faculty.admissionPolicy
    ).text;

    const materials: StoryCheckMaterials = {
      documents: [],
      essays: [],
      interviews: [],
      activities: [],
    };

    const documentsSnap = await adminDb
      .collection("documents")
      .where("userId", "==", auth.uid)
      .get();
    materials.documents = documentsSnap.docs
      .filter((document) => {
        const data = document.data();
        return (
          data.universityId === universityId && data.facultyId === facultyId
        );
      })
      .slice(0, 10)
      .map((document) => {
        const data = document.data();
        return {
          id: document.id,
          type: text(data.type) || "出願書類",
          title: text(data.title) || "無題",
          content: text(data.content).slice(0, 12000),
        };
      });

    const essaysSnap = await adminDb
      .collection("essays")
      .where("userId", "==", auth.uid)
      .orderBy("submittedAt", "desc")
      .limit(5)
      .get();
    materials.essays = essaysSnap.docs.map((essay) => {
      const data = essay.data();
      return {
        id: essay.id,
        topic: text(data.topic) || text(data.title) || "無題",
        content: (text(data.ocrText) || text(data.content)).slice(0, 12000),
        ...(typeof data.scores?.total === "number"
          ? { score: data.scores.total }
          : {}),
      };
    });

    const interviewsSnap = await adminDb
      .collection("interviews")
      .where("userId", "==", auth.uid)
      .orderBy("startedAt", "desc")
      .limit(5)
      .get();
    materials.interviews = interviewsSnap.docs.map((interview) => {
      const data = interview.data();
      return {
        id: interview.id,
        mode: text(data.mode) || "個人面接",
        ...(text(data.summary) ? { summary: text(data.summary) } : {}),
      };
    });

    const activitiesSnap = await adminDb
      .collection(`users/${auth.uid}/activities`)
      .limit(20)
      .get();
    materials.activities = activitiesSnap.docs.map((activity) => {
      const data = activity.data();
      return {
        id: activity.id,
        title: text(data.title) || "活動実績",
        category: text(data.category) || "未分類",
        description: text(data.description).slice(0, 4000),
        ...(data.structuredData && typeof data.structuredData === "object"
          ? { structuredData: data.structuredData }
          : {}),
      };
    });

    let selfAnalysisSnap = await adminDb.doc(`selfAnalysis/${auth.uid}`).get();
    if (!selfAnalysisSnap.exists) {
      selfAnalysisSnap = await adminDb
        .doc(`users/${auth.uid}/selfAnalysis/current`)
        .get();
    }
    if (selfAnalysisSnap.exists) {
      const data = selfAnalysisSnap.data()!;
      const values =
        data.values && typeof data.values === "object" ? data.values : {};
      const strengths =
        data.strengths && typeof data.strengths === "object"
          ? data.strengths
          : {};
      const vision =
        data.vision && typeof data.vision === "object" ? data.vision : {};
      const identity =
        data.identity && typeof data.identity === "object" ? data.identity : {};
      const mapped = {
        values: textList(values.coreValues),
        strengths: textList(strengths.strengths),
        vision: text(vision.longTermVision),
        selfStatement: text(identity.selfStatement),
      };
      if (
        mapped.values.length ||
        mapped.strengths.length ||
        mapped.vision ||
        mapped.selfStatement
      ) {
        materials.selfAnalysis = mapped;
      }
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "ストーリーチェックにはAPIキーが必要です",
          available: false,
        },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic();
    const prompt = buildStoryCheckPrompt(
      universityName,
      facultyName,
      admissionPolicy,
      materials
    );
    const message = await anthropic.messages.parse({
      model: AI_MODEL_SONNET,
      max_tokens: 4096,
      system: prompt,
      messages: [
        {
          role: "user",
          content: "reference_dataに基づいて一貫性を評価してください。",
        },
      ],
      output_config: {
        format: zodOutputFormat(StoryCheckOutputSchema),
      },
    });

    if (message.stop_reason === "max_tokens" || !message.parsed_output) {
      return NextResponse.json(
        { error: "AIからの応答を検証できませんでした" },
        { status: 502 }
      );
    }

    const report: StoryCheckReport = message.parsed_output;
    return NextResponse.json({
      report,
      universityName,
      facultyName,
      aiMetadata: {
        ...AI_PROMPT_VERSIONS.storyCheck,
        model: AI_MODEL_SONNET,
      },
    });
  } catch (error) {
    console.error("Story check error:", error);
    return NextResponse.json(
      { error: "一貫性チェックに失敗しました" },
      { status: 500 }
    );
  }
}

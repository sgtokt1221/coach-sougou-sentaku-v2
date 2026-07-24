import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api/auth";
import { requireFeature } from "@/lib/api/subscription";
import {
  buildStatementDraftPrompt,
  normalizeSelfAnalysisData,
  type SelfAnalysisData,
} from "@/lib/ai/prompts/statement";
import { fitToCharLimit } from "@/lib/ai/fit-char-limit";
import { StatementDraftOutputSchema } from "@/lib/ai/schemas/statement";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import {
  AI_MODEL_STATEMENT,
  AI_PROMPT_VERSIONS,
} from "@/lib/ai/prompt-versions";
import type { AiGenerationMetadata } from "@/lib/types/ai";

export const maxDuration = 60;

interface GenerateStatementRequest {
  universityId: string;
  facultyId: string;
  /** 目標文字数。未指定時は 800 字。 */
  targetWordCount?: number;
}

interface StatementDraftResponse {
  draft: string;
  structure: {
    intro: string;
    body: string;
    strengths: string;
    conclusion: string;
  };
  improvementSuggestions: string[];
  aiMetadata: AiGenerationMetadata;
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    if (!adminDb) {
      return NextResponse.json(
        { error: "データベース接続エラー" },
        { status: 500 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as GenerateStatementRequest | null;
    if (!body?.universityId || !body.facultyId) {
      return NextResponse.json(
        { error: "universityId, facultyId は必須です" },
        { status: 400 }
      );
    }
    const { universityId, facultyId } = body;

    // 大学・学部情報を取得
    const universityDoc = await adminDb
      .doc(`universities/${universityId}`)
      .get();
    if (!universityDoc.exists) {
      return NextResponse.json(
        { error: "大学が見つかりません" },
        { status: 404 }
      );
    }

    const universityData = universityDoc.data();
    if (!universityData) {
      return NextResponse.json(
        { error: "大学データが取得できません" },
        { status: 404 }
      );
    }
    const faculties = Array.isArray(universityData.faculties)
      ? (universityData.faculties as Array<{
          id?: string;
          name?: string;
          admissionPolicy?: string;
        }>)
      : [];
    const faculty = faculties.find((item) => item.id === facultyId);
    if (!faculty) {
      return NextResponse.json(
        { error: "学部が見つかりません" },
        { status: 404 }
      );
    }
    const universityName =
      typeof universityData.name === "string"
        ? universityData.name
        : "志望大学";
    const facultyName = faculty.name ?? "学部";
    const admissionPolicy = prepareAdmissionPolicy(
      faculty.admissionPolicy
    ).text;

    // 現行の保存先を優先し、旧形式のサブコレクションも後方互換で読む。
    let selfAnalysisDoc = await adminDb.doc(`selfAnalysis/${auth.uid}`).get();
    if (!selfAnalysisDoc.exists) {
      selfAnalysisDoc = await adminDb
        .doc(`users/${auth.uid}/selfAnalysis/current`)
        .get();
    }
    const selfAnalysis = normalizeSelfAnalysisData(
      selfAnalysisDoc.exists ? selfAnalysisDoc.data() : null
    );

    // Claude APIを呼び出し（モック対応）
    let statementResponse: StatementDraftResponse;

    if (process.env.NODE_ENV === "development") {
      // 開発環境：モックレスポンス
      statementResponse = generateMockStatement(
        universityName,
        facultyName,
        admissionPolicy,
        selfAnalysis
      );
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "AI機能は現在利用できません", available: false },
          { status: 503 }
        );
      }
      const prompt = buildStatementDraftPrompt(
        universityName,
        facultyName,
        admissionPolicy,
        selfAnalysis,
        body.targetWordCount || 800
      );
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });
      const response = await client.messages.parse({
        model: AI_MODEL_STATEMENT,
        max_tokens: 4096,
        system: prompt,
        messages: [
          {
            role: "user",
            content: "reference_dataに基づいて志望理由書を生成してください。",
          },
        ],
        output_config: {
          format: zodOutputFormat(StatementDraftOutputSchema),
        },
      });
      if (response.stop_reason === "max_tokens" || !response.parsed_output) {
        throw new Error("Claude APIの構造化応答が不正です");
      }

      const structure = { ...response.parsed_output.structure };
      const limit = Math.round((body.targetWordCount || 800) * 1.1);
      let draft = joinStatementStructure(structure);
      if (draft.length > limit) {
        const entries = Object.entries(structure).filter(([, text]) =>
          text.trim()
        );
        const contentBudget = Math.max(1, limit - (entries.length - 1) * 2);
        const originalLength = entries.reduce(
          (sum, [, text]) => sum + text.length,
          0
        );
        for (const [key, text] of entries) {
          const sectionLimit = Math.max(
            20,
            Math.floor(contentBudget * (text.length / originalLength))
          );
          structure[key as keyof typeof structure] = await fitToCharLimit(
            client,
            text,
            sectionLimit
          );
        }
        draft = joinStatementStructure(structure);
      }
      if (draft.length > limit) {
        throw new Error("志望理由書を指定文字数内に収められませんでした");
      }
      statementResponse = {
        draft,
        structure,
        improvementSuggestions: response.parsed_output.improvementSuggestions,
        aiMetadata: {
          ...AI_PROMPT_VERSIONS.statementDraft,
          model: AI_MODEL_STATEMENT,
        },
      };
    }

    return NextResponse.json(statementResponse);
  } catch (error) {
    console.error("Statement generation error:", error);
    return NextResponse.json(
      { error: "志望理由書の生成に失敗しました" },
      { status: 500 }
    );
  }
}

function joinStatementStructure(
  structure: StatementDraftResponse["structure"]
): string {
  return Object.values(structure)
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function generateMockStatement(
  universityName: string,
  facultyName: string,
  admissionPolicy: string,
  selfAnalysis: SelfAnalysisData
): StatementDraftResponse {
  const value = selfAnalysis.values[0] || "【大切にしている価値観を入力】";
  const strength = selfAnalysis.strengths[0] || "【自分の強みを入力】";
  const experience =
    selfAnalysis.experiences[0] || "【関心を持った原体験を入力】";
  const vision = selfAnalysis.vision || "【将来実現したいことを入力】";
  const apConnection = selfAnalysis.apConnection
    ? selfAnalysis.apConnection
    : admissionPolicy
      ? "【自分の経験とAPの接点を入力】"
      : "【AP確認後に接続を書く】";
  const structure = {
    intro: `私は${value}を大切にしている。${experience}を振り返る中で、${facultyName.replace("学部", "")}分野への関心を持った。`,
    body: `${universityName}${facultyName}で、【大学で探究したい問いを入力】に取り組みたい。${apConnection}。`,
    strengths: `${strength}を、${selfAnalysis.experiences[0] ? "上記の経験" : "【強みが表れた経験を入力】"}で培ってきた。この強みを大学でどのように生かすか、【具体的な行動を入力】。`,
    conclusion: `大学での学びを通じて、${vision}。そのために、【入学後の行動計画を入力】。`,
  };
  const draft = joinStatementStructure(structure);

  return {
    draft,
    structure,
    improvementSuggestions: [
      "【】内を、実際の経験と自分の言葉で埋めてください。",
      "大学固有の授業・研究内容は、公式情報を確認してから追加してください。",
    ],
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.statementDraft,
      model: "development-mock",
    },
  };
}

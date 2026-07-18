import { NextRequest, NextResponse } from "next/server";
import { jsonrepair } from "jsonrepair";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api/auth";
import { requireFeature } from "@/lib/api/subscription";
import {
  buildStatementDraftPrompt,
  normalizeSelfAnalysisData,
  type SelfAnalysisData,
} from "@/lib/ai/prompts/statement";
import { extractJsonObject } from "@/lib/ai/extract-json";

export const maxDuration = 60;

interface GenerateStatementRequest {
  universityId: string;
  facultyId: string;
}

interface StatementDraftResponse {
  draft: string;
  structure: {
    intro: string;
    body: string;
    strengths: string;
    conclusion: string;
  };
  evaluationScores: {
    apAlignment: number;
    consistency: number;
    specificity: number;
    futureVision: number;
  };
  improvementSuggestions: string[];
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    if (!adminDb) {
      return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
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
    const universityDoc = await adminDb.doc(`universities/${universityId}`).get();
    if (!universityDoc.exists) {
      return NextResponse.json({ error: "大学が見つかりません" }, { status: 404 });
    }

    const universityData = universityDoc.data();
    if (!universityData) {
      return NextResponse.json({ error: "大学データが取得できません" }, { status: 404 });
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
      return NextResponse.json({ error: "学部が見つかりません" }, { status: 404 });
    }
    const universityName =
      typeof universityData.name === "string"
        ? universityData.name
        : "志望大学";
    const facultyName = faculty.name ?? "学部";

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
        faculty.admissionPolicy || "未設定",
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
        faculty.admissionPolicy || "未設定",
        selfAnalysis
      );
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      const content =
        response.content[0]?.type === "text" ? response.content[0].text : "";
      const jsonText = extractJsonObject(content);
      if (!jsonText) {
        throw new Error("Claude APIの応答形式が不正です");
      }
      statementResponse = normalizeStatementResponse(
        JSON.parse(jsonrepair(jsonText))
      );
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

function normalizeStatementResponse(raw: unknown): StatementDraftResponse {
  const data = raw && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : {};
  const structure = data.structure && typeof data.structure === "object"
    ? (data.structure as Record<string, unknown>)
    : {};
  const scores = data.evaluationScores && typeof data.evaluationScores === "object"
    ? (data.evaluationScores as Record<string, unknown>)
    : {};
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const score = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const result: StatementDraftResponse = {
    draft: text(data.draft),
    structure: {
      intro: text(structure.intro),
      body: text(structure.body),
      strengths: text(structure.strengths),
      conclusion: text(structure.conclusion),
    },
    evaluationScores: {
      apAlignment: score(scores.apAlignment),
      consistency: score(scores.consistency),
      specificity: score(scores.specificity),
      futureVision: score(scores.futureVision),
    },
    improvementSuggestions: Array.isArray(data.improvementSuggestions)
      ? data.improvementSuggestions.map(text).filter(Boolean)
      : [],
  };
  if (!result.draft || Object.values(result.structure).every((item) => !item)) {
    throw new Error("Claude APIの応答に下書きが含まれていません");
  }
  return result;
}

function generateMockStatement(
  universityName: string,
  facultyName: string,
  admissionPolicy: string,
  selfAnalysis: SelfAnalysisData
): StatementDraftResponse {
  const experience = selfAnalysis.experiences[0]
    ? `${selfAnalysis.experiences[0]}という経験を振り返る中で`
    : "【関心を持った原体験を入力】をきっかけに";
  const intro = `私は${selfAnalysis.values[0]}を大切にし、${selfAnalysis.strengths[0]}を活かして社会に貢献したいと考えている。${experience}、${facultyName.replace("学部", "")}分野への関心を深めてきた。`;

  const body = `${universityName}${facultyName}を志望する理由は、${admissionPolicy.substring(0, 50)}...という理念に強く共感するからである。特に、${selfAnalysis.apConnection}この点で、私の価値観と大学の方針が一致している。大学では、${selfAnalysis.vision}という目標に向けて、専門的な知識と実践的なスキルを身につけたい。`;

  const strengths = `私の強みである${selfAnalysis.strengths.join("と")}を活かして、大学のコミュニティに貢献したい。具体的には、学習グループのリーダーシップや、学内プロジェクトへの積極的な参加を通じて、仲間と共に成長していきたい。`;

  const conclusion = `${universityName}での学びを通じて、${selfAnalysis.vision}私は将来、${facultyName.replace("学部", "")}分野の専門家として、社会の課題解決に取り組んでいく所存である。`;

  const draft = `${intro}\n\n${body}\n\n${strengths}\n\n${conclusion}`;

  return {
    draft,
    structure: {
      intro,
      body,
      strengths,
      conclusion,
    },
    evaluationScores: {
      apAlignment: 25,
      consistency: 22,
      specificity: 20,
      futureVision: 18,
    },
    improvementSuggestions: [
      "より具体的なエピソードを追加してください",
      "アドミッションポリシーとの関連をより明確にしてください",
      "将来ビジョンをより詳細に記述してください",
    ],
  };
}

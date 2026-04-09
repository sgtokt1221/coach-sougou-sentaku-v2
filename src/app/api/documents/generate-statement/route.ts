import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";
import { buildStatementDraftPrompt, type SelfAnalysisData } from "@/lib/ai/prompts/statement";

interface GenerateStatementRequest {
  universityId: string;
  facultyId: string;
  userId?: string;
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

    // 認証確認
    const authData = await verifyAuthToken(request);
    if (!authData) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
    }

    const body: GenerateStatementRequest = await request.json();
    const { universityId, facultyId, userId } = body;
    const targetUserId = userId || authData.uid;

    // 大学・学部情報を取得
    const universityDoc = await adminDb.doc(`universities/${universityId}`).get();
    if (!universityDoc.exists) {
      return NextResponse.json({ error: "大学が見つかりません" }, { status: 404 });
    }

    const universityData = universityDoc.data();
    if (!universityData) {
      return NextResponse.json({ error: "大学データが取得できません" }, { status: 404 });
    }
    const faculty = universityData.faculties?.find((f: any) => f.id === facultyId);
    if (!faculty) {
      return NextResponse.json({ error: "学部が見つかりません" }, { status: 404 });
    }

    // 自己分析データを取得
    const selfAnalysisDoc = await adminDb.doc(`users/${targetUserId}/selfAnalysis/current`).get();
    const selfAnalysisData = selfAnalysisDoc.data();

    // データが不足している場合のデフォルト値
    const selfAnalysis: SelfAnalysisData = {
      values: selfAnalysisData?.values || ["学び", "成長", "貢献"],
      strengths: selfAnalysisData?.strengths || ["探究心", "協調性"],
      vision: selfAnalysisData?.vision || "社会課題を解決する専門家として貢献したい",
      selfStatement: selfAnalysisData?.selfStatement || "学びを通じて社会に貢献したい学生です。",
      apConnection: selfAnalysisData?.apConnection || "大学の理念と私の価値観が合致しています。",
    };

    // Claude APIを呼び出し（モック対応）
    let statementResponse: StatementDraftResponse;

    if (process.env.NODE_ENV === "development") {
      // 開発環境：モックレスポンス
      statementResponse = generateMockStatement(
        universityData.name,
        faculty.name,
        faculty.admissionPolicy || "未設定",
        selfAnalysis
      );
    } else {
      // 本番環境：Claude API呼び出し
      const prompt = buildStatementDraftPrompt(
        universityData.name,
        faculty.name,
        faculty.admissionPolicy || "未設定",
        selfAnalysis
      );

      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        throw new Error("Claude API呼び出しに失敗しました");
      }

      const claudeData = await claudeResponse.json();
      const content = claudeData.content[0]?.text || "";

      // JSON部分を抽出
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        throw new Error("Claude APIの応答形式が不正です");
      }

      statementResponse = JSON.parse(jsonMatch[1]);
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

function generateMockStatement(
  universityName: string,
  facultyName: string,
  admissionPolicy: string,
  selfAnalysis: SelfAnalysisData
): StatementDraftResponse {
  const intro = `私は${selfAnalysis.values[0]}を大切にし、${selfAnalysis.strengths[0]}を活かして社会に貢献したいと考えている。高校時代の活動を通じて、${facultyName.replace("学部", "")}分野への関心を深めてきた。`;

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
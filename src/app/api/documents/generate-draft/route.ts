import { NextRequest, NextResponse } from "next/server";
import type { DraftGenerateRequest, DraftGenerateResponse } from "@/lib/types/template";
import { getFrameworkByType } from "@/lib/templates/frameworks";
import { buildTemplateDraftPrompt } from "@/lib/ai/prompts/template-draft";

const MOCK_ACTIVITIES = [
  {
    title: "文芸部部長として活動",
    structuredData: {
      motivation: "中学時代から創作が好きで、高校では仲間と一緒に活動の場を広げたいと思った。",
      actions: [
        "部長として月2回の定例会議を運営",
        "文化祭で校外の作家を招いたトークイベントを企画・実施",
        "校内文芸誌を年2回発行",
      ],
      results: [
        "文化祭のトークイベントに来場者150名を動員",
        "文芸誌の発行部数を前年比2倍に拡大",
        "部員数が12名から20名に増加",
      ],
      learnings: [
        "チームをまとめるには一人ひとりの強みを活かす配置が重要",
        "外部との連携で活動の質が大きく向上する",
      ],
      connection:
        "大学では日本文学を専攻し、創作と批評の両面から文学の可能性を探求したい。",
    },
  },
];

function generateMockDraft(
  req: DraftGenerateRequest
): DraftGenerateResponse {
  const framework = getFrameworkByType(req.frameworkType);
  if (!framework) {
    return {
      draft: "フレームワークが見つかりませんでした。",
      frameworkType: req.frameworkType,
      sections: [],
    };
  }

  const sections = framework.sections.map((s) => ({
    title: s.title,
    content: `【${s.title}】\n${s.placeholder}`,
  }));

  const draft = sections.map((s) => `${s.title}\n\n${s.content}`).join("\n\n");

  return {
    draft,
    frameworkType: req.frameworkType,
    sections,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: DraftGenerateRequest = await request.json();

    if (!body.documentType || !body.frameworkType || !body.universityId || !body.facultyId) {
      return NextResponse.json(
        { error: "documentType, frameworkType, universityId, facultyId は必須です" },
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

    // Try Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey });

        const activities = MOCK_ACTIVITIES;

        const systemPrompt = buildTemplateDraftPrompt(
          framework,
          body.universityName,
          body.facultyName,
          body.documentType,
          body.targetWordCount || 800,
          activities
        );

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `${body.universityName}${body.facultyName}の${body.documentType}を、${framework.name}のフレームワークで下書き生成してください。`,
            },
          ],
        });

        const text =
          message.content[0].type === "text" ? message.content[0].text : "";
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          const result: DraftGenerateResponse = {
            draft: parsed.draft || "",
            frameworkType: body.frameworkType,
            sections: parsed.sections || [],
          };
          return NextResponse.json(result);
        }
      } catch (err) {
        console.warn("Claude API call failed, falling back to mock:", err);
      }
    }

    // Mock fallback
    const mockResult = generateMockDraft(body);
    return NextResponse.json(mockResult);
  } catch (error) {
    console.error("Draft generation error:", error);
    return NextResponse.json(
      { error: "下書きの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

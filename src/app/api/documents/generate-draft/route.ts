import { NextRequest, NextResponse } from "next/server";
import type { DraftGenerateRequest, DraftGenerateResponse } from "@/lib/types/template";
import { getFrameworkByType } from "@/lib/templates/frameworks";
import { buildTemplateDraftPrompt } from "@/lib/ai/prompts/template-draft";
import { fitToCharLimit } from "@/lib/ai/fit-char-limit";
import { adminDb } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

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
      ? new Set(body.activityIds.filter((id): id is string => typeof id === "string"))
      : null;
    const activities = activitiesSnap.docs
      .filter((doc) => requestedIds === null || requestedIds.has(doc.id))
      .map((doc) => {
        const data = doc.data();
        return {
          title: typeof data.title === "string" ? data.title : "活動実績",
          structuredData: data.structuredData,
        };
      });

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const systemPrompt = buildTemplateDraftPrompt(
      framework,
      body.universityName,
      body.facultyName,
      body.documentType,
      body.targetWordCount || 800,
      activities
    );

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
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
      // AI 出力の sections には id がないため framework 定義の順序で付与する
      const aiSections: Array<{ title?: string; content?: string }> = Array.isArray(parsed.sections)
        ? parsed.sections
        : [];
      const sections = framework.sections.map((s, i) => ({
        id: s.id,
        title: aiSections[i]?.title ?? s.title,
        content: aiSections[i]?.content ?? "",
        placeholder: `【${s.guidingQuestion}】\n${s.placeholder ?? "ここに記入してください。"}`,
      }));
      const result: DraftGenerateResponse = {
        // 本文はセクション見出し(結論(Point)等)を含めず content のみ連結する。
        // 出願書類にフレームワークの見出しをそのまま残さないため。
        draft: sections.map((s) => s.content).filter((c) => c.trim()).join("\n\n"),
        frameworkType: body.frameworkType,
        sections,
      };
      // 字数上限の強制（目標文字数の+10%以内）。LLM が超過して出しても
      // サーバー側で数え直し、上限内に収める圧縮リライトを行う。
      const limit = Math.round((body.targetWordCount || 800) * 1.1);
      if (result.draft) {
        result.draft = await fitToCharLimit(client, result.draft, limit);
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "AIからの応答を解析できませんでした" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Draft generation error:", error);
    return NextResponse.json(
      { error: "下書きの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

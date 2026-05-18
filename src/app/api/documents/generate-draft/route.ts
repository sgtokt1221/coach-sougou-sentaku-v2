import { NextRequest, NextResponse } from "next/server";
import type { DraftGenerateRequest, DraftGenerateResponse } from "@/lib/types/template";
import { getFrameworkByType } from "@/lib/templates/frameworks";
import { buildTemplateDraftPrompt } from "@/lib/ai/prompts/template-draft";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

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

    const activities = activitiesSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        title: data.title,
        structuredData: data.structuredData,
      };
    });

    // 活動実績が未登録の場合は AI を呼ばずに決定論的に雛形を組み立てる。
    // 架空のエピソード捏造を避け、ユーザーが各セクションをガイディング質問に
    // 沿って埋められる状態にする。AI による具体的な下書きは活動実績登録後に提供。
    if (activities.length === 0) {
      const result: DraftGenerateResponse = {
        frameworkType: body.frameworkType,
        draft: "",
        sections: framework.sections.map((s) => ({
          id: s.id,
          title: s.title,
          content: `【${s.guidingQuestion}】\n${s.placeholder ?? "ここに記入してください。"}`,
        })),
      };
      return NextResponse.json(result);
    }

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
      // AI 出力の sections には id がないため framework 定義の順序で付与する
      const aiSections: Array<{ title?: string; content?: string }> = Array.isArray(parsed.sections)
        ? parsed.sections
        : [];
      const sections = framework.sections.map((s, i) => ({
        id: s.id,
        title: aiSections[i]?.title ?? s.title,
        content: aiSections[i]?.content ?? "",
      }));
      const result: DraftGenerateResponse = {
        draft: parsed.draft || "",
        frameworkType: body.frameworkType,
        sections,
      };
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

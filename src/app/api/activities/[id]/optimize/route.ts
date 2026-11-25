import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { buildActivityOptimizePrompt } from "@/lib/ai/prompts/activity";
import type { ActivityOptimization } from "@/lib/types/activity";

interface OptimizeRequest {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "apOptimization");
    if (gate) return gate;

    const { id } = await params;
    const body: OptimizeRequest = await request.json();
    const { universityId, facultyId, universityName, facultyName } = body;

    if (!universityId || !facultyId || !universityName || !facultyName) {
      return NextResponse.json(
        { error: "universityId, facultyId, universityName, facultyName は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const mockOptimization: ActivityOptimization = {
        universityId,
        facultyId,
        universityName,
        facultyName,
        optimizedText: `${universityName}${facultyName}のアドミッションポリシーに基づき、この活動実績を最適化しました。主体的な取り組みと協働の姿勢が、貴学の求める人物像と合致しています。活動を通じて培った課題発見力と実行力は、大学での学術研究においても大きな強みとなります。特に、多様な視点を取り入れながら成果を生み出した経験は、学際的な学びを重視する貴学の教育方針に合致しています。`,
        alignmentScore: 7,
        keyApKeywords: ["主体性", "協働", "課題発見力", "学際的"],
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ optimization: mockOptimization });
    }

    // 以前は AP をクライアント SDK で、活動を自分の API への素の fetch で読んでいた。
    // どちらもサーバーでは未ログイン扱いになり、AP 未設定・空の活動のまま AI を呼んでいた。
    const { adminDb, verifyAuthToken } = await import("@/lib/firebase/admin");
    const uid =
      (await verifyAuthToken(request).then((r) => r?.uid).catch(() => null)) ??
      (process.env.NODE_ENV === "development" ? "dev-user" : null);
    if (!uid || !adminDb) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const activitySnap = await adminDb.doc(`users/${uid}/activities/${id}`).get();
    if (!activitySnap.exists) {
      return NextResponse.json({ error: "活動実績が見つかりません" }, { status: 404 });
    }
    const activity = activitySnap.data() ?? {};

    let admissionPolicy = "（AP未設定）";
    try {
      const uniDoc = await adminDb.doc(`universities/${universityId}`).get();
      const faculty = (uniDoc.data()?.faculties ?? []).find(
        (f: { id: string; admissionPolicy?: string }) => f.id === facultyId
      );
      if (faculty?.admissionPolicy) admissionPolicy = faculty.admissionPolicy;
    } catch (e) {
      console.warn("[activities/optimize] AP の取得に失敗:", e);
    }

    const activityDesc = activity.description ?? "";
    const structured = activity.structuredData;

    const activityContext = structured
      ? `動機: ${structured.motivation}\n行動: ${structured.actions.join("、")}\n成果: ${structured.results.join("、")}\n学び: ${structured.learnings.join("、")}\n接続: ${structured.connection}`
      : activityDesc;

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const systemPrompt = buildActivityOptimizePrompt(universityName, facultyName, admissionPolicy);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: `以下の活動実績をAP向けに最適化してください:\n\n${activityContext}` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const optimization: ActivityOptimization = {
          universityId,
          facultyId,
          universityName,
          facultyName,
          optimizedText: parsed.optimizedText ?? text,
          alignmentScore: parsed.alignmentScore ?? 5,
          keyApKeywords: parsed.keyApKeywords ?? [],
          generatedAt: new Date().toISOString(),
        };
        return NextResponse.json({ optimization });
      }
    } catch {
      // JSON parse failed
    }

    const fallbackOptimization: ActivityOptimization = {
      universityId,
      facultyId,
      universityName,
      facultyName,
      optimizedText: text,
      alignmentScore: 5,
      keyApKeywords: [],
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ optimization: fallbackOptimization });
  } catch (error) {
    console.error("Activity optimize error:", error);
    return NextResponse.json(
      { error: "最適化処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

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

    // Fetch admission policy from Firestore
    let admissionPolicy = "（AP未設定）";
    try {
      const { db } = await import("@/lib/firebase/config");
      if (db) {
        const { doc, getDoc } = await import("firebase/firestore");
        const uniDoc = await getDoc(doc(db, "universities", universityId));
        if (uniDoc.exists()) {
          const uniData = uniDoc.data();
          const faculty = uniData.faculties?.find(
            (f: { id: string; admissionPolicy?: string }) => f.id === facultyId
          );
          if (faculty?.admissionPolicy) {
            admissionPolicy = faculty.admissionPolicy;
          }
        }
      }
    } catch {
      // Firestore not available
    }

    // Fetch activity description
    const activityRes = await fetch(new URL(`/api/activities/${id}`, request.url));
    const activityData = await activityRes.json();
    const activityDesc = activityData.activity?.description ?? "";
    const structured = activityData.activity?.structuredData;

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

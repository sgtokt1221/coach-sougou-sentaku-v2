import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { loadResearchSelfContext } from "@/lib/ai/research-context";
import {
  buildCurriculumGeneratePrompt,
  buildMockCurriculumUnits,
  type GeneratedUnit,
} from "@/lib/ai/prompts/research-curriculum";
import type { ResearchCurriculum, ResearchCurriculumUnit } from "@/lib/types/research";
import { RESEARCH_MAX_UNITS } from "@/lib/types/research";

interface GenerateBody {
  domain: string;
  theme: string;
  goal: string;
  unitCount: number;
}

function parseUnits(text: string): GeneratedUnit[] {
  const m = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error("カリキュラムのパースに失敗");
  const p = JSON.parse(m[1]);
  const units = Array.isArray(p.units) ? p.units : [];
  return units.map((u: Record<string, unknown>) => ({
    title: String(u.title ?? ""),
    aim: String(u.aim ?? ""),
    research: Array.isArray(u.research) ? u.research.map(String) : [],
    output: String(u.output ?? ""),
  }));
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const userSnap = await adminDb.doc(`users/${uid}`).get();
  if (userSnap.data()?.researchEnrolled !== true) {
    return NextResponse.json({ error: "探究授業の受講登録がありません。" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as GenerateBody;
    const domain = (body.domain ?? "").trim();
    const theme = (body.theme ?? "").trim();
    const goal = (body.goal ?? "").trim();
    const unitCount = Math.min(RESEARCH_MAX_UNITS, Math.max(1, Math.round(body.unitCount || 0)));
    if (!theme || !unitCount) {
      return NextResponse.json({ error: "テーマと回数は必須です" }, { status: 400 });
    }

    const { text: selfContext } = await loadResearchSelfContext(uid);

    let generated: GeneratedUnit[];
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      generated = buildMockCurriculumUnits(unitCount, theme || domain);
    } else {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic();
      const resp = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: buildCurriculumGeneratePrompt({ domain, theme, goal, unitCount, selfContext }),
        messages: [{ role: "user", content: "上記の方針でカリキュラムを作成してください。" }],
      });
      const text = resp.content[0]?.type === "text" ? resp.content[0].text : "";
      generated = parseUnits(text);
    }

    // order/status を付与（足りない/多い分は unitCount に合わせる）
    const units: ResearchCurriculumUnit[] = generated.slice(0, unitCount).map((u, i) => ({
      order: i + 1,
      title: u.title,
      aim: u.aim,
      research: u.research,
      output: u.output,
      status: "todo",
    }));

    const now = new Date().toISOString();
    const curriculum: ResearchCurriculum = {
      domain,
      theme,
      goal,
      totalUnits: unitCount,
      units,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.doc(`users/${uid}/researchCurriculum/current`).set(curriculum);
    return NextResponse.json(curriculum);
  } catch (error) {
    console.error("Research curriculum generate error:", error);
    return NextResponse.json({ error: "カリキュラム生成中にエラーが発生しました" }, { status: 500 });
  }
}

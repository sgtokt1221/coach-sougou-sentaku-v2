import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase/admin";
import { loadResearchSelfContext } from "@/lib/ai/research-context";
import {
  buildCurriculumGeneratePrompt,
  buildMockCurriculumUnits,
  type GeneratedUnit,
} from "@/lib/ai/prompts/research-curriculum";
import type { ResearchCurriculum, ResearchCurriculumUnit } from "@/lib/types/research";
import { RESEARCH_MAX_UNITS } from "@/lib/types/research";

/**
 * 探究カリキュラムを生成して users/{studentUid}/researchCurriculum/current に active 保存する。
 * 生徒の自己録音フロー・講師のセッション生成 の両方から使う共通ロジック。
 * 権限・受講チェックは呼び出し側(route)の責務。
 */
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

export async function generateAndSaveCurriculum(args: {
  studentUid: string;
  domain: string;
  theme: string;
  goal: string;
  unitCount: number;
}): Promise<ResearchCurriculum> {
  const { studentUid } = args;
  if (!adminDb) throw new Error("サーバー設定エラー");

  const domain = (args.domain ?? "").trim();
  const theme = (args.theme ?? "").trim();
  const goal = (args.goal ?? "").trim();
  const unitCount = Math.min(RESEARCH_MAX_UNITS, Math.max(1, Math.round(args.unitCount || 0)));
  if (!theme || !unitCount) throw new Error("テーマと回数は必須です");

  const { text: selfContext } = await loadResearchSelfContext(studentUid);

  let generated: GeneratedUnit[];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    generated = buildMockCurriculumUnits(unitCount, theme || domain);
  } else {
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

  await adminDb.doc(`users/${studentUid}/researchCurriculum/current`).set(curriculum);
  return curriculum;
}

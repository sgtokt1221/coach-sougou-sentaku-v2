import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { WeaknessAnalytics } from "@/lib/types/analytics";

const MOCK_WEAKNESSES: WeaknessAnalytics = {
  topWeaknesses: [
    { area: "論拠となるデータ・事例の不足", count: 45, improvementRate: 42 },
    { area: "AP連動の弱さ", count: 38, improvementRate: 55 },
    { area: "導入部分の構成", count: 32, improvementRate: 68 },
    { area: "結論の明確化", count: 28, improvementRate: 72 },
    { area: "具体的エピソードの不足", count: 25, improvementRate: 48 },
    { area: "将来ビジョンの曖昧さ", count: 22, improvementRate: 35 },
    { area: "文章表現の改善", count: 20, improvementRate: 60 },
    { area: "論理的飛躍", count: 18, improvementRate: 50 },
    { area: "字数配分の偏り", count: 15, improvementRate: 78 },
    { area: "問題提起の弱さ", count: 12, improvementRate: 65 },
  ],
  avgDaysToResolve: 14.3,
  universityGap: [
    {
      universityName: "東京大学",
      requiredSkills: ["論理的思考力", "社会問題への洞察", "独自の視点"],
      studentGap: ["論拠となるデータ・事例の不足", "論理的飛躍"],
    },
    {
      universityName: "京都大学",
      requiredSkills: ["学術的表現", "多角的分析", "知的好奇心"],
      studentGap: ["AP連動の弱さ", "文章表現の改善"],
    },
    {
      universityName: "早稲田大学",
      requiredSkills: ["表現力", "独創性", "社会貢献意識"],
      studentGap: ["具体的エピソードの不足", "将来ビジョンの曖昧さ"],
    },
    {
      universityName: "慶應義塾大学",
      requiredSkills: ["問題解決力", "リーダーシップ", "国際性"],
      studentGap: ["問題提起の弱さ", "具体的エピソードの不足"],
    },
  ],
  improvementPatterns: [
    {
      pattern: "週2回以上の提出で弱点を集中改善",
      successRate: 78,
      avgSubmissions: 6,
      avgDaysToImprove: 12,
    },
    {
      pattern: "添削フィードバック後48時間以内に再提出",
      successRate: 85,
      avgSubmissions: 3,
      avgDaysToImprove: 8,
    },
    {
      pattern: "同一テーマで3回以上書き直し",
      successRate: 72,
      avgSubmissions: 4,
      avgDaysToImprove: 15,
    },
    {
      pattern: "面接練習と小論文を交互に実施",
      successRate: 65,
      avgSubmissions: 8,
      avgDaysToImprove: 20,
    },
  ],
};

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json(MOCK_WEAKNESSES);
    }

    try {
      const { collectionGroup, getDocs } = await import("firebase/firestore");

      const weaknessesSnap = await getDocs(collectionGroup(db, "weaknesses"));
      if (weaknessesSnap.empty) {
        return NextResponse.json(MOCK_WEAKNESSES);
      }

      const areaMap = new Map<string, { count: number; improving: number; resolved: number; totalDays: number }>();

      for (const docSnap of weaknessesSnap.docs) {
        const w = docSnap.data();
        const area = w.area ?? "unknown";
        const entry = areaMap.get(area) ?? { count: 0, improving: 0, resolved: 0, totalDays: 0 };
        entry.count += w.count ?? 1;
        if (w.improving) entry.improving++;
        if (w.resolved) {
          entry.resolved++;
          const first = w.firstOccurred?.toDate?.() ?? new Date(w.firstOccurred);
          const last = w.lastOccurred?.toDate?.() ?? new Date(w.lastOccurred);
          entry.totalDays += Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
        }
        areaMap.set(area, entry);
      }

      const topWeaknesses = Array.from(areaMap.entries())
        .map(([area, data]) => ({
          area,
          count: data.count,
          improvementRate:
            data.count > 0
              ? Math.round(((data.improving + data.resolved) / (data.improving + data.resolved + 1)) * 100)
              : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const resolvedEntries = Array.from(areaMap.values()).filter((d) => d.resolved > 0);
      const avgDaysToResolve =
        resolvedEntries.length > 0
          ? Math.round(
              (resolvedEntries.reduce((sum, d) => sum + d.totalDays / d.resolved, 0) / resolvedEntries.length) * 10
            ) / 10
          : MOCK_WEAKNESSES.avgDaysToResolve;

      const result: WeaknessAnalytics = {
        topWeaknesses: topWeaknesses.length > 0 ? topWeaknesses : MOCK_WEAKNESSES.topWeaknesses,
        avgDaysToResolve,
        universityGap: MOCK_WEAKNESSES.universityGap,
        improvementPatterns: MOCK_WEAKNESSES.improvementPatterns,
      };

      return NextResponse.json(result);
    } catch (err) {
      console.warn("Firestore weakness analytics fetch failed, using mock:", err);
      return NextResponse.json(MOCK_WEAKNESSES);
    }
  } catch (error) {
    console.error("Weakness analytics error:", error);
    return NextResponse.json({ error: "弱点分析データの取得中にエラーが発生しました" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { GrowthReport } from "@/lib/types/analytics";

const MOCK_REPORT: GrowthReport = {
  summary:
    "直近の添削結果から、全体的にスコアが上昇傾向にあります。特に「構成力」と「表現力」は平均を上回る成長を見せています。一方で「論拠の具体性」にはまだ改善の余地があります。AP連動の意識も高まってきており、この調子で練習を続ければさらなる成長が期待できます。面接練習との相乗効果も出始めており、志望理由の一貫性が添削結果にも表れています。",
  comparisonToAvg: [
    { area: "構成力", myScore: 7.5, avgScore: 6.2 },
    { area: "論理性", myScore: 6.8, avgScore: 6.5 },
    { area: "表現力", myScore: 8.0, avgScore: 6.8 },
    { area: "AP連動", myScore: 7.2, avgScore: 6.0 },
    { area: "独自性", myScore: 6.5, avgScore: 6.3 },
  ],
  recommendations: [
    "論拠に使えるデータや事例を日頃からメモする習慣をつけましょう。新聞やニュースサイトから関連トピックの統計を集めると効果的です。",
    "添削後48時間以内に同じテーマで書き直すと、フィードバックが定着しやすくなります。",
    "志望大学のAPを改めて読み直し、自分の経験との接点を3つ以上書き出してみましょう。",
  ],
  generatedAt: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(MOCK_REPORT);
    }

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      // DB未接続: API_KEYがあればモックデータでAI生成、なければモックレポート返却
      if (!apiKey) {
        return NextResponse.json(MOCK_REPORT);
      }

      try {
        const { buildGrowthReportPrompt } = await import("@/lib/ai/prompts/growth-report");
        const Anthropic = (await import("@anthropic-ai/sdk")).default;

        const mockScoreTrend = "3/1: 28点, 3/5: 31点, 3/10: 38点, 3/15: 34点, 3/20: 40点";
        const mockWeaknesses = "論拠の具体性(5回,未改善), AP連動表現(3回,改善中), 構成力(2回,改善中)";
        const mockAvgComparison = "構成力: 全体平均 6.2\n論理性: 全体平均 6.5\n表現力: 全体平均 6.8\nAP連動: 全体平均 6.0\n独自性: 全体平均 6.3";

        const prompt = buildGrowthReportPrompt(mockWeaknesses, mockScoreTrend, mockAvgComparison);

        const client = new Anthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        const rawText = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);

        if (!jsonMatch) {
          return NextResponse.json(MOCK_REPORT);
        }

        const parsed = JSON.parse(jsonMatch[1]);

        const report: GrowthReport = {
          summary: parsed.summary ?? MOCK_REPORT.summary,
          comparisonToAvg: MOCK_REPORT.comparisonToAvg,
          recommendations: parsed.recommendations ?? MOCK_REPORT.recommendations,
          generatedAt: new Date().toISOString(),
        };

        return NextResponse.json(report);
      } catch (err) {
        console.warn("Growth report generation failed (mock mode), using fallback:", err);
        return NextResponse.json(MOCK_REPORT);
      }
    }

    // Firestoreからデータ収集してAI生成
    try {
      const { buildGrowthReportPrompt } = await import("@/lib/ai/prompts/growth-report");
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const { collection, getDocs, query, orderBy } = await import("firebase/firestore");

      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");

      // ユーザー固有データ取得
      let scoreTrend = "";
      let weaknessList = "";

      if (userId) {
        // essays サブコレクション → スコア推移文字列
        const essaysSnap = await getDocs(
          query(collection(db, "users", userId, "essays"), orderBy("submittedAt", "desc"))
        );
        scoreTrend = essaysSnap.docs
          .map((d) => {
            const data = d.data();
            const date = data.submittedAt?.toDate?.()
              ? data.submittedAt.toDate().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
              : "不明";
            return `${date}: ${data.scores?.total ?? "?"}点`;
          })
          .reverse()
          .join(", ");

        // weaknesses サブコレクション → 弱点リスト文字列
        const weakSnap = await getDocs(collection(db, "users", userId, "weaknesses"));
        weaknessList = weakSnap.docs
          .map((d) => {
            const data = d.data();
            const status = data.resolved ? "解決" : data.improving ? "改善中" : "未改善";
            return `${data.area}(${data.count}回,${status})`;
          })
          .join(", ");
      }

      if (!scoreTrend) scoreTrend = "（データなし）";
      if (!weaknessList) weaknessList = "（データなし）";

      // 全体平均を算出
      const essaysSnap = await getDocs(collection(db, "essays"));
      const allScores = essaysSnap.docs
        .map((d) => d.data().scores)
        .filter((s) => s?.total);

      const avgScores = {
        structure: avg(allScores.map((s) => s.structure)),
        logic: avg(allScores.map((s) => s.logic)),
        expression: avg(allScores.map((s) => s.expression)),
        apAlignment: avg(allScores.map((s) => s.apAlignment)),
        originality: avg(allScores.map((s) => s.originality)),
      };

      const avgComparison = Object.entries(avgScores)
        .map(([k, v]) => `${k}: 全体平均 ${v}`)
        .join("\n");

      const prompt = buildGrowthReportPrompt(weaknessList, scoreTrend, avgComparison);

      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        return NextResponse.json(MOCK_REPORT);
      }

      const parsed = JSON.parse(jsonMatch[1]);

      const report: GrowthReport = {
        summary: parsed.summary ?? MOCK_REPORT.summary,
        comparisonToAvg: MOCK_REPORT.comparisonToAvg.map((c) => ({
          ...c,
          avgScore: avgScores[c.area as keyof typeof avgScores] ?? c.avgScore,
        })),
        recommendations: parsed.recommendations ?? MOCK_REPORT.recommendations,
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json(report);
    } catch (err) {
      console.warn("Growth report generation failed, using mock:", err);
      return NextResponse.json(MOCK_REPORT);
    }
  } catch (error) {
    console.error("Growth report error:", error);
    return NextResponse.json({ error: "成長レポートの生成中にエラーが発生しました" }, { status: 500 });
  }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

import { NextRequest, NextResponse } from "next/server";
import type { GrowthReport } from "@/lib/types/analytics";

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "成長レポートにはAPIキーが必要です", available: false },
        { status: 503 }
      );
    }

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json(
        { error: "データベースに接続できません" },
        { status: 500 }
      );
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
        return NextResponse.json(
          { error: "AIからの応答を解析できませんでした" },
          { status: 500 }
        );
      }

      const parsed = JSON.parse(jsonMatch[1]);

      const report: GrowthReport = {
        summary: parsed.summary ?? "",
        comparisonToAvg: (parsed.comparisonToAvg ?? []).map((c: { area: string; myScore: number; avgScore?: number }) => ({
          ...c,
          avgScore: avgScores[c.area as keyof typeof avgScores] ?? c.avgScore ?? 0,
        })),
        recommendations: parsed.recommendations ?? [],
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json(report);
    } catch (err) {
      console.error("Growth report generation failed:", err);
      return NextResponse.json(
        { error: "成長レポートの生成に失敗しました" },
        { status: 500 }
      );
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

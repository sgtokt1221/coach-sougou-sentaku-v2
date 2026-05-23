import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { GrowthReport } from "@/lib/types/analytics";

export const maxDuration = 60;

/**
 * GET /api/growth/report?userId={uid}
 *
 * 生徒向け AI 成長レポート (スコア推移 + 全体平均比較 + 改善提案)。
 *
 * 修正履歴:
 * - 旧版は Firebase Client SDK をサーバー側で使っており Firestore Security Rule で
 *   permission denied になっていた。Admin SDK へ書き換え。
 * - essays スキーマも実体に合わせて修正: トップレベル `essays/{essayId}` を userId で
 *   filter (以前は `users/{uid}/essays/` サブコレクションを参照していたが、これは
 *   現行スキーマに存在しない)。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "成長レポートにはAPIキーが必要です", available: false },
      { status: 503 },
    );
  }

  if (!adminDb) {
    return NextResponse.json(
      { error: "データベースに接続できません" },
      { status: 500 },
    );
  }

  try {
    const { buildGrowthReportPrompt } = await import("@/lib/ai/prompts/growth-report");
    const Anthropic = (await import("@anthropic-ai/sdk")).default;

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get("userId");
    // student は自分自身のレポートのみ取得可。admin/teacher/superadmin は明示の userId 必要
    const userId =
      auth.role === "student"
        ? auth.uid
        : queryUserId ?? auth.uid;

    // ユーザー固有データ取得
    let scoreTrend = "(データなし)";
    let weaknessList = "(データなし)";

    if (userId) {
      try {
        // essays トップレベル + userId フィルタ (現行スキーマ)
        const essaysSnap = await adminDb
          .collection("essays")
          .where("userId", "==", userId)
          .get();
        const essayItems = essaysSnap.docs
          .map((d) => {
            const data = d.data() as {
              submittedAt?: { toDate?: () => Date };
              scores?: { total?: number };
            };
            return {
              date: data.submittedAt?.toDate?.() ?? null,
              total: data.scores?.total ?? null,
            };
          })
          .filter((e) => e.date && typeof e.total === "number")
          .sort((a, b) => (a.date!.getTime() - b.date!.getTime()));
        if (essayItems.length > 0) {
          scoreTrend = essayItems
            .map((e) => {
              const dateStr = e.date!.toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
              });
              return `${dateStr}: ${e.total}点`;
            })
            .join(", ");
        }
      } catch (e) {
        console.warn("[growth/report] essays fetch failed:", e);
      }

      try {
        // weaknesses サブコレクション (これは現行スキーマで存在する)
        const weakSnap = await adminDb
          .collection(`users/${userId}/weaknesses`)
          .get();
        const wItems = weakSnap.docs.map((d) => {
          const data = d.data() as {
            area?: string;
            count?: number;
            resolved?: boolean;
            improving?: boolean;
          };
          return data;
        });
        if (wItems.length > 0) {
          weaknessList = wItems
            .map((w) => {
              const status = w.resolved ? "解決" : w.improving ? "改善中" : "未改善";
              return `${w.area ?? "不明"}(${w.count ?? 0}回,${status})`;
            })
            .join(", ");
        }
      } catch (e) {
        console.warn("[growth/report] weaknesses fetch failed:", e);
      }
    }

    // 全体平均を算出 (全 essays から)
    const avgScores = {
      structure: 0,
      logic: 0,
      expression: 0,
      apAlignment: 0,
      originality: 0,
    };
    try {
      const allEssaysSnap = await adminDb.collection("essays").get();
      const allScores = allEssaysSnap.docs
        .map((d) => (d.data() as { scores?: { total?: number } }).scores)
        .filter(
          (
            s,
          ): s is {
            total: number;
            structure: number;
            logic: number;
            expression: number;
            apAlignment: number;
            originality: number;
          } => !!s && typeof s.total === "number",
        );
      if (allScores.length > 0) {
        avgScores.structure = avg(allScores.map((s) => s.structure));
        avgScores.logic = avg(allScores.map((s) => s.logic));
        avgScores.expression = avg(allScores.map((s) => s.expression));
        avgScores.apAlignment = avg(allScores.map((s) => s.apAlignment));
        avgScores.originality = avg(allScores.map((s) => s.originality));
      }
    } catch (e) {
      console.warn("[growth/report] all essays fetch failed:", e);
    }

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

    const rawText =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)\s*```/) ??
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AIからの応答を解析できませんでした" },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const report: GrowthReport = {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      comparisonToAvg: Array.isArray(parsed.comparisonToAvg)
        ? parsed.comparisonToAvg.map(
            (c: { area: string; myScore: number; avgScore?: number }) => ({
              ...c,
              avgScore:
                avgScores[c.area as keyof typeof avgScores] ??
                c.avgScore ??
                0,
            }),
          )
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((r: unknown): r is string => typeof r === "string")
        : [],
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("[growth/report] error:", error);
    return NextResponse.json(
      {
        error: "成長レポートの生成に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import Anthropic from "@anthropic-ai/sdk";
import type { AlertItem } from "@/lib/types/admin";

export const maxDuration = 60;

interface InterventionItem {
  studentUid: string;
  studentName: string;
  recommendation: string;
  reasoning: string;
  severity: "critical" | "high" | "warning";
}

interface InterventionResponse {
  items: InterventionItem[];
}

/**
 * Generate fallback recommendations based on severity and alert type
 */
function generateFallbackRecommendation(
  studentName: string,
  severity: "critical" | "high" | "warning",
  alerts: AlertItem[]
): { recommendation: string; reasoning: string } {
  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const highAlerts = alerts.filter(a => a.severity === "high");

  if (criticalAlerts.length > 0) {
    const alert = criticalAlerts[0];
    switch (alert.type) {
      case "inactive":
        return {
          recommendation: "緊急連絡で学習再開を促す",
          reasoning: "長期間活動していません"
        };
      case "declining":
        return {
          recommendation: "基礎課題の見直しを提案",
          reasoning: "スコア連続下降中です"
        };
      case "document_deadline":
        return {
          recommendation: "期限管理の個別サポート",
          reasoning: "書類期限が迫っています"
        };
      default:
        return {
          recommendation: "個別面談の実施",
          reasoning: "重要な問題が発生中です"
        };
    }
  }

  if (highAlerts.length > 0) {
    return {
      recommendation: "学習方法の見直し指導",
      reasoning: "複数の課題が見られます"
    };
  }

  return {
    recommendation: "現状維持でサポート継続",
    reasoning: "軽微な注意点があります"
  };
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;
    const effectiveRole = (role === "superadmin" && viewAs) ? "admin" : role;

    // Reuse alerts logic from /api/admin/alerts to get the same data
    const alertsUrl = new URL("/api/admin/alerts", request.url);
    if (viewAs) alertsUrl.searchParams.set("viewAs", viewAs);

    const alertsResponse = await fetch(alertsUrl.toString(), {
      headers: {
        Authorization: request.headers.get("Authorization") || "",
        "X-Dev-Role": request.headers.get("X-Dev-Role") || "",
      }
    });

    if (!alertsResponse.ok) {
      console.warn("Failed to fetch alerts for intervention recommendations");
      return NextResponse.json({ items: [] });
    }

    const alerts: AlertItem[] = await alertsResponse.json();

    // Get top 5 students with critical/high severity alerts
    const criticalHighAlerts = alerts.filter(a =>
      (a.severity === "critical" || a.severity === "high") && !a.acknowledged
    );

    const studentAlertMap = new Map<string, AlertItem[]>();
    criticalHighAlerts.forEach(alert => {
      const existing = studentAlertMap.get(alert.studentUid) || [];
      existing.push(alert);
      studentAlertMap.set(alert.studentUid, existing);
    });

    // Sort by severity priority and take top 5
    const sortedStudents = Array.from(studentAlertMap.entries())
      .map(([studentUid, studentAlerts]) => {
        const criticalCount = studentAlerts.filter(a => a.severity === "critical").length;
        const highCount = studentAlerts.filter(a => a.severity === "high").length;
        const maxSeverity = criticalCount > 0 ? "critical" : "high";
        return {
          studentUid,
          studentName: studentAlerts[0].studentName,
          alerts: studentAlerts,
          severity: maxSeverity as "critical" | "high",
          priority: criticalCount * 10 + highCount
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    if (sortedStudents.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Generate recommendations for each student
    const interventionItems: InterventionItem[] = [];

    for (const student of sortedStudents) {
      let recommendation: string;
      let reasoning: string;

      if (apiKey) {
        try {
          const client = new Anthropic({ apiKey });

          // Prepare alert summaries
          const alertSummary = student.alerts
            .map(a => `${a.type}(${a.severity}): ${a.message}`)
            .join(", ");

          const systemPrompt = `あなたは総合型選抜専門塾の経験豊富な講師です。
生徒の状況を分析し、今週とるべき具体的な介入アクションを1つ提案してください。

出力形式（JSON）:
{
  "recommendation": "40字以内の具体的なアクション",
  "reasoning": "30字以内の簡潔な理由"
}`;

          const userMessage = `【生徒】${student.studentName}
【アラート】${alertSummary}

この生徒に対して、講師が今週とるべき介入アクションを提案してください。`;

          const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }]
          });

          const responseText = response.content[0].type === "text" ? response.content[0].text : "";

          // Extract JSON from response
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
            responseText.match(/(\{[\s\S]*?\})/);

          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1]);
            recommendation = parsed.recommendation || "";
            reasoning = parsed.reasoning || "";
          } else {
            throw new Error("Could not parse AI response");
          }
        } catch (error) {
          console.warn(`Claude API failed for student ${student.studentUid}:`, error);
          // Fall back to rule-based recommendation
          const fallback = generateFallbackRecommendation(
            student.studentName,
            student.severity,
            student.alerts
          );
          recommendation = fallback.recommendation;
          reasoning = fallback.reasoning;
        }
      } else {
        // No API key - use rule-based recommendations
        const fallback = generateFallbackRecommendation(
          student.studentName,
          student.severity,
          student.alerts
        );
        recommendation = fallback.recommendation;
        reasoning = fallback.reasoning;
      }

      interventionItems.push({
        studentUid: student.studentUid,
        studentName: student.studentName,
        recommendation: recommendation.slice(0, 40), // Ensure length limit
        reasoning: reasoning.slice(0, 30), // Ensure length limit
        severity: student.severity
      });
    }

    return NextResponse.json({ items: interventionItems } satisfies InterventionResponse);
  } catch (error) {
    console.error("Intervention recommendations error:", error);
    return NextResponse.json({ items: [] });
  }
}
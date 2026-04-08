import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { WeaknessAnalytics } from "@/lib/types/analytics";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin", "teacher"]);
  if (authResult instanceof NextResponse) return authResult;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    try {
      const weaknessesSnap = await adminDb.collectionGroup("weaknesses").get();
      if (weaknessesSnap.empty) {
        return NextResponse.json({ topWeaknesses: [], avgDaysToResolve: 0, universityGap: [], improvementPatterns: [] });
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
          : 0;

      const result: WeaknessAnalytics = {
        topWeaknesses,
        avgDaysToResolve,
        universityGap: [],
        improvementPatterns: [],
      };

      return NextResponse.json(result);
    } catch (err) {
      console.error("Firestore weakness analytics fetch failed:", err);
      return NextResponse.json({ error: "データの取得中にエラーが発生しました" }, { status: 500 });
    }
  } catch (error) {
    console.error("Weakness analytics error:", error);
    return NextResponse.json({ error: "弱点分析データの取得中にエラーが発生しました" }, { status: 500 });
  }
}

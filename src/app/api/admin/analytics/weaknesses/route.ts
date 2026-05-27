import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { WeaknessAnalytics } from "@/lib/types/analytics";
import {
  categorizeWeakness,
  ESSAY_CATEGORY_LABELS,
  ESSAY_CATEGORY_ORDER,
  type EssayCategoryKey,
} from "@/lib/growth/weakness-category";

type AreaEntry = {
  count: number;
  improving: number;
  resolved: number;
  totalDays: number;
  students: Set<string>;
};

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
        return NextResponse.json<WeaknessAnalytics>({
          topWeaknesses: [],
          byCategory: [],
          avgDaysToResolve: 0,
          universityGap: [],
          improvementPatterns: [],
        });
      }

      // 二段ネスト Map: categoryId → areaMap
      const byCat = new Map<EssayCategoryKey, Map<string, AreaEntry>>();
      const flatArea = new Map<string, AreaEntry & { categoryId: EssayCategoryKey }>();

      for (const docSnap of weaknessesSnap.docs) {
        const w = docSnap.data();
        if (w.archivedAt) continue; // Phase 4: archive 済みは集計対象外
        const area = w.area ?? "unknown";
        const cat: EssayCategoryKey = (w.categoryId as EssayCategoryKey) ?? categorizeWeakness(area);
        const uid = docSnap.ref.parent.parent?.id ?? "";

        if (!byCat.has(cat)) byCat.set(cat, new Map());
        const inner = byCat.get(cat)!;
        const entry = inner.get(area) ?? {
          count: 0,
          improving: 0,
          resolved: 0,
          totalDays: 0,
          students: new Set<string>(),
        };
        entry.count += w.count ?? 1;
        if (w.improving) entry.improving++;
        if (w.resolved) {
          entry.resolved++;
          const first = w.firstOccurred?.toDate?.() ?? new Date(w.firstOccurred);
          const last = w.lastOccurred?.toDate?.() ?? new Date(w.lastOccurred);
          entry.totalDays += Math.max(
            1,
            Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)),
          );
        }
        if (uid) entry.students.add(uid);
        inner.set(area, entry);

        // フラットも同時更新
        const flat = flatArea.get(area) ?? {
          count: 0,
          improving: 0,
          resolved: 0,
          totalDays: 0,
          students: new Set<string>(),
          categoryId: cat,
        };
        flat.count += w.count ?? 1;
        if (w.improving) flat.improving++;
        if (w.resolved) {
          flat.resolved++;
          const first = w.firstOccurred?.toDate?.() ?? new Date(w.firstOccurred);
          const last = w.lastOccurred?.toDate?.() ?? new Date(w.lastOccurred);
          flat.totalDays += Math.max(
            1,
            Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)),
          );
        }
        if (uid) flat.students.add(uid);
        flatArea.set(area, flat);
      }

      // 既存形式 (= フラット Top 10) + categoryId 付き
      const topWeaknesses = Array.from(flatArea.entries())
        .map(([area, data]) => ({
          area,
          count: data.count,
          improvementRate:
            data.count > 0
              ? Math.round(
                  ((data.improving + data.resolved) /
                    (data.improving + data.resolved + 1)) *
                    100,
                )
              : 0,
          categoryId: data.categoryId,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // カテゴリ別集計
      const byCategory = ESSAY_CATEGORY_ORDER.flatMap((cat) => {
        const inner = byCat.get(cat);
        if (!inner || inner.size === 0) return [];
        const items = [...inner.entries()].map(([area, data]) => ({
          area,
          count: data.count,
          improvementRate:
            data.count > 0
              ? Math.round(
                  ((data.improving + data.resolved) /
                    (data.improving + data.resolved + 1)) *
                    100,
                )
              : 0,
        }));
        const totalCount = items.reduce((s, x) => s + x.count, 0);
        const studentSet = new Set<string>();
        for (const e of inner.values()) {
          for (const uid of e.students) studentSet.add(uid);
        }
        return [
          {
            categoryId: cat,
            label: ESSAY_CATEGORY_LABELS[cat],
            totalCount,
            studentCount: studentSet.size,
            topItems: items
              .sort((a, b) => b.count - a.count)
              .slice(0, 5),
          },
        ];
      }).sort((a, b) => b.totalCount - a.totalCount);

      const resolvedEntries = Array.from(flatArea.values()).filter((d) => d.resolved > 0);
      const avgDaysToResolve =
        resolvedEntries.length > 0
          ? Math.round(
              (resolvedEntries.reduce(
                (sum, d) => sum + d.totalDays / d.resolved,
                0,
              ) /
                resolvedEntries.length) *
                10,
            ) / 10
          : 0;

      const result: WeaknessAnalytics = {
        topWeaknesses,
        byCategory,
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

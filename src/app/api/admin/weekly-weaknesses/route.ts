import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface WeaknessEntry {
  area: string;
  count: number;
  studentCount: number;
}

interface WeeklyWeaknessesResponse {
  weeklyTop: WeaknessEntry[];
  comparedToLastWeek: {
    improved: string[];
    worsened: string[];
    new: string[];
  };
}

const MOCK_RESPONSE: WeeklyWeaknessesResponse = {
  weeklyTop: [
    { area: "論拠となるデータ・事例の不足", count: 8, studentCount: 5 },
    { area: "構成の不明確さ", count: 6, studentCount: 4 },
    { area: "接続詞のバリエーション不足", count: 5, studentCount: 3 },
    { area: "口語的表現の使用", count: 4, studentCount: 3 },
    { area: "結論の弱さ", count: 3, studentCount: 2 },
  ],
  comparedToLastWeek: {
    improved: ["表現力の不足"],
    worsened: ["構成の不明確さ"],
    new: ["接続詞のバリエーション不足"],
  },
};

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(MOCK_RESPONSE);
    }

    // Get managed student IDs for scoping
    let studentIds: string[] = [];
    if (role === "superadmin") {
      const snap = await adminDb.collection("users").where("role", "==", "student").get();
      studentIds = snap.docs.map((d) => d.id);
    } else {
      const snap = await adminDb.collection("users").where("managedBy", "==", uid).get();
      studentIds = snap.docs.map((d) => d.id);
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ weeklyTop: [], comparedToLastWeek: { improved: [], worsened: [], new: [] } });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Aggregate weaknesses for this week and last week
    const thisWeekMap = new Map<string, Set<string>>();
    const lastWeekMap = new Map<string, Set<string>>();

    for (const studentId of studentIds) {
      const weakSnap = await adminDb.collection(`users/${studentId}/weaknesses`).get();
      for (const doc of weakSnap.docs) {
        const data = doc.data();
        if (data.resolved) continue;

        const lastOccurred = data.lastOccurred?.toDate?.() ?? null;
        if (!lastOccurred) continue;

        const area = data.area ?? doc.id;

        // This week
        if (lastOccurred >= oneWeekAgo) {
          if (!thisWeekMap.has(area)) thisWeekMap.set(area, new Set());
          thisWeekMap.get(area)!.add(studentId);
        }

        // Last week (for comparison)
        if (lastOccurred >= twoWeeksAgo && lastOccurred < oneWeekAgo) {
          if (!lastWeekMap.has(area)) lastWeekMap.set(area, new Set());
          lastWeekMap.get(area)!.add(studentId);
        }
      }
    }

    // Build weekly top
    const weeklyTop: WeaknessEntry[] = Array.from(thisWeekMap.entries())
      .map(([area, students]) => ({
        area,
        count: students.size,
        studentCount: students.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    // Compare to last week
    const thisWeekAreas = new Set(thisWeekMap.keys());
    const lastWeekAreas = new Set(lastWeekMap.keys());

    const improved: string[] = [];
    const worsened: string[] = [];
    const newAreas: string[] = [];

    for (const area of thisWeekAreas) {
      if (!lastWeekAreas.has(area)) {
        newAreas.push(area);
      } else {
        const thisCount = thisWeekMap.get(area)!.size;
        const lastCount = lastWeekMap.get(area)!.size;
        if (thisCount > lastCount) worsened.push(area);
      }
    }
    for (const area of lastWeekAreas) {
      if (!thisWeekAreas.has(area)) {
        improved.push(area);
      }
    }

    return NextResponse.json({
      weeklyTop,
      comparedToLastWeek: {
        improved: improved.slice(0, 3),
        worsened: worsened.slice(0, 3),
        new: newAreas.slice(0, 3),
      },
    });
  } catch (error) {
    console.error("Weekly weaknesses error:", error);
    return NextResponse.json(
      { error: "弱点集計中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

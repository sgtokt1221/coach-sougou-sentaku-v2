import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface WeaknessEntry {
  area: string;
  count: number;
  studentCount: number;
  sources: string[]; // ["essay", "interview", "skill_check", "interview_skill_check", "both"]
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
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
    const thisWeekSources = new Map<string, Set<string>>(); // area → sources set

    for (const studentId of studentIds) {
      const weakSnap = await adminDb.collection(`users/${studentId}/weaknesses`).get();
      for (const doc of weakSnap.docs) {
        const data = doc.data();
        if (data.resolved) continue;

        const lastOccurred = data.lastOccurred?.toDate?.() ?? null;
        if (!lastOccurred) continue;

        const area = data.area ?? doc.id;
        const source = (data.source ?? "essay") as string;

        // This week
        if (lastOccurred >= oneWeekAgo) {
          if (!thisWeekMap.has(area)) thisWeekMap.set(area, new Set());
          thisWeekMap.get(area)!.add(studentId);
          if (!thisWeekSources.has(area)) thisWeekSources.set(area, new Set());
          thisWeekSources.get(area)!.add(source);
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
        sources: Array.from(thisWeekSources.get(area) ?? []),
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

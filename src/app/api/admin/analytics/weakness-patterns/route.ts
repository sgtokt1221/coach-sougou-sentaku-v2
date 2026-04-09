import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { WeaknessPattern, WeaknessPatternsResponse } from "@/lib/types/analytics";

const MOCK_PATTERNS: WeaknessPattern[] = [
  {
    weakness: "論理的一貫性の欠如",
    occurrenceCount: 45,
    resolvedCount: 28,
    resolutionRate: 62.2,
    avgResolutionDays: 14,
    affectedStudents: 12,
    relatedUniversities: ["東京大学", "京都大学", "早稲田大学"],
  },
  {
    weakness: "AP合致度不足",
    occurrenceCount: 38,
    resolvedCount: 15,
    resolutionRate: 39.5,
    avgResolutionDays: 21,
    affectedStudents: 10,
    relatedUniversities: ["東京大学", "大阪大学", "同志社大学"],
  },
  {
    weakness: "具体例の不足",
    occurrenceCount: 32,
    resolvedCount: 22,
    resolutionRate: 68.8,
    avgResolutionDays: 10,
    affectedStudents: 9,
    relatedUniversities: ["早稲田大学", "慶應義塾大学", "明治大学"],
  },
  {
    weakness: "結論の曖昧さ",
    occurrenceCount: 28,
    resolvedCount: 20,
    resolutionRate: 71.4,
    avgResolutionDays: 8,
    affectedStudents: 8,
    relatedUniversities: ["京都大学", "大阪大学"],
  },
  {
    weakness: "序論の弱さ",
    occurrenceCount: 25,
    resolvedCount: 18,
    resolutionRate: 72.0,
    avgResolutionDays: 7,
    affectedStudents: 7,
    relatedUniversities: ["同志社大学", "立命館大学", "関西大学"],
  },
  {
    weakness: "段落構成の乱れ",
    occurrenceCount: 22,
    resolvedCount: 14,
    resolutionRate: 63.6,
    avgResolutionDays: 12,
    affectedStudents: 6,
    relatedUniversities: ["東京大学", "早稲田大学"],
  },
  {
    weakness: "表現の単調さ",
    occurrenceCount: 20,
    resolvedCount: 16,
    resolutionRate: 80.0,
    avgResolutionDays: 6,
    affectedStudents: 8,
    relatedUniversities: ["慶應義塾大学", "明治大学", "立教大学"],
  },
  {
    weakness: "志望理由の深掘り不足",
    occurrenceCount: 18,
    resolvedCount: 8,
    resolutionRate: 44.4,
    avgResolutionDays: 18,
    affectedStudents: 5,
    relatedUniversities: ["京都大学", "大阪大学", "東京大学"],
  },
  {
    weakness: "時事問題の理解不足",
    occurrenceCount: 15,
    resolvedCount: 10,
    resolutionRate: 66.7,
    avgResolutionDays: 15,
    affectedStudents: 4,
    relatedUniversities: ["早稲田大学", "慶應義塾大学"],
  },
  {
    weakness: "面接での話し方",
    occurrenceCount: 12,
    resolvedCount: 9,
    resolutionRate: 75.0,
    avgResolutionDays: 11,
    affectedStudents: 6,
    relatedUniversities: ["同志社大学", "関西学院大学", "立命館大学"],
  },
];

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin", "teacher"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    if (!adminDb) {
      const totalWeaknesses = MOCK_PATTERNS.reduce((sum, p) => sum + p.occurrenceCount, 0);
      const totalResolved = MOCK_PATTERNS.reduce((sum, p) => sum + p.resolvedCount, 0);
      const overallRate =
        totalWeaknesses > 0
          ? Math.round((totalResolved / totalWeaknesses) * 1000) / 10
          : 0;
      const avgDays =
        MOCK_PATTERNS.length > 0
          ? Math.round(
              MOCK_PATTERNS.reduce((sum, p) => sum + p.avgResolutionDays, 0) /
                MOCK_PATTERNS.length
            )
          : 0;

      const response: WeaknessPatternsResponse = {
        patterns: MOCK_PATTERNS,
        totalWeaknesses,
        overallResolutionRate: overallRate,
        avgResolutionDays: avgDays,
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    // Scoping
    const studentIdSet: Set<string> | null = await (async () => {
      if (role === "superadmin") return null;
      const studentsSnap = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .where("managedBy", "==", uid)
        .get();
      return new Set(studentsSnap.docs.map((d) => d.id));
    })();

    if (studentIdSet && studentIdSet.size === 0) {
      return NextResponse.json({
        patterns: [],
        totalWeaknesses: 0,
        overallResolutionRate: 0,
        avgResolutionDays: 0,
        generatedAt: new Date().toISOString(),
      } satisfies WeaknessPatternsResponse);
    }

    // Fetch all weakness subcollections
    const weaknessesSnap = await adminDb.collectionGroup("weaknesses").get();

    // Map: weakness area -> aggregated data
    const patternMap = new Map<
      string,
      {
        occurrenceCount: number;
        resolvedCount: number;
        totalResolutionDays: number;
        studentSet: Set<string>;
        universitySet: Set<string>;
      }
    >();

    // Also fetch student target universities for correlation
    const studentUniMap = new Map<string, string[]>();

    for (const doc of weaknessesSnap.docs) {
      // Extract userId from path: users/{userId}/weaknesses/{weaknessId}
      const pathParts = doc.ref.path.split("/");
      const userId = pathParts[1];

      if (studentIdSet && !studentIdSet.has(userId)) continue;

      const data = doc.data();
      const area = (data.area as string) ?? "unknown";
      const count = (data.count as number) ?? 1;
      const resolved = data.resolved === true || data.dismissed === true;

      if (!patternMap.has(area)) {
        patternMap.set(area, {
          occurrenceCount: 0,
          resolvedCount: 0,
          totalResolutionDays: 0,
          studentSet: new Set(),
          universitySet: new Set(),
        });
      }

      const entry = patternMap.get(area)!;
      entry.occurrenceCount += count;
      entry.studentSet.add(userId);

      if (resolved) {
        entry.resolvedCount++;
        const first = data.firstOccurred?.toDate?.() ?? new Date(data.firstOccurred);
        const last = data.lastOccurred?.toDate?.() ?? new Date(data.lastOccurred);
        const days = Math.max(
          1,
          Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
        );
        entry.totalResolutionDays += days;
      }

      // Fetch student's target universities if not already fetched
      if (!studentUniMap.has(userId)) {
        try {
          const userDoc = await adminDb.doc(`users/${userId}`).get();
          const targets = (userDoc.data()?.targetUniversities as string[]) ?? [];
          studentUniMap.set(userId, targets);
        } catch {
          studentUniMap.set(userId, []);
        }
      }

      const targets = studentUniMap.get(userId) ?? [];
      for (const target of targets) {
        const uniId = target.split(":")[0];
        entry.universitySet.add(uniId);
      }
    }

    // Resolve university names
    const allUniIds = new Set<string>();
    for (const entry of patternMap.values()) {
      for (const id of entry.universitySet) {
        allUniIds.add(id);
      }
    }

    const uniNameMap = new Map<string, string>();
    for (const uniId of allUniIds) {
      try {
        const uniDoc = await adminDb.doc(`universities/${uniId}`).get();
        if (uniDoc.exists) {
          uniNameMap.set(uniId, (uniDoc.data()?.name as string) ?? uniId);
        } else {
          uniNameMap.set(uniId, uniId);
        }
      } catch {
        uniNameMap.set(uniId, uniId);
      }
    }

    const patterns: WeaknessPattern[] = Array.from(patternMap.entries())
      .map(([area, data]) => ({
        weakness: area,
        occurrenceCount: data.occurrenceCount,
        resolvedCount: data.resolvedCount,
        resolutionRate:
          data.occurrenceCount > 0
            ? Math.round((data.resolvedCount / data.occurrenceCount) * 1000) / 10
            : 0,
        avgResolutionDays:
          data.resolvedCount > 0
            ? Math.round(data.totalResolutionDays / data.resolvedCount)
            : 0,
        affectedStudents: data.studentSet.size,
        relatedUniversities: Array.from(data.universitySet).map(
          (id) => uniNameMap.get(id) ?? id
        ),
      }))
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

    const totalWeaknesses = patterns.reduce((sum, p) => sum + p.occurrenceCount, 0);
    const totalResolved = patterns.reduce((sum, p) => sum + p.resolvedCount, 0);
    const overallResolutionRate =
      totalWeaknesses > 0
        ? Math.round((totalResolved / totalWeaknesses) * 1000) / 10
        : 0;
    const avgResolutionDays =
      patterns.filter((p) => p.avgResolutionDays > 0).length > 0
        ? Math.round(
            patterns
              .filter((p) => p.avgResolutionDays > 0)
              .reduce((sum, p) => sum + p.avgResolutionDays, 0) /
              patterns.filter((p) => p.avgResolutionDays > 0).length
          )
        : 0;

    const response: WeaknessPatternsResponse = {
      patterns,
      totalWeaknesses,
      overallResolutionRate,
      avgResolutionDays,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Weakness patterns error:", error);
    return NextResponse.json(
      { error: "弱点パターンデータの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

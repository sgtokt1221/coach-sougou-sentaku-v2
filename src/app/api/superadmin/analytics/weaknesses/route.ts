import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type {
  WeaknessAggregate,
  WeaknessAggregateResponse,
  WeaknessSource,
} from "@/lib/types/superadmin-analytics";

const MAX_STUDENTS_PER_AREA = 20;
const MAX_AREAS = 50;
const TREND_WEEKS = 8;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function parseSource(input: string | null): WeaknessSource {
  if (input === "essay" || input === "interview") return input;
  return "all";
}

function allowedSources(source: WeaknessSource): Set<string> {
  if (source === "essay") return new Set(["essay", "both"]);
  if (source === "interview")
    return new Set(["interview", "interview_skill_check", "both"]);
  return new Set([
    "essay",
    "interview",
    "interview_skill_check",
    "skill_check",
    "both",
  ]);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  // Firestore Timestamp
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof Date) return value;
  return null;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const source = parseSource(searchParams.get("source"));
  const sourceFilter = allowedSources(source);

  try {
    const weaknessesSnap = await adminDb.collectionGroup("weaknesses").get();

    // 生徒名キャッシュ
    const userDisplayMap = new Map<string, string>();
    const fetchUserName = async (uid: string): Promise<string> => {
      if (userDisplayMap.has(uid)) return userDisplayMap.get(uid)!;
      try {
        const doc = await adminDb.doc(`users/${uid}`).get();
        const name =
          (doc.data()?.displayName as string) ??
          (doc.data()?.email as string) ??
          uid;
        userDisplayMap.set(uid, name);
        return name;
      } catch {
        userDisplayMap.set(uid, uid);
        return uid;
      }
    };

    const now = Date.now();
    const weekStart = now - TREND_WEEKS * MS_PER_WEEK;

    type StudentAgg = {
      uid: string;
      occurrences: number;
      lastSeenAt?: string;
      resolved?: boolean;
    };
    type AreaEntry = {
      area: string;
      totalOccurrences: number;
      resolvedCount: number;
      studentMap: Map<string, StudentAgg>;
      weeklyTrend: number[]; // length TREND_WEEKS
    };
    const areaMap = new Map<string, AreaEntry>();

    let totalRecords = 0;

    for (const doc of weaknessesSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const recordSource = (data.source as string) ?? "essay";
      if (!sourceFilter.has(recordSource)) continue;

      const pathParts = doc.ref.path.split("/");
      const uid = pathParts[1];
      if (!uid) continue;

      const area = (data.area as string) ?? "unknown";
      const count =
        typeof data.count === "number" && data.count > 0 ? data.count : 1;
      const resolved = data.resolved === true || data.dismissed === true;
      const lastOccurred = toDate(data.lastOccurred);

      totalRecords++;

      if (!areaMap.has(area)) {
        areaMap.set(area, {
          area,
          totalOccurrences: 0,
          resolvedCount: 0,
          studentMap: new Map(),
          weeklyTrend: new Array(TREND_WEEKS).fill(0),
        });
      }
      const entry = areaMap.get(area)!;
      entry.totalOccurrences += count;
      if (resolved) entry.resolvedCount += 1;

      // 生徒別集計
      const existing = entry.studentMap.get(uid);
      if (existing) {
        existing.occurrences += count;
        if (
          lastOccurred &&
          (!existing.lastSeenAt ||
            new Date(existing.lastSeenAt) < lastOccurred)
        ) {
          existing.lastSeenAt = lastOccurred.toISOString();
        }
        if (resolved) existing.resolved = true;
      } else {
        entry.studentMap.set(uid, {
          uid,
          occurrences: count,
          lastSeenAt: lastOccurred ? lastOccurred.toISOString() : undefined,
          resolved: resolved || undefined,
        });
      }

      // 週次トレンド (lastOccurred をバケット化)
      if (lastOccurred && lastOccurred.getTime() >= weekStart) {
        const weekIdx = Math.min(
          TREND_WEEKS - 1,
          Math.floor((lastOccurred.getTime() - weekStart) / MS_PER_WEEK),
        );
        entry.weeklyTrend[weekIdx] += 1;
      }
    }

    // 上位 MAX_AREAS に絞り、生徒名解決
    const sorted = Array.from(areaMap.values())
      .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
      .slice(0, MAX_AREAS);

    const aggregates: WeaknessAggregate[] = await Promise.all(
      sorted.map(async (entry) => {
        const students = Array.from(entry.studentMap.values())
          .sort((a, b) => b.occurrences - a.occurrences)
          .slice(0, MAX_STUDENTS_PER_AREA);
        const resolvedForNames = await Promise.all(
          students.map(async (s) => ({
            ...s,
            displayName: await fetchUserName(s.uid),
          })),
        );
        const first4 = entry.weeklyTrend
          .slice(0, 4)
          .reduce((a, b) => a + b, 0);
        const last4 = entry.weeklyTrend
          .slice(4)
          .reduce((a, b) => a + b, 0);
        const trendRatio = first4 === 0 ? (last4 > 0 ? 2 : 1) : last4 / first4;
        return {
          area: entry.area,
          totalOccurrences: entry.totalOccurrences,
          affectedStudents: entry.studentMap.size,
          resolvedCount: entry.resolvedCount,
          weeklyTrend: entry.weeklyTrend,
          trendRatio: Math.round(trendRatio * 100) / 100,
          students: resolvedForNames,
        };
      }),
    );

    const response: WeaknessAggregateResponse = {
      aggregates,
      source,
      totalRecords,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("superadmin/analytics/weaknesses error:", error);
    return NextResponse.json(
      { error: "弱点集計の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type {
  UniversityAggregate,
  UniversityAggregateResponse,
  UniversityAggregateStudent,
} from "@/lib/types/superadmin-analytics";

interface ResolvedName {
  universityName: string;
  facultyName: string;
}

const MAX_STUDENTS_PER_ROW = 30;

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    // 全生徒取得
    const studentsSnap = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .get();

    type CompoundKey = string; // "univId:facId"
    const bucket = new Map<
      CompoundKey,
      { students: UniversityAggregateStudent[] }
    >();
    const studentsWithTargets = new Set<string>();

    for (const doc of studentsSnap.docs) {
      const data = doc.data();
      const targets = Array.isArray(data.targetUniversities)
        ? (data.targetUniversities as string[])
        : [];
      if (targets.length === 0) continue;
      studentsWithTargets.add(doc.id);

      const studentEntry: UniversityAggregateStudent = {
        uid: doc.id,
        displayName:
          (data.displayName as string) ??
          (data.email as string) ??
          "(名称未設定)",
        email: (data.email as string) ?? "",
      };

      for (const target of targets) {
        if (typeof target !== "string" || !target.includes(":")) continue;
        const [universityId, facultyId] = target.split(":");
        if (!universityId || !facultyId) continue;
        const key: CompoundKey = `${universityId}:${facultyId}`;
        if (!bucket.has(key)) bucket.set(key, { students: [] });
        bucket.get(key)!.students.push(studentEntry);
      }
    }

    // 大学・学部名を解決 (Firestore の universities を優先、なければ MOCK)
    const neededUniIds = new Set<string>();
    for (const key of bucket.keys()) {
      neededUniIds.add(key.split(":")[0]);
    }
    const nameMap = new Map<string, ResolvedName>();
    for (const uniId of neededUniIds) {
      let resolved: Record<string, ResolvedName> | null = null;
      try {
        const uniDoc = await adminDb.doc(`universities/${uniId}`).get();
        if (uniDoc.exists) {
          const uniData = uniDoc.data() as {
            name?: string;
            faculties?: Array<{ id: string; name?: string }>;
          };
          resolved = {};
          for (const f of uniData.faculties ?? []) {
            resolved[`${uniId}:${f.id}`] = {
              universityName: uniData.name ?? uniId,
              facultyName: f.name ?? f.id,
            };
          }
        }
      } catch {
        // fallthrough to mock
      }
      if (!resolved) {
        const mock = MOCK_UNIVERSITIES.find((u) => u.id === uniId);
        if (mock) {
          resolved = {};
          for (const f of mock.faculties) {
            resolved[`${uniId}:${f.id}`] = {
              universityName: mock.name,
              facultyName: f.name,
            };
          }
        }
      }
      if (resolved) {
        for (const [k, v] of Object.entries(resolved)) {
          nameMap.set(k, v);
        }
      }
    }

    const aggregates: UniversityAggregate[] = Array.from(bucket.entries())
      .map(([key, { students }]) => {
        const [universityId, facultyId] = key.split(":");
        const names = nameMap.get(key);
        return {
          universityId,
          facultyId,
          universityName: names?.universityName ?? universityId,
          facultyName: names?.facultyName ?? facultyId,
          studentCount: students.length,
          students: students.slice(0, MAX_STUDENTS_PER_ROW),
        };
      })
      .sort((a, b) => {
        if (b.studentCount !== a.studentCount)
          return b.studentCount - a.studentCount;
        return a.universityName.localeCompare(b.universityName, "ja");
      });

    const response: UniversityAggregateResponse = {
      aggregates,
      totalStudents: studentsWithTargets.size,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("superadmin/analytics/universities error:", error);
    return NextResponse.json(
      { error: "志望校集計の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  UniversityGapAnalysis,
  UniversityGapResponse,
  GapItem,
} from "@/lib/types/analytics";

const MOCK_GAPS: UniversityGapAnalysis[] = [
  {
    universityId: "tokyo-u",
    universityName: "東京大学",
    facultyId: "law",
    facultyName: "法学部",
    avgEssayScore: 34,
    avgInterviewScore: 28,
    requiredScores: { essay: 40, interview: 32 },
    gapAnalysis: [
      { area: "論理性", studentAvg: 6.5, required: 8, gap: -1.5, status: "yellow" },
      { area: "構成", studentAvg: 7, required: 8, gap: -1, status: "yellow" },
      { area: "AP合致度", studentAvg: 5, required: 8, gap: -3, status: "red" },
      { area: "独自性", studentAvg: 7, required: 8, gap: -1, status: "yellow" },
      { area: "表現力", studentAvg: 8.5, required: 8, gap: 0.5, status: "green" },
    ],
    studentCount: 3,
  },
  {
    universityId: "kyoto-u",
    universityName: "京都大学",
    facultyId: "economics",
    facultyName: "経済学部",
    avgEssayScore: 37,
    avgInterviewScore: 30,
    requiredScores: { essay: 38, interview: 30 },
    gapAnalysis: [
      { area: "論理性", studentAvg: 7.5, required: 8, gap: -0.5, status: "green" },
      { area: "構成", studentAvg: 7, required: 7.5, gap: -0.5, status: "green" },
      { area: "AP合致度", studentAvg: 6, required: 7.5, gap: -1.5, status: "yellow" },
      { area: "独自性", studentAvg: 8, required: 7.5, gap: 0.5, status: "green" },
      { area: "表現力", studentAvg: 8.5, required: 7.5, gap: 1, status: "green" },
    ],
    studentCount: 2,
  },
  {
    universityId: "waseda-u",
    universityName: "早稲田大学",
    facultyId: "political-science",
    facultyName: "政治経済学部",
    avgEssayScore: 32,
    avgInterviewScore: 26,
    requiredScores: { essay: 36, interview: 30 },
    gapAnalysis: [
      { area: "論理性", studentAvg: 6, required: 7.5, gap: -1.5, status: "yellow" },
      { area: "構成", studentAvg: 6.5, required: 7, gap: -0.5, status: "green" },
      { area: "AP合致度", studentAvg: 5.5, required: 7.5, gap: -2, status: "red" },
      { area: "独自性", studentAvg: 7, required: 7, gap: 0, status: "green" },
      { area: "表現力", studentAvg: 7, required: 7, gap: 0, status: "green" },
    ],
    studentCount: 1,
  },
  {
    universityId: "osaka-u",
    universityName: "大阪大学",
    facultyId: "law",
    facultyName: "法学部",
    avgEssayScore: 38,
    avgInterviewScore: 31,
    requiredScores: { essay: 38, interview: 30 },
    gapAnalysis: [
      { area: "論理性", studentAvg: 8, required: 7.5, gap: 0.5, status: "green" },
      { area: "構成", studentAvg: 7.5, required: 7.5, gap: 0, status: "green" },
      { area: "AP合致度", studentAvg: 7, required: 7.5, gap: -0.5, status: "green" },
      { area: "独自性", studentAvg: 7.5, required: 7.5, gap: 0, status: "green" },
      { area: "表現力", studentAvg: 8, required: 8, gap: 0, status: "green" },
    ],
    studentCount: 2,
  },
  {
    universityId: "doshisha-u",
    universityName: "同志社大学",
    facultyId: "law",
    facultyName: "法学部",
    avgEssayScore: 25,
    avgInterviewScore: 20,
    requiredScores: { essay: 34, interview: 28 },
    gapAnalysis: [
      { area: "論理性", studentAvg: 5, required: 7, gap: -2, status: "red" },
      { area: "構成", studentAvg: 5, required: 7, gap: -2, status: "red" },
      { area: "AP合致度", studentAvg: 4, required: 7, gap: -3, status: "red" },
      { area: "独自性", studentAvg: 5, required: 6.5, gap: -1.5, status: "yellow" },
      { area: "表現力", studentAvg: 6, required: 6.5, gap: -0.5, status: "green" },
    ],
    studentCount: 1,
  },
];

function computeGapStatus(gap: number): GapItem["status"] {
  if (gap >= -0.5) return "green";
  if (gap >= -2) return "yellow";
  return "red";
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin", "teacher"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    if (!adminDb) {
      const response: UniversityGapResponse = {
        gaps: MOCK_GAPS,
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    // Fetch students with scoping
    let studentsQuery = adminDb.collection("users").where("role", "==", "student");
    if (role !== "superadmin") {
      studentsQuery = studentsQuery.where("managedBy", "==", uid);
    }
    const studentsSnap = await studentsQuery.get();

    if (studentsSnap.empty) {
      return NextResponse.json({
        gaps: [],
        generatedAt: new Date().toISOString(),
      } satisfies UniversityGapResponse);
    }

    // Collect target universities per student and their essay scores
    const universityMap = new Map<
      string,
      {
        universityId: string;
        universityName: string;
        facultyId: string;
        facultyName: string;
        essayScores: number[];
        interviewScores: number[];
        studentIds: Set<string>;
        scoresByArea: Map<string, number[]>;
      }
    >();

    for (const studentDoc of studentsSnap.docs) {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;
      const targets: string[] = studentData.targetUniversities ?? [];

      const essaysSnap = await adminDb
        .collection("essays")
        .where("userId", "==", studentId)
        .get()
        .catch(() => ({ docs: [] as Array<{ data: () => Record<string, unknown> }> }));

      const interviewsSnap = await adminDb
        .collection("interviews")
        .where("userId", "==", studentId)
        .get()
        .catch(() => ({ docs: [] as Array<{ data: () => Record<string, unknown> }> }));

      for (const target of targets) {
        const [uniId, facId] = target.split(":");
        const key = target;

        if (!universityMap.has(key)) {
          universityMap.set(key, {
            universityId: uniId,
            universityName: uniId,
            facultyId: facId ?? "general",
            facultyName: facId ?? "一般",
            essayScores: [],
            interviewScores: [],
            studentIds: new Set(),
            scoresByArea: new Map(),
          });
        }

        const entry = universityMap.get(key)!;
        entry.studentIds.add(studentId);

        for (const essayDoc of essaysSnap.docs) {
          const essay = essayDoc.data();
          if (essay.scores?.total != null) {
            entry.essayScores.push(essay.scores.total);
          }
          const areas = ["structure", "logic", "expression", "apAlignment", "originality"];
          for (const area of areas) {
            if (essay.scores?.[area] != null) {
              if (!entry.scoresByArea.has(area)) entry.scoresByArea.set(area, []);
              entry.scoresByArea.get(area)!.push(essay.scores[area]);
            }
          }
        }

        for (const intDoc of interviewsSnap.docs) {
          const interview = intDoc.data();
          if (interview.scores?.total != null) {
            entry.interviewScores.push(interview.scores.total);
          }
        }
      }
    }

    // Enrich with university names
    const uniIds = new Set<string>();
    for (const entry of universityMap.values()) {
      uniIds.add(entry.universityId);
    }

    const uniNames = new Map<string, { name: string; faculties: Map<string, string> }>();
    for (const uniId of uniIds) {
      try {
        const uniDoc = await adminDb.doc(`universities/${uniId}`).get();
        if (uniDoc.exists) {
          const data = uniDoc.data()!;
          const facMap = new Map<string, string>();
          if (Array.isArray(data.faculties)) {
            for (const fac of data.faculties) {
              facMap.set(fac.id, fac.name ?? fac.id);
            }
          }
          uniNames.set(uniId, { name: data.name ?? uniId, faculties: facMap });
        }
      } catch {
        // ignore
      }
    }

    const areaLabels: Record<string, string> = {
      structure: "構成",
      logic: "論理性",
      expression: "表現力",
      apAlignment: "AP合致度",
      originality: "独自性",
    };

    const gaps: UniversityGapAnalysis[] = [];
    for (const entry of universityMap.values()) {
      const uniInfo = uniNames.get(entry.universityId);
      const universityName = uniInfo?.name ?? entry.universityId;
      const facultyName =
        uniInfo?.faculties.get(entry.facultyId) ?? entry.facultyId;

      const avgEssay =
        entry.essayScores.length > 0
          ? Math.round(
              (entry.essayScores.reduce((a, b) => a + b, 0) / entry.essayScores.length) * 10
            ) / 10
          : 0;
      const avgInterview =
        entry.interviewScores.length > 0
          ? Math.round(
              (entry.interviewScores.reduce((a, b) => a + b, 0) / entry.interviewScores.length) *
                10
            ) / 10
          : 0;

      const requiredEssay = 36;
      const requiredInterview = 28;

      const gapAnalysis: GapItem[] = [];
      const areas = ["structure", "logic", "expression", "apAlignment", "originality"];
      for (const area of areas) {
        const scores = entry.scoresByArea.get(area) ?? [];
        const avg =
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : 0;
        const required = 7;
        const gap = Math.round((avg - required) * 10) / 10;
        gapAnalysis.push({
          area: areaLabels[area] ?? area,
          studentAvg: avg,
          required,
          gap,
          status: computeGapStatus(gap),
        });
      }

      gaps.push({
        universityId: entry.universityId,
        universityName,
        facultyId: entry.facultyId,
        facultyName,
        avgEssayScore: avgEssay,
        avgInterviewScore: avgInterview,
        requiredScores: { essay: requiredEssay, interview: requiredInterview },
        gapAnalysis,
        studentCount: entry.studentIds.size,
      });
    }

    gaps.sort((a, b) => {
      const aWorst = Math.min(...a.gapAnalysis.map((g) => g.gap));
      const bWorst = Math.min(...b.gapAnalysis.map((g) => g.gap));
      return aWorst - bWorst;
    });

    const response: UniversityGapResponse = {
      gaps,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("University gap analysis error:", error);
    return NextResponse.json(
      { error: "大学別ギャップ分析の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ universityId: string; facultyId: string }> }
) {
  const { universityId, facultyId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const snapshot = await adminDb
      .collection("passedStudentData")
      .where("universityId", "==", universityId)
      .where("facultyId", "==", facultyId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        universityId,
        facultyId,
        insufficient: true,
        sampleSize: 0,
        statistics: null,
      });
    }

    // Aggregate statistics from all matching documents
    const docs = snapshot.docs.map((d) => d.data());
    const sampleSize = docs.length;

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => (arr.length ? Math.round(sum(arr) / arr.length) : 0);

    const essaySubmissions = docs.map((d) => d.essaySubmissions ?? 0);
    const interviewPractices = docs.map((d) => d.interviewPractices ?? 0);
    const finalEssayScores = docs.map((d) => d.finalEssayScore ?? 0).filter((s) => s > 0);
    const finalInterviewScores = docs.map((d) => d.finalInterviewScore ?? 0).filter((s) => s > 0);
    const weaknessResolutionDays = docs.map((d) => d.weaknessResolutionDays ?? 0).filter((d) => d > 0);

    // Aggregate weakness patterns
    const weaknessMap = new Map<string, number>();
    const resolvedMap = new Map<string, number[]>();
    for (const d of docs) {
      if (d.initialWeaknesses) {
        for (const w of d.initialWeaknesses) {
          weaknessMap.set(w.area, (weaknessMap.get(w.area) ?? 0) + 1);
        }
      }
      if (d.resolvedWeaknesses) {
        for (const w of d.resolvedWeaknesses) {
          if (!resolvedMap.has(w.area)) resolvedMap.set(w.area, []);
          resolvedMap.get(w.area)!.push(w.daysToResolve ?? 0);
        }
      }
    }

    const topInitialWeaknesses = [...weaknessMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area, count]) => ({
        area,
        frequency: Math.round((count / sampleSize) * 100),
      }));

    const topResolvedBeforePass = [...resolvedMap.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([area, days]) => ({
        area,
        avgDaysToResolve: avg(days),
      }));

    // Aggregate score progression if available
    const progressionMap = new Map<number, number[]>();
    for (const d of docs) {
      if (d.scoreProgression) {
        for (const p of d.scoreProgression) {
          if (!progressionMap.has(p.weeksBeforeExam)) {
            progressionMap.set(p.weeksBeforeExam, []);
          }
          progressionMap.get(p.weeksBeforeExam)!.push(p.score ?? 0);
        }
      }
    }
    const scoreProgressionPattern = [...progressionMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([weeksBeforeExam, scores]) => ({
        weeksBeforeExam,
        avgScore: avg(scores),
      }));

    // Get university/faculty names
    const uniDoc = await adminDb.doc(`universities/${universityId}`).get();
    const uniData = uniDoc.data();
    const faculty = uniData?.faculties?.find(
      (f: { id: string }) => f.id === facultyId
    );

    return NextResponse.json({
      universityId,
      facultyId,
      universityName: uniData?.name ?? universityId,
      facultyName: faculty?.name ?? facultyId,
      sampleSize,
      statistics: {
        avgEssaySubmissions: avg(essaySubmissions),
        avgInterviewPractices: avg(interviewPractices),
        avgFinalEssayScore: avg(finalEssayScores),
        avgFinalInterviewScore: avg(finalInterviewScores),
        avgWeaknessResolutionDays: avg(weaknessResolutionDays),
        topInitialWeaknesses,
        topResolvedBeforePass,
        scoreProgressionPattern,
      },
      insufficient: false,
    });
  } catch (error) {
    console.error("Passed data error:", error);
    return NextResponse.json(
      { error: "合格者データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

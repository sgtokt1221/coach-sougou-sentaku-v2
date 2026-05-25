import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 大学 × 学部 別の合格者統計を「動的集計」 で返す API。
 *
 * データソース:
 *  - users/{uid}/examResults でその大学 × 学部に "passed" の生徒を抽出
 *  - 該当生徒の essays / interviews / weaknesses を集計
 *
 * Firestore のサブコレクション examResults は collectionGroup で横断する。
 * インデックス問題回避のため JS 側でフィルタ。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ universityId: string; facultyId: string }> },
) {
  const { universityId, facultyId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    // 1. 該当大学 × 学部 の合格者を collectionGroup で抽出
    const examSnap = await adminDb
      .collectionGroup("examResults")
      .where("universityId", "==", universityId)
      .where("facultyId", "==", facultyId)
      .get();

    const passedUids = [
      ...new Set(
        examSnap.docs
          .filter((d) => d.data().status === "passed")
          .map((d) => d.ref.parent.parent?.id)
          .filter((uid): uid is string => typeof uid === "string"),
      ),
    ];

    if (passedUids.length === 0) {
      return NextResponse.json({
        universityId,
        facultyId,
        insufficient: true,
        sampleSize: 0,
        statistics: null,
        message: "この学部の合格者データはまだありません",
      });
    }

    // 2. 各合格者の essays / interviews / weaknesses を並列取得
    const studentDataPromises = passedUids.map(async (uid) => {
      const [essaysSnap, interviewsSnap, weaknessesSnap] = await Promise.all([
        adminDb!.collection("essays").where("userId", "==", uid).get(),
        adminDb!
          .collection("interviews")
          .where("userId", "==", uid)
          .where("status", "==", "completed")
          .get(),
        adminDb!.collection(`users/${uid}/weaknesses`).get(),
      ]);
      return {
        uid,
        essays: essaysSnap.docs.map((d) => d.data()),
        interviews: interviewsSnap.docs.map((d) => d.data()),
        weaknesses: weaknessesSnap.docs.map((d) => d.data()),
      };
    });

    const studentData = await Promise.all(studentDataPromises);

    // 3. 集計
    const sampleSize = studentData.length;
    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10;

    const essayCounts = studentData.map((s) => s.essays.length);
    const interviewCounts = studentData.map((s) => s.interviews.length);

    // 各生徒の essay 平均スコア (= 個人ごと総合スコア平均)
    const perStudentEssayAvg = studentData
      .map((s) => {
        const totals = s.essays
          .map((e) => e.scores?.total)
          .filter((t): t is number => typeof t === "number");
        return totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
      })
      .filter((v): v is number => v !== null);
    const perStudentInterviewAvg = studentData
      .map((s) => {
        const totals = s.interviews
          .map((i) => i.scores?.total)
          .filter((t): t is number => typeof t === "number");
        return totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
      })
      .filter((v): v is number => v !== null);

    // 各合格者の「最後の essay」 のスコア = 最終スコア
    const finalEssayScores = studentData
      .map((s) => {
        if (s.essays.length === 0) return null;
        const sorted = [...s.essays].sort((a, b) => {
          const ta = a.submittedAt?.toMillis?.() ?? 0;
          const tb = b.submittedAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        return sorted[0]?.scores?.total ?? null;
      })
      .filter((v): v is number => typeof v === "number");

    const finalInterviewScores = studentData
      .map((s) => {
        if (s.interviews.length === 0) return null;
        const sorted = [...s.interviews].sort((a, b) => {
          const ta = a.startedAt?.toMillis?.() ?? 0;
          const tb = b.startedAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        return sorted[0]?.scores?.total ?? null;
      })
      .filter((v): v is number => typeof v === "number");

    // 弱点パターン: 初期 (= 最初に検出された弱点) と解消済みの集計
    const initialWeaknessMap = new Map<string, number>();
    const resolvedDaysMap = new Map<string, number[]>();
    for (const s of studentData) {
      for (const w of s.weaknesses) {
        const area = w.area ?? "";
        if (!area) continue;
        initialWeaknessMap.set(area, (initialWeaknessMap.get(area) ?? 0) + 1);
        if (w.resolved && w.firstOccurred && w.lastOccurred) {
          const first = w.firstOccurred?.toMillis?.() ?? 0;
          const last = w.lastOccurred?.toMillis?.() ?? 0;
          if (first > 0 && last > 0) {
            const days = Math.max(0, Math.round((last - first) / 86400000));
            if (!resolvedDaysMap.has(area)) resolvedDaysMap.set(area, []);
            resolvedDaysMap.get(area)!.push(days);
          }
        }
      }
    }

    const topInitialWeaknesses = [...initialWeaknessMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area, count]) => ({
        area,
        frequency: Math.round((count / sampleSize) * 100),
      }));

    const topResolvedBeforePass = [...resolvedDaysMap.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([area, days]) => ({
        area,
        avgDaysToResolve: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
      }));

    // 大学/学部名解決
    const uniDoc = await adminDb.doc(`universities/${universityId}`).get();
    const uniData = uniDoc.data();
    const faculty = uniData?.faculties?.find(
      (f: { id: string }) => f.id === facultyId,
    );

    return NextResponse.json({
      universityId,
      facultyId,
      universityName: uniData?.name ?? universityId,
      facultyName: faculty?.name ?? facultyId,
      sampleSize,
      statistics: {
        avgEssaySubmissions: Math.round(avg(essayCounts.map((n) => n))),
        avgInterviewPractices: Math.round(avg(interviewCounts.map((n) => n))),
        avgEssayScore: avg(perStudentEssayAvg),
        avgFinalEssayScore: avg(finalEssayScores),
        avgInterviewScore: avg(perStudentInterviewAvg),
        avgFinalInterviewScore: avg(finalInterviewScores),
        topInitialWeaknesses,
        topResolvedBeforePass,
      },
      insufficient: sampleSize < 3,
    });
  } catch (error) {
    console.error("Passed data error:", error);
    return NextResponse.json(
      {
        error: "合格者データの取得に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

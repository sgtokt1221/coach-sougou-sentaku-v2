import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface SchoolStat {
  school: string;
  studentCount: number;
  avgEssayScore: number;
  avgInterviewScore: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  passRate: number; // 0-100, 結果のあるものだけで計算
  topTargetUniversities: { name: string; count: number }[];
}

/**
 * 高校別集計 (superadmin 限定)。
 *
 * 全 student を school でグルーピングし、 各高校の:
 *  - 生徒数
 *  - 平均 essay スコア / 平均 interview スコア
 *  - 合否結果別件数 + 合格率
 *  - 志望校 Top 3
 * を返す。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const usersSnap = await adminDb
    .collection("users")
    .where("role", "==", "student")
    .get();

  // school 単位でグルーピング
  const groups = new Map<
    string,
    {
      uids: string[];
      targetUnis: string[][];
    }
  >();
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const school = (data.school ?? "").trim() || "(未設定)";
    if (!groups.has(school)) groups.set(school, { uids: [], targetUnis: [] });
    groups.get(school)!.uids.push(userDoc.id);
    groups.get(school)!.targetUnis.push(data.targetUniversities ?? []);
  }

  const stats: SchoolStat[] = await Promise.all(
    [...groups.entries()].map(async ([school, g]) => {
      // 各生徒の essay / interview / examResults を並列取得
      const perStudent = await Promise.all(
        g.uids.map(async (uid) => {
          const [essaysSnap, interviewsSnap, examSnap] = await Promise.all([
            adminDb!.collection("essays").where("userId", "==", uid).get(),
            adminDb!
              .collection("interviews")
              .where("userId", "==", uid)
              .where("status", "==", "completed")
              .get(),
            adminDb!.collection(`users/${uid}/examResults`).get(),
          ]);
          const essayTotals = essaysSnap.docs
            .map((d) => d.data().scores?.total)
            .filter((t): t is number => typeof t === "number");
          const interviewTotals = interviewsSnap.docs
            .map((d) => d.data().scores?.total)
            .filter((t): t is number => typeof t === "number");
          const examResults = examSnap.docs.map((d) => d.data().status as string);
          return { essayTotals, interviewTotals, examResults };
        }),
      );

      const avg = (xs: number[]) =>
        xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

      // 全生徒の essay/interview avg = 個人 avg の平均 (= 公平)
      const perStudentEssayAvg = perStudent
        .map((p) => (p.essayTotals.length > 0 ? avg(p.essayTotals) : null))
        .filter((v): v is number => v !== null);
      const perStudentInterviewAvg = perStudent
        .map((p) => (p.interviewTotals.length > 0 ? avg(p.interviewTotals) : null))
        .filter((v): v is number => v !== null);

      // 合否集計
      let passed = 0,
        failed = 0,
        pending = 0;
      for (const p of perStudent) {
        for (const r of p.examResults) {
          if (r === "passed") passed++;
          else if (r === "failed") failed++;
          else pending++;
        }
      }
      const total = passed + failed;
      const passRate = total === 0 ? 0 : Math.round((passed / total) * 100);

      // 志望校 Top 3
      const uniCount = new Map<string, number>();
      for (const uniList of g.targetUnis) {
        for (const u of uniList) {
          uniCount.set(u, (uniCount.get(u) ?? 0) + 1);
        }
      }
      const topTargetUniversities = [...uniCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      return {
        school,
        studentCount: g.uids.length,
        avgEssayScore: avg(perStudentEssayAvg),
        avgInterviewScore: avg(perStudentInterviewAvg),
        passedCount: passed,
        failedCount: failed,
        pendingCount: pending,
        passRate,
        topTargetUniversities,
      };
    }),
  );

  // 生徒数降順でソート
  stats.sort((a, b) => b.studentCount - a.studentCount);

  return NextResponse.json({
    schools: stats,
    total: stats.length,
    generatedAt: new Date().toISOString(),
  });
}

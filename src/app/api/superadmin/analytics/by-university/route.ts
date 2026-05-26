import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

interface MonthlyPoint {
  month: string; // YYYY-MM
  essayCount: number;
  interviewCount: number;
  avgEssayScore: number;
  avgInterviewScore: number;
  activeStudents: number;
}

interface UniversityPaceResponse {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  totalStudents: number;       // この大学/学部を志望している全生徒数
  totalSubmissions: number;
  /** status 制約なしの interview 総数 (透明化メタ) */
  totalInterviewsAllStatuses?: number;
  /** 分析に使った completed interview の数 */
  completedInterviewsAnalyzed?: number;
  monthly: MonthlyPoint[];     // 月別の活動推移 (直近 12 ヶ月)
}

/**
 * 大学 × 学部別 の月別活動量・スコア推移 (superadmin 限定)。
 *
 * 「○○大学を目指す子は、 何月にどれくらいのペースで取り組んでいたか」 を
 * 月次集計で返す。 ダッシュボードでグラフ化する用途。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const url = new URL(request.url);
  const universityId = url.searchParams.get("universityId") ?? "";
  const facultyId = url.searchParams.get("facultyId") ?? "";

  if (!universityId || !facultyId) {
    return NextResponse.json(
      { error: "universityId と facultyId は必須" },
      { status: 400 },
    );
  }

  // 1. この大学 × 学部を志望する生徒の uid 一覧
  // targetUniversities は ["univId:facId", ...] 形式 (もしくは univId のみ)
  const compoundId = `${universityId}:${facultyId}`;
  const usersSnap = await adminDb
    .collection("users")
    .where("role", "==", "student")
    .where("targetUniversities", "array-contains-any", [
      compoundId,
      universityId,
    ])
    .get();
  const targetUids = usersSnap.docs.map((d) => d.id);

  if (targetUids.length === 0) {
    return NextResponse.json({
      universityId,
      facultyId,
      universityName: "",
      facultyName: "",
      totalStudents: 0,
      totalSubmissions: 0,
      monthly: [],
    });
  }

  // 2. 該当生徒の essay / interview を並列取得 (Firestore where in は 10 件まで)
  const chunks: string[][] = [];
  for (let i = 0; i < targetUids.length; i += 10) {
    chunks.push(targetUids.slice(i, i + 10));
  }

  const essayDocs: { date: Date; total: number; uid: string }[] = [];
  const interviewDocs: { date: Date; total: number; uid: string }[] = [];

  let totalInterviewsCount = 0; // status 制約なしの interviews 総数 (透明化用)
  for (const chunk of chunks) {
    const [essaysSnap, interviewsSnap, allInterviewsSnap] = await Promise.all([
      adminDb.collection("essays").where("userId", "in", chunk).get(),
      adminDb
        .collection("interviews")
        .where("userId", "in", chunk)
        .where("status", "==", "completed")
        .get(),
      adminDb.collection("interviews").where("userId", "in", chunk).get(),
    ]);
    totalInterviewsCount += allInterviewsSnap.size;
    for (const d of essaysSnap.docs) {
      const data = d.data();
      const date = data.submittedAt?.toDate?.();
      if (!date || typeof data.scores?.total !== "number") continue;
      essayDocs.push({ date, total: data.scores.total, uid: data.userId });
    }
    for (const d of interviewsSnap.docs) {
      const data = d.data();
      const date = data.startedAt?.toDate?.();
      if (!date || typeof data.scores?.total !== "number") continue;
      interviewDocs.push({ date, total: data.scores.total, uid: data.userId });
    }
  }

  // 3. 直近 12 ヶ月で集計
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const monthly: MonthlyPoint[] = months.map((monthKey) => {
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);

    const monthEssays = essayDocs.filter((e) => e.date >= start && e.date < end);
    const monthInterviews = interviewDocs.filter(
      (i) => i.date >= start && i.date < end,
    );
    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
    const activeStudents = new Set([
      ...monthEssays.map((e) => e.uid),
      ...monthInterviews.map((i) => i.uid),
    ]).size;

    return {
      month: monthKey,
      essayCount: monthEssays.length,
      interviewCount: monthInterviews.length,
      avgEssayScore: avg(monthEssays.map((e) => e.total)),
      avgInterviewScore: avg(monthInterviews.map((i) => i.total)),
      activeStudents,
    };
  });

  // 4. 大学/学部名解決
  const uniDoc = await adminDb.doc(`universities/${universityId}`).get();
  const uniData = uniDoc.data();
  const faculty = uniData?.faculties?.find(
    (f: { id: string }) => f.id === facultyId,
  );

  const response: UniversityPaceResponse = {
    universityId,
    facultyId,
    universityName: uniData?.name ?? universityId,
    facultyName: faculty?.name ?? facultyId,
    totalStudents: targetUids.length,
    totalSubmissions: essayDocs.length + interviewDocs.length,
    totalInterviewsAllStatuses: totalInterviewsCount,
    completedInterviewsAnalyzed: interviewDocs.length,
    monthly,
  };

  return NextResponse.json(response);
}

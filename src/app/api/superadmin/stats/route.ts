import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  SuperadminDashboardStats,
  AdminPerformance,
  RecentActivity,
  ScoreTrendItem,
  InvitationSummary,
} from "@/lib/types/admin";

/**
 * Firestore Timestamp / Date / ISO 文字列 / 数値タイムスタンプ のどれでも
 * ISO 文字列に変換するヘルパー。 変換不能なら null。
 *
 * 旧実装は `.toDate?.()?.toISOString() ?? new Date().toISOString()` で
 * 文字列保存の値が来ると現在時刻に化けるバグがあった (A-2)。
 */
function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === "function") {
    try {
      return maybeTs.toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const [adminsSnap, teachersSnap, studentsSnap] = await Promise.all([
      adminDb.collection("users").where("role", "==", "admin").count().get(),
      adminDb.collection("users").where("role", "==", "teacher").count().get(),
      adminDb.collection("users").where("role", "==", "student").count().get(),
    ]);

    const allStudentsSnap = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .get();
    const unassignedCount = allStudentsSnap.docs.filter(
      (doc) => !doc.data().managedBy,
    ).length;

    // Admin performance
    const adminTeacherSnap = await adminDb
      .collection("users")
      .where("role", "in", ["admin", "teacher"])
      .get();

    const adminPerformance: AdminPerformance[] = await Promise.all(
      adminTeacherSnap.docs.map(async (doc) => {
        const data = doc.data();
        const managedStudents = allStudentsSnap.docs.filter(
          (s) => s.data().managedBy === doc.id,
        );
        let totalScore = 0;
        let scoreCount = 0;
        let alertCount = 0;

        for (const student of managedStudents) {
          const studentData = student.data();
          const essaysSnap = await adminDb!
            .collection("users")
            .doc(student.id)
            .collection("essays")
            .orderBy("submittedAt", "desc")
            .limit(1)
            .get();

          // 最新スコア
          if (essaysSnap.docs.length > 0) {
            const score = essaysSnap.docs[0].data()?.scores?.total;
            if (typeof score === "number") {
              totalScore += score;
              scoreCount++;
            }
          }

          // 要注意判定 (A-1 修正): essay 0 件の新規生徒は加入後 14 日まで
          // 猶予。 essay あれば 7 日以上前で要注意
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          if (essaysSnap.docs.length === 0) {
            const signupIso = toIsoOrNull(studentData.createdAt);
            if (signupIso) {
              const daysSinceSignup = Math.floor(
                (Date.now() - new Date(signupIso).getTime()) / 86400000,
              );
              if (daysSinceSignup >= 14) alertCount++;
            }
          } else {
            const lastIso = toIsoOrNull(
              essaysSnap.docs[0].data()?.submittedAt,
            );
            if (
              lastIso &&
              Date.now() - new Date(lastIso).getTime() > sevenDaysMs
            ) {
              alertCount++;
            }
          }
        }

        return {
          uid: doc.id,
          displayName: data.displayName ?? "",
          role: data.role as "admin" | "teacher",
          studentCount: managedStudents.length,
          averageScore:
            scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : null,
          alertStudentCount: alertCount,
        };
      }),
    );

    // Invitation summary
    const invitationSummary: InvitationSummary = {
      total: 0,
      pending: 0,
      used: 0,
      expired: 0,
    };
    try {
      const invSnap = await adminDb.collection("invitations").get();
      const now = Date.now();
      for (const doc of invSnap.docs) {
        const d = doc.data();
        invitationSummary.total++;
        if (d.status === "used") {
          invitationSummary.used++;
        } else {
          const expiresIso = toIsoOrNull(d.expiresAt);
          const isExpired =
            d.status === "expired" ||
            (expiresIso && new Date(expiresIso).getTime() < now);
          if (isExpired) invitationSummary.expired++;
          else invitationSummary.pending++;
        }
      }
    } catch (err) {
      console.warn("[stats] invitations not available:", err);
    }

    // Recent activity (A-2 修正: toIsoOrNull で日時を堅牢に)
    const recentActivity: RecentActivity[] = [];

    try {
      const activitiesSnap = await adminDb
        .collection("activities")
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();
      for (const actDoc of activitiesSnap.docs) {
        const data = actDoc.data();
        const ts = toIsoOrNull(data.timestamp);
        if (!ts) continue; // 日時不明はスキップ (= 現在時刻に化けさせない)
        recentActivity.push({
          id: actDoc.id,
          type: data.type ?? "essay_submit",
          description: data.description ?? "",
          timestamp: ts,
          studentName: data.studentName,
          adminName: data.adminName,
        });
      }
    } catch (err) {
      console.warn("[stats] activities not available:", err);
    }

    // Recent essays (collectionGroup) - 60 件取って Top 10 で十分なので
    // スコア推移にも使い回す
    const recentEssays = await adminDb
      .collectionGroup("essays")
      .orderBy("submittedAt", "desc")
      .limit(60)
      .get();
    for (const essayDoc of recentEssays.docs.slice(0, 10)) {
      const data = essayDoc.data();
      const parentPath = essayDoc.ref.parent.parent;
      const studentDoc = parentPath ? await parentPath.get() : null;
      const studentName = studentDoc?.data()?.displayName ?? "不明";
      const ts = toIsoOrNull(data.submittedAt);
      if (!ts) continue;
      recentActivity.push({
        id: essayDoc.id,
        type: "essay_submit",
        description: "小論文を提出しました",
        timestamp: ts,
        studentName,
      });
    }

    recentActivity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    recentActivity.splice(10);

    // Score trend (B 修正: 30 日分埋め)
    const dailyScores = new Map<string, { total: number; count: number }>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    for (const doc of recentEssays.docs) {
      const data = doc.data();
      const score = data.scores?.total;
      const ts = toIsoOrNull(data.submittedAt);
      if (typeof score !== "number" || !ts) continue;
      const date = new Date(ts);
      if (date < thirtyDaysAgo) continue;
      const key = ts.slice(0, 10);
      const existing = dailyScores.get(key) ?? { total: 0, count: 0 };
      existing.total += score;
      existing.count++;
      dailyScores.set(key, existing);
    }

    // 30 日分のカレンダーを生成し、 データない日は count=0 で埋める
    const scoreTrend: ScoreTrendItem[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const entry = dailyScores.get(key);
      scoreTrend.push({
        date: key,
        averageScore: entry
          ? Math.round((entry.total / entry.count) * 10) / 10
          : 0,
        count: entry?.count ?? 0,
      });
    }

    const stats: SuperadminDashboardStats = {
      totalAdmins: adminsSnap.data().count,
      totalTeachers: teachersSnap.data().count,
      totalStudents: studentsSnap.data().count,
      unassignedStudents: unassignedCount,
      adminPerformance,
      recentActivity,
      scoreTrend,
      invitationSummary,
    };

    return NextResponse.json(stats);
  } catch (error) {
    // A-3 修正: 本番エラーは 500 で返してフロントが「集計エラー」 を表示
    console.error("[superadmin/stats] failed:", error);
    return NextResponse.json(
      {
        error: "集計取得に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

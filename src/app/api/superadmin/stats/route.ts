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

    // Unassigned students
    const allStudentsSnap = await adminDb
      .collection("users")
      .where("role", "==", "student")
      .get();
    const unassignedCount = allStudentsSnap.docs.filter(
      (doc) => !doc.data().managedBy
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
          (s) => s.data().managedBy === doc.id
        );
        let totalScore = 0;
        let scoreCount = 0;
        let alertCount = 0;

        for (const student of managedStudents) {
          const essaysSnap = await adminDb!
            .collection("users")
            .doc(student.id)
            .collection("essays")
            .orderBy("submittedAt", "desc")
            .limit(1)
            .get();
          if (essaysSnap.docs.length > 0) {
            const score = essaysSnap.docs[0].data()?.scores?.total;
            if (typeof score === "number") {
              totalScore += score;
              scoreCount++;
            }
          }
          const lastActivity = essaysSnap.docs[0]?.data()?.submittedAt?.toDate?.();
          if (!lastActivity || Date.now() - lastActivity.getTime() > 7 * 24 * 60 * 60 * 1000) {
            alertCount++;
          }
        }

        return {
          uid: doc.id,
          displayName: data.displayName ?? "",
          role: data.role as "admin" | "teacher",
          studentCount: managedStudents.length,
          averageScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : null,
          alertStudentCount: alertCount,
        };
      })
    );

    // Invitation summary
    let invitationSummary: InvitationSummary = { total: 0, pending: 0, used: 0, expired: 0 };
    try {
      const invSnap = await adminDb.collection("invitations").get();
      const now = new Date();
      for (const doc of invSnap.docs) {
        const d = doc.data();
        invitationSummary.total++;
        if (d.status === "used") invitationSummary.used++;
        else if (d.status === "expired" || (d.expiresAt?.toDate?.() && d.expiresAt.toDate() < now))
          invitationSummary.expired++;
        else invitationSummary.pending++;
      }
    } catch {
      // invitations collection may not exist
    }

    // Recent activity: merge activities collection + recent essays
    const recentActivity: RecentActivity[] = [];

    // Activities collection (interview_complete, student_added, student_assigned)
    try {
      const activitiesSnap = await adminDb
        .collection("activities")
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();
      for (const actDoc of activitiesSnap.docs) {
        const data = actDoc.data();
        recentActivity.push({
          id: actDoc.id,
          type: data.type ?? "essay_submit",
          description: data.description ?? "",
          timestamp: data.timestamp?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          studentName: data.studentName,
          adminName: data.adminName,
        });
      }
    } catch {
      // activities collection may not exist yet
    }

    // Recent essays
    const recentEssays = await adminDb
      .collectionGroup("essays")
      .orderBy("submittedAt", "desc")
      .limit(10)
      .get();
    for (const essayDoc of recentEssays.docs) {
      const data = essayDoc.data();
      const parentPath = essayDoc.ref.parent.parent;
      const studentDoc = parentPath ? await parentPath.get() : null;
      const studentName = studentDoc?.data()?.displayName ?? "不明";
      recentActivity.push({
        id: essayDoc.id,
        type: "essay_submit",
        description: "小論文を提出しました",
        timestamp: data.submittedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        studentName,
      });
    }

    // Sort by timestamp desc and take top 10
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    recentActivity.splice(10);

    // Score trend (last 30 days)
    const scoreTrend: ScoreTrendItem[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyScores = new Map<string, { total: number; count: number }>();
    for (const doc of recentEssays.docs) {
      const data = doc.data();
      const score = data.scores?.total;
      const date = data.submittedAt?.toDate?.();
      if (typeof score === "number" && date && date >= thirtyDaysAgo) {
        const key = date.toISOString().slice(0, 10);
        const existing = dailyScores.get(key) ?? { total: 0, count: 0 };
        existing.total += score;
        existing.count++;
        dailyScores.set(key, existing);
      }
    }
    for (const [date, { total, count }] of dailyScores) {
      scoreTrend.push({
        date,
        averageScore: Math.round((total / count) * 10) / 10,
        count,
      });
    }
    scoreTrend.sort((a, b) => a.date.localeCompare(b.date));

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
  } catch {
    return NextResponse.json({
      totalAdmins: 0,
      totalTeachers: 0,
      totalStudents: 0,
      unassignedStudents: 0,
      adminPerformance: [],
      recentActivity: [],
      scoreTrend: [],
      invitationSummary: { total: 0, pending: 0, used: 0, expired: 0 },
    } satisfies SuperadminDashboardStats);
  }
}

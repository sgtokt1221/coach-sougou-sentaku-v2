import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  SuperadminDashboardStats,
  AdminPerformance,
  RecentActivity,
  ScoreTrendItem,
  InvitationSummary,
  OrganizationStat,
  FeatureUsageStat,
  FeatureUsageItem,
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
    // 件数: count() 失敗時は .get().size にフォールバック (件数は正確性が必要なので
    // ここだけ失敗したら 500=fail-loud、それ以外のセクションは個別に degrade する)
    const usersCol = adminDb.collection("users");
    const safeCount = async (
      q: FirebaseFirestore.Query,
    ): Promise<number> => {
      try {
        return (await q.count().get()).data().count;
      } catch {
        return (await q.get()).size;
      }
    };
    const [totalAdmins, totalTeachers, totalStudents] = await Promise.all([
      safeCount(usersCol.where("role", "==", "admin")),
      safeCount(usersCol.where("role", "==", "teacher")),
      safeCount(usersCol.where("role", "==", "student")),
    ]);

    // 以降は非必須セクション。失敗しても 0/空で degrade し、画面を落とさない。
    let unassignedCount = 0;
    let adminPerformance: AdminPerformance[] = [];
    let avgEssayScore: number | null = null;
    let activeStudents = 0;
    let byOrganization: OrganizationStat[] = [];
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const isActive = (data: FirebaseFirestore.DocumentData): boolean => {
      const iso = toIsoOrNull(
        data.lastSeenAt ??
          (data.lastActivity as { at?: unknown } | undefined)?.at,
      );
      return !!iso && Date.now() - new Date(iso).getTime() <= THIRTY_DAYS_MS;
    };
    try {
      const allStudentsSnap = await usersCol.where("role", "==", "student").get();
      unassignedCount = allStudentsSnap.docs.filter(
        (doc) => !doc.data().managedBy,
      ).length;
      activeStudents = allStudentsSnap.docs.filter((d) => isActive(d.data())).length;

      // 組織マップ: adminUid → {orgId,orgName}、orgId → {name, adminCount}
      const orgByAdmin = new Map<string, { orgId: string; orgName: string }>();
      const orgMeta = new Map<string, { name: string; adminCount: number }>();
      const orgsSnap = await adminDb.collection("organizations").get();
      for (const orgDoc of orgsSnap.docs) {
        const od = orgDoc.data();
        const name = (od.name as string) ?? "";
        const members: string[] = Array.isArray(od.memberAdminUids)
          ? od.memberAdminUids
          : [];
        orgMeta.set(orgDoc.id, {
          name,
          adminCount: new Set(members).size,
        });
        members.forEach((uid) =>
          orgByAdmin.set(uid, { orgId: orgDoc.id, orgName: name }),
        );
      }

      const adminTeacherSnap = await usersCol
        .where("role", "in", ["admin", "teacher"])
        .get();

      const perfSettled = await Promise.allSettled(
        adminTeacherSnap.docs.map(async (doc) => {
        const data = doc.data();
        const managedStudents = allStudentsSnap.docs.filter(
          (s) => s.data().managedBy === doc.id,
        );
        let totalScore = 0;
        let scoreCount = 0;
        let alertCount = 0;
        let activeCount = 0;

        for (const student of managedStudents) {
          const studentData = student.data();
          if (isActive(studentData)) activeCount++;
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

        const role = data.role as "admin" | "teacher";
        // admin はメンバーシップ(memberAdminUids)、teacher は自身の organizationId で所属判定
        const orgId =
          (role === "admin"
            ? orgByAdmin.get(doc.id)?.orgId
            : typeof data.organizationId === "string"
              ? data.organizationId
              : undefined) ?? "__none__";

        return {
          perf: {
            uid: doc.id,
            displayName: data.displayName ?? "",
            role,
            studentCount: managedStudents.length,
            averageScore:
              scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : null,
            alertStudentCount: alertCount,
          } as AdminPerformance,
          orgId,
          role,
          scoreSum: totalScore,
          scoreCount,
          studentCount: managedStudents.length,
          activeCount,
        };
      }),
      );
      type PerfItem = {
        perf: AdminPerformance;
        orgId: string;
        role: "admin" | "teacher";
        scoreSum: number;
        scoreCount: number;
        studentCount: number;
        activeCount: number;
      };
      const extended = perfSettled
        .filter((r): r is PromiseFulfilledResult<PerfItem> => r.status === "fulfilled")
        .map((r) => r.value);
      adminPerformance = extended.map((e) => e.perf);

      // 全体平均スコア
      let gSum = 0;
      let gCnt = 0;
      for (const e of extended) {
        gSum += e.scoreSum;
        gCnt += e.scoreCount;
      }
      avgEssayScore = gCnt > 0 ? Math.round((gSum / gCnt) * 10) / 10 : null;

      // 塾別集計
      const aggr = new Map<
        string,
        {
          teacherCount: number;
          adminCount: number;
          studentCount: number;
          scoreSum: number;
          scoreCount: number;
          activeCount: number;
        }
      >();
      for (const e of extended) {
        const cur =
          aggr.get(e.orgId) ?? {
            teacherCount: 0,
            adminCount: 0,
            studentCount: 0,
            scoreSum: 0,
            scoreCount: 0,
            activeCount: 0,
          };
        if (e.role === "teacher") cur.teacherCount++;
        else cur.adminCount++;
        cur.studentCount += e.studentCount;
        cur.scoreSum += e.scoreSum;
        cur.scoreCount += e.scoreCount;
        cur.activeCount += e.activeCount;
        aggr.set(e.orgId, cur);
      }
      byOrganization = Array.from(aggr.entries())
        .map(([orgId, a]) => ({
          orgId,
          orgName:
            orgId === "__none__" ? "未所属" : orgMeta.get(orgId)?.name || orgId,
          // 実塾は memberAdminUids 数を優先 (一覧と整合)、未所属は集計値
          adminCount:
            orgId === "__none__"
              ? a.adminCount
              : orgMeta.get(orgId)?.adminCount ?? a.adminCount,
          teacherCount: a.teacherCount,
          studentCount: a.studentCount,
          avgEssayScore:
            a.scoreCount > 0 ? Math.round((a.scoreSum / a.scoreCount) * 10) / 10 : null,
          activeStudentCount: a.activeCount,
        }))
        .sort((x, y) => y.studentCount - x.studentCount);
    } catch (err) {
      console.warn("[stats] performance section failed:", err);
    }

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
    // スコア推移にも使い回す。collectionGroup の index 不足等で失敗しても degrade。
    let recentEssaysDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    try {
      const recentEssays = await adminDb
        .collectionGroup("essays")
        .orderBy("submittedAt", "desc")
        .limit(60)
        .get();
      recentEssaysDocs = recentEssays.docs;
    } catch (err) {
      console.warn("[stats] recent essays (collectionGroup) failed:", err);
    }
    for (const essayDoc of recentEssaysDocs.slice(0, 10)) {
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

    for (const doc of recentEssaysDocs) {
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

    // 機能の利用状況＋採用率: 各機能の件数と、使った生徒の distinct 数。
    // collectionGroup はフィルタ無しなので index 不要。失敗時は 0 で degrade。
    const emptyUsage = (): FeatureUsageItem => ({ count: 0, students: 0 });
    const featureUsage: FeatureUsageStat = {
      essays: emptyUsage(),
      interviews: emptyUsage(),
      documents: emptyUsage(),
      activities: emptyUsage(),
      skillChecks: emptyUsage(),
      selfAnalysis: emptyUsage(),
    };
    try {
      // top-level (userId フィールドで distinct)
      const usageFromTopLevel = async (
        col: string,
      ): Promise<FeatureUsageItem> => {
        const snap = await adminDb!.collection(col).get();
        const set = new Set<string>();
        snap.docs.forEach((d) => {
          const uid = d.data().userId;
          if (typeof uid === "string") set.add(uid);
        });
        return { count: snap.size, students: set.size };
      };
      // collectionGroup (親ドキュメント=生徒uid で distinct)。set も返す
      const groupUsage = async (
        group: string,
      ): Promise<{ count: number; set: Set<string> }> => {
        const snap = await adminDb!.collectionGroup(group).get();
        const set = new Set<string>();
        snap.docs.forEach((d) => {
          const uid = d.ref.parent.parent?.id;
          if (uid) set.add(uid);
        });
        return { count: snap.size, set };
      };

      const [essays, interviews, documents, activities, scDocs, scInterview, selfSnap] =
        await Promise.all([
          usageFromTopLevel("essays"),
          usageFromTopLevel("interviews"),
          groupUsage("documents"),
          groupUsage("activities"),
          groupUsage("skillChecks"),
          groupUsage("interviewSkillChecks"),
          adminDb.collection("selfAnalysis").get(),
        ]);
      featureUsage.essays = essays;
      featureUsage.interviews = interviews;
      featureUsage.documents = { count: documents.count, students: documents.set.size };
      featureUsage.activities = { count: activities.count, students: activities.set.size };
      // スキルチェックは小論文/面接の両方を合算 (生徒は和集合で distinct)
      const scUnion = new Set<string>([...scDocs.set, ...scInterview.set]);
      featureUsage.skillChecks = {
        count: scDocs.count + scInterview.count,
        students: scUnion.size,
      };
      featureUsage.selfAnalysis = {
        count: selfSnap.size,
        students: selfSnap.size,
      };
    } catch (err) {
      console.warn("[stats] feature usage failed:", err);
    }

    const stats: SuperadminDashboardStats = {
      totalAdmins,
      totalTeachers,
      totalStudents,
      unassignedStudents: unassignedCount,
      avgEssayScore,
      activeStudents,
      featureUsage,
      byOrganization,
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

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { resolveTargetUniversities } from "@/lib/universities/resolve";
import { getOrgMemberAdminUids, chunk } from "@/lib/api/organization-scope";
import type { StudentListItem } from "@/lib/types/admin";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
} from "@/lib/skill-check/aggregate";

function isDeclining(scores: number[]): boolean {
  if (scores.length < 3) return false;
  const recent = scores.slice(-3);
  return recent[0] > recent[1] && recent[1] > recent[2];
}

function computeScoreTrend(scores: number[]): "up" | "down" | "flat" | null {
  if (scores.length < 3) return null;
  const recent = scores.slice(-3);
  const diff = recent[2] - recent[0];
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "flat";
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid } = authResult;

  const body = await request.json();
  const { email, displayName, password, school, schoolId, grade, gpa, englishCerts, targetUniversities } = body as {
    email: string;
    displayName: string;
    password: string;
    school?: string;
    schoolId?: string;
    grade?: number;
    gpa?: number;
    englishCerts?: { type: string; score?: string }[];
    targetUniversities?: string[];
  };

  if (!email || !displayName || !password) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上必要です" }, { status: 400 });
  }

  const { adminAuth, adminDb } = await import("@/lib/firebase/admin");

  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    // 作成者(admin)の所属塾を生徒にも引き継ぐ (組織共有の高速パス用)
    const callerOrgId = (await adminDb.doc(`users/${callerUid}`).get()).data()
      ?.organizationId as string | undefined;

    await adminDb.doc(`users/${userRecord.uid}`).set({
      email,
      displayName,
      role: "student",
      plan: "coach",
      school: school ?? "",
      ...(schoolId ? { schoolId } : {}),
      grade: grade ?? null,
      gpa: gpa ?? null,
      englishCerts: englishCerts ?? [],
      managedBy: callerUid,
      ...(callerOrgId ? { organizationId: callerOrgId } : {}),
      targetUniversities: targetUniversities ?? [],
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      displayName,
      school: school ?? "",
      grade: grade ?? null,
      gpa: gpa ?? null,
      englishCerts: englishCerts ?? [],
      managedBy: callerUid,
      targetUniversities: targetUniversities ?? [],
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "作成に失敗しました";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "lastActivity";
    const order = searchParams.get("order") || "desc";
    const viewAs = searchParams.get("viewAs");
    const universityFilter = searchParams.get("university");
    const rankFilter = searchParams.get("rank");

    // superadminがviewAsを指定している場合、そのadminの視点でフィルタ
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;
    const effectiveRole = (role === "superadmin" && viewAs) ? "admin" : role;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // 生徒ドキュメント集合を取得 (admin は同じ塾のメンバーが managedBy の生徒を共有)
    const studentDocsById = new Map<
      string,
      FirebaseFirestore.QueryDocumentSnapshot
    >();
    if (effectiveRole === "teacher") {
      // 講師の担当生徒は assignedTeacherIds(配列) で統一 (managedBy は管理者用)
      const snap = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .where("assignedTeacherIds", "array-contains", effectiveUid)
        .get();
      snap.docs.forEach((d) => studentDocsById.set(d.id, d));
    } else if (effectiveRole === "superadmin") {
      const snap = await adminDb.collection("users").where("role", "==", "student").get();
      snap.docs.forEach((d) => studentDocsById.set(d.id, d));
    } else {
      // admin: 自分の塾(組織)メンバーが managedBy になっている生徒を共有
      const memberUids = await getOrgMemberAdminUids(adminDb, effectiveUid);
      for (const part of chunk(memberUids, 30)) {
        const snap = await adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "in", part)
          .get();
        snap.docs.forEach((d) => studentDocsById.set(d.id, d));
      }
    }
    const studentDocs = Array.from(studentDocsById.values());

    const students: StudentListItem[] = await Promise.all(
      studentDocs.map(async (docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;

        // Promise.allSettled で部分成功を許容 (1 コレクションの失敗で全体を落とさない)。
        // silent fallback と異なり console.warn で痕跡を残す。
        // interviews は composite index 回避のため orderBy なしで取得し JS で並べ替える
        const subResults = await Promise.allSettled([
          adminDb!.collection("essays").where("userId", "==", uid).orderBy("submittedAt", "desc").get(),
          adminDb!.collection(`users/${uid}/weaknesses`).get(),
          adminDb!.collection(`users/${uid}/documents`).get(),
          adminDb!.collection("sessions").where("studentUid", "==", uid).orderBy("scheduledAt", "desc").limit(1).get(),
          adminDb!.collection("interviews").where("userId", "==", uid).get(),
          adminDb!.collection(`users/${uid}/homeworkAssignments`).get(),
        ]);
        const subQueryNames = ["essays", "weaknesses", "documents", "sessions", "interviews", "homeworkAssignments"];
        const [essaysSnap, weaknessesSnap, documentsSnap, sessionsSnap, interviewsSnap, homeworkSnap] = subResults.map((r, i) => {
          if (r.status === "rejected") {
            console.warn(`[admin/students] subquery '${subQueryNames[i]}' failed for ${uid}:`, r.reason);
            return { size: 0, docs: [] } as unknown as FirebaseFirestore.QuerySnapshot;
          }
          return r.value;
        }) as [FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot];

        const essayCount = essaysSnap.size;
        const latestEssay = essaysSnap.docs[0]?.data();
        const latestScore: number | null =
          latestEssay?.scores?.total ?? null;

        // 最終活動の候補 (種別つき)。ログイン(lastSeenAt)は活動には含めない
        type ActivityType = NonNullable<StudentListItem["lastActivity"]>["type"];
        const activityCandidates: Array<{ type: ActivityType; ts: number }> = [];
        const latestEssayTs = latestEssay?.submittedAt?.toDate?.()?.getTime();
        if (latestEssayTs) activityCandidates.push({ type: "essay", ts: latestEssayTs });

        // 面接 (トップレベル interviews を JS で並べ替え。completed のみ。index 回避)
        const completedInterviews = interviewsSnap.docs
          .filter((d) => d.data().status === "completed")
          .map((d) => ({
            ts: d.data().startedAt?.toDate?.()?.getTime() ?? 0,
            total: d.data().scores?.total as number | undefined,
          }))
          .filter((x) => x.ts > 0)
          .sort((a, b) => b.ts - a.ts);
        if (completedInterviews[0]) {
          activityCandidates.push({ type: "interview", ts: completedInterviews[0].ts });
        }

        // 面接 最新スコア + 推移 (直近3回、古い順で computeScoreTrend)
        const latestInterviewScore: number | null =
          typeof completedInterviews[0]?.total === "number" ? completedInterviews[0].total : null;
        const recentInterviewScores = completedInterviews
          .slice(0, 3)
          .map((x) => x.total)
          .filter((s): s is number => typeof s === "number")
          .reverse();
        const interviewScoreTrend = computeScoreTrend(recentInterviewScores);

        const otherCollections: Array<{ name: string; field: string; type: ActivityType }> = [
          { name: "skillChecks", field: "takenAt", type: "skillCheck" },
          { name: "interviewSkillChecks", field: "takenAt", type: "interviewSkillCheck" },
          { name: "summaryDrills", field: "completedAt", type: "summaryDrill" },
          { name: "activityLogs", field: "createdAt", type: "activity" },
        ];
        for (const { name, field, type } of otherCollections) {
          try {
            const snap = await adminDb!
              .collection(`users/${uid}/${name}`)
              .orderBy(field, "desc")
              .limit(1)
              .get();
            const ts = snap.docs[0]?.data()?.[field]?.toDate?.()?.getTime();
            if (ts) activityCandidates.push({ type, ts });
          } catch {
            // スキップ
          }
        }

        // 最終活動 (何をいつ)
        const lastActivityCandidate = [...activityCandidates].sort((a, b) => b.ts - a.ts)[0];
        const lastActivity: StudentListItem["lastActivity"] = lastActivityCandidate
          ? { type: lastActivityCandidate.type, at: new Date(lastActivityCandidate.ts).toISOString() }
          : null;

        // 最終ログイン (users.lastSeenAt / ハートビート)
        const lastSeenDate = data.lastSeenAt?.toDate?.();
        const lastSeenAt: string | null = lastSeenDate ? lastSeenDate.toISOString() : null;

        // lastActivityAt は従来通り活動 + ログインを conflate (inactive アラート / ソート互換)
        const allTimestamps = activityCandidates.map((c) => c.ts);
        if (lastSeenDate) allTimestamps.push(lastSeenDate.getTime());
        const lastActivityAt: string | null = allTimestamps.length > 0
          ? new Date(Math.max(...allTimestamps)).toISOString()
          : null;

        // 提出締切を過ぎた未提出 (assigned/in_progress) の宿題があるか
        const nowMs = Date.now();
        const hasOverdueHomework = homeworkSnap.docs.some((d) => {
          const hw = d.data();
          if (hw.status !== "assigned" && hw.status !== "in_progress") return false;
          if (!hw.dueDate) return false;
          const due = new Date(hw.dueDate).getTime();
          return Number.isFinite(due) && due < nowMs;
        });

        const alertFlags: StudentListItem["alertFlags"] = [];

        if (lastActivityAt) {
          const daysSince =
            (Date.now() - new Date(lastActivityAt).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSince >= 3) alertFlags.push("inactive");
        } else {
          alertFlags.push("inactive");
        }

        const repeatedCount = weaknessesSnap.docs.filter(
          (d) => (d.data().count ?? 0) >= 5 && !d.data().archivedAt // Phase 4: archive 除外
        ).length;
        if (repeatedCount > 0) alertFlags.push("repeated_weakness");

        // declining detection: 直近3回のスコアが連続下降
        const recentScores = essaysSnap.docs
          .slice(0, 3)
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number");
        if (recentScores.length >= 3 && isDeclining(recentScores.reverse())) {
          alertFlags.push("declining");
        }

        // スコア推移（直近3回）
        const scoreTrend = computeScoreTrend(recentScores);

        // アクティブ弱点数（dismissedでない + archive されていないもの）
        const activeWeaknessDocs = weaknessesSnap.docs.filter(
          (d) => !d.data().dismissed && !d.data().archivedAt
        );
        const activeWeaknessCount = activeWeaknessDocs.length;

        // 弱点の改善傾向: improving(改善中) と stuck(count>=3で未改善) を比較
        // improving が多い→改善傾向、stuck が多い→停滞、それ以外→横ばい。弱点0は null
        let weaknessTrend: "improving" | "stable" | "declining" | null = null;
        if (activeWeaknessCount > 0) {
          const improvingCount = activeWeaknessDocs.filter(
            (d) => d.data().improving === true && !d.data().resolved
          ).length;
          const stuckCount = activeWeaknessDocs.filter(
            (d) => !d.data().improving && !d.data().resolved && (d.data().count ?? 0) >= 3
          ).length;
          if (improvingCount > 0 && improvingCount >= stuckCount) {
            weaknessTrend = "improving";
          } else if (stuckCount > improvingCount) {
            weaknessTrend = "declining";
          } else {
            weaknessTrend = "stable";
          }
        }

        // 書類完了度
        const totalDocs = documentsSnap.size;
        const completedDocs = documentsSnap.docs.filter(
          (d) => d.data().status === "final" || d.data().status === "reviewed"
        ).length;

        // 最終セッション日
        const lastSessionDoc = sessionsSnap.docs[0]?.data();
        const lastSessionAt: string | null = lastSessionDoc?.scheduledAt
          ? (lastSessionDoc.scheduledAt.toDate?.()?.toISOString() ?? lastSessionDoc.scheduledAt)
          : null;

        const lastSkillCheckedAt: string | null = data.lastSkillCheckedAt?.toDate?.()?.toISOString() ?? null;
        const lastInterviewCheckedAt: string | null = data.lastInterviewCheckedAt?.toDate?.()?.toISOString() ?? null;

        // 練習集計を反映した aggregate ランクを算出
        // currentSkillRank/currentInterviewRank は「SC + 直近30日練習の合成」値
        const [essayAgg, interviewAgg] = await Promise.all([
          computeEssayAggregate(uid, typeof data.currentSkillScore === "number" ? data.currentSkillScore : null),
          computeInterviewAggregate(uid, typeof data.currentInterviewScore === "number" ? data.currentInterviewScore : null),
        ]);

        return {
          uid,
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          photoURL: data.photoURL ?? null,
          targetUniversities: data.targetUniversities ?? [],
          resolvedUniversities: resolveTargetUniversities(data.targetUniversities),
          grade: typeof data.grade === "number" ? data.grade : undefined,
          gradeUpdatedAt:
            typeof data.gradeUpdatedAt === "string"
              ? data.gradeUpdatedAt
              : undefined,
          isRonin: data.isRonin === true,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ??
            (typeof data.createdAt === "string" ? data.createdAt : undefined),
          latestScore,
          latestInterviewScore,
          essayCount,
          lastActivityAt,
          lastSeenAt,
          lastActivity,
          hasOverdueHomework,
          alertFlags,
          scoreTrend,
          interviewScoreTrend,
          activeWeaknessCount,
          weaknessTrend,
          documentProgress: { completed: completedDocs, total: totalDocs },
          lastSessionAt,
          currentSkillRank: essayAgg.compositeRank,
          currentSkillScore: essayAgg.compositeScore,
          lastSkillCheckedAt,
          academicCategory: data.academicCategory ?? null,
          currentInterviewRank: interviewAgg.compositeRank,
          currentInterviewScore: interviewAgg.compositeScore,
          lastInterviewCheckedAt,
          assignedTeacherIds: getAssignedTeacherIds(data),
        };
      })
    );

    let filtered = students;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (universityFilter) {
      filtered = filtered.filter((s) =>
        s.targetUniversities.includes(universityFilter)
      );
    }
    if (rankFilter) {
      filtered = filtered.filter((s) => s.currentSkillRank === rankFilter);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sort === "score") {
        cmp = (a.latestScore ?? -1) - (b.latestScore ?? -1);
      } else if (sort === "name") {
        cmp = a.displayName.localeCompare(b.displayName, "ja");
      } else if (sort === "rank" || sort === "interviewRank") {
        const rankOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
        const field = sort === "interviewRank" ? "currentInterviewRank" : "currentSkillRank";
        const aRank = a[field] ? rankOrder[a[field] as string] : 99;
        const bRank = b[field] ? rankOrder[b[field] as string] : 99;
        cmp = aRank - bRank;
      } else {
        const aTime = a.lastActivityAt
          ? new Date(a.lastActivityAt).getTime()
          : 0;
        const bTime = b.lastActivityAt
          ? new Date(b.lastActivityAt).getTime()
          : 0;
        cmp = aTime - bTime;
      }
      return order === "asc" ? cmp : -cmp;
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Admin students list error:", error);
    return NextResponse.json(
      { error: "生徒一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import { resolveTargetUniversities } from "@/lib/universities/resolve";
import type { StudentDetail } from "@/lib/types/admin";
import {
  computeEssayAggregateFromList,
  computeInterviewAggregateFromList,
} from "@/lib/skill-check/aggregate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;

    // スコープ判定: superadmin / 自分の管轄 / 同じ塾の admin のいずれか
    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(userData),
      },
      allowAssignedTeacher: true,
    });
    if (orgDenied) {
      // teacher の場合は session 経由アクセスを最後に許可
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(effectiveUid, id);
        if (!hasAccess) return orgDenied;
      } else {
        return orgDenied;
      }
    }

    // composite index (userId + status + startedAt) が無い環境でも JS filter で
    // 履歴を確実に拾う。 silent catch で空配列にすると面接側が永遠に出ない問題を回避
    const fetchCompletedInterviews = async () => {
      try {
        return await adminDb!
          .collection("interviews")
          .where("userId", "==", id)
          .where("status", "==", "completed")
          .orderBy("startedAt", "desc")
          .get();
      } catch (indexErr) {
        console.warn(
          "[admin/students] interviews composite index missing, fallback to JS filter:",
          indexErr,
        );
        const snap = await adminDb!
          .collection("interviews")
          .where("userId", "==", id)
          .get();
        const docs = snap.docs
          .filter((d) => d.data().status === "completed")
          .sort((a, b) => {
            const ta = a.data().startedAt?.toDate?.()?.getTime() ?? 0;
            const tb = b.data().startedAt?.toDate?.()?.getTime() ?? 0;
            return tb - ta;
          });
        return { docs };
      }
    };

    const [
      essaysSnap,
      interviewsSnap,
      weaknessesSnap,
      skillChecksSnap,
      interviewSkillChecksSnap,
    ] = await Promise.all([
      adminDb
        .collection("essays")
        .where("userId", "==", id)
        .orderBy("submittedAt", "desc")
        .get(),
      fetchCompletedInterviews(),
      adminDb
        .collection(`users/${id}/weaknesses`)
        .get(),
      adminDb
        .collection(`users/${id}/skillChecks`)
        .orderBy("takenAt", "desc")
        .limit(1)
        .get(),
      adminDb
        .collection(`users/${id}/interviewSkillChecks`)
        .orderBy("takenAt", "desc")
        .limit(1)
        .get(),
    ]);

    // 大学ID→日本語名のヘルパー（部分一致フォールバック付き）
    function resolveUniName(uniId: string, facId: string): { uniName: string; facName: string } {
      // 完全一致を試す
      let uni = MOCK_UNIVERSITIES.find((u) => u.id === uniId);
      // 部分一致フォールバック（IDの先頭部分で探す）
      if (!uni && uniId) {
        uni = MOCK_UNIVERSITIES.find((u) => uniId.startsWith(u.id) || u.id.startsWith(uniId));
      }
      let fac = uni?.faculties?.find((f) => f.id === facId);
      // 学部も部分一致
      if (!fac && facId && uni?.faculties) {
        fac = uni.faculties.find((f) => facId.startsWith(f.id) || f.id.startsWith(facId));
      }
      return {
        uniName: uni?.name ?? uniId,
        facName: fac?.name ?? facId,
      };
    }

    const essays = essaysSnap.docs.map((d) => {
      const data = d.data();
      const resolved = resolveUniName(data.targetUniversity ?? "", data.targetFaculty ?? "");
      return {
        id: d.id,
        targetUniversity: resolved.uniName,
        targetFaculty: resolved.facName,
        topic: data.topic,
        submittedAt: data.submittedAt?.toDate().toISOString() ?? new Date().toISOString(),
        scores: data.scores ?? null,
        status: data.status ?? "uploaded",
      };
    });

    const weaknesses = weaknessesSnap.docs
      .filter((d) => !d.data().archivedAt) // Phase 4: archive 済みは一覧から除外
      .map((d) => {
        const data = d.data();
        return {
          area: data.area ?? "",
          count: data.count ?? 0,
          firstOccurred: data.firstOccurred?.toDate() ?? new Date(),
          lastOccurred: data.lastOccurred?.toDate() ?? new Date(),
          improving: data.improving ?? false,
          resolved: data.resolved ?? false,
          source: data.source ?? "essay",
          reminderDismissedAt: data.reminderDismissedAt?.toDate() ?? null,
          categoryId: data.categoryId,
        };
      });

    // 添削スコア推移（総合 + 構成要素別）
    const essayScoreTrend = essays
      .filter((e) => e.scores)
      .reverse()
      .map((e) => ({
        date: e.submittedAt,
        total: e.scores!.total,
        structure: e.scores!.structure ?? 0,
        logic: e.scores!.logic ?? 0,
        expression: e.scores!.expression ?? 0,
        apAlignment: e.scores!.apAlignment ?? 0,
        originality: e.scores!.originality ?? 0,
      }));

    // 面接スコア推移（総合 + 共通5軸）
    const interviewScoreTrend = interviewsSnap.docs
      .map((d) => {
        const data = d.data();
        const s = data.scores;
        return {
          date: data.startedAt?.toDate().toISOString() ?? new Date().toISOString(),
          total: s?.total ?? null,
          clarity: s?.clarity ?? 0,
          apAlignment: s?.apAlignment ?? 0,
          enthusiasm: s?.enthusiasm ?? 0,
          specificity: s?.specificity ?? 0,
          bodyLanguage: s?.bodyLanguage ?? 0,
        };
      })
      .filter(
        (i): i is {
          date: string;
          total: number;
          clarity: number;
          apAlignment: number;
          enthusiasm: number;
          specificity: number;
          bodyLanguage: number;
        } => i.total != null,
      )
      .reverse();

    // スキル俯瞰レーダー用: 直近 3 件の 5 軸平均
    const avg = (xs: number[]) =>
      xs.length > 0
        ? Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10
        : 0;

    const recentEssayScores = essays
      .filter((e) => e.scores)
      .slice(0, 3)
      .map((e) => e.scores!);
    const essayCategoryAverages =
      recentEssayScores.length > 0
        ? {
            structure: avg(recentEssayScores.map((s) => s.structure ?? 0)),
            logic: avg(recentEssayScores.map((s) => s.logic ?? 0)),
            expression: avg(recentEssayScores.map((s) => s.expression ?? 0)),
            apAlignment: avg(recentEssayScores.map((s) => s.apAlignment ?? 0)),
            originality: avg(recentEssayScores.map((s) => s.originality ?? 0)),
          }
        : undefined;

    const recentInterviewScores = interviewsSnap.docs
      .slice(0, 3)
      .map((d) => d.data().scores)
      .filter((s): s is Record<string, number> => s != null);
    const interviewCategoryAverages =
      recentInterviewScores.length > 0
        ? {
            clarity: avg(recentInterviewScores.map((s) => s.clarity ?? 0)),
            apAlignment: avg(recentInterviewScores.map((s) => s.apAlignment ?? 0)),
            enthusiasm: avg(recentInterviewScores.map((s) => s.enthusiasm ?? 0)),
            specificity: avg(recentInterviewScores.map((s) => s.specificity ?? 0)),
            bodyLanguage: avg(recentInterviewScores.map((s) => s.bodyLanguage ?? 0)),
          }
        : undefined;

    // スキル俯瞰の StatsSummaryCard 用サマリ (count / avgScore / scoreChange / best/worst category)
    const ESSAY_CATEGORY_LABELS: Record<string, string> = {
      structure: "構成",
      logic: "論理性",
      expression: "表現力",
      apAlignment: "AP合致度",
      originality: "独自性",
    };
    const INTERVIEW_CATEGORY_LABELS: Record<string, string> = {
      clarity: "明確さ",
      apAlignment: "AP合致度",
      enthusiasm: "熱意",
      specificity: "具体性",
      bodyLanguage: "ボディランゲージ",
    };

    function pickBestWorst(
      cat: Record<string, number> | undefined,
      labels: Record<string, string>,
    ): { bestCategory?: string; worstCategory?: string } {
      if (!cat) return {};
      const entries = Object.entries(cat);
      if (entries.length === 0) return {};
      const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
      const worst = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
      return {
        bestCategory: labels[best[0]] ?? best[0],
        worstCategory: labels[worst[0]] ?? worst[0],
      };
    }

    // 先期比: 直近 3 件平均 - その前 3 件平均
    const prevEssayScores = essays
      .filter((e) => e.scores)
      .slice(3, 6)
      .map((e) => e.scores!);
    const essayAvgCurrent =
      recentEssayScores.length > 0
        ? recentEssayScores.reduce((s, x) => s + (x.total ?? 0), 0) /
          recentEssayScores.length
        : 0;
    const essayAvgPrev =
      prevEssayScores.length > 0
        ? prevEssayScores.reduce((s, x) => s + (x.total ?? 0), 0) /
          prevEssayScores.length
        : 0;
    const essayStatsSummary =
      recentEssayScores.length > 0
        ? {
            count: recentEssayScores.length,
            avgScore: Math.round(essayAvgCurrent * 10) / 10,
            scoreChange:
              prevEssayScores.length > 0
                ? Math.round((essayAvgCurrent - essayAvgPrev) * 10) / 10
                : 0,
            ...pickBestWorst(essayCategoryAverages, ESSAY_CATEGORY_LABELS),
          }
        : undefined;

    const prevInterviewScores = interviewsSnap.docs
      .slice(3, 6)
      .map((d) => d.data().scores)
      .filter((s): s is Record<string, number> => s != null);
    const interviewAvgCurrent =
      recentInterviewScores.length > 0
        ? recentInterviewScores.reduce((s, x) => s + (x.total ?? 0), 0) /
          recentInterviewScores.length
        : 0;
    const interviewAvgPrev =
      prevInterviewScores.length > 0
        ? prevInterviewScores.reduce((s, x) => s + (x.total ?? 0), 0) /
          prevInterviewScores.length
        : 0;
    const interviewStatsSummary =
      recentInterviewScores.length > 0
        ? {
            count: recentInterviewScores.length,
            avgScore: Math.round(interviewAvgCurrent * 10) / 10,
            scoreChange:
              prevInterviewScores.length > 0
                ? Math.round((interviewAvgCurrent - interviewAvgPrev) * 10) / 10
                : 0,
            ...pickBestWorst(interviewCategoryAverages, INTERVIEW_CATEGORY_LABELS),
          }
        : undefined;

    // 最終活動（添削・面接の最新を、種別つきで特定）
    const activityCandidates: { type: "essay" | "interview"; at: string }[] = [];
    if (essays.length > 0) {
      activityCandidates.push({ type: "essay", at: essays[0].submittedAt });
    }
    if (interviewsSnap.docs.length > 0) {
      const latestInterview = interviewsSnap.docs[0].data();
      if (latestInterview.startedAt) {
        activityCandidates.push({
          type: "interview",
          at: latestInterview.startedAt.toDate().toISOString(),
        });
      }
    }
    activityCandidates.sort((a, b) => (a.at < b.at ? 1 : -1));
    const lastActivity = activityCandidates[0] ?? null;
    const lastActivityAt = lastActivity?.at ?? null;

    // 最終ログイン (ハートビートで更新される users.lastSeenAt)
    const lastSeenAt =
      userData.lastSeenAt?.toDate?.()?.toISOString() ??
      (typeof userData.lastSeenAt === "string" ? userData.lastSeenAt : null);

    // 志望校のcompound IDを日本語名に解決
    const targetUnis = userData.targetUniversities ?? [];
    const resolvedUniversities = resolveTargetUniversities(targetUnis);

    // スキル指標 = 最新スキルチェックテスト結果のみ。
    // 練習履歴 (essays / interviews) は合成しない (= 月 1 リマインド再受験で更新)
    const latestEssaySc = skillChecksSnap.docs[0]?.data();
    const latestInterviewSc = interviewSkillChecksSnap.docs[0]?.data();

    const essayScTotal =
      typeof latestEssaySc?.scores?.total === "number"
        ? latestEssaySc.scores.total
        : null;
    const interviewScTotal =
      typeof latestInterviewSc?.scores?.total === "number"
        ? latestInterviewSc.scores.total
        : null;

    // 空配列を渡すと blend() が sc_only / none に自動分岐 (純粋関数を再利用)
    const essayAggregate = computeEssayAggregateFromList(essayScTotal, []);
    const interviewAggregate = computeInterviewAggregateFromList(
      interviewScTotal,
      [],
    );

    // SC 受験メタ (リマインド UI 用)
    const buildSkillCheckMeta = (
      doc: FirebaseFirestore.DocumentData | undefined,
    ):
      | { takenAt: string; daysSinceLast: number; needsRefresh: boolean }
      | undefined => {
      const taken = doc?.takenAt?.toDate?.() as Date | undefined;
      if (!taken) return undefined;
      const days = Math.floor((Date.now() - taken.getTime()) / 86400000);
      return {
        takenAt: taken.toISOString(),
        daysSinceLast: days,
        needsRefresh: days >= 30,
      };
    };
    const essaySkillCheckMeta = buildSkillCheckMeta(latestEssaySc);
    const interviewSkillCheckMeta = buildSkillCheckMeta(latestInterviewSc);

    const detail: StudentDetail = {
      profile: {
        uid: id,
        displayName: userData.displayName ?? "",
        email: userData.email ?? "",
        photoURL: userData.photoURL ?? null,
        school: userData.school,
        schoolId: userData.schoolId,
        grade: userData.grade,
        gradeUpdatedAt: userData.gradeUpdatedAt,
        isRonin: userData.isRonin === true,
        createdAt:
          userData.createdAt?.toDate?.()?.toISOString() ??
          (typeof userData.createdAt === "string" ? userData.createdAt : undefined),
        gpa: userData.gpa ?? undefined,
        englishCerts: userData.englishCerts ?? undefined,
        targetUniversities: targetUnis,
        sessionsPerMonth: userData.sessionsPerMonth ?? 1,
        resolvedUniversities,
        assignedTeacherIds: getAssignedTeacherIds(userData),
      },
      weaknesses,
      essays,
      essayScoreTrend,
      interviewScoreTrend,
      ...(essayCategoryAverages ? { essayCategoryAverages } : {}),
      ...(essayStatsSummary ? { essayStatsSummary } : {}),
      ...(interviewStatsSummary ? { interviewStatsSummary } : {}),
      ...(interviewCategoryAverages ? { interviewCategoryAverages } : {}),
      essayAggregate,
      interviewAggregate,
      ...(essaySkillCheckMeta ? { essaySkillCheckMeta } : {}),
      ...(interviewSkillCheckMeta ? { interviewSkillCheckMeta } : {}),
      lastActivityAt,
      lastActivity,
      lastSeenAt,
      realtimeUnlocked: userData.realtimeUnlocked === true,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Admin student detail error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `生徒詳細の取得中にエラー: ${message}` },
      { status: 500 }
    );
  }
}

const ALLOWED_FIELDS = ["displayName", "school", "schoolId", "grade", "gpa", "englishCerts", "targetUniversities", "sessionsPerMonth", "isRonin"] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id } = await params;
  const body = await request.json();

  // フィールドをフィルタリング
  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field];
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "更新するフィールドがありません" },
      { status: 400 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;

    // managedByスコーピング
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;

    // スコープ判定: superadmin / 自分の管轄 / 同じ塾の admin のいずれか
    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
      },
    });
    if (orgDenied) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(effectiveUid, id);
        if (!hasAccess) return orgDenied;
      } else {
        return orgDenied;
      }
    }

    // 学年 / 浪人フラグが「実際に変わったとき」だけ gradeUpdatedAt を更新する。
    // 値が同じでも毎回更新すると 4/1 自動加算（getDisplayGrade）の起点がリセットされ、
    // 学年を触っていない編集でも表示学年が1年巻き戻る。
    const gradeChanged =
      "grade" in body && (body.grade ?? null) !== (userData.grade ?? null);
    const roninChanged =
      "isRonin" in body && !!body.isRonin !== !!userData.isRonin;
    if (gradeChanged || roninChanged) {
      updates.gradeUpdatedAt = new Date().toISOString();
    }

    updates.updatedAt = new Date();
    await adminDb.doc(`users/${id}`).update(updates);

    return NextResponse.json({ uid: id, ...updates });
  } catch (error) {
    console.error("Admin student update error:", error);
    return NextResponse.json(
      { error: "生徒情報の更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 生徒アカウントの無効化（ソフト削除）。
 * role を "disabled" にしてログイン後のアクセスを不可にする（データは保持・復元は運営）。
 * admin/superadmin のみ。admin は自塾の生徒のみ（assigned teacher は不可＝管理操作）。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;
  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const studentDoc = await adminDb.doc(`users/${id}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = studentDoc.data();
    // 生徒以外（admin/teacher/superadmin）はこのエンドポイントで無効化させない
    if (userData?.role !== "student") {
      return NextResponse.json(
        { error: "対象は生徒アカウントではありません" },
        { status: 400 },
      );
    }
    // 自塾スコープ（担当講師の代理無効化は不可＝allowAssignedTeacher:false）
    const orgDenied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData?.managedBy,
        organizationId: userData?.organizationId,
      },
    });
    if (orgDenied) return orgDenied;

    await adminDb.doc(`users/${id}`).update({
      role: "disabled",
      disabledAt: new Date().toISOString(),
      updatedAt: new Date(),
    });
    return NextResponse.json({ success: true, uid: id, role: "disabled" });
  } catch (error) {
    console.error("Admin student disable error:", error);
    return NextResponse.json(
      { error: "生徒の無効化に失敗しました" },
      { status: 500 },
    );
  }
}

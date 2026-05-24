import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
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

    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(effectiveUid, id);
        if (!hasAccess) {
          return NextResponse.json(
            { error: "この生徒へのアクセス権がありません" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "この生徒へのアクセス権がありません" },
          { status: 403 }
        );
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

    const weaknesses = weaknessesSnap.docs.map((d) => {
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
      };
    });

    // 添削スコア推移
    const essayScoreTrend = essays
      .filter((e) => e.scores)
      .reverse()
      .map((e) => ({
        date: e.submittedAt,
        total: e.scores!.total,
      }));

    // 面接スコア推移
    const interviewScoreTrend = interviewsSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          date: data.startedAt?.toDate().toISOString() ?? new Date().toISOString(),
          total: data.scores?.total ?? null,
        };
      })
      .filter((i): i is { date: string; total: number } => i.total != null)
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

    // 最終活動日を計算（添削・面接の最新日時）
    const dates: string[] = [];
    if (essays.length > 0) dates.push(essays[0].submittedAt);
    if (interviewsSnap.docs.length > 0) {
      const latestInterview = interviewsSnap.docs[0].data();
      if (latestInterview.startedAt) {
        dates.push(latestInterview.startedAt.toDate().toISOString());
      }
    }
    const lastActivityAt = dates.length > 0
      ? dates.sort().reverse()[0]
      : null;

    // 志望校のcompound IDを日本語名に解決
    const targetUnis = userData.targetUniversities ?? [];
    const resolvedUniversities = targetUnis.map((compoundId: string) => {
      const [universityId, facultyId] = compoundId.split(":");
      const uni = MOCK_UNIVERSITIES.find((u) => u.id === universityId);
      const faculty = uni?.faculties?.find((f) => f.id === facultyId);
      return {
        compoundId,
        universityName: uni?.name ?? universityId,
        facultyName: faculty?.name ?? facultyId ?? "",
      };
    });

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
        school: userData.school,
        grade: userData.grade,
        gradeUpdatedAt: userData.gradeUpdatedAt,
        isRonin: userData.isRonin === true,
        gpa: userData.gpa ?? undefined,
        englishCerts: userData.englishCerts ?? undefined,
        targetUniversities: targetUnis,
        resolvedUniversities,
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

const ALLOWED_FIELDS = ["displayName", "school", "grade", "gpa", "englishCerts", "targetUniversities", "sessionsPerMonth", "isRonin"] as const;

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
  // 学年が更新されたら gradeUpdatedAt も同時記録 (4/1 自動加算用)
  if ("grade" in body) {
    updates.gradeUpdatedAt = new Date().toISOString();
  }
  // 浪人切替: 浪人開始日記録 (= gradeUpdatedAt を「今」 にして加算を停止 / リセット)
  if ("isRonin" in body) {
    updates.gradeUpdatedAt = new Date().toISOString();
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

    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(effectiveUid, id);
        if (!hasAccess) {
          return NextResponse.json(
            { error: "この生徒の編集権限がありません" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "この生徒の編集権限がありません" },
          { status: 403 }
        );
      }
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

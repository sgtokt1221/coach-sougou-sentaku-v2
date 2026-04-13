import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { StudentDetail } from "@/lib/types/admin";

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

    const [essaysSnap, interviewsSnap, weaknessesSnap] = await Promise.all([
      adminDb
        .collection("essays")
        .where("userId", "==", id)
        .orderBy("submittedAt", "desc")
        .get(),
      adminDb
        .collection("interviews")
        .where("userId", "==", id)
        .orderBy("startedAt", "desc")
        .get()
        .catch(() => ({ docs: [] })),
      adminDb
        .collection(`users/${id}/weaknesses`)
        .get(),
    ]);

    const essays = essaysSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        targetUniversity: data.targetUniversity ?? "",
        targetFaculty: data.targetFaculty ?? "",
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

    const detail: StudentDetail = {
      profile: {
        uid: id,
        displayName: userData.displayName ?? "",
        email: userData.email ?? "",
        school: userData.school,
        grade: userData.grade,
        gpa: userData.gpa ?? undefined,
        englishCerts: userData.englishCerts ?? undefined,
        targetUniversities: targetUnis,
        resolvedUniversities,
      },
      weaknesses,
      essays,
      essayScoreTrend,
      interviewScoreTrend,
      lastActivityAt,
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

const ALLOWED_FIELDS = ["displayName", "school", "grade", "gpa", "englishCerts", "targetUniversities"] as const;

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

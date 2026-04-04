import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { StudentDetail } from "@/lib/types/admin";

const MOCK_DETAIL: StudentDetail = {
  profile: {
    uid: "mock_student_001",
    displayName: "田中 太郎",
    email: "tanaka@example.com",
    school: "私立開成高等学校",
    grade: 3,
    gpa: 4.5,
    englishCerts: [{ type: "EIKEN" as const, score: "準1級" }],
    targetUniversities: ["東京大学", "京都大学"],
  },
  weaknesses: [
    {
      area: "論理的一貫性",
      count: 3,
      firstOccurred: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      improving: true,
      resolved: false,
      source: "essay",
      reminderDismissedAt: null,
    },
    {
      area: "具体例の不足",
      count: 5,
      firstOccurred: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      improving: false,
      resolved: false,
      source: "essay",
      reminderDismissedAt: null,
    },
    {
      area: "結論の曖昧さ",
      count: 2,
      firstOccurred: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      lastOccurred: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      improving: false,
      resolved: true,
      source: "both",
      reminderDismissedAt: null,
    },
  ],
  essays: [
    {
      id: "essay_001",
      targetUniversity: "東京大学",
      targetFaculty: "法学部",
      topic: "現代社会における民主主義の課題と展望",
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      scores: {
        structure: 8,
        logic: 7,
        expression: 8,
        apAlignment: 7,
        originality: 8,
        total: 38,
      },
      status: "reviewed",
    },
    {
      id: "essay_002",
      targetUniversity: "京都大学",
      targetFaculty: "経済学部",
      topic: "少子高齢化社会における経済政策の方向性",
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      scores: {
        structure: 7,
        logic: 7,
        expression: 7,
        apAlignment: 6,
        originality: 7,
        total: 34,
      },
      status: "reviewed",
    },
    {
      id: "essay_003",
      targetUniversity: "東京大学",
      targetFaculty: "法学部",
      topic: "国際法の実効性について",
      submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      scores: {
        structure: 6,
        logic: 6,
        expression: 7,
        apAlignment: 6,
        originality: 5,
        total: 30,
      },
      status: "reviewed",
    },
  ],
  scoreTrend: [
    {
      date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      total: 26,
      structure: 5,
      logic: 5,
      expression: 6,
      apAlignment: 5,
      originality: 5,
    },
    {
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      total: 28,
      structure: 6,
      logic: 5,
      expression: 6,
      apAlignment: 6,
      originality: 5,
    },
    {
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      total: 30,
      structure: 6,
      logic: 6,
      expression: 7,
      apAlignment: 6,
      originality: 5,
    },
    {
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      total: 34,
      structure: 7,
      logic: 7,
      expression: 7,
      apAlignment: 6,
      originality: 7,
    },
    {
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      total: 38,
      structure: 8,
      logic: 7,
      expression: 8,
      apAlignment: 7,
      originality: 8,
    },
  ],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({
        ...MOCK_DETAIL,
        profile: { ...MOCK_DETAIL.profile, uid: id },
      });
    }

    const { doc, getDoc, collection, query, orderBy, getDocs } =
      await import("firebase/firestore");

    const userDoc = await getDoc(doc(db, "users", id));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;

    if (role !== "superadmin" && userData.managedBy !== effectiveUid) {
      // セッションベースのアクセス権チェック（ヘルパー講師用）
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

    const essaysSnap = await getDocs(
      query(
        collection(db, "users", id, "essays"),
        orderBy("submittedAt", "desc")
      )
    );

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

    const weaknessesSnap = await getDocs(
      collection(db, "users", id, "weaknesses")
    );
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

    const scoreTrend = essays
      .filter((e) => e.scores)
      .reverse()
      .map((e) => ({
        date: e.submittedAt,
        total: e.scores!.total,
        structure: e.scores!.structure,
        logic: e.scores!.logic,
        expression: e.scores!.expression,
        apAlignment: e.scores!.apAlignment,
        originality: e.scores!.originality,
      }));

    const detail: StudentDetail = {
      profile: {
        uid: id,
        displayName: userData.displayName ?? "",
        email: userData.email ?? "",
        school: userData.school,
        grade: userData.grade,
        gpa: userData.gpa ?? undefined,
        englishCerts: userData.englishCerts ?? undefined,
        targetUniversities: userData.targetUniversities ?? [],
      },
      weaknesses,
      essays,
      scoreTrend,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Admin student detail error:", error);
    return NextResponse.json(
      { error: "生徒詳細の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

const ALLOWED_FIELDS = ["displayName", "school", "grade", "targetUniversities"] as const;

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
    // devモード: モックレスポンス
    return NextResponse.json({ uid: id, ...updates });
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

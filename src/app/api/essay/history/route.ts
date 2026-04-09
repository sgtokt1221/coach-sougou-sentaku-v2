import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    // トークンからuserIdを取得（interview/historyと同じパターン）
    if (!userId || userId === "current") {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { adminAuth } = await import("@/lib/firebase/admin");
          if (adminAuth) {
            const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
            userId = decoded.uid;
          }
        } catch (e) {
          console.error("Essay history: auth token verification failed:", e);
        }
      }
      // dev mode fallback
      if (!userId && process.env.NODE_ENV === "development") {
        const devRole = request.headers.get("X-Dev-Role");
        if (devRole) userId = "dev-user";
      }
    }

    if (!userId) {
      return NextResponse.json({ essays: [] });
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDKが初期化されていません" },
        { status: 500 }
      );
    }

    let snapshot;
    try {
      snapshot = await adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .orderBy("submittedAt", "desc")
        .get();
    } catch {
      // Fallback: インデックス未作成時はorderByなしでクエリし、JS側でソート
      snapshot = await adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .get();
    }

    // 大学名解決用キャッシュ
    const universityCache = new Map<string, { name: string; faculties: Array<{ id: string; name: string }> }>();

    async function resolveNames(universityId: string, facultyId: string) {
      if (!universityCache.has(universityId)) {
        const uniDoc = await adminDb!.doc(`universities/${universityId}`).get();
        if (uniDoc.exists) {
          const d = uniDoc.data()!;
          universityCache.set(universityId, { name: d.name, faculties: d.faculties ?? [] });
        }
      }
      const uni = universityCache.get(universityId);
      const faculty = uni?.faculties.find((f) => f.id === facultyId);
      return { universityName: uni?.name ?? universityId, facultyName: faculty?.name ?? facultyId };
    }

    const essays = await Promise.all(
      snapshot.docs.map(async (d) => {
        const data = d.data();
        const { universityName, facultyName } = await resolveNames(
          data.targetUniversity ?? "",
          data.targetFaculty ?? ""
        );
        const scores = data.scores ?? { structure: 0, logic: 0, expression: 0, apAlignment: 0, originality: 0 };
        return {
          id: d.id,
          universityName,
          facultyName,
          topic: data.topic ?? "",
          submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          status: data.status ?? "reviewed",
          totalScore: scores.total ?? (scores.structure + scores.logic + scores.expression + scores.apAlignment + scores.originality),
          scores: {
            structure: scores.structure ?? 0,
            logic: scores.logic ?? 0,
            expression: scores.expression ?? 0,
            apAlignment: scores.apAlignment ?? 0,
            originality: scores.originality ?? 0,
          },
        };
      })
    );

    // フォールバック時のためJS側でもソート
    essays.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return NextResponse.json({ essays });
  } catch (error) {
    console.error("Essay history error:", error);
    return NextResponse.json(
      { error: "履歴取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

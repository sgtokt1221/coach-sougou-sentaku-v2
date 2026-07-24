import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    // "current" は「現在のログインユーザー」のエイリアス。トークン / dev role から解決する。
    // 旧実装は !userId のみチェックしていて、"current" のままだと後段の
    // where("userId", "==", "current") で hit せず 0 件返却するバグがあった。
    if (!userId || userId === "current") {
      userId = null;
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
      // 添削完了 (status: "reviewed") の essay のみ履歴に表示。
      // status: "reviewing" のまま放置されたゴミデータ (旧版 brushedUpText
      // undefined エラーで Firestore reject されたもの等) は除外する。
      snapshot = await adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .where("status", "==", "reviewed")
        .orderBy("submittedAt", "desc")
        .get();
    } catch {
      // Fallback: インデックス未作成時はorderByなしでクエリし、JS側でソート
      snapshot = await adminDb
        .collection("essays")
        .where("userId", "==", userId)
        .where("status", "==", "reviewed")
        .get();
    }

    // 大学名解決用キャッシュ
    const universityCache = new Map<
      string,
      { name: string; faculties: Array<{ id: string; name: string }> }
    >();

    // 旧データの universityId/facultyId 表記揺れに対する alias 辞書。
    // 過去問データやFirestoreの古いユーザーデータが旧 ID で保存されている場合に
    // 現行 ID に寄せて表示を救済する。
    const universityIdAliases: Record<string, string> = {
      "kwansei-gakuin-u": "kwansei-u",
    };
    const facultyIdAliases: Record<string, string> = {
      "global-communications": "global-comm",
    };

    async function resolveNames(universityId: string, facultyId: string) {
      const resolvedUniversityId =
        universityIdAliases[universityId] ?? universityId;
      if (!universityCache.has(resolvedUniversityId)) {
        const uniDoc = await adminDb!
          .doc(`universities/${resolvedUniversityId}`)
          .get();
        if (uniDoc.exists) {
          const d = uniDoc.data()!;
          universityCache.set(resolvedUniversityId, {
            name: d.name,
            faculties: d.faculties ?? [],
          });
        }
      }
      const uni = universityCache.get(resolvedUniversityId);
      const resolvedFacultyId = facultyIdAliases[facultyId] ?? facultyId;
      const faculty = uni?.faculties.find((f) => f.id === resolvedFacultyId);
      // 学部名が見つからない場合は facultyId を表示せず空文字にする
      return {
        universityName: uni?.name ?? resolvedUniversityId,
        facultyName: faculty?.name ?? "",
      };
    }

    const essays = await Promise.all(
      snapshot.docs.map(async (d) => {
        const data = d.data();
        const { universityName, facultyName } = await resolveNames(
          data.targetUniversity ?? "",
          data.targetFaculty ?? ""
        );
        const scores = data.scores ?? {
          structure: 0,
          logic: 0,
          expression: 0,
          apAlignment: 0,
          originality: 0,
        };
        const total =
          scores.total ??
          (scores.structure ?? 0) +
            (scores.logic ?? 0) +
            (scores.expression ?? 0) +
            (scores.apAlignment ?? 0) +
            (scores.originality ?? 0);
        return {
          id: d.id,
          universityName,
          facultyName,
          topic: data.topic ?? "",
          submittedAt:
            data.submittedAt?.toDate?.()?.toISOString() ??
            new Date().toISOString(),
          status: data.status ?? "reviewed",
          totalScore: total,
          scoreMaximum: data.feedback?.scoreMaximum ?? 50,
          scores: {
            structure: scores.structure ?? 0,
            logic: scores.logic ?? 0,
            expression: scores.expression ?? 0,
            apAlignment: scores.apAlignment ?? 0,
            originality: scores.originality ?? 0,
            total,
          },
          rootEssayId: data.rootEssayId ?? d.id,
          parentEssayId: data.parentEssayId ?? null,
          attemptNumber:
            typeof data.attemptNumber === "number" ? data.attemptNumber : 1,
          inputMode: data.inputMode ?? null,
          sourceType: data.sourceType ?? null,
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

import { NextRequest, NextResponse } from "next/server";

/**
 * 生徒自身の要約ドリル履歴。
 * 管理者ルート (/api/admin/students/[id]/summary-drills) と同じ shape を返す。
 */
export interface SummaryDrillHistoryItem {
  id: string;
  passageId: string | null;
  passageTitle: string | null;
  facultyId: string | null;
  summaryText: string;
  scores: {
    comprehension: number;
    conciseness: number;
    keyPoints: number;
    structure: number;
    expression: number;
  };
  total: number;
  feedback: string | null;
  completedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    // セキュリティ: 履歴は常に「呼び出し元自身」のものだけを返す。
    // クエリの userId は信頼せず、必ずトークン(dev時のみ X-Dev-Role)から uid を解決する。
    let userId: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { adminAuth } = await import("@/lib/firebase/admin");
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
          userId = decoded.uid;
        }
      } catch (e) {
        console.error("Summary drill history: auth token verification failed:", e);
      }
    }
    // dev mode fallback
    if (!userId && process.env.NODE_ENV === "development") {
      const devRole = request.headers.get("X-Dev-Role");
      if (devRole) userId = "dev-user";
    }

    if (!userId) {
      return NextResponse.json([]);
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json([]);
    }

    let snapshot;
    try {
      snapshot = await adminDb
        .collection(`users/${userId}/summaryDrills`)
        .orderBy("completedAt", "desc")
        .get();
    } catch {
      // Fallback: インデックス未作成等で orderBy が失敗したら JS 側でソート
      snapshot = await adminDb.collection(`users/${userId}/summaryDrills`).get();
    }

    const items: SummaryDrillHistoryItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        passageId: data.passageId ?? null,
        passageTitle: data.passageTitle ?? null,
        facultyId: data.facultyId ?? null,
        summaryText: data.summaryText ?? "",
        scores: data.scores ?? {
          comprehension: 0,
          conciseness: 0,
          keyPoints: 0,
          structure: 0,
          expression: 0,
        },
        total: data.total ?? 0,
        feedback: data.feedback ?? null,
        completedAt:
          data.completedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    // フォールバック時のため JS 側でも降順ソート
    items.sort((a, b) => b.completedAt.localeCompare(a.completedAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Summary drill history error:", error);
    return NextResponse.json([]);
  }
}

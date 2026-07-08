import { NextRequest, NextResponse } from "next/server";
import type {
  LogicDrillType,
  LogicDrillAnswer,
  LogicDrillScores,
  LogicDrillFeedback,
} from "@/lib/types/logic-drill";

/**
 * 生徒自身の論理ドリル履歴。
 * 管理者ルート (/api/admin/students/[id]/logic-drills) と同じ shape を返す。
 */
export interface LogicDrillHistoryItem {
  id: string;
  drillType: LogicDrillType;
  itemId: string;
  answer: LogicDrillAnswer | null;
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback | null;
  completedAt: string;
}

const EMPTY_SCORES: LogicDrillScores = {
  consistency: 0,
  validity: 0,
  structure: 0,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    // "current" は「現在のログインユーザー」のエイリアス。トークン / dev role から解決する。
    // (/api/essay/summary-drill/history と同じ userId 解決ロジック)
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
          console.error("Logic drill history: auth token verification failed:", e);
        }
      }
      // dev mode fallback
      if (!userId && process.env.NODE_ENV === "development") {
        const devRole = request.headers.get("X-Dev-Role");
        if (devRole) userId = "dev-user";
      }
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
        .collection(`users/${userId}/logicDrills`)
        .orderBy("completedAt", "desc")
        .get();
    } catch {
      // Fallback: インデックス未作成等で orderBy が失敗したら JS 側でソート
      snapshot = await adminDb.collection(`users/${userId}/logicDrills`).get();
    }

    const items: LogicDrillHistoryItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        drillType: data.drillType,
        itemId: data.itemId ?? "",
        answer: data.answer ?? null,
        scores: data.scores ?? EMPTY_SCORES,
        feedback: data.feedback ?? null,
        completedAt:
          data.completedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    // フォールバック時のため JS 側でも降順ソート
    items.sort((a, b) => b.completedAt.localeCompare(a.completedAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Logic drill history error:", error);
    return NextResponse.json([]);
  }
}

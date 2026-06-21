import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export interface SavedDrillItem {
  id: string;
  category: string | null;
  question: string;
  answer: string;
  score: number;
  betterAnswer: string | null;
  createdAt: string;
}

/** GET: 自分が保存(saved)したドリル問答（新しい順） */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  if (!adminDb) return NextResponse.json([]);

  try {
    const snap = await adminDb
      .collection(`users/${uid}/interviewDrills`)
      .where("saved", "==", true)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const items: SavedDrillItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        category: data.category ?? null,
        question: data.question ?? "",
        answer: data.answer ?? "",
        score: data.score ?? 0,
        betterAnswer: data.betterAnswer ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error("[interview-drill/saved] GET failed:", err);
    return NextResponse.json([]);
  }
}

/** PATCH: 保存フラグの切替（自分の uid 配下のみ） */
export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const { drillId, saved, isBest } = (await request.json()) as {
      drillId?: string;
      saved?: boolean;
      isBest?: boolean;
    };
    if (!drillId) {
      return NextResponse.json({ error: "drillId は必須です" }, { status: 400 });
    }
    const ref = adminDb.doc(`users/${uid}/interviewDrills/${drillId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
    }

    // ベスト手動指定（1問1ベスト: 同一 questionId の他docを下ろす）
    if (typeof isBest === "boolean") {
      if (isBest) {
        const qId = (snap.data()?.questionId as string | null) ?? null;
        if (qId) {
          const sib = await adminDb
            .collection(`users/${uid}/interviewDrills`)
            .where("questionId", "==", qId)
            .get();
          const batch = adminDb.batch();
          sib.docs.forEach((d) => {
            if (d.id !== drillId) batch.set(d.ref, { isBest: false }, { merge: true });
          });
          await batch.commit();
        }
      }
      await ref.set({ isBest }, { merge: true });
      return NextResponse.json({ id: drillId, isBest });
    }

    await ref.set({ saved: saved === true }, { merge: true });
    return NextResponse.json({ id: drillId, saved: saved === true });
  } catch (err) {
    console.error("[interview-drill/saved] PATCH failed:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

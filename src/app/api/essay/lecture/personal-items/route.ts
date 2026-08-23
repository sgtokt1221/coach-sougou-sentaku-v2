import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  pickPersonalItems,
  type RawCorrection,
} from "@/lib/sentence-drill/personal";
import type { LanguageCorrection } from "@/lib/types/essay";

/**
 * GET /api/essay/lecture/personal-items?count=3
 *
 * 「あなたの答案から」ラウンドの出題。直近の答案の赤ペンから、まだ出していないものを返す。
 * 素材が足りなければ空配列を返す（画面はラウンドごと省く）。
 *
 * essays の userId+submittedAt は既存の複合インデックスを使う
 * （/api/admin/students と同じクエリ形）。
 */
const RECENT_ESSAYS = 10;

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [
    "student",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) return NextResponse.json([]);

  const count = Math.min(
    5,
    Math.max(1, Number(new URL(request.url).searchParams.get("count") ?? 3))
  );

  const [essaySnap, stateSnap] = await Promise.all([
    adminDb
      .collection("essays")
      .where("userId", "==", uid)
      .orderBy("submittedAt", "desc")
      .limit(RECENT_ESSAYS)
      .get(),
    adminDb.doc(`users/${uid}/sentenceDrillState/personal`).get(),
  ]);

  const corrections: RawCorrection[] = [];
  for (const doc of essaySnap.docs) {
    const data = doc.data();
    const list: LanguageCorrection[] = data.feedback?.languageCorrections ?? [];
    const submittedAt =
      data.submittedAt?.toDate?.()?.getTime() ??
      new Date(data.submittedAt ?? 0).getTime();
    for (const c of list) {
      if (!c?.original || !c?.suggestion) continue;
      corrections.push({
        original: c.original,
        suggestion: c.suggestion,
        type: c.type,
        reason: c.reason ?? "",
        essayId: doc.id,
        submittedAt: Number.isFinite(submittedAt) ? submittedAt : 0,
      });
    }
  }

  const usedKeys = new Set<string>(stateSnap.data()?.usedKeys ?? []);
  return NextResponse.json(pickPersonalItems(corrections, usedKeys, count));
}

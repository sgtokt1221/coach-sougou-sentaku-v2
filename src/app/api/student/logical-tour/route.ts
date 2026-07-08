// src/app/api/student/logical-tour/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { TOUR_STATIONS } from "@/lib/logical-tour/stations";
import {
  jstDayBoundsUtc, computeStreakUpdate, nextIncompleteStation, remainingMinutes,
} from "@/lib/logical-tour/logic";
import type { LogicalTourResponse, TourStationKey, LogicalTourState } from "@/lib/types/logical-tour";

const EMPTY: LogicalTourState = { lastCompletedDate: "", streak: 0, longestStreak: 0 };

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const { startIso, endIso } = jstDayBoundsUtc(date);

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const { Timestamp } = await import("firebase-admin/firestore");
  const startTs = Timestamp.fromDate(new Date(startIso));
  const endTs = Timestamp.fromDate(new Date(endIso));

  // 各駅の当日記録有無（失敗時は未完扱い）
  const doneByKey = {} as Record<TourStationKey, boolean>;
  await Promise.all(
    TOUR_STATIONS.map(async (s) => {
      try {
        const col = adminDb.collection(`users/${uid}/${s.collection}`);
        const q =
          s.dateType === "isoString"
            ? col.where(s.dateField, ">=", startIso).where(s.dateField, "<", endIso)
            : col.where(s.dateField, ">=", startTs).where(s.dateField, "<", endTs);
        const snap = await q.limit(1).get();
        doneByKey[s.key] = !snap.empty;
      } catch (e) {
        console.warn(`[logical-tour] ${s.key} query failed:`, e);
        doneByKey[s.key] = false;
      }
    }),
  );

  const completedCount = TOUR_STATIONS.filter((s) => doneByKey[s.key]).length;
  const allDone = completedCount === TOUR_STATIONS.length;

  // ストリーク（3駅完了かつ未計上ならトランザクション冪等更新）
  const ref = adminDb.doc(`logicalTours/${uid}`);
  let state: LogicalTourState = ((await ref.get()).data() as LogicalTourState | undefined) ?? EMPTY;
  if (allDone && state.lastCompletedDate !== date) {
    try {
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const prev = (snap.data() as LogicalTourState | undefined) ?? EMPTY;
        const upd = computeStreakUpdate(prev, date, true);
        if (upd) {
          tx.set(ref, upd, { merge: true });
          state = { ...prev, ...upd };
        } else {
          state = prev;
        }
      });
    } catch (e) {
      console.warn("[logical-tour] streak update failed:", e);
    }
  }

  const body: LogicalTourResponse = {
    date,
    stations: [...TOUR_STATIONS].sort((a, b) => a.order - b.order).map((s) => ({ key: s.key, done: doneByKey[s.key] })),
    completedCount,
    allDone,
    nextStationKey: nextIncompleteStation(doneByKey),
    remainingMinutes: remainingMinutes(doneByKey),
    streak: state.streak ?? 0,
    longestStreak: state.longestStreak ?? 0,
  };
  return NextResponse.json(body);
}

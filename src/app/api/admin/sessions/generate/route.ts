import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getOrgMemberAdminUids } from "@/lib/api/organization-scope";
import {
  previousMonth,
  extractSlots,
  computeGeneration,
} from "@/lib/recurring-class/generate";
import { ONE_ON_ONE_TYPES } from "@/lib/types/recurring-class";
import type { GenSlot, GenPreviewItem } from "@/lib/types/recurring-class";
import type { SessionType } from "@/lib/types/session";

/** 呼び出し元 admin の所属組織 ID（未所属なら null）。 */
async function callerOrg(uid: string): Promise<string | null> {
  const d = (await adminDb!.doc(`users/${uid}`).get()).data();
  return (d?.organizationId as string | undefined) ?? null;
}

const PREVIEW_LIMIT = 200;
const BATCH_SIZE = 500;

/**
 * POST: 定期授業をマスタ／前月コピーから月次一括生成する。
 * body: { month: "YYYY-MM", source: "master" | "previous-month", dryRun: boolean }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const b = await request.json().catch(() => null);
  const month: string | undefined = b?.month;
  const source: string | undefined = b?.source;
  const dryRun: boolean = b?.dryRun === true;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month が不正です" }, { status: 400 });
  }
  if (source !== "master" && source !== "previous-month") {
    return NextResponse.json({ error: "source が不正です" }, { status: 400 });
  }

  const orgId = await callerOrg(auth.uid);
  const memberUids = new Set(await getOrgMemberAdminUids(adminDb, auth.uid));

  // --- スロット取得 ---
  let slots: GenSlot[] = [];
  if (source === "master") {
    const snap = orgId
      ? await adminDb
          .collection("recurringClassTemplates")
          .where("organizationId", "==", orgId)
          .get()
      : await adminDb
          .collection("recurringClassTemplates")
          .where("createdByAdminId", "==", auth.uid)
          .get();
    slots = snap.docs
      .map((d) => d.data())
      .filter((t) => t.active === true && ONE_ON_ONE_TYPES.includes(t.type as SessionType))
      .map((t) => ({
        studentId: t.studentId as string,
        studentName: (t.studentName as string) ?? "",
        teacherId: t.teacherId as string,
        teacherName: (t.teacherName as string) ?? "",
        type: t.type as SessionType,
        weekday: t.weekday as number,
        startTime: t.startTime as string,
        duration: (t.duration as number | null | undefined) ?? null,
        format: t.format as "online" | "offline" | undefined,
      }));
  } else {
    // previous-month: 前月の自 org 1:1 セッションからスロット抽出
    const prev = previousMonth(month);
    const sessionsSnap = await adminDb.collection("sessions").get();
    const prevSessions = sessionsSnap.docs
      .map((d) => d.data())
      .filter(
        (s) =>
          typeof s.createdByAdminId === "string" &&
          memberUids.has(s.createdByAdminId) &&
          typeof s.scheduledAt === "string" &&
          s.scheduledAt.startsWith(`${prev}-`) &&
          ONE_ON_ONE_TYPES.includes(s.type as SessionType),
      );
    slots = extractSlots(prevSessions);
  }

  // --- 休校日（当月・自 org） ---
  const closureSnap = orgId
    ? await adminDb
        .collection("closureDays")
        .where("organizationId", "==", orgId)
        .get()
    : await adminDb
        .collection("closureDays")
        .where("createdByAdminId", "==", auth.uid)
        .get();
  const closureDates = new Set(
    closureSnap.docs
      .map((d) => d.data().date as string)
      .filter((date) => typeof date === "string" && date.startsWith(`${month}-`)),
  );

  // --- 既存キー（当月・自 org セッション） ---
  const monthSessionsSnap = await adminDb.collection("sessions").get();
  const existingKeys = new Set<string>();
  for (const d of monthSessionsSnap.docs) {
    const s = d.data();
    if (
      typeof s.createdByAdminId === "string" &&
      memberUids.has(s.createdByAdminId) &&
      typeof s.scheduledAt === "string" &&
      s.scheduledAt.startsWith(`${month}-`) &&
      typeof s.studentId === "string"
    ) {
      existingKeys.add(`${s.studentId}|${s.scheduledAt}`);
    }
  }

  const result = computeGeneration({ slots, month, closureDates, existingKeys });

  const counts = {
    toCreate: result.toCreate.length,
    skippedClosure: result.skippedClosure.length,
    skippedDuplicate: result.skippedDuplicate.length,
  };
  const sliced = (arr: GenPreviewItem[]) => arr.slice(0, PREVIEW_LIMIT);

  if (dryRun) {
    return NextResponse.json({
      counts,
      toCreate: sliced(result.toCreate),
      skippedClosure: sliced(result.skippedClosure),
      skippedDuplicate: sliced(result.skippedDuplicate),
    });
  }

  // --- 本番作成（通知なし・writeBatch を 500 件ごとに分割） ---
  const now = new Date().toISOString();
  for (let i = 0; i < result.toCreate.length; i += BATCH_SIZE) {
    const chunk = result.toCreate.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    for (const item of chunk) {
      const ref = adminDb.collection("sessions").doc();
      batch.set(ref, {
        teacherId: item.slot.teacherId,
        studentId: item.slot.studentId,
        teacherName: item.slot.teacherName,
        studentName: item.slot.studentName,
        createdByAdminId: auth.uid,
        type: item.slot.type,
        status: "scheduled",
        scheduledAt: item.scheduledAt,
        duration: item.slot.duration ?? null,
        format: item.slot.format === "online" ? "online" : "offline",
        meetLink: null,
        notes: null,
        sharedWithStudent: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }

  return NextResponse.json({
    created: result.toCreate.length,
    counts,
    toCreate: sliced(result.toCreate),
    skippedClosure: sliced(result.skippedClosure),
    skippedDuplicate: sliced(result.skippedDuplicate),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { assertSessionAccess } from "@/lib/api/session-auth";
import type { Session, LessonDebrief } from "@/lib/types/session";

/** POST /api/admin/sessions/[id]/debrief — 振り返りの merge 更新 + 弱点 DB 連動 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = { id: snap.id, ...snap.data() } as Session;
  const accessError = await assertSessionAccess(adminDb, session, auth);
  if (accessError) return accessError;

  const body = (await request.json().catch(() => null)) as {
    notes?: string;
    newWeaknessAreas?: string[];
    parentSummary?: string;
    nextAgendaSeed?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const existing: Partial<LessonDebrief> = session.debrief ?? {};
  const mergedAreas = Array.isArray(body.newWeaknessAreas)
    ? Array.from(
        new Set(
          body.newWeaknessAreas
            .map((a) => String(a).trim())
            .filter((a) => a.length > 0 && a.length <= 100),
        ),
      )
    : existing.newWeaknessAreas ?? [];

  const patched: LessonDebrief = {
    notes: typeof body.notes === "string" ? body.notes.slice(0, 3000) : existing.notes ?? "",
    newWeaknessAreas: mergedAreas,
    parentSummary:
      typeof body.parentSummary === "string"
        ? body.parentSummary.slice(0, 800)
        : existing.parentSummary ?? "",
    nextAgendaSeed:
      typeof body.nextAgendaSeed === "string"
        ? body.nextAgendaSeed.slice(0, 1000)
        : existing.nextAgendaSeed ?? "",
    capturedAt: new Date().toISOString(),
  };

  await ref.set(
    { debrief: patched, updatedAt: new Date().toISOString() },
    { merge: true },
  );

  // 新発見弱点の upsert
  if (mergedAreas.length > 0) {
    const existingAreas = new Set(existing.newWeaknessAreas ?? []);
    const freshAreas = mergedAreas.filter((a) => !existingAreas.has(a));
    const now = new Date();
    for (const area of freshAreas) {
      const wref = adminDb.doc(`users/${session.studentId}/weaknesses/${area}`);
      const wsnap = await wref.get();
      if (wsnap.exists) {
        await wref.set(
          {
            count: FieldValue.increment(1),
            lastOccurred: now,
            source: "both",
          },
          { merge: true },
        );
      } else {
        await wref.set({
          area,
          count: 1,
          firstOccurred: now,
          lastOccurred: now,
          improving: false,
          resolved: false,
          source: "lesson",
          reminderDismissedAt: null,
        });
      }
    }
  }

  return NextResponse.json({ debrief: patched });
}

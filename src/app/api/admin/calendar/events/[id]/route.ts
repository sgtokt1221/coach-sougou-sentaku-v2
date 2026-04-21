import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { AdminEvent } from "@/lib/types/admin-event";

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidTime(s: unknown): s is string {
  return typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const docRef = adminDb.collection("adminEvents").doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  const current = snap.data() as AdminEvent;
  if (auth.role !== "superadmin" && current.createdByAdminId !== auth.uid) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const o = body as Record<string, unknown>;
  const patch: Partial<AdminEvent> = { updatedAt: new Date().toISOString() };
  if (typeof o.title === "string" && o.title.trim().length > 0) {
    patch.title = o.title.trim().slice(0, 200);
  }
  if (isValidDate(o.date)) patch.date = o.date;
  if (typeof o.allDay === "boolean") patch.allDay = o.allDay;
  if (isValidTime(o.startTime)) patch.startTime = o.startTime;
  else if (o.startTime === null || o.startTime === "") patch.startTime = undefined;
  if (isValidTime(o.endTime)) patch.endTime = o.endTime;
  else if (o.endTime === null || o.endTime === "") patch.endTime = undefined;
  if (typeof o.location === "string") {
    patch.location = o.location.trim().slice(0, 200) || undefined;
  }
  if (typeof o.description === "string") {
    patch.description = o.description.trim().slice(0, 2000) || undefined;
  }

  await docRef.set(patch, { merge: true });
  const updated = (await docRef.get()).data() as AdminEvent;
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const docRef = adminDb.collection("adminEvents").doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  const current = snap.data() as AdminEvent;
  if (auth.role !== "superadmin" && current.createdByAdminId !== auth.uid) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  await docRef.delete();
  return NextResponse.json({ ok: true });
}

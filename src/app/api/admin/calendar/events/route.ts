import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { AdminEvent, AdminEventInput } from "@/lib/types/admin-event";

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidTime(s: unknown): s is string {
  return typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
}

function sanitize(input: unknown): AdminEventInput | null {
  if (typeof input !== "object" || input === null) return null;
  const o = input as Record<string, unknown>;
  if (typeof o.title !== "string" || o.title.trim().length === 0) return null;
  if (!isValidDate(o.date)) return null;
  const allDay = o.allDay !== false;
  const ev: AdminEventInput = {
    title: o.title.trim().slice(0, 200),
    date: o.date,
    allDay,
  };
  if (!allDay) {
    if (isValidTime(o.startTime)) ev.startTime = o.startTime;
    if (isValidTime(o.endTime)) ev.endTime = o.endTime;
  }
  if (typeof o.location === "string" && o.location.trim().length > 0) {
    ev.location = o.location.trim().slice(0, 200);
  }
  if (typeof o.description === "string" && o.description.trim().length > 0) {
    ev.description = o.description.trim().slice(0, 2000);
  }
  return ev;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const input = sanitize(body);
  if (!input) {
    return NextResponse.json(
      { error: "入力が不正です (title / date は必須)" },
      { status: 400 }
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const docRef = adminDb.collection("adminEvents").doc();
  const ev: AdminEvent = {
    id: docRef.id,
    ...input,
    createdByAdminId: auth.uid,
    createdAt: now,
    updatedAt: now,
  };
  await docRef.set(ev);
  return NextResponse.json(ev, { status: 201 });
}

export async function GET(request: NextRequest) {
  // 補助: 期間指定で一覧取得 (カレンダー API 以外の用途用)
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  let q: FirebaseFirestore.Query = adminDb.collection("adminEvents");
  if (auth.role !== "superadmin") {
    q = q.where("createdByAdminId", "==", auth.uid);
  }
  if (from) q = q.where("date", ">=", from);
  if (to) q = q.where("date", "<=", to);

  const snap = await q.get();
  const events = snap.docs.map((d) => d.data() as AdminEvent);
  return NextResponse.json({ events });
}

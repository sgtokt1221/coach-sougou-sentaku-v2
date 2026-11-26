import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  FACULTY_INFO_COLLECTION,
  facultyInfoDocId,
  type FacultyInfoCategory,
  type FacultyInfoItem,
} from "@/lib/universities/faculty-info";
import { requestFacultyInfoRefresh } from "@/lib/universities/faculty-info-request";

/**
 * 学部の公式サイトの情報（facultyInfo）。全塾で共有するので、直す・外す・取り直すのは本部（superadmin）だけ。
 * GET: 見る（admin / teacher / superadmin）
 * PATCH: 項目を外す・戻す・直す・手で足す（superadmin）
 * POST: 取り直す（superadmin）
 */
type Params = { params: Promise<{ universityId: string; facultyId: string }> };

async function docRef(params: Params["params"]) {
  const { universityId, facultyId } = await params;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return null;
  return {
    universityId,
    facultyId,
    ref: adminDb.doc(`${FACULTY_INFO_COLLECTION}/${facultyInfoDocId(universityId, facultyId)}`),
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const target = await docRef(params);
  if (!target) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  const d = (await target.ref.get()).data();
  if (!d) return NextResponse.json({ status: "none", items: [] });
  return NextResponse.json({
    status: d.status ?? "none",
    items: Array.isArray(d.items) ? d.items : [],
    collectedAt: d.collectedAt ?? null,
    updatedAt: d.updatedAt ?? null,
    lastError: d.lastError ?? null,
    running: typeof d.leaseUntil === "string" && d.leaseUntil > new Date().toISOString(),
  });
}

const CATEGORIES: FacultyInfoCategory[] = ["course", "feature", "program"];
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const target = await docRef(params);
  if (!target) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;
  const { adminDb } = await import("@/lib/firebase/admin");

  const result = await adminDb!.runTransaction(async (tx) => {
    const snap = await tx.get(target.ref);
    const items = ((snap.data()?.items ?? []) as FacultyInfoItem[]).slice();
    const idx = items.findIndex((i) => i.id === body.itemId);
    if (action === "hide" || action === "show") {
      if (idx < 0) return "not-found";
      items[idx] = { ...items[idx], hidden: action === "hide" };
    } else if (action === "update") {
      if (idx < 0) return "not-found";
      const title = str(body.title, 40);
      const summary = str(body.summary, 120);
      if (!title || !summary) return "invalid";
      items[idx] = { ...items[idx], title, summary };
    } else if (action === "add") {
      const category = CATEGORIES.find((c) => c === body.category);
      const title = str(body.title, 40);
      const summary = str(body.summary, 120);
      const quote = str(body.quote, 200);
      const sourceUrl = str(body.sourceUrl, 500);
      if (!category || !title || !summary || !quote || !/^https?:\/\//.test(sourceUrl)) return "invalid";
      items.push({
        id: createHash("sha256").update(`${sourceUrl}\n${quote}`).digest("hex").slice(0, 12),
        category,
        title,
        summary,
        quote,
        sourceUrl,
        origin: "manual",
        hidden: false,
      });
    } else {
      return "invalid";
    }
    const now = new Date().toISOString();
    tx.set(
      target.ref,
      {
        universityId: target.universityId,
        facultyId: target.facultyId,
        items,
        // 手で足して1件でも使える項目があれば、下書き・添削に渡す
        ...(items.some((i) => !i.hidden) ? { status: "ready" } : {}),
        updatedAt: now,
        editedBy: auth.uid,
        editedAt: now,
      },
      { merge: true }
    );
    return "ok";
  });
  if (result === "not-found") return NextResponse.json({ error: "項目が見つかりません" }, { status: 404 });
  if (result === "invalid") return NextResponse.json({ error: "入力が正しくありません" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const target = await docRef(params);
  if (!target) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  // 失敗の回数を戻してから積む（自動の打ち止めを解く）
  await target.ref.set({ attempts: 0, lastError: null }, { merge: true });
  const queued = await requestFacultyInfoRefresh(target.universityId, target.facultyId).catch(
    (e) => {
      console.error("[faculty-info] 取り直しを頼めなかった:", e);
      return false;
    }
  );
  if (!queued) {
    return NextResponse.json({ error: "取り直しを頼めませんでした" }, { status: 503 });
  }
  return NextResponse.json({ queued: true });
}

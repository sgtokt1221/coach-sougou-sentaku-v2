import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { ResearchCurriculum } from "@/lib/types/research";
import { RESEARCH_MAX_UNITS } from "@/lib/types/research";

/**
 * 自己探究カリキュラム（生徒本人）。保存: users/{uid}/researchCurriculum/current。
 * 受講登録(researchEnrolled)が条件。テキスト生成のみのため保護者同意は不要。
 */

async function requireEnrolledStudent(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return { error: auth };
  if (!adminDb) {
    return { error: NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 }) };
  }
  const userSnap = await adminDb.doc(`users/${auth.uid}`).get();
  if (userSnap.data()?.researchEnrolled !== true) {
    return {
      error: NextResponse.json(
        { error: "探究授業の受講登録がありません。" },
        { status: 403 }
      ),
    };
  }
  return { uid: auth.uid };
}

export async function GET(request: NextRequest) {
  const r = await requireEnrolledStudent(request);
  if (r.error) return r.error;

  try {
    const snap = await adminDb!
      .doc(`users/${r.uid}/researchCurriculum/current`)
      .get();
    return NextResponse.json(snap.exists ? (snap.data() as ResearchCurriculum) : null);
  } catch (error) {
    console.error("Research curriculum GET error:", error);
    return NextResponse.json({ error: "カリキュラムの取得に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const r = await requireEnrolledStudent(request);
  if (r.error) return r.error;

  try {
    const body = (await request.json()) as Partial<ResearchCurriculum>;
    const ref = adminDb!.doc(`users/${r.uid}/researchCurriculum/current`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "カリキュラムがありません" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (Array.isArray(body.units)) updates.units = body.units;
    if (typeof body.totalUnits === "number") {
      updates.totalUnits = Math.min(RESEARCH_MAX_UNITS, Math.max(1, Math.round(body.totalUnits)));
    }
    if (body.status === "draft" || body.status === "active") updates.status = body.status;
    if (typeof body.domain === "string") updates.domain = body.domain;
    if (typeof body.theme === "string") updates.theme = body.theme;
    if (typeof body.goal === "string") updates.goal = body.goal;

    await ref.set(updates, { merge: true });
    const updated = await ref.get();
    return NextResponse.json(updated.data() as ResearchCurriculum);
  } catch (error) {
    console.error("Research curriculum PATCH error:", error);
    return NextResponse.json({ error: "カリキュラムの更新に失敗しました" }, { status: 500 });
  }
}

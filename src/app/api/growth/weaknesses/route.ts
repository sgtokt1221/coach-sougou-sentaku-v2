import { NextRequest, NextResponse } from "next/server";
import { weaknessDocId } from "@/lib/growth/weakness-id";
import { loadWeaknessRecords } from "@/lib/growth/weakness-store";
import { getRemindableWeaknesses } from "@/lib/growth/analyze";
import {
  weaknessDescriptionOf,
  weaknessGroupOf,
} from "@/lib/growth/weakness-taxonomy";

/**
 * 誰の弱点かはトークンからだけ決める。
 *
 * クエリ・ボディの userId を信用していたため、他人の uid を付ければ
 * その生徒の弱点リストを読めた（面接履歴と同じ穴）。
 */
async function resolveUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        return decoded.uid;
      }
    } catch {}
  }
  if (process.env.NODE_ENV === "development") {
    const devRole = request.headers.get("X-Dev-Role");
    if (devRole) return "dev-user";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const context = (searchParams.get("context") ?? "dashboard") as
    | "dashboard"
    | "essay_new"
    | "essay_result"
    | "all";

  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ weaknesses: [] });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ weaknesses: [] });
  }

  try {
    // 読み方は提出の書き込みと同じ正本を使う（直近の記録 recentHits を落とすと、
    // 画面側で段階を累計の回数から計算し直してサーバーの判定とずれる）
    const { records: weaknesses } = await loadWeaknessRecords(adminDb, userId);
    // all: 成長画面とダッシュボードの件数用。解決済みも含める（アーカイブ済みは除く）。
    // getRemindableWeaknesses は解決済みを返さないので、「解決済み」の列が常に0件だった
    const list =
      context === "all"
        ? weaknesses.filter((w) => !w.archivedAt)
        : getRemindableWeaknesses(weaknesses, context);
    const withDisplay = list.map((w) => ({
      ...w,
      description: weaknessDescriptionOf(w),
      group: weaknessGroupOf(w),
    }));
    return NextResponse.json({ weaknesses: withDisplay });
  } catch (err) {
    console.warn("Failed to fetch weaknesses:", err);
    return NextResponse.json({ weaknesses: [] });
  }
}

/**
 * 弱点リマインドの「もう見ない」。
 *
 * 以前はボディの userId を必須にしていたが、呼び出し側（ダッシュボードの
 * バナー）は area しか送っていなかったため、毎回 400 で落ちていた。
 * 画面は先に消す作りなので、消えたように見えて次に開くと復活する。
 * 対象はトークンの本人に限る。
 */
export async function POST(request: NextRequest) {
  const body: { area?: string } = await request.json();
  const area = body.area;
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!area) {
    return NextResponse.json({ error: "area は必須です" }, { status: 400 });
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({
      success: false,
      reason: "Firebase not configured",
    });
  }

  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb
      .doc(`users/${userId}/weaknesses/${weaknessDocId(area)}`)
      .update({
        reminderDismissedAt: FieldValue.serverTimestamp(),
      });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("Failed to update reminderDismissedAt:", err);
    return NextResponse.json(
      { success: false, reason: "Update failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 自己探究授業の録音・AI処理に関する同意。
 * 生徒端末で保護者が同意する想定（Phase0）。同意文面は法務レビュー前のドラフト。
 */

/** 同意文面の版。文面を改訂したら上げる（再同意の判定に使う）。 */
export const RESEARCH_CONSENT_VERSION = "draft-2026-06";

/** GET: 自分の同意状態と最新の同意記録を返す */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const data = userDoc.data();
    const consentSnap = await adminDb
      .doc(`users/${uid}/consents/research`)
      .get();

    return NextResponse.json({
      researchEnrolled: data?.researchEnrolled === true,
      researchConsentStatus: data?.researchConsentStatus ?? "none",
      consentVersion: RESEARCH_CONSENT_VERSION,
      record: consentSnap.exists ? consentSnap.data() : null,
    });
  } catch (error) {
    console.error("Research consent GET error:", error);
    return NextResponse.json(
      { error: "同意状態の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/** POST: 同意を記録し、状態を granted にする（受講登録済みのときのみ） */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    const body = (await request.json()) as {
      parentName?: string;
      agreedItems?: string[];
    };

    if (!body.parentName || body.parentName.trim().length === 0) {
      return NextResponse.json(
        { error: "保護者氏名を入力してください" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.agreedItems) || body.agreedItems.length === 0) {
      return NextResponse.json(
        { error: "同意項目にチェックしてください" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${uid}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }
    if (userDoc.data()?.researchEnrolled !== true) {
      return NextResponse.json(
        { error: "探究授業の受講登録がありません。教室にお問い合わせください。" },
        { status: 400 }
      );
    }

    const agreedAt = new Date().toISOString();
    await adminDb.doc(`users/${uid}/consents/research`).set({
      consentVersion: RESEARCH_CONSENT_VERSION,
      parentName: body.parentName.trim(),
      agreedItems: body.agreedItems,
      agreedAt,
      // 生徒端末で保護者が同意した記録（本人性はこの方式の前提として記録に残す）
      consentedBy: "parent-on-student-device",
      revoked: false,
    });
    await adminDb
      .doc(`users/${uid}`)
      .set({ researchConsentStatus: "granted", updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ researchConsentStatus: "granted", agreedAt });
  } catch (error) {
    console.error("Research consent POST error:", error);
    return NextResponse.json(
      { error: "同意の記録中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

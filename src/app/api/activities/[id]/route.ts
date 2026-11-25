import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";

/**
 * 活動は users/{uid}/activities にあるので、持ち主はトークンの uid だけで決まる。
 * 以前は本番でもトークンが無いと "dev-user" に落ちていた（詳細画面が素の fetch
 * だったため、本番では毎回「見つかりません」になっていた）。
 */
async function ownerUid(request: NextRequest): Promise<string | null> {
  const uid = await verifyAuthToken(request).then((r) => r?.uid).catch(() => null);
  if (uid) return uid;
  return process.env.NODE_ENV === "development" ? "dev-user" : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const uid = await ownerUid(request);
    if (!uid) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const docSnap = await adminDb.doc(`users/${uid}/activities/${id}`).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "活動実績が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ activity: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    console.error("Activity GET error:", error);
    return NextResponse.json({ error: "活動実績の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const uid = await ownerUid(request);
    if (!uid) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const updates = {
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };

    await adminDb.doc(`users/${uid}/activities/${id}`).set(updates, { merge: true });

    return NextResponse.json({ activity: updates });
  } catch (error) {
    console.error("Activity PUT error:", error);
    return NextResponse.json({ error: "活動実績の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const uid = await ownerUid(request);
    if (!uid) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const docSnap = await adminDb.doc(`users/${uid}/activities/${id}`).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "活動実績が見つかりません" }, { status: 404 });
    }

    await adminDb.doc(`users/${uid}/activities/${id}`).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity DELETE error:", error);
    return NextResponse.json({ error: "活動実績の削除に失敗しました" }, { status: 500 });
  }
}

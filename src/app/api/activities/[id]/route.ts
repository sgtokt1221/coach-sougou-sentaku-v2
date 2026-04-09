import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "activityManager");
    if (gate) return gate;

    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const uid = await verifyAuthToken(request).then(r => r?.uid).catch(() => null)
      ?? "dev-user";

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
    const gate = await requireFeature(request, "activityManager");
    if (gate) return gate;

    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const uid = await verifyAuthToken(request).then(r => r?.uid).catch(() => null)
      ?? "dev-user";

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
    const gate = await requireFeature(request, "activityManager");
    if (gate) return gate;

    const { id } = await params;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const uid = await verifyAuthToken(request).then(r => r?.uid).catch(() => null)
      ?? "dev-user";

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

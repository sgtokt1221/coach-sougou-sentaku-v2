import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";
import type { Activity, ActivityCreateRequest, ActivityCategory } from "@/lib/types/activity";

export async function GET(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "activityManager");
    if (gate) return gate;

    const auth = await verifyAuthToken(request);
    const uid = auth?.uid ?? (process.env.NODE_ENV === "development" ? "dev-user" : null);

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    if (!uid) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as ActivityCategory | null;

    let query: FirebaseFirestore.Query = adminDb.collection(`users/${uid}/activities`);
    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.get();
    const activities: Activity[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Activity[];

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Activities GET error:", error);
    return NextResponse.json({ error: "活動実績の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "activityManager");
    if (gate) return gate;

    const auth = await verifyAuthToken(request);
    const uid = auth?.uid ?? (process.env.NODE_ENV === "development" ? "dev-user" : null);

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    if (!uid) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body: ActivityCreateRequest = await request.json();
    const { title, category, period, description } = body;

    if (!title || !category || !period?.start || !description) {
      return NextResponse.json(
        { error: "title, category, period.start, description は必須です" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docData = {
      userId: uid,
      title,
      category,
      period,
      description,
      optimizations: [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection(`users/${uid}/activities`).add(docData);

    const newActivity: Activity = {
      id: docRef.id,
      ...docData,
    };

    return NextResponse.json({ activity: newActivity }, { status: 201 });
  } catch (error) {
    console.error("Activities POST error:", error);
    return NextResponse.json({ error: "活動実績の登録に失敗しました" }, { status: 500 });
  }
}

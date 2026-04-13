import { NextRequest, NextResponse } from "next/server";

async function resolveUserId(request: NextRequest, rawId: string): Promise<string> {
  if (rawId !== "me") return rawId;
  try {
    const { verifyAuthToken } = await import("@/lib/firebase/admin");
    const decoded = await verifyAuthToken(request);
    if (decoded?.uid) return decoded.uid;
  } catch {}
  return rawId;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    userId = await resolveUserId(request, userId);

    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const doc = await adminDb.doc(`selfAnalysis/${userId}`).get();
      if (doc.exists) {
        return NextResponse.json({ id: doc.id, ...doc.data() });
      }
    }

    // データがない場合はnullを返す（モックではない）
    return NextResponse.json(null);
  } catch (error) {
    console.error("Self-analysis GET error:", error);
    return NextResponse.json(
      { error: "自己分析データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    const resolvedId = await resolveUserId(request, body.userId);

    // リセットリクエスト
    if (body.reset) {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        await adminDb.doc(`selfAnalysis/${resolvedId}`).delete();
      }
      return NextResponse.json({ success: true, reset: true });
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const { FieldValue } = await import("firebase-admin/firestore");
      const docId = resolvedId;
      await adminDb.doc(`selfAnalysis/${docId}`).set(
        {
          userId: body.userId,
          values: body.values ?? null,
          strengths: body.strengths ?? null,
          weaknesses: body.weaknesses ?? null,
          interests: body.interests ?? null,
          vision: body.vision ?? null,
          identity: body.identity ?? null,
          completedSteps: body.completedSteps ?? 0,
          isComplete: body.isComplete ?? false,
          chatHistory: body.chatHistory ?? [],
          updatedAt: FieldValue.serverTimestamp(),
          ...(!body.id ? { createdAt: FieldValue.serverTimestamp() } : {}),
        },
        { merge: true }
      );
      return NextResponse.json({ success: true, id: docId });
    }

    return NextResponse.json({ success: true, id: `sa-${Date.now()}` });
  } catch (error) {
    console.error("Self-analysis POST error:", error);
    return NextResponse.json(
      { error: "自己分析データの保存に失敗しました" },
      { status: 500 }
    );
  }
}

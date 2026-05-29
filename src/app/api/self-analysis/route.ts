import { NextRequest, NextResponse } from "next/server";

/**
 * "me" を実 uid に解決する。トークン検証に失敗した場合、以前は rawId ("me") に
 * フォールバックして `selfAnalysis/me` という共有ドキュメントに書き込んでいたため、
 * 別ユーザーのデータと混線・行方不明になる原因になっていた。
 * 解決できない場合は null を返し、呼び出し側で 401 を返す。
 * dev モードのみ requireRole と同様に "dev-user" にフォールバックする。
 */
async function resolveUserId(
  request: NextRequest,
  rawId: string
): Promise<string | null> {
  if (rawId !== "me") return rawId;
  try {
    const { verifyAuthToken } = await import("@/lib/firebase/admin");
    const decoded = await verifyAuthToken(request);
    if (decoded?.uid) return decoded.uid;
  } catch {}
  if (process.env.NODE_ENV === "development") return "dev-user";
  return null;
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

    const resolvedUserId = await resolveUserId(request, userId);
    if (!resolvedUserId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    userId = resolvedUserId;

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
    if (!resolvedId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // リセットリクエスト (= 削除)。 監査ログを残してから delete
    if (body.reset) {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        // 削除前の中身をログに保存 (= 復元可能性 + 「いつ何を削除したか」 追跡)
        try {
          const prevDoc = await adminDb.doc(`selfAnalysis/${resolvedId}`).get();
          await adminDb
            .collection(`users/${resolvedId}/activityLogs`)
            .add({
              type: "self_analysis_reset",
              description: "自己分析データをリセットしました",
              createdAt: new Date(),
              snapshot: prevDoc.exists ? prevDoc.data() : null,
            });
        } catch (err) {
          console.warn("[self-analysis reset] ログ記録失敗:", err);
        }
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
          synthesis: body.synthesis ?? null,
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

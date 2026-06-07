import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";
import type { Session, ResearchInputAttachment } from "@/lib/types/session";

interface PatchBody {
  topic?: string;
  sourceUrls?: string[];
  memo?: string;
  attachments?: ResearchInputAttachment[];
}

/**
 * PATCH /api/sessions/[id]/research-input
 * 探究授業中に生徒本人がテーマ/出典URL/メモ/資料画像URLを書き込む。
 * sessions/{id}.researchInputs に merge し、講師画面がポーリングでライブ取得する。
 * 画像本体は生徒クライアントが Storage(essays/{uid}/...) にアップロードし、URL のみここに渡す。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAuthToken(request);
  if (!auth) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!adminDb) return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });

  const { id } = await params;
  const ref = adminDb.doc(`sessions/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  }
  const session = snap.data() as Session;
  if (auth.uid !== session.studentId) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as PatchBody;
    const inputs: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.topic === "string") inputs.topic = body.topic;
    if (typeof body.memo === "string") inputs.memo = body.memo;
    if (Array.isArray(body.sourceUrls)) {
      inputs.sourceUrls = body.sourceUrls.map((s) => String(s).trim()).filter(Boolean);
    }
    if (Array.isArray(body.attachments)) {
      inputs.attachments = body.attachments
        .filter((a) => a && typeof a.url === "string")
        .slice(0, 6)
        .map((a) => ({
          url: String(a.url),
          mediaType: String(a.mediaType ?? "image/jpeg"),
          name: String(a.name ?? "image"),
        }));
    }
    await ref.set({ researchInputs: inputs }, { merge: true });
    return NextResponse.json({ ok: true, researchInputs: inputs });
  } catch (error) {
    console.error("[research-input] PATCH failed:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

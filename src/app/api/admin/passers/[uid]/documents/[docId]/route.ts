import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  PASSER_DOCUMENT_TYPES,
  loadPasserForCaller,
  passerIso,
} from "@/lib/passers/passer-access";
import type { DocumentVersion } from "@/lib/types/document";

/**
 * GET /api/admin/passers/[uid]/documents/[docId]
 * 合格者の出願書類1件（最新の本文・AI講評・版の推移）。読むだけ。既読は付けない。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; docId: string }> }
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const { uid, docId } = await params;
  try {
    const p = await loadPasserForCaller(adminDb, auth, uid);
    if (p instanceof NextResponse) return p;
    const snap = await adminDb.doc(`documents/${docId}`).get();
    const data = snap.data();
    if (
      !snap.exists ||
      !data ||
      data.userId !== uid ||
      !(PASSER_DOCUMENT_TYPES as readonly string[]).includes(data.type)
    ) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }
    const versions: DocumentVersion[] = Array.isArray(data.versions) ? data.versions : [];
    const latest = versions[versions.length - 1];
    return NextResponse.json({
      id: snap.id,
      type: data.type ?? "",
      universityName: data.universityName ?? "",
      facultyName: data.facultyName ?? "",
      status: data.status ?? "draft",
      content: latest?.content ?? data.content ?? "",
      // どの本文への添削か分からない旧データは渡さない（管理者の書類詳細と同じ）
      feedback: data.feedback && data.feedbackContent ? data.feedback : null,
      feedbackContent:
        data.feedback && typeof data.feedbackContent === "string"
          ? data.feedbackContent
          : null,
      // 古い順（1版目から）
      versions: versions.map((v, i) => ({
        id: v.id ?? String(i),
        content: v.content ?? "",
        wordCount: v.wordCount ?? 0,
        createdAt: passerIso(v.createdAt),
      })),
    });
  } catch (error) {
    console.error("passer document error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

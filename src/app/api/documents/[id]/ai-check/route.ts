import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { checkAiLikeness } from "@/lib/ai/ai-likeness";

/**
 * 個別性チェック。AI呼び出し1回。
 */
export const maxDuration = 120;

/**
 * 指定書類の本文の個別性を確認し、結果を documents/{id}.aiLikeness に保存して返す。
 * グローバル documents コレクション + userId 所有者チェック。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const docRef = adminDb.doc(`documents/${id}`);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }
    const data = existing.data();
    if (data?.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const content: string =
      typeof body.content === "string" ? body.content : (data?.content ?? "");
    if (!content.trim()) {
      return NextResponse.json(
        { error: "content は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const aiLikeness = await checkAiLikeness(content, {
      documentType: data?.type ?? "出願書類",
      universityName: data?.universityName ?? "未指定",
      facultyName: data?.facultyName ?? "未指定",
    });

    await docRef.update({ aiLikeness });

    return NextResponse.json({ aiLikeness, documentId: id });
  } catch (error) {
    console.error("Document ai-likeness error:", error);
    return NextResponse.json(
      { error: "個別性チェック中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

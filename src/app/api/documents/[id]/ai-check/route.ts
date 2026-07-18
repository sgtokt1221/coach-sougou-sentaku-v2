import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildAiLikenessPrompt } from "@/lib/ai/prompts/ai-likeness";
import { aiLikenessLevel } from "@/lib/types/document";
import type { DocumentAiLikeness } from "@/lib/types/document";

/**
 * 指定書類の本文の「AIっぽさ」を判定し、結果を documents/{id}.aiLikeness に保存して返す。
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
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { id } = await params;
    const docRef = adminDb.doc(`documents/${id}`);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }
    const data = existing.data();
    if (data?.userId !== auth.uid) {
      return NextResponse.json({ error: "この書類へのアクセス権がありません" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const content: string = typeof body.content === "string" ? body.content : (data?.content ?? "");
    if (!content.trim()) {
      return NextResponse.json({ error: "content は必須です" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const client = new Anthropic();
    const systemPrompt = buildAiLikenessPrompt(
      data?.type ?? "出願書類",
      data?.universityName ?? "未指定",
      data?.facultyName ?? "未指定"
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.error("Could not parse AI likeness response:", rawText);
      return NextResponse.json({ error: "AIレスポンスの解析に失敗しました" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const aiLikeness: DocumentAiLikeness = {
      score,
      level: aiLikenessLevel(score),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 8).map(String) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 8).map(String) : [],
      checkedAt: new Date().toISOString(),
      checkedWordCount: content.length,
    };

    await docRef.update({ aiLikeness });

    return NextResponse.json({ aiLikeness, documentId: id });
  } catch (error) {
    console.error("Document ai-likeness error:", error);
    return NextResponse.json(
      { error: "AIっぽさ判定中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

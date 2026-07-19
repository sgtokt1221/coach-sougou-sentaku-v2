import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildDocumentRewritePrompt } from "@/lib/ai/prompts/document-rewrite";

/**
 * 生徒の指示に従って書類本文をAIで書き換え、書き換え案を返す（永続化はしない）。
 * 生徒がプレビューを確認して「置き換える」を選んだ場合のみ、クライアント側が保存する。
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
    const content: string = typeof body.content === "string" ? body.content : "";
    const instruction: string = typeof body.instruction === "string" ? body.instruction : "";
    if (!content.trim() || !instruction.trim()) {
      return NextResponse.json(
        { error: "content と instruction は必須です" },
        { status: 400 }
      );
    }

    // AP取得
    let admissionPolicy = "";
    if (data?.universityId) {
      try {
        const uniDoc = await adminDb.doc(`universities/${data.universityId}`).get();
        if (uniDoc.exists) {
          const uniData = uniDoc.data();
          const faculty = uniData?.faculties?.find(
            (f: { id: string; admissionPolicy?: string }) => f.id === data.facultyId
          );
          if (faculty?.admissionPolicy) {
            admissionPolicy = faculty.admissionPolicy;
          }
        }
      } catch (err) {
        console.warn("AP fetch failed:", err);
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const client = new Anthropic();
    const systemPrompt = buildDocumentRewritePrompt({
      instruction,
      documentType: data?.type ?? "出願書類",
      universityName: data?.universityName ?? "未指定",
      facultyName: data?.facultyName ?? "未指定",
      admissionPolicy,
      targetWordCount: data?.targetWordCount,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error("Could not parse AI response:", rawText);
      return NextResponse.json(
        { error: "AIレスポンスの解析に失敗しました" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const rewritten: string = typeof parsed.rewritten === "string" ? parsed.rewritten : "";
    if (!rewritten.trim()) {
      return NextResponse.json(
        { error: "AIレスポンスの解析に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error("Document rewrite error:", error);
    return NextResponse.json(
      { error: "書き換え処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

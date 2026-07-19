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
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });

    // 本文全文をJSONで返すため出力が長くなりやすい。max_tokens で切れた場合は
    // JSON.parse が失敗して汎用500になる前に、分かりやすいメッセージで返す。
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        {
          error:
            "本文が長く、書き換え結果が途中で切れました。指示を分けるか目標文字数を下げてお試しください。",
        },
        { status: 500 }
      );
    }

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // 本文全文をプレーンテキストで返させる（多段落の本文をJSON化すると改行の
    // エスケープ漏れで JSON.parse が壊れやすいため）。万一コードフェンスが付いても剥がす。
    const rewritten = rawText
      .trim()
      .replace(/^```[a-zA-Z]*\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
    if (!rewritten) {
      console.error("Empty rewrite response:", rawText);
      return NextResponse.json(
        { error: "書き換え結果を取得できませんでした" },
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

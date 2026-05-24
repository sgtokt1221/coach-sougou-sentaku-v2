/**
 * 過去問の sourceText を返す API。
 *
 * 流れ:
 * 1. 既存静的データに sourceText があればそのまま返す (実問題文)
 * 2. Firestore `pastQuestionSourceTexts/{id}` にキャッシュがあれば返す
 * 3. 無ければ Claude で生成 → Firestore に保存 → 返す
 *
 * 静的データの 142 件分の sourceText 欠落を一括補完する代わりに、
 * アクセスされたエントリだけ on-demand で生成・キャッシュする方式。
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getEnrichedPastQuestionById, needsSourceText } from "@/data/essay-past-questions";
import {
  SOURCE_TEXT_SYSTEM_PROMPT,
  buildSourceTextUserPrompt,
} from "@/lib/ai/prompts/past-question-source";
import type { PastQuestionSourceTextResponse } from "@/lib/types/past-question-source";

export const maxDuration = 60;

const MODEL_ID = "claude-sonnet-4-6";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // --- 認証 ---
  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      }
    } catch {
      // 不正トークンは下で 401 に
    }
  }
  // dev mode fallback
  if (!userId && process.env.NODE_ENV === "development") {
    const devRole = request.headers.get("X-Dev-Role");
    if (devRole) userId = "dev-user";
  }
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // --- 静的データから該当エントリを取得 ---
  const question = getEnrichedPastQuestionById(id);
  if (!question) {
    return NextResponse.json({ error: "過去問が見つかりません" }, { status: 404 });
  }

  // 既存 sourceText がある = 実問題文 or 既補完済み
  if (question.sourceText) {
    return NextResponse.json<PastQuestionSourceTextResponse>({
      sourceText: question.sourceText,
      isSample: question.isSampleSourceText === true,
    });
  }

  // 本文不要な形式なら 400
  if (!needsSourceText(question)) {
    return NextResponse.json(
      { error: "この過去問は本文を必要としない形式です" },
      { status: 400 },
    );
  }

  // --- Firestore キャッシュを確認 ---
  const { adminDb } = await import("@/lib/firebase/admin");
  if (adminDb) {
    try {
      const cached = await adminDb.doc(`pastQuestionSourceTexts/${id}`).get();
      if (cached.exists) {
        const data = cached.data();
        if (data?.sourceText) {
          return NextResponse.json<PastQuestionSourceTextResponse>({
            sourceText: data.sourceText,
            isSample: true,
          });
        }
      }
    } catch (err) {
      console.warn("[past-question/source-text] cache read failed", err);
    }
  }

  // --- Claude で生成 ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 503 },
    );
  }

  let generated: string;
  try {
    const anthropic = new Anthropic({ apiKey });
    const completion = await anthropic.messages.create({
      model: MODEL_ID,
      max_tokens: 2000,
      system: SOURCE_TEXT_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildSourceTextUserPrompt(question) },
      ],
    });
    const block = completion.content.find((c) => c.type === "text");
    generated = block && block.type === "text" ? block.text.trim() : "";
    if (!generated) throw new Error("empty response");
  } catch (err) {
    console.error("[past-question/source-text] Claude failed", err);
    return NextResponse.json(
      { error: "課題文の生成に失敗しました。時間をおいて再度お試しください。" },
      { status: 502 },
    );
  }

  // --- Firestore に保存 ---
  if (adminDb) {
    try {
      const { FieldValue } = await import("firebase-admin/firestore");
      await adminDb.doc(`pastQuestionSourceTexts/${id}`).set({
        id,
        sourceText: generated,
        isSample: true,
        generatedAt: FieldValue.serverTimestamp(),
        model: MODEL_ID,
      });
    } catch (err) {
      console.warn("[past-question/source-text] cache write failed", err);
      // 書き込み失敗でも返却は続行
    }
  }

  return NextResponse.json<PastQuestionSourceTextResponse>({
    sourceText: generated,
    isSample: true,
  });
}

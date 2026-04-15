import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { buildSummaryEvaluationPrompt } from "@/lib/ai/prompts/summary-drill";

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { uid } = authResult;
  const {
    passageId,
    facultyId,
    passageTitle,
    passageText,
    summaryText,
    keyPoints,
    language,
  } = await request.json();

  if (!passageText || !summaryText) {
    return NextResponse.json({ error: "passageText と summaryText は必須です" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEYが設定されていません" }, { status: 503 });
  }

  const lang: "ja" | "en" = language === "en" ? "en" : "ja";
  const client = new Anthropic();
  const prompt = buildSummaryEvaluationPrompt(passageText, summaryText, keyPoints ?? [], lang);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found in response");
    const result = JSON.parse(jsonMatch[0]);

    // Firestore に結果を保存
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      const { FieldValue } = await import("firebase-admin/firestore");
      if (adminDb) {
        const docRef = adminDb.collection(`users/${uid}/summaryDrills`).doc();
        await docRef.set({
          id: docRef.id,
          passageId: passageId ?? null,
          facultyId: facultyId ?? null,
          passageTitle: passageTitle ?? null,
          language: lang,
          summaryText,
          scores: result.scores,
          total: result.total,
          feedback: result.feedback,
          completedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("[summary-drill] failed to save result", err);
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "AI応答のパースに失敗しました", raw: text },
      { status: 500 },
    );
  }
}

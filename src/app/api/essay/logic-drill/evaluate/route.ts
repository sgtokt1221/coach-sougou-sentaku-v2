// src/app/api/essay/logic-drill/evaluate/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { buildLogicDrillPrompt } from "@/lib/ai/prompts/logic-drill";
import { getLogicDrillItemById } from "@/lib/logic-drill/rotation";
import type {
  LogicDrillAnswer,
  LogicDrillResult,
  LogicDrillType,
} from "@/lib/types/logic-drill";

/** users/{uid}/logicDrills に採点結果を1件保存する（保存失敗は握りつぶす）。 */
async function saveLogicDrillResult(
  uid: string,
  drillType: LogicDrillType,
  itemId: string,
  answer: LogicDrillAnswer,
  result: LogicDrillResult,
): Promise<void> {
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { FieldValue } = await import("firebase-admin/firestore");
    if (adminDb) {
      const docRef = adminDb.collection(`users/${uid}/logicDrills`).doc();
      await docRef.set({
        id: docRef.id,
        drillType,
        itemId,
        answer,
        scores: result.scores,
        feedback: result.feedback,
        completedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("[logic-drill] failed to save result", err);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const body = (await request.json().catch(() => null)) as {
    drillType?: LogicDrillType;
    itemId?: string;
    answer?: LogicDrillAnswer;
  } | null;

  const drillType = body?.drillType;
  const itemId = body?.itemId;
  const answer = body?.answer;
  if (!drillType || !itemId || !answer) {
    return NextResponse.json({ error: "drillType, itemId, answer は必須です" }, { status: 400 });
  }

  const item = getLogicDrillItemById(itemId);
  if (!item || item.type !== drillType || answer.type !== drillType) {
    return NextResponse.json({ error: "itemId/drillType/answer が不整合です" }, { status: 400 });
  }

  // alexandra（係り受け4択）はAIを使わず決定的に採点する。
  if (drillType === "alexandra" && item.type === "alexandra" && answer.type === "alexandra") {
    const correct = answer.selectedIndex === item.answerIndex;
    const result: LogicDrillResult = {
      scores: correct
        ? { consistency: 5, validity: 5, structure: 5 }
        : { consistency: 0, validity: 0, structure: 0 },
      feedback: {
        good: correct ? "係り受けを正確に読み取れています。" : "",
        improve: correct ? "" : "修飾語がどの語に係るかを丁寧に追ってみましょう。",
        mcqCorrect: correct,
        modelAnswer: item.explanation,
      },
    };
    await saveLogicDrillResult(uid, drillType, itemId, answer, result);
    return NextResponse.json(result);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEYが設定されていません" }, { status: 503 });
  }

  const client = new Anthropic();
  const prompt = buildLogicDrillPrompt(item, answer);
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    const result = JSON.parse(jsonMatch[0]) as LogicDrillResult;

    await saveLogicDrillResult(uid, drillType, itemId, answer, result);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "AI応答のパースに失敗しました", raw: text },
      { status: 500 },
    );
  }
}

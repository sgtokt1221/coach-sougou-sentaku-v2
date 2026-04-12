/**
 * マッチングチャットの会話履歴からユーザーの大学選びの希望を抽出する。
 * チャット完了後に 1 回だけ呼ばれ、構造化された「希望サマリー」を返す。
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireRole } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student", "admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { history } = await request.json();
  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "会話履歴が必要です" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API キー未設定" }, { status: 503 });
  }

  const client = new Anthropic();

  const conversationText = history
    .map((m: { role: string; content: string }) => `${m.role === "user" ? "生徒" : "AI"}: ${m.content}`)
    .join("\n\n");

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `あなたは大学受験カウンセラーです。
以下の相談チャットの内容から、この生徒が大学選びで重視しているポイントを簡潔に箇条書きで抽出してください。

抽出すべき項目:
- 興味のある学問分野
- 大学の環境 (立地、規模、雰囲気など)
- 求める特徴 (留学制度、少人数教育、研究重視など)
- 将来のキャリアとの関連
- その他の希望

JSON ではなく、自然な日本語の箇条書きで出力してください。情報がない項目は省略してください。`,
    messages: [
      {
        role: "user",
        content: `以下のチャット内容から生徒の大学選びの希望を抽出してください。\n\n${conversationText}`,
      },
    ],
  });

  const preferences =
    res.content[0].type === "text" ? res.content[0].text : "";

  return NextResponse.json({ preferences });
}

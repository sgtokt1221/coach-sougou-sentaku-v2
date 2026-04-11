import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview";
import type { InterviewMessageResponse, InterviewMessage, InterviewMode } from "@/lib/types/interview";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messages, mode, universityContext, presentationContent, elapsedSeconds }: {
      sessionId: string;
      messages: InterviewMessage[];
      mode?: InterviewMode;
      universityContext?: any;
      presentationContent?: string;
      elapsedSeconds?: number;
    } = body;

    if (!sessionId || !messages) {
      return NextResponse.json(
        { error: "sessionId, messages は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      );
    }

    // セッション情報からシステムプロンプトを構築
    let systemPrompt = "あなたは大学入試の面接官です。総合型選抜の面接を行ってください。";

    // 1. リクエストボディから直接コンテキストを取得（優先）
    if (universityContext) {
      systemPrompt = buildInterviewSystemPrompt(
        mode ?? "individual",
        universityContext.universityName ?? "（大学名未設定）",
        universityContext.facultyName ?? "（学部名未設定）",
        universityContext.admissionPolicy ?? "（AP未設定）",
        "（過去の弱点なし）",
        undefined,
        presentationContent
      );
    } else {
      // 2. Firestoreから取得（フォールバック）
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        try {
          const sessionDoc = await adminDb.doc(`interviews/${sessionId}`).get();
          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data()!;
            const ctx = sessionData.universityContext;
            if (ctx) {
              systemPrompt = buildInterviewSystemPrompt(
                sessionData.mode ?? "individual",
                ctx.universityName,
                ctx.facultyName,
                ctx.admissionPolicy,
                "（過去の弱点なし）"
              );
            }
          }
        } catch (err) {
          console.warn("Failed to fetch session from Firestore:", err);
        }
      }
    }

    // GD 残り時間が少なくなってきたら総括フェーズに入る指示を system prompt に追加
    if (mode === "group_discussion" && typeof elapsedSeconds === "number") {
      if (elapsedSeconds >= 13 * 60) {
        systemPrompt += `\n\n## ⏰ 時間警告\n経過時間は ${Math.floor(elapsedSeconds / 60)} 分です。残り約 2 分しかありません。次のレスポンスで Phase 3 総括フェーズに入り、【司会】が「そろそろ時間です。最後に一言ずつ」と促してください。次か次々のレスポンスで必ず「以上で集団討論を終了いたします」と締めてください。`;
      } else if (elapsedSeconds >= 11 * 60) {
        systemPrompt += `\n\n## ⏰ 時間警告\n経過時間は ${Math.floor(elapsedSeconds / 60)} 分です。残り約 4 分です。そろそろ議論を収束させ、総括フェーズに向かってください。`;
      }
    }

    const client = new Anthropic();

    // ai→assistant, student→user に変換
    const claudeMessages = messages.map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    // GD は複数人の連続発話を含むため max_tokens を拡張
    const maxTokens = mode === "group_discussion" ? 1200 : 512;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: claudeMessages,
    });

    let content =
      response.content[0].type === "text" ? response.content[0].text : "";

    // GD で極端に短いレスポンス(司会の指示だけ等)が返ってきた場合、続きを生成して結合
    // 目安: 接頭辞【...】が 1 つ以下かつ 120 字未満なら続きを促す
    if (mode === "group_discussion") {
      const bracketCount = (content.match(/[【\[][^】\]]+[】\]]/g) ?? []).length;
      if (bracketCount <= 1 && content.length < 120) {
        try {
          const followup = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
              ...claudeMessages,
              { role: "assistant", content },
              {
                role: "user",
                content:
                  "続けてください。自己紹介フェーズなら【健太】【美咲】【翔太】の自己紹介を順番に出し、最後に【司会】が受験生Dさん(あなた)に発言を促してください。",
              },
            ],
          });
          const extra =
            followup.content[0].type === "text" ? followup.content[0].text : "";
          if (extra) {
            content = `${content}\n\n${extra}`;
          }
        } catch (err) {
          console.warn("[interview/message] followup generation failed", err);
        }
      }
    }

    // GD は Phase 構造で 10〜14 ターン、約 15 分で収束するよう調整
    const maxTurns = mode === "group_discussion" ? 18 : 16;
    const minTurns = mode === "group_discussion" ? 10 : 8;

    // GD の 15 分ハード制限: 14 分超過かつ minTurns 到達済みなら強制終了
    const timeUp =
      mode === "group_discussion" &&
      typeof elapsedSeconds === "number" &&
      elapsedSeconds >= 14 * 60 &&
      messages.length >= minTurns;

    const naturalActive =
      (messages.length < maxTurns &&
        !content.includes("以上で面接を終了") &&
        !content.includes("以上で集団討論を終了") &&
        !content.includes("面接を終わりにします") &&
        response.stop_reason !== "end_turn") ||
      messages.length < minTurns;

    const isActive = !timeUp && naturalActive;

    const result: InterviewMessageResponse = { content, isActive: Boolean(isActive) };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview message error:", error);
    return NextResponse.json(
      { error: "面接メッセージ処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

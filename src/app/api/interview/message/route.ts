import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview";
import type {
  InterviewMessageResponse,
  InterviewMessage,
  InterviewMode,
} from "@/lib/types/interview";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";
import { verifyAuthToken, adminDb } from "@/lib/firebase/admin";

/** 集団討論は1ターンでAIを2回呼ぶことがある */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      messages,
      mode,
      universityContext,
      presentationContent,
      elapsedSeconds,
    }: {
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

    /**
     * セッションの記録。口頭試問の分野はここから取る。
     *
     * 分野をクライアントから受け取ると、途中の1リクエストで欠けただけで
     * 試験官が別の話題に流れる（エラーは出ない）。開始時に保存した値を使う。
     */
    let sessionData: Record<string, any> | null = null;
    if (adminDb) {
      try {
        const snap = await adminDb.doc(`interviews/${sessionId}`).get();
        if (snap.exists) sessionData = snap.data() ?? null;
      } catch (err) {
        console.warn("Failed to fetch session from Firestore:", err);
      }
    }
    const oralExam = sessionData?.oralExam as
      | { subject: string; scope?: string }
      | undefined;

    // セッション情報からシステムプロンプトを構築
    let systemPrompt =
      "あなたは大学入試の面接官です。総合型選抜の面接を行ってください。";

    // 1. リクエストボディから直接コンテキストを取得（優先）
    const ctx = universityContext ?? sessionData?.universityContext;
    if (ctx) {
      systemPrompt = buildInterviewSystemPrompt(
        mode ?? sessionData?.mode ?? "individual",
        ctx.universityName ?? "（大学名未設定）",
        ctx.facultyName ?? "（学部名未設定）",
        ctx.admissionPolicy ?? "（AP未設定）",
        "（過去の弱点なし）",
        undefined,
        presentationContent,
        undefined,
        oralExam
      );
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
      model: AI_MODEL_SONNET,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: claudeMessages,
    });

    let content =
      response.content[0].type === "text" ? response.content[0].text : "";

    // GD で極端に短いレスポンス(司会の指示だけ等)が返ってきた場合、続きを生成して結合
    // 目安: 接頭辞【...】が 1 つ以下かつ 120 字未満なら続きを促す
    if (mode === "group_discussion") {
      const bracketCount = (content.match(/[【\[][^】\]]+[】\]]/g) ?? [])
        .length;
      if (bracketCount <= 1 && content.length < 120) {
        try {
          const followup = await client.messages.create({
            model: AI_MODEL_SONNET,
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

    /**
     * 面接を続けるか。
     *
     * 以前はここに `response.stop_reason !== "end_turn"` が入っていた。
     * 通常の応答は必ず end_turn で返るため条件は常に偽になり、
     * 実際には「minTurns に達したら即終了」になっていた。個人面接は
     * 8 メッセージ（生徒の4回目の回答あたり）で、プロンプトが指示する
     * 起承転結の「転」に入る前に打ち切られていた。
     * 終了の判断は、AIが終了を宣言したか・上限ターンに達したかで決める。
     */
    const declaredEnd =
      content.includes("以上で面接を終了") ||
      content.includes("以上で集団討論を終了") ||
      content.includes("以上で口頭試問を終了") ||
      content.includes("以上でプレゼンテーション面接を終了") ||
      content.includes("面接を終わりにします");

    const naturalActive =
      messages.length < minTurns ||
      (messages.length < maxTurns && !declaredEnd);

    const isActive = !timeUp && naturalActive;

    /**
     * 会話を1ターンずつサーバーへ残す（監査 P0-3）。
     *
     * これまで会話はクライアントだけが持ち、終了時にまとめて送られたものを
     * そのまま採点していた。差し替えても欠落させても検出できない。
     * ここで積んでおけば、採点はサーバーの記録から行える。
     *
     * 保存に失敗しても面接は続行する（会話を止めない）。
     */
    if (adminDb && sessionData) {
      try {
        const auth = await verifyAuthToken(request);
        const ref = adminDb.doc(`interviews/${sessionId}`);
        /**
         * 本人のセッションにだけ書く。
         *
         * 以前は「認証が取れなければ書いてよい」判定になっていたため、
         * トークンを付けなければ他人の会話記録を丸ごと差し替えられた。
         * 採点はこの記録を正本にするので、書き手は本人に限る。
         */
        const isOwner =
          auth && (sessionData.userId === auth.uid || auth.uid === "dev-user");
        // 保存前に始まった古いセッション（userId 未設定）は本人判定ができないため書かない
        if (isOwner) {
          await ref.set(
            {
              messages: [
                ...messages.map((m) => ({ role: m.role, content: m.content })),
                { role: "ai", content },
              ],
              lastMessageAt: new Date().toISOString(),
              // 進行中一覧はこちらで並べ替える。書かないとテキスト面接だけ
              // 開始時刻のまま並び、最後に触ったセッションが上に来ない
              lastActiveAt: new Date(),
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.error("[interview/message] 会話の保存に失敗:", err);
      }
    }

    const result: InterviewMessageResponse = {
      content,
      isActive: Boolean(isActive),
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview message error:", error);
    return NextResponse.json(
      { error: "面接メッセージ処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

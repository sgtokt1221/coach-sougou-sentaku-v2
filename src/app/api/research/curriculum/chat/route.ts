import { NextRequest, NextResponse } from "next/server";
import { logAiConversation } from "@/lib/chat/ai-conversation-log";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { loadResearchSelfContext } from "@/lib/ai/research-context";
import {
  buildCurriculumChatPrompt,
  buildMockCurriculumChat,
  type CurriculumChatResult,
} from "@/lib/ai/prompts/research-curriculum";

interface ChatBody {
  message: string;
  history?: Array<{ role: string; content: string }>;
  /** 続きの会話ならクライアントが持っているID */
  conversationId?: string | null;
}

function parseChat(text: string): CurriculumChatResult {
  const m = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) return { aiMessage: text, isReady: false };
  try {
    const p = JSON.parse(m[1]);
    return {
      aiMessage: p.aiMessage ?? "",
      suggestedDomains: Array.isArray(p.suggestedDomains) ? p.suggestedDomains : undefined,
      isReady: p.isReady === true,
      decided:
        p.isReady && p.decided
          ? {
              domain: p.decided.domain ?? "",
              theme: p.decided.theme ?? "",
              goal: p.decided.goal ?? "",
            }
          : undefined,
    };
  } catch {
    return { aiMessage: text, isReady: false };
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const userSnap = await adminDb.doc(`users/${uid}`).get();
  if (userSnap.data()?.researchEnrolled !== true) {
    return NextResponse.json({ error: "探究授業の受講登録がありません。" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as ChatBody;
    if (!body.message) {
      return NextResponse.json({ error: "message は必須です" }, { status: 400 });
    }

    const { text: selfContext, selfAnalysisComplete } = await loadResearchSelfContext(uid);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ...buildMockCurriculumChat(body.message), selfAnalysisComplete });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const m of body.history ?? []) {
      messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.content });
    }
    messages.push({ role: "user", content: body.message });

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildCurriculumChatPrompt(selfContext),
      messages,
    });
    const text = resp.content[0]?.type === "text" ? resp.content[0].text : "";
    const parsed = parseChat(text);

    // やり取りを履歴に残す（管理者の「AI対話履歴」で読めるようにする）
    const savedId = await logAiConversation({
      uid,
      kind: "research_decide",
      conversationId: body.conversationId,
      messages: [
        ...messages,
        { role: "assistant", content: parsed.aiMessage || text },
      ],
    });

    return NextResponse.json({
      ...parsed,
      selfAnalysisComplete,
      conversationId: savedId,
    });
  } catch (error) {
    console.error("Research curriculum chat error:", error);
    return NextResponse.json({ error: "対話処理中にエラーが発生しました" }, { status: 500 });
  }
}

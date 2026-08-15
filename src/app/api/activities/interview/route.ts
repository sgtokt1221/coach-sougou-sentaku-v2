import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { buildActivityFullInterviewPrompt } from "@/lib/ai/prompts/activity";
import { logAiConversation } from "@/lib/chat/ai-conversation-log";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/types/activity";
import type { ActivityCategory } from "@/lib/types/activity";

/**
 * 活動実績の AI対話先行ヒアリング（ステートレス）。
 * 既存活動に紐づかず、新規登録の前段としてタイトル・カテゴリ・時期＋5項目を対話で引き出す。
 */

interface InterviewRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  /** 続きの会話ならクライアントが持っているID。無ければ新規採番して返す */
  conversationId?: string | null;
}

const VALID_CATEGORIES = new Set(Object.keys(ACTIVITY_CATEGORY_LABELS));

function normalizeCategory(v: unknown): ActivityCategory {
  return typeof v === "string" && VALID_CATEGORIES.has(v) ? (v as ActivityCategory) : "other";
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student", "teacher", "admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  let body: InterviewRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const { message, history, conversationId } = body;
  if (!message) {
    return NextResponse.json({ error: "message は必須です" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ヒアリング機能にはAPIキーが必要です", available: false },
      { status: 503 }
    );
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (history) {
    for (const msg of history) {
      messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
    }
  }
  messages.push({ role: "user", content: message });

  let text = "";
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildActivityFullInterviewPrompt(),
      messages,
    });
    text = response.content[0].type === "text" ? response.content[0].text : "";
  } catch (e) {
    console.error("[activities/interview] Claude error:", e);
    return NextResponse.json({ error: "ヒアリング処理中にエラーが発生しました" }, { status: 502 });
  }

  /**
   * やり取りを履歴として残す（管理者の「AI対話履歴」で読めるようにする）。
   * この経路は会話を保存しておらず、構造化された結果しか残っていなかった。
   */
  const savedId = await logAiConversation({
    uid: auth.uid,
    kind: "activity_interview",
    conversationId,
    messages: [...messages, { role: "assistant", content: text }],
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let suggested:
        | { title: string; category: ActivityCategory; period: { start: string; end: string } }
        | undefined;
      if (parsed.suggested && typeof parsed.suggested === "object") {
        const s = parsed.suggested;
        suggested = {
          title: typeof s.title === "string" ? s.title : "",
          category: normalizeCategory(s.category),
          period: {
            start: typeof s.period?.start === "string" ? s.period.start : "",
            end: typeof s.period?.end === "string" ? s.period.end : "",
          },
        };
      }
      return NextResponse.json({
        aiQuestion: parsed.aiQuestion ?? text,
        isComplete: Boolean(parsed.isComplete),
        structuredData: parsed.structuredData,
        suggested,
        conversationId: savedId,
      });
    }
  } catch {
    // JSON 抽出失敗時は raw text を返す
  }

  return NextResponse.json({ aiQuestion: text, isComplete: false, conversationId: savedId });
}

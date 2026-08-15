import type { AiConversationKind } from "@/lib/types/ai-conversation";

/**
 * ステートレスなAI対話（活動実績のヒアリング・志望校探索・探究の分野決め）を
 * 履歴として残す。
 *
 * これらは会話をリクエストで往復させるだけで、結果（構造化データや決定事項）
 * しか保存していなかった。管理者は生徒がAIと何を話したかを追えず、
 * 「AI対話履歴」にも出せなかった。
 *
 * 保存先は機能ごとに分けず `users/{uid}/aiConversations/{id}` に寄せる。
 * 会話の置き場が増えるほど、読む側（/api/admin/students/[id]/ai-conversations）が
 * 系統ごとの分岐を抱えることになる。
 *
 * 保存は本筋（AIの応答を返すこと）を止めない。失敗しても warn だけ残す。
 */

/** 1会話で保存するメッセージの上限。長い相談でドキュメントが肥大するのを防ぐ */
const MAX_MESSAGES = 200;
/** 見出しに使う先頭発言の長さ */
const TITLE_MAX = 40;

export interface AiConversationLogInput {
  uid: string;
  kind: AiConversationKind;
  /** 続きの会話なら既存ID。無ければ新規に採番して返す */
  conversationId?: string | null;
  messages: { role: "user" | "assistant"; content: string }[];
  /** 見出し。省略時は最初の生徒の発言から作る */
  title?: string;
}

/**
 * 会話を丸ごと upsert し、会話IDを返す。
 * クライアントは返ったIDを次のターンに渡す（同じ会話に追記される）。
 */
export async function logAiConversation(
  input: AiConversationLogInput,
): Promise<string | null> {
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) return input.conversationId ?? null;

    const messages = input.messages
      .filter((m) => m.content?.trim())
      .slice(-MAX_MESSAGES);
    if (messages.length === 0) return input.conversationId ?? null;

    const col = adminDb.collection(`users/${input.uid}/aiConversations`);
    const ref = input.conversationId
      ? col.doc(input.conversationId)
      : col.doc();

    const firstUser = messages.find((m) => m.role === "user")?.content ?? "";
    const title =
      input.title?.trim() ||
      (firstUser.length > TITLE_MAX
        ? firstUser.slice(0, TITLE_MAX) + "…"
        : firstUser) ||
      "AIとの相談";

    const now = new Date().toISOString();
    await ref.set(
      {
        kind: input.kind,
        title,
        messages,
        messageCount: messages.length,
        updatedAt: now,
        // 既にあれば createdAt は保持したいので merge に任せ、無い時だけ入れる
        ...(input.conversationId ? {} : { createdAt: now }),
      },
      { merge: true },
    );
    return ref.id;
  } catch (err) {
    console.warn(`[ai-conversation-log] 保存に失敗 kind=${input.kind}`, err);
    return input.conversationId ?? null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { CHAT_REACTION_EMOJIS } from "@/lib/types/feedback";

/**
 * チャットの絵文字リアクションを付け外しする。
 *
 * メッセージは3種類の場所に散っているが、いずれも users/{ownerId}/... なので
 * 「その持ち主のスレッドを見てよいか」だけで認可できる。スレッドごとに
 * 判定を書くと必ずどれかが緩くなるので、ここに集約する。
 *
 *   users/{studentId}/feedback        生徒 ↔ 管理者
 *   users/{studentId}/teacherFeedback 生徒 ↔ 講師
 *   users/{teacherId}/feedback        講師 ↔ 管理者
 */
const COLLECTIONS = ["feedback", "teacherFeedback"] as const;
type ChatCollection = (typeof COLLECTIONS)[number];

const EMOJIS: readonly string[] = CHAT_REACTION_EMOJIS;

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [
    "student",
    "teacher",
    "admin",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;
  const { uid, role } = auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    ownerId?: string;
    collection?: string;
    messageId?: string;
    emoji?: string;
  };
  const { ownerId, messageId, emoji } = body;
  const collection = body.collection as ChatCollection | undefined;

  if (!ownerId || !messageId || !emoji || !collection) {
    return NextResponse.json(
      { error: "ownerId, collection, messageId, emoji が必要です" },
      { status: 400 },
    );
  }
  if (!COLLECTIONS.includes(collection)) {
    return NextResponse.json({ error: "collection が不正です" }, { status: 400 });
  }
  // 任意の文字列を保存させない（絵文字以外を入れられるとUIが崩れる）
  if (!EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "使えない絵文字です" }, { status: 400 });
  }

  // 持ち主本人でなければ、その人のデータを見られる立場かを確認する
  if (uid !== ownerId) {
    const ownerDoc = await adminDb.doc(`users/${ownerId}`).get();
    if (!ownerDoc.exists) {
      return NextResponse.json({ error: "相手が見つかりません" }, { status: 404 });
    }
    const d = ownerDoc.data();
    const denied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: ownerId,
      studentData: {
        managedBy: d?.managedBy as string | undefined,
        organizationId: d?.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(d),
      },
      allowAssignedTeacher: true,
    });
    if (denied) return denied;
  }

  const ref = adminDb.doc(`users/${ownerId}/${collection}/${messageId}`);

  try {
    // 同じ人が連打しても二重に入らないよう、読んでから書く
    const updated = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      const current = (snap.data()?.reactions ?? {}) as Record<string, string[]>;
      const users = Array.isArray(current[emoji]) ? current[emoji] : [];
      const next = users.includes(uid)
        ? users.filter((u) => u !== uid)
        : [...users, uid];

      const reactions: Record<string, string[]> = { ...current };
      // 0人になった絵文字は残さない。空配列が溜まると表示側で数えづらい
      if (next.length === 0) delete reactions[emoji];
      else reactions[emoji] = next;

      tx.update(ref, { reactions });
      return reactions;
    });

    if (updated === null) {
      return NextResponse.json(
        { error: "メッセージが見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ reactions: updated });
  } catch (error) {
    console.error("[chat/reactions] failed:", error);
    return NextResponse.json(
      { error: "リアクションの更新に失敗しました" },
      { status: 500 },
    );
  }
}

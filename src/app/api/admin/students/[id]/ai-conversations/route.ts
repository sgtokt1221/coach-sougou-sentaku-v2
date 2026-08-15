import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import type {
  AiConversation,
  AiConversationKind,
  AiConversationMessage,
} from "@/lib/types/ai-conversation";

/**
 * GET /api/admin/students/[id]/ai-conversations
 *
 * その生徒とAIのやり取りを、機能をまたいで1本の時系列にして返す。
 *
 * 読む場所は6つ。小論文コーチ・書類コーチ・AI模擬面接・面接スキルチェック・
 * 自己分析は機能ごとに別の場所へ保存されており、保存場所も role の呼び方も
 * 時刻の型も違うのでここで揃える。
 * 活動ヒアリング・志望校探索・探究の分野決めは元々会話を保存していなかったため、
 * 後から足すぶんは users/{uid}/aiConversations に集約している
 * （src/lib/chat/ai-conversation-log.ts）。
 */

/** 1つの会話で返すメッセージの上限。長い面接がレスポンスを膨らませるのを防ぐ */
const MAX_MESSAGES = 200;
/** 種類ごとの件数上限 */
const MAX_ITEMS_PER_KIND = 30;

/** Firestore Timestamp / ISO 文字列 / Date のいずれでも ISO 文字列にする */
function toIso(v: unknown): string {
  const withToDate = v as { toDate?: () => Date } | null | undefined;
  if (withToDate?.toDate) return withToDate.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(+d)) return d.toISOString();
  }
  return new Date(0).toISOString();
}

/** 面接系の role（ai/student）も含めて表示用の2値へ寄せる */
function normalizeMessages(raw: unknown): AiConversationMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const role = String((m as { role?: unknown })?.role ?? "");
      const content = String((m as { content?: unknown })?.content ?? "");
      if (!content.trim()) return null;
      return {
        role: role === "user" || role === "student" ? "user" : "assistant",
        content,
      } as AiConversationMessage;
    })
    .filter((m): m is AiConversationMessage => m !== null);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id } = await params;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const userDoc = await adminDb.doc(`users/${id}`).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = userDoc.data();
  const denied = await scopeByOrganization({
    requesterUid: uid,
    requesterRole: role,
    studentUid: id,
    studentData: {
      managedBy: userData?.managedBy as string | undefined,
      organizationId: userData?.organizationId as string | undefined,
      assignedTeacherIds: getAssignedTeacherIds(userData),
    },
    allowAssignedTeacher: true,
  });
  if (denied) return denied;

  /**
   * 1つでも失敗したら全部落ちる、という作りにしない。
   * 会話は5系統あり、片方のインデックス欠落やデータ不整合で履歴全体が
   * 見えなくなる方が困る。失敗した系統だけ落として warn を残す。
   */
  const [essay, docs, interviews, skillChecks, selfAnalysis, logged] =
    await Promise.allSettled([
      adminDb
        .collection(`users/${id}/essayCoachThreads`)
        .orderBy("updatedAt", "desc")
        .limit(MAX_ITEMS_PER_KIND)
        .get(),
      adminDb
        .collection(`users/${id}/documentCoachThreads`)
        .orderBy("updatedAt", "desc")
        .limit(MAX_ITEMS_PER_KIND)
        .get(),
      adminDb
        .collection("interviews")
        .where("userId", "==", id)
        .orderBy("startedAt", "desc")
        .limit(MAX_ITEMS_PER_KIND)
        .get(),
      adminDb
        .collection(`users/${id}/interviewSkillChecks`)
        .orderBy("takenAt", "desc")
        .limit(MAX_ITEMS_PER_KIND)
        .get(),
      adminDb.doc(`selfAnalysis/${id}`).get(),
      // 活動ヒアリング・志望校探索・探究の分野決め。会話をここへ集約している
      adminDb
        .collection(`users/${id}/aiConversations`)
        .orderBy("updatedAt", "desc")
        .limit(MAX_ITEMS_PER_KIND * 3)
        .get(),
    ]);

  const items: AiConversation[] = [];
  const push = (
    kind: AiConversationKind,
    docId: string,
    title: string,
    updatedAt: string,
    messages: AiConversationMessage[],
    note?: string,
  ) => {
    if (messages.length === 0) return;
    items.push({
      id: `${kind}:${docId}`,
      kind,
      title,
      updatedAt,
      messageCount: messages.length,
      messages: messages.slice(-MAX_MESSAGES),
      ...(note ? { note } : {}),
    });
  };

  const warn = (kind: string, r: PromiseSettledResult<unknown>) => {
    if (r.status === "rejected") {
      console.warn(`[ai-conversations] ${kind} の取得に失敗:`, r.reason);
    }
  };
  warn("essayCoachThreads", essay);
  warn("documentCoachThreads", docs);
  warn("interviews", interviews);
  warn("interviewSkillChecks", skillChecks);
  warn("selfAnalysis", selfAnalysis);
  warn("aiConversations", logged);

  if (essay.status === "fulfilled") {
    essay.value.docs.forEach((d) => {
      const t = d.data();
      push(
        "essay_coach",
        d.id,
        String(t.topic ?? t.title ?? "小論文の相談"),
        toIso(t.updatedAt ?? t.createdAt),
        normalizeMessages(t.messages),
      );
    });
  }

  if (docs.status === "fulfilled") {
    docs.value.docs.forEach((d) => {
      const t = d.data();
      push(
        "document_coach",
        d.id,
        String(t.sectionTitle ?? "書類の相談"),
        toIso(t.updatedAt ?? t.createdAt),
        normalizeMessages(t.messages),
      );
    });
  }

  if (interviews.status === "fulfilled") {
    interviews.value.docs.forEach((d) => {
      const t = d.data();
      // 中断した面接も出す。「全部の対話が見たい」ので完了だけに絞らない
      const done = t.status === "completed";
      push(
        "interview",
        d.id,
        String(t.topic ?? t.universityName ?? "AI模擬面接"),
        toIso(t.completedAt ?? t.lastActiveAt ?? t.startedAt),
        normalizeMessages(t.messages),
        done ? undefined : "中断",
      );
    });
  }

  if (skillChecks.status === "fulfilled") {
    skillChecks.value.docs.forEach((d) => {
      const t = d.data();
      push(
        "interview_skill_check",
        d.id,
        "面接スキルチェック",
        toIso(t.takenAt),
        normalizeMessages(t.messages),
      );
    });
  }

  if (selfAnalysis.status === "fulfilled" && selfAnalysis.value.exists) {
    const t = selfAnalysis.value.data() ?? {};
    const history = Array.isArray(t.chatHistory) ? t.chatHistory : [];
    // ステップごとに1つの会話として並べる。まとめると「どの問いの話か」が消える
    history.forEach((entry: { step?: number; messages?: unknown }, i: number) => {
      push(
        "self_analysis",
        `step-${entry?.step ?? i}`,
        `自己分析 ステップ${entry?.step ?? i + 1}`,
        toIso(t.updatedAt),
        normalizeMessages(entry?.messages),
      );
    });
  }

  if (logged.status === "fulfilled") {
    logged.value.docs.forEach((d) => {
      const t = d.data();
      push(
        (t.kind as AiConversationKind) ?? "activity_interview",
        d.id,
        String(t.title ?? "AIとの相談"),
        toIso(t.updatedAt ?? t.createdAt),
        normalizeMessages(t.messages),
      );
    });
  }

  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return NextResponse.json({ conversations: items });
}

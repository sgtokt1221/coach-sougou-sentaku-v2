import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { getOrgMemberAdminUids, chunk } from "@/lib/api/organization-scope";
import type { ConversationListItem } from "@/lib/types/feedback";

/**
 * GET /api/admin/messages
 * コーチのインボックス: 担当生徒一覧に conversations サマリを左結合して返す。
 * ?countOnly=true で unreadByCoach の合計のみ返す。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const countOnly = searchParams.get("countOnly") === "true";
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;
    const effectiveRole = role === "superadmin" && viewAs ? "admin" : role;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // 担当する生徒・講師（管理者から見た連絡相手）。
    // admin は自分の塾(組織)メンバーが managedBy の相手を共有。teacher は従来どおり自分の managedBy。
    const rawDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (effectiveRole === "superadmin") {
      const s = await adminDb
        .collection("users")
        .where("role", "in", ["student", "teacher"])
        .get();
      rawDocs.push(...s.docs);
    } else if (effectiveRole === "admin") {
      const memberUids = await getOrgMemberAdminUids(adminDb, effectiveUid);
      const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      for (const part of chunk(memberUids, 30)) {
        const s = await adminDb
          .collection("users")
          .where("managedBy", "in", part)
          .get();
        s.docs.forEach((d) => byId.set(d.id, d));
      }
      rawDocs.push(...byId.values());
    } else {
      const s = await adminDb
        .collection("users")
        .where("managedBy", "==", effectiveUid)
        .get();
      rawDocs.push(...s.docs);
    }

    const docs = rawDocs.filter((d) => {
      const r = d.data().role;
      return r === "student" || r === "teacher";
    });

    if (docs.length === 0) {
      return NextResponse.json(countOnly ? { unreadCount: 0 } : []);
    }

    // conversations サマリをバッチ取得
    const convRefs = docs.map((d) => adminDb.doc(`conversations/${d.id}`));
    const convSnaps = await adminDb.getAll(...convRefs);
    const convById = new Map<string, FirebaseFirestore.DocumentData>();
    convSnaps.forEach((c) => {
      if (c.exists) convById.set(c.id, c.data()!);
    });

    if (countOnly) {
      let total = 0;
      convById.forEach((c) => {
        total += typeof c.unreadByCoach === "number" ? c.unreadByCoach : 0;
      });
      return NextResponse.json({ unreadCount: total });
    }

    const items: ConversationListItem[] = docs.map((d) => {
      const data = d.data();
      const conv = convById.get(d.id);
      const lastMessageAt =
        conv?.lastMessageAt?.toDate?.()?.toISOString() ??
        (typeof conv?.lastMessageAt === "string" ? conv.lastMessageAt : null);
      return {
        studentId: d.id,
        studentName: (data.displayName as string) ?? "",
        studentPhotoURL: (data.photoURL as string | undefined) ?? null,
        role: (data.role as "student" | "teacher") ?? "student",
        lastMessageText: (conv?.lastMessageText as string) ?? "",
        lastMessageAt,
        lastSenderRole: (conv?.lastSenderRole as "coach" | "student") ?? null,
        unreadByCoach:
          typeof conv?.unreadByCoach === "number" ? conv.unreadByCoach : 0,
      };
    });

    // 最終メッセージ降順 (無いものは末尾、名前昇順)
    items.sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (at !== bt) return bt - at;
      return a.studentName.localeCompare(b.studentName, "ja");
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Admin messages GET error:", error);
    return NextResponse.json(
      { error: "メッセージ一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

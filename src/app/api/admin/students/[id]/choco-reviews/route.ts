import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { EssayInlineComment } from "@/lib/types/essay";
import type { ChocoRole } from "@/lib/types/choco";

export interface ChocoReviewListItem {
  id: string;
  createdAt: string;
  /** 元の文章のタイトル */
  themeTitle: string;
  /** 生徒が担当した段落の位置（0始まり）と役割 */
  blankIndex: number;
  role: ChocoRole | null;
  /** 生徒が書いた段落。管理者画面で本文にコメントを付けるために返す */
  studentText: string;
  wordCount: number;
  scores: { logic: number; coherence: number; expression: number; total: number } | null;
  feedbackOverall: string;
  inlineComments?: EssayInlineComment[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { id } = await params;

  if (!adminDb) {
    return NextResponse.json([]);
  }

  try {
    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data()!;

    const orgDenied = await scopeByOrganization({
      requesterUid: uid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData.managedBy as string | undefined,
        organizationId: userData.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(userData),
      },
      allowAssignedTeacher: true,
    });
    if (orgDenied) {
      if (role === "teacher") {
        const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
        const hasAccess = await hasActiveSessionAccess(uid, id);
        if (!hasAccess) {
          return orgDenied;
        }
      } else {
        return orgDenied;
      }
    }

    const snapshot = await adminDb
      .collection(`users/${id}/chokoReviews`)
      .orderBy("createdAt", "desc")
      .get();

    const items: ChocoReviewListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? new Date().toISOString(),
        themeTitle: data.themeTitle ?? "",
        blankIndex: typeof data.blankIndex === "number" ? data.blankIndex : 0,
        role: data.role ?? null,
        studentText: data.studentText ?? "",
        wordCount: data.wordCount ?? (data.studentText ?? "").length,
        scores: data.scores ?? null,
        feedbackOverall: data.feedback?.overall ?? "",
        inlineComments: data.inlineComments ?? [],
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("[admin/choco-reviews] failed", err);
    return NextResponse.json([]);
  }
}

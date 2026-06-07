import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";

export interface InterviewDrillListItem {
  id: string;
  category: string | null;
  question: string;
  answer: string;
  score: number; // 1-5
  feedback: string | null;
  betterAnswer: string | null;
  createdAt: string;
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
        if (!hasAccess) return orgDenied;
      } else {
        return orgDenied;
      }
    }

    const snapshot = await adminDb
      .collection(`users/${id}/interviewDrills`)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const items: InterviewDrillListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        category: data.category ?? null,
        question: data.question ?? "",
        answer: data.answer ?? "",
        score: data.score ?? 0,
        feedback: data.feedback ?? null,
        betterAnswer: data.betterAnswer ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("[admin/interview-drills] failed", err);
    return NextResponse.json([]);
  }
}

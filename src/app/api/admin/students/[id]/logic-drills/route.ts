import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type {
  LogicDrillType,
  LogicDrillAnswer,
  LogicDrillScores,
  LogicDrillFeedback,
} from "@/lib/types/logic-drill";

export interface LogicDrillListItem {
  id: string;
  drillType: LogicDrillType | null;
  itemId: string | null;
  answer: LogicDrillAnswer | null;
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback | null;
  completedAt: string;
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
      .collection(`users/${id}/logicDrills`)
      .orderBy("completedAt", "desc")
      .get();

    const items: LogicDrillListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        drillType: data.drillType ?? null,
        itemId: data.itemId ?? null,
        answer: data.answer ?? null,
        scores: data.scores ?? { consistency: 0, validity: 0, structure: 0 },
        feedback: data.feedback ?? null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("[admin/logic-drills] failed", err);
    return NextResponse.json([]);
  }
}

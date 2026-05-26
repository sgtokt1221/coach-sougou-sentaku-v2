import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export interface SummaryDrillListItem {
  id: string;
  passageTitle: string | null;
  facultyId: string | null;
  scores: {
    comprehension: number;
    conciseness: number;
    keyPoints: number;
    structure: number;
    expression: number;
  };
  total: number;
  feedback: string | null;
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
      },
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
      .collection(`users/${id}/summaryDrills`)
      .orderBy("completedAt", "desc")
      .get();

    const items: SummaryDrillListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        passageTitle: data.passageTitle ?? null,
        facultyId: data.facultyId ?? null,
        scores: data.scores ?? { comprehension: 0, conciseness: 0, keyPoints: 0, structure: 0, expression: 0 },
        total: data.total ?? 0,
        feedback: data.feedback ?? null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("[admin/summary-drills] failed", err);
    return NextResponse.json([]);
  }
}

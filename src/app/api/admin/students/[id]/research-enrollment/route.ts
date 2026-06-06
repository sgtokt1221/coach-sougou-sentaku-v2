import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";

/** 探究受講の状態（生徒詳細で管理者が付与） */
interface ResearchEnrollment {
  researchEnrolled: boolean;
  researchPlan: "weekly" | "monthly" | null;
  researchConsentStatus: "none" | "pending" | "granted" | "revoked";
  researchEnrolledAt: string | null;
}

const VALID_PLANS = ["weekly", "monthly"] as const;
const VALID_CONSENT = ["none", "pending", "granted", "revoked"] as const;

/**
 * GET /api/admin/students/[id]/research-enrollment
 * 指定生徒の探究受講状態を返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data();

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData?.managedBy as string | undefined,
        organizationId: userData?.organizationId as string | undefined,
        assignedTeacherIds: getAssignedTeacherIds(userData),
      },
      allowAssignedTeacher: true,
    });
    if (orgDenied) return orgDenied;

    const result: ResearchEnrollment = {
      researchEnrolled: userData?.researchEnrolled === true,
      researchPlan: (userData?.researchPlan as ResearchEnrollment["researchPlan"]) ?? null,
      researchConsentStatus:
        (userData?.researchConsentStatus as ResearchEnrollment["researchConsentStatus"]) ??
        "none",
      researchEnrolledAt: (userData?.researchEnrolledAt as string | undefined) ?? null,
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Research enrollment GET error:", error);
    return NextResponse.json(
      { error: "探究受講状態の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/students/[id]/research-enrollment
 * 探究受講の付与/解除・ペース変更・同意状態の更新。
 * 受講を付与した時点で同意は pending（保護者のWeb同意で granted になる）。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<{
      researchEnrolled: boolean;
      researchPlan: "weekly" | "monthly";
      researchConsentStatus: "none" | "pending" | "granted" | "revoked";
    }>;

    if (
      body.researchPlan !== undefined &&
      !VALID_PLANS.includes(body.researchPlan)
    ) {
      return NextResponse.json({ error: "無効な受講ペースです" }, { status: 400 });
    }
    if (
      body.researchConsentStatus !== undefined &&
      !VALID_CONSENT.includes(body.researchConsentStatus)
    ) {
      return NextResponse.json({ error: "無効な同意状態です" }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const userDoc = await adminDb.doc(`users/${id}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
    }
    const userData = userDoc.data();

    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = role === "superadmin" && viewAs ? viewAs : uid;

    const orgDenied = await scopeByOrganization({
      requesterUid: effectiveUid,
      requesterRole: role,
      studentUid: id,
      studentData: {
        managedBy: userData?.managedBy as string | undefined,
        organizationId: userData?.organizationId as string | undefined,
      },
    });
    if (orgDenied) return orgDenied;

    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.researchEnrolled !== undefined) {
      update.researchEnrolled = body.researchEnrolled;
      if (body.researchEnrolled) {
        update.researchEnrolledAt =
          (userData?.researchEnrolledAt as string | undefined) ??
          new Date().toISOString();
        // 付与時、まだ同意プロセスが始まっていなければ pending にする
        const current = userData?.researchConsentStatus as string | undefined;
        if (!current || current === "none") {
          update.researchConsentStatus = "pending";
        }
      }
    }
    if (body.researchPlan !== undefined) update.researchPlan = body.researchPlan;
    if (body.researchConsentStatus !== undefined) {
      update.researchConsentStatus = body.researchConsentStatus;
    }

    await adminDb.doc(`users/${id}`).set(update, { merge: true });

    const after = await adminDb.doc(`users/${id}`).get();
    const d = after.data();
    return NextResponse.json({
      researchEnrolled: d?.researchEnrolled === true,
      researchPlan: d?.researchPlan ?? null,
      researchConsentStatus: d?.researchConsentStatus ?? "none",
      researchEnrolledAt: d?.researchEnrolledAt ?? null,
    });
  } catch (error) {
    console.error("Research enrollment PATCH error:", error);
    return NextResponse.json(
      { error: "探究受講状態の更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

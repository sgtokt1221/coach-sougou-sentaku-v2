import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import { generateAndSaveCurriculum } from "@/lib/ai/research-curriculum-generate";
import type { ResearchCurriculum } from "@/lib/types/research";

interface GenerateBody {
  domain?: string;
  theme?: string;
  goal?: string;
  unitCount: number;
}

/**
 * POST /api/admin/students/[id]/research-curriculum/generate
 * 講師が初回セッションで生徒の探究カリキュラムを生成する。
 * domain/theme/goal は body 指定 or 既存 draft の値を使う。講師は担当生徒のみ。
 */
export async function POST(
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

    const body = (await request.json()) as GenerateBody;
    // 未指定なら draft の値を使う
    const draft = (await adminDb.doc(`users/${id}/researchCurriculum/current`).get()).data() as
      | ResearchCurriculum
      | undefined;
    const domain = body.domain ?? draft?.domain ?? "";
    const theme = body.theme ?? draft?.theme ?? "";
    const goal = body.goal ?? draft?.goal ?? "";

    const curriculum = await generateAndSaveCurriculum({
      studentUid: id,
      domain,
      theme,
      goal,
      unitCount: body.unitCount,
    });
    return NextResponse.json(curriculum);
  } catch (error) {
    const message =
      error instanceof Error && /必須です/.test(error.message)
        ? error.message
        : "カリキュラム生成中にエラーが発生しました";
    const status = message === "カリキュラム生成中にエラーが発生しました" ? 500 : 400;
    if (status === 500) console.error("Admin research curriculum generate error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

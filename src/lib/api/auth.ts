import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";

export async function requireRole(
  request: Request,
  allowedRoles: string[]
): Promise<{ uid: string; role: string } | NextResponse> {
  const authResult = await verifyAuthToken(request);

  // dev mode bypass: if no admin SDK configured, check devRole header
  if (!authResult) {
    const devRole = request.headers.get("X-Dev-Role");
    if (process.env.NODE_ENV === "development" && devRole) {
      if (!allowedRoles.includes(devRole)) {
        return NextResponse.json(
          { error: "権限がありません" },
          { status: 403 }
        );
      }
      return { uid: "dev-user", role: devRole };
    }
    // If no auth at all in dev, allow for backward compat with mock data
    if (process.env.NODE_ENV === "development") {
      return { uid: "dev-user", role: "admin" };
    }
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  if (!allowedRoles.includes(authResult.role)) {
    return NextResponse.json(
      { error: "権限がありません" },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * 生徒データへのアクセスを「自分の管轄 (managedBy) または同じ塾の admin」 で許可。
 *
 * 既存の `managedBy` チェックを置き換えるのではなく拡張:
 *   - superadmin → 常に OK
 *   - 生徒自身 (uid === studentUid) → OK
 *   - studentData.managedBy === requesterUid → 既存の挙動 OK
 *   - 同じ organizationId のメンバー admin → 新たに OK
 *
 * 戻り値: NextResponse (403) なら拒否、 null なら OK。
 */
export async function scopeByOrganization(opts: {
  requesterUid: string;
  requesterRole: string;
  studentUid: string;
  studentData: {
    managedBy?: string;
    organizationId?: string;
    /** 担当講師 uid 配列。allowAssignedTeacher=true のとき許可判定に使う */
    assignedTeacherIds?: string[];
  };
  /**
   * true のとき「担当講師 (assignedTeacherId === requester)」も許可する。
   * 学習データ取得 API でのみ true にする。管理者↔生徒の private チャットや
   * 課金・割当など admin 限定 API では false のまま（プライバシー/権限保護）。
   */
  allowAssignedTeacher?: boolean;
}): Promise<NextResponse | null> {
  const { requesterUid, requesterRole, studentUid, studentData } = opts;

  if (requesterRole === "superadmin") return null;
  if (requesterUid === studentUid) return null;
  if (studentData.managedBy === requesterUid) return null;

  // 担当講師による学習データ閲覧 (opt-in)
  if (
    opts.allowAssignedTeacher &&
    requesterRole === "teacher" &&
    Array.isArray(studentData.assignedTeacherIds) &&
    studentData.assignedTeacherIds.includes(requesterUid)
  ) {
    return null;
  }

  // 同じ organization のメンバーかチェック (親 admin / 子 admin 関係)
  // (1) 生徒に organizationId があれば requester の organizationId と一致で許可 (高速パス)
  // (2) 生徒に organizationId が無くても、生徒の managedBy が requester の組織メンバー
  //     (organizations.memberAdminUids) に含まれれば許可 (移行不要な共有)
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const studentOrgId = studentData.organizationId;
      if (studentOrgId) {
        const requesterDoc = await adminDb.doc(`users/${requesterUid}`).get();
        const requesterOrgId = requesterDoc.data()?.organizationId;
        if (requesterOrgId && requesterOrgId === studentOrgId) return null;
      }
      if (studentData.managedBy) {
        const { getOrgMemberAdminUids } = await import("@/lib/api/organization-scope");
        const memberUids = await getOrgMemberAdminUids(adminDb, requesterUid);
        if (memberUids.includes(studentData.managedBy)) return null;
      }
    }
  } catch (err) {
    console.warn("[scopeByOrganization] org check failed:", err);
  }

  return NextResponse.json({ error: "担当外の生徒です" }, { status: 403 });
}

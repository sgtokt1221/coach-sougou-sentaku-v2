import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AdminListItem } from "@/lib/types/admin";
import { logActivity } from "@/lib/firebase/activity-log";

const mockAdmins: AdminListItem[] = [
  {
    uid: "admin_001",
    displayName: "管理者 太郎",
    email: "admin-taro@example.com",
    role: "admin",
    studentCount: 12,
    createdAt: "2025-09-01T00:00:00.000Z",
  },
  {
    uid: "admin_002",
    displayName: "講師 花子",
    email: "teacher-hanako@example.com",
    role: "teacher",
    studentCount: 8,
    createdAt: "2025-10-15T00:00:00.000Z",
  },
  {
    uid: "admin_003",
    displayName: "管理者 次郎",
    email: "admin-jiro@example.com",
    role: "admin",
    studentCount: 5,
    createdAt: "2026-01-10T00:00:00.000Z",
  },
];

export async function GET(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json(mockAdmins);
  }

  try {
    // 管理者 (= admin ロール) のみ取得。 講師は /api/superadmin/teachers で別管理
    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "admin")
      .get();

    // 各 admin の所属塾を解決するため、 organizations を一括取得
    const orgsSnap = await adminDb.collection("organizations").get();
    const orgById = new Map<
      string,
      { name: string; ownerAdminUid: string }
    >();
    for (const orgDoc of orgsSnap.docs) {
      const od = orgDoc.data();
      orgById.set(orgDoc.id, {
        name: od.name ?? "",
        ownerAdminUid: od.ownerAdminUid ?? "",
      });
    }

    const admins: AdminListItem[] = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const studentsSnap = await adminDb!
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "==", doc.id)
          .count()
          .get();
        const orgId =
          typeof data.organizationId === "string" ? data.organizationId : undefined;
        const orgInfo = orgId ? orgById.get(orgId) : undefined;
        return {
          uid: doc.id,
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          role: "admin" as const,
          studentCount: studentsSnap.data().count,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          organizationId: orgId,
          organizationName: orgInfo?.name,
          isOwner: orgInfo ? orgInfo.ownerAdminUid === doc.id : false,
        };
      }),
    );

    return NextResponse.json(admins);
  } catch (err) {
    console.warn("[admins] fetch failed:", err);
    return NextResponse.json(mockAdmins.filter((a) => a.role === "admin"));
  }
}

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const { email, displayName, role, password } = body as {
    email: string;
    displayName: string;
    role: "admin" | "teacher";
    password: string;
  };

  if (!email || !displayName || !role || !password) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (!adminAuth || !adminDb) {
    return NextResponse.json({
      uid: "mock_new_admin",
      email,
      displayName,
      role,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    await adminDb.doc(`users/${userRecord.uid}`).set({
      email,
      displayName,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    void logActivity("student_added", `「${displayName}」を${role === "admin" ? "管理者" : "講師"}として追加しました`, {
      adminName: displayName,
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "作成に失敗しました" },
      { status: 500 }
    );
  }
}

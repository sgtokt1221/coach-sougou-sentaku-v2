import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

/**
 * 既存ユーザーに organizationId を遡及付与する一括移行 (superadmin 限定)。
 *
 * 動作:
 *  - 全 admin (role: "admin") を取得
 *  - admin 自身に organizationId が既にあればスキップ (冪等)
 *  - 無ければ organizations/{newId} を作成
 *    - name: 「塾 {displayName}」 (後で superadmin が編集可)
 *    - ownerAdminUid: admin.uid
 *    - memberAdminUids: [admin.uid]
 *  - その admin が managedBy で持つ全 student / teacher に organizationId 付与
 *  - admin 自身にも organizationId 付与
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  const adminsSnap = await adminDb
    .collection("users")
    .where("role", "==", "admin")
    .get();

  const log: Array<{
    adminUid: string;
    adminName: string;
    orgId?: string;
    studentsUpdated?: number;
    teachersUpdated?: number;
    skipped?: boolean;
    error?: string;
  }> = [];

  for (const adminDoc of adminsSnap.docs) {
    const adminUid = adminDoc.id;
    const adminData = adminDoc.data();
    const adminName = adminData.displayName ?? "(無名)";

    try {
      // 既に organizationId があるならスキップ (冪等)
      if (adminData.organizationId) {
        log.push({
          adminUid,
          adminName,
          orgId: adminData.organizationId,
          skipped: true,
        });
        continue;
      }

      // 組織作成
      const now = new Date().toISOString();
      const orgRef = await adminDb.collection("organizations").add({
        name: `塾 ${adminName}`,
        ownerAdminUid: adminUid,
        memberAdminUids: [adminUid],
        createdAt: now,
      });

      // admin 自身に付与
      await adminDb.doc(`users/${adminUid}`).update({ organizationId: orgRef.id });

      // 担当生徒 / 講師に付与
      const [studentsSnap, teachersSnap] = await Promise.all([
        adminDb.collection("users").where("managedBy", "==", adminUid).where("role", "==", "student").get(),
        adminDb.collection("users").where("managedBy", "==", adminUid).where("role", "==", "teacher").get(),
      ]);

      const batchUpdates: Promise<unknown>[] = [];
      for (const s of studentsSnap.docs) {
        batchUpdates.push(s.ref.update({ organizationId: orgRef.id }));
      }
      for (const t of teachersSnap.docs) {
        batchUpdates.push(t.ref.update({ organizationId: orgRef.id }));
      }
      await Promise.all(batchUpdates);

      log.push({
        adminUid,
        adminName,
        orgId: orgRef.id,
        studentsUpdated: studentsSnap.size,
        teachersUpdated: teachersSnap.size,
      });
    } catch (err) {
      log.push({
        adminUid,
        adminName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const created = log.filter((l) => !l.skipped && !l.error).length;
  const skipped = log.filter((l) => l.skipped).length;
  const failed = log.filter((l) => l.error).length;

  return NextResponse.json({
    summary: { totalAdmins: adminsSnap.size, created, skipped, failed },
    log,
  });
}

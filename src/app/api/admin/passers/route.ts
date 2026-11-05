import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  PASSER_DOCUMENT_TYPES,
  visiblePassers,
} from "@/lib/passers/passer-access";

/**
 * GET /api/admin/passers
 * 呼び出した人が見られる合格者の一覧（同じ塾の管理者・講師、本部は全員）。
 * 名前は同じ塾の人にだけ返す。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  try {
    const passers = await visiblePassers(adminDb, auth);
    const rows = await Promise.all(
      passers.map(async (p) => {
        const [essays, docs] = await Promise.all([
          adminDb!.collection("essays").where("userId", "==", p.uid).count().get(),
          adminDb!
            .collection("documents")
            .where("userId", "==", p.uid)
            .select("type")
            .get(),
        ]);
        return {
          uid: p.uid,
          name: p.name,
          label: p.label,
          passes: p.passes,
          essayCount: essays.data().count,
          documentCount: docs.docs.filter((d) =>
            (PASSER_DOCUMENT_TYPES as readonly string[]).includes(d.get("type"))
          ).length,
        };
      })
    );
    return NextResponse.json({ passers: rows });
  } catch (error) {
    console.error("passers list error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

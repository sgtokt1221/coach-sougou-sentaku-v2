import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  PASSER_DOCUMENT_TYPES,
  loadPasserForCaller,
  passerIso,
} from "@/lib/passers/passer-access";

/**
 * GET /api/admin/passers/[uid]
 * 合格者1人分の小論文と出願書類（志望理由書・自己推薦書）の一覧。読むだけ。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const { uid } = await params;
  try {
    const p = await loadPasserForCaller(adminDb, auth, uid);
    if (p instanceof NextResponse) return p;

    const [essaySnap, docSnap] = await Promise.all([
      adminDb
        .collection("essays")
        .where("userId", "==", uid)
        .orderBy("submittedAt", "desc")
        .select(
          "topic",
          "submittedAt",
          "scores.total",
          "feedback.scoreMaximum",
          "questionContext.questionType",
          "status"
        )
        .get(),
      adminDb.collection("documents").where("userId", "==", uid).get(),
    ]);

    const essays = essaySnap.docs
      .filter((d) => d.get("status") === "reviewed")
      .map((d) => ({
        id: d.id,
        topic: String(d.get("topic") ?? "").split("\n")[0],
        submittedAt: passerIso(d.get("submittedAt")),
        total: d.get("scores.total") ?? null,
        scoreMaximum: d.get("feedback.scoreMaximum") ?? 50,
        questionType: d.get("questionContext.questionType") ?? null,
      }));

    const documents = docSnap.docs
      .map((d) => d.data() as Record<string, unknown> & { type?: string })
      .map((x, i) => ({ x, id: docSnap.docs[i].id }))
      .filter(({ x }) =>
        (PASSER_DOCUMENT_TYPES as readonly string[]).includes(x.type ?? "")
      )
      .map(({ x, id }) => ({
        id,
        type: x.type ?? "",
        universityName: (x.universityName as string) ?? "",
        facultyName: (x.facultyName as string) ?? "",
        status: (x.status as string) ?? "draft",
        versionCount: Array.isArray(x.versions) ? x.versions.length : 0,
        updatedAt: passerIso(x.updatedAt),
      }))
      // 提出版（final）を先に、その中では新しい順
      .sort(
        (a, b) =>
          Number(b.status === "final") - Number(a.status === "final") ||
          String(b.updatedAt).localeCompare(String(a.updatedAt))
      );

    return NextResponse.json({
      uid: p.uid,
      name: p.name,
      label: p.label,
      passes: p.passes,
      essays,
      documents,
    });
  } catch (error) {
    console.error("passer detail error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getOrgMemberAdminUids } from "@/lib/api/organization-scope";
import {
  SUBMISSION_KINDS,
  isSubmissionKind,
  viewedDocId,
  type SubmissionKind,
} from "@/lib/api/submission-kinds";

export const maxDuration = 30;

/** 担当生徒の uid を解決する（生徒一覧APIと同じスコープ規則）。 */
async function resolveStudentIds(
  uid: string,
  role: string,
): Promise<string[]> {
  const ids = new Set<string>();
  if (role === "teacher") {
    const snap = await adminDb!
      .collection("users")
      .where("role", "==", "student")
      .where("assignedTeacherIds", "array-contains", uid)
      .get();
    snap.docs.forEach((d) => ids.add(d.id));
  } else if (role === "superadmin") {
    const snap = await adminDb!
      .collection("users")
      .where("role", "==", "student")
      .get();
    snap.docs.forEach((d) => ids.add(d.id));
  } else {
    const memberUids = await getOrgMemberAdminUids(adminDb!, uid);
    for (let i = 0; i < memberUids.length; i += 30) {
      const part = memberUids.slice(i, i + 30);
      if (part.length === 0) continue;
      const snap = await adminDb!
        .collection("users")
        .where("role", "==", "student")
        .where("managedBy", "in", part)
        .get();
      snap.docs.forEach((d) => ids.add(d.id));
    }
  }
  return Array.from(ids);
}

/**
 * GET /api/admin/unviewed-submissions
 *
 * 呼び出した管理者/講師が「まだ開いていない」提出物の件数を返す。
 * 既読は users/{uid}/viewedSubmissions に閲覧者ごとに記録している。
 *
 * 返り値:
 *   total       全体の未確認件数（サイドバー等のバッジ用）
 *   byStudent   生徒 uid → 件数（生徒一覧の行バッジ用）
 *   ids         種別ごとの未確認 ID 一覧（答案一覧の行マーク用）
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid, role } = auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const [studentIds, viewedSnap] = await Promise.all([
      resolveStudentIds(uid, role),
      adminDb.collection(`users/${uid}/viewedSubmissions`).get(),
    ]);
    const viewed = new Set(viewedSnap.docs.map((d) => d.id));
    if (studentIds.length === 0) {
      return NextResponse.json({ total: 0, byStudent: {}, ids: {} });
    }
    const studentSet = new Set(studentIds);

    const byStudent: Record<string, number> = {};
    const ids: Partial<Record<SubmissionKind, string[]>> = {};

    const add = (kind: SubmissionKind, id: string, studentId: string) => {
      if (viewed.has(viewedDocId(kind, id))) return;
      byStudent[studentId] = (byStudent[studentId] ?? 0) + 1;
      (ids[kind] ??= []).push(id);
    };

    // グローバルコレクション（essays / documents）は userId 一致で拾う
    const globalTasks = (
      ["essay", "document"] as const
    ).map(async (kind) => {
      const col = kind === "essay" ? "essays" : "documents";
      const cfg = SUBMISSION_KINDS[kind];
      // in クエリは30件までなので分割
      for (let i = 0; i < studentIds.length; i += 30) {
        const part = studentIds.slice(i, i + 30);
        const snap = await adminDb!
          .collection(col)
          .where("userId", "in", part)
          .get()
          .catch(() => null);
        if (!snap) continue;
        for (const d of snap.docs) {
          const data = d.data();
          if (cfg.countable && !cfg.countable(data)) continue;
          const sid = data.userId as string;
          if (!studentSet.has(sid)) continue;
          add(kind, d.id, sid);
        }
      }
    });

    // 生徒配下のサブコレクション
    const subKinds = (
      Object.keys(SUBMISSION_KINDS) as SubmissionKind[]
    ).filter((k) => SUBMISSION_KINDS[k].subcollection);
    const subTasks = studentIds.map(async (sid) => {
      await Promise.all(
        subKinds.map(async (kind) => {
          const cfg = SUBMISSION_KINDS[kind];
          const snap = await adminDb!
            .collection(`users/${sid}/${cfg.subcollection}`)
            .get()
            .catch(() => null);
          if (!snap) return;
          for (const d of snap.docs) {
            const data = d.data();
            if (cfg.countable && !cfg.countable(data)) continue;
            add(kind, d.id, sid);
          }
        }),
      );
    });

    await Promise.all([...globalTasks, ...subTasks]);

    const total = Object.values(byStudent).reduce((a, b) => a + b, 0);
    return NextResponse.json({ total, byStudent, ids });
  } catch (error) {
    console.error("[unviewed-submissions] failed:", error);
    // バッジは失敗しても本体機能を止めない
    return NextResponse.json({ total: 0, byStudent: {}, ids: {} });
  }
}

/**
 * POST /api/admin/unviewed-submissions
 * body: { kind, id, studentId }
 * 提出物を開いたときに、その1件を自分の既読として記録する。
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    id?: string;
    studentId?: string;
  };
  if (!isSubmissionKind(body.kind) || !body.id) {
    return NextResponse.json({ error: "kind と id が必要です" }, { status: 400 });
  }

  try {
    await adminDb
      .doc(`users/${uid}/viewedSubmissions/${viewedDocId(body.kind, body.id)}`)
      .set({
        kind: body.kind,
        submissionId: body.id,
        studentId: body.studentId ?? null,
        viewedAt: new Date(),
      });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[unviewed-submissions] mark failed:", error);
    return NextResponse.json(
      { error: "既読の記録に失敗しました" },
      { status: 500 },
    );
  }
}

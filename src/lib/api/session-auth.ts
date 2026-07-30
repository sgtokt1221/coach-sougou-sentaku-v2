import { NextResponse } from "next/server";
import type { Session } from "@/lib/types/session";

/**
 * セッション API の認可ロジック (session 系 endpoint 共通)
 *
 * 許可条件 (OR):
 *  - role === "superadmin"
 *  - session.teacherId === auth.uid              （担当講師本人）
 *  - session.createdByAdminId === auth.uid        （作成者本人）
 *  - role === "admin" かつ session が自塾(組織)のもの（管理者は自塾内なら常に代行可）
 *  - users/{session.studentId}.managedBy === auth.uid（その生徒の担当）
 *
 * ※ 管理者の代行は「自塾(organization)内」に限定する。越境(他塾のセッション)は
 *   マルチテナント保護のため不可。判定は createdByAdminId / 生徒の managedBy が
 *   自塾の admin メンバーに含まれるかで行う（sessions 一覧 GET の組織スコープと同基準）。
 */
export async function assertSessionAccess(
  adminDb: FirebaseFirestore.Firestore,
  session: Session,
  auth: { uid: string; role: string },
): Promise<NextResponse | null> {
  if (auth.role === "superadmin") return null;
  if (session.teacherId === auth.uid) return null;
  if (session.createdByAdminId === auth.uid) return null;

  // 管理者は自塾(組織)のセッションなら常に代行できる。
  if (auth.role === "admin") {
    try {
      const { getOrgMemberAdminUids } = await import("@/lib/api/organization-scope");
      const memberUids = new Set(await getOrgMemberAdminUids(adminDb, auth.uid));
      if (session.createdByAdminId && memberUids.has(session.createdByAdminId)) {
        return null;
      }
      if (session.studentId) {
        const sdoc = await adminDb.doc(`users/${session.studentId}`).get();
        const mb = sdoc.exists ? (sdoc.data()?.managedBy as string | undefined) : undefined;
        if (mb && memberUids.has(mb)) return null;
      }
    } catch {
      // 組織解決に失敗した場合は下の既定判定にフォールバック
    }
  }

  if (!session.studentId) {
    return NextResponse.json(
      { error: "セッションに生徒が紐付いていません" },
      { status: 400 },
    );
  }

  try {
    const userDoc = await adminDb.doc(`users/${session.studentId}`).get();
    if (userDoc.exists && userDoc.data()?.managedBy === auth.uid) return null;
  } catch {
    // fall through to deny
  }

  return NextResponse.json(
    { error: "このセッションへのアクセス権がありません" },
    { status: 403 },
  );
}

/**
 * 欠席回を遡って何件まで飛ばすか。連続欠席が続いても実施回に届くようにするが、
 * 無制限に遡ると読み取り量が増えるので上限を置く。
 */
const PREVIOUS_SESSION_LOOKBACK = 10;

/**
 * 前回セッション取得 (同一生徒で現在より前の、直近の「実施した」回)。
 *
 * 欠席回 (status: "cancelled") は飛ばす。授業が行われていないので debrief が無く、
 * これを「前回」として扱うと次回授業に前回の内容が引き継がれない:
 *   - previous-debrief が null を返し、反省点・次回議題が表示されない
 *   - generate-plan が前回情報なしで台本を作る
 *   - session-artifacts の抽出範囲が欠席回で切れ、欠席回より前に生徒が提出した
 *     小論文・書類が一度も授業で扱われないまま次回の材料から落ちる
 * 欠席した分の内容は、その次に実施する授業へ持ち越すのが運用上正しい。
 *
 * Firestore は範囲条件と別フィールドの不等号を併用できないため、数件取って
 * JS 側で絞る。
 */
export async function getPreviousSession(
  adminDb: FirebaseFirestore.Firestore,
  studentId: string,
  currentScheduledAt: string,
): Promise<Session | null> {
  const { session } = await getPreviousSessionWithAbsences(
    adminDb,
    studentId,
    currentScheduledAt,
  );
  return session;
}

/**
 * getPreviousSession と同じ検索をしつつ、飛ばした欠席回の件数も返す。
 *
 * 引き継ぎ元が直前の回でなくなるため、画面で「間に欠席が N 回あります」と
 * 伝えるのに使う。件数は同じクエリ結果から数えるので追加の読み取りは発生せず、
 * 新しい複合インデックスも要らない。
 */
export async function getPreviousSessionWithAbsences(
  adminDb: FirebaseFirestore.Firestore,
  studentId: string,
  currentScheduledAt: string,
): Promise<{
  session: Session | null;
  skippedAbsences: number;
  /** 飛ばした欠席回のうち、準備してあった台本が残っているもの（新しい順） */
  missedSessions: Session[];
}> {
  try {
    const snap = await adminDb
      .collection("sessions")
      .where("studentId", "==", studentId)
      .where("scheduledAt", "<", currentScheduledAt)
      .orderBy("scheduledAt", "desc")
      .limit(PREVIOUS_SESSION_LOOKBACK)
      .get();
    if (snap.empty)
      return { session: null, skippedAbsences: 0, missedSessions: [] };
    const sessions = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Session,
    );
    const attendedIndex = sessions.findIndex((s) => s.status !== "cancelled");
    // 実施回に当たるまでの欠席回。ここに準備済みの台本が残っていれば未消化の内容。
    const absentRange =
      attendedIndex < 0 ? sessions : sessions.slice(0, attendedIndex);
    const missedSessions = absentRange.filter(
      (s) => s.prepPlan || (s.theme ?? "").trim().length > 0,
    );
    if (attendedIndex < 0) {
      // 遡れる範囲すべてが欠席。引き継ぐ debrief は無いが、未消化の台本は返す
      // (直前の欠席回を session として返すと debrief 無しの回が「前回」になる)。
      return { session: null, skippedAbsences: sessions.length, missedSessions };
    }
    return {
      session: sessions[attendedIndex],
      skippedAbsences: attendedIndex,
      missedSessions,
    };
  } catch (err) {
    console.warn("[session-auth] getPreviousSession failed:", err);
    return { session: null, skippedAbsences: 0, missedSessions: [] };
  }
}

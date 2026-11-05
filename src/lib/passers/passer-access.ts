/**
 * 合格者答案（管理者・本部）の読み取りの規則。
 *
 * 合格者 = users/{uid}/examResults に status "passed" が1件以上ある生徒。
 * 見られるのは同じ塾の管理者・講師と本部だけ（判定は scopeByOrganization と同じ）。
 * 名前は同じ塾の人にだけ出し、それ以外（本部の横断表示）は「合格者A」のように伏せる。
 * 合格者でない生徒は、同じ塾でもここからは読ませない（404）。
 */
import { NextResponse } from "next/server";
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { scopeByOrganization } from "@/lib/api/auth";

export interface PasserPass {
  universityName: string;
  facultyName: string;
  /** 合格を登録した日（ISO） */
  registeredAt: string | null;
}

export interface PasserIdentity {
  uid: string;
  /** 同じ塾の人が見るときだけ入る */
  name: string | null;
  /** 名前を伏せるときの呼び名（合格者A など） */
  label: string;
  passes: PasserPass[];
}

function toIso(v: unknown): string | null {
  const t = v as { toDate?: () => Date } | string | null | undefined;
  const d =
    t && typeof t === "object" && typeof t.toDate === "function"
      ? t.toDate()
      : t
        ? new Date(t as string)
        : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

/** 合格者の uid → 合格の一覧（合格を最初に登録した日の古い順） */
export async function listPassers(db: Firestore): Promise<Map<string, PasserPass[]>> {
  // 等号の条件を付けないので collection group のインデックスは要らない
  const snap = await db.collectionGroup("examResults").get();
  const map = new Map<string, PasserPass[]>();
  for (const d of snap.docs) {
    const x = d.data();
    if (x.status !== "passed") continue;
    const uid = d.ref.parent.parent?.id;
    if (!uid) continue;
    map.set(uid, [
      ...(map.get(uid) ?? []),
      {
        universityName: x.universityName ?? "",
        facultyName: x.facultyName ?? "",
        registeredAt: toIso(x.createdAt),
      },
    ]);
  }
  const first = (ps: PasserPass[]) =>
    ps.map((p) => p.registeredAt ?? "9999").sort()[0];
  return new Map([...map.entries()].sort((a, b) => first(a[1]).localeCompare(first(b[1]))));
}

/** 0 → A, 25 → Z, 26 → AA */
function letters(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export interface Caller {
  uid: string;
  role: string;
}

async function callerOrgId(db: Firestore, caller: Caller): Promise<string | null> {
  const d = await db.doc(`users/${caller.uid}`).get();
  const org = d.get("organizationId");
  return typeof org === "string" && org ? org : null;
}

async function canSee(caller: Caller, uid: string, user: DocumentData): Promise<boolean> {
  const denied = await scopeByOrganization({
    requesterUid: caller.uid,
    requesterRole: caller.role,
    studentUid: uid,
    studentData: {
      managedBy: user.managedBy,
      organizationId: user.organizationId,
    },
    allowAssignedTeacher: false,
  });
  return denied === null;
}

/** 呼び出した人が見られる合格者（呼び名は全合格者の中の順番で決まる） */
export async function visiblePassers(
  db: Firestore,
  caller: Caller
): Promise<Array<PasserIdentity & { user: DocumentData }>> {
  const passers = await listPassers(db);
  const myOrg = await callerOrgId(db, caller);
  const out: Array<PasserIdentity & { user: DocumentData }> = [];
  let i = 0;
  for (const [uid, passes] of passers) {
    const label = `合格者${letters(i++)}`;
    const snap = await db.doc(`users/${uid}`).get();
    if (!snap.exists) continue;
    const user = snap.data()!;
    if (!(await canSee(caller, uid, user))) continue;
    const sameOrg = !!myOrg && user.organizationId === myOrg;
    out.push({
      uid,
      name: sameOrg ? (user.displayName ?? "") : null,
      label,
      passes,
      user,
    });
  }
  return out;
}

/** 1人分。合格者でなければ 404、見られなければ 403 */
export async function loadPasserForCaller(
  db: Firestore,
  caller: Caller,
  uid: string
): Promise<(PasserIdentity & { user: DocumentData }) | NextResponse> {
  const passers = await listPassers(db);
  const idx = [...passers.keys()].indexOf(uid);
  if (idx < 0) {
    return NextResponse.json({ error: "合格者が見つかりません" }, { status: 404 });
  }
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "合格者が見つかりません" }, { status: 404 });
  }
  const user = snap.data()!;
  if (!(await canSee(caller, uid, user))) {
    return NextResponse.json({ error: "担当外の生徒です" }, { status: 403 });
  }
  const myOrg = await callerOrgId(db, caller);
  return {
    uid,
    name: myOrg && user.organizationId === myOrg ? (user.displayName ?? "") : null,
    label: `合格者${letters(idx)}`,
    passes: passers.get(uid)!,
    user,
  };
}

/** 出願書類のうち合格者答案で見せる種類 */
export const PASSER_DOCUMENT_TYPES = ["志望理由書", "自己推薦書"] as const;

export { toIso as passerIso };

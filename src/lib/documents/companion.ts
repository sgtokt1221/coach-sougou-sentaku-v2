/**
 * 志望理由書と自己推薦書の組（2026-11-27）。
 *
 * 同じ学部に両方を出す生徒の2通は、役割を分けて書く必要がある。没案もあるので、
 * 組にするのは生徒が「提出予定」にした書類どうし。組は保存せず、毎回ここで引く。
 * 提出予定は同じ学部・同じ種類で1通だけ（付け替えると前の印は外れる）。
 */
import { adminDb } from "@/lib/firebase/admin";

export const COMPANION_TYPE: Record<string, string> = {
  志望理由書: "自己推薦書",
  自己推薦書: "志望理由書",
};

/** 組の相手として使う本文の最低字数（書きかけの数行は比べない） */
const MIN_COMPANION_CHARS = 100;

export interface CompanionDocument {
  id: string;
  type: string;
  title: string;
  content: string;
}

/**
 * 同じ学部の、もう一方の種類の提出予定の書類。無ければ null。
 * 生徒の書類は数件なので userId だけで読み、残りはメモリで絞る（既存の一覧と同じクエリ）。
 */
export async function findCompanionDocument(params: {
  uid: string;
  universityId: unknown;
  facultyId: unknown;
  type: unknown;
  excludeId?: string;
}): Promise<CompanionDocument | null> {
  const otherType = typeof params.type === "string" ? COMPANION_TYPE[params.type] : undefined;
  if (!adminDb || !otherType) return null;
  if (typeof params.universityId !== "string" || typeof params.facultyId !== "string") return null;
  const snap = await adminDb.collection("documents").where("userId", "==", params.uid).get();
  for (const d of snap.docs) {
    if (d.id === params.excludeId) continue;
    const x = d.data();
    if (
      x.submissionPlanned === true &&
      x.type === otherType &&
      x.universityId === params.universityId &&
      x.facultyId === params.facultyId &&
      typeof x.content === "string" &&
      x.content.trim().length >= MIN_COMPANION_CHARS
    ) {
      return {
        id: d.id,
        type: otherType,
        title: typeof x.title === "string" && x.title ? x.title : otherType,
        content: x.content,
      };
    }
  }
  return null;
}

/**
 * 提出予定を付け外しする。付けるときは、同じ学部・同じ種類のほかの書類の印を同じトランザクションで外す。
 * 持ち主の確認は呼び出し側で済ませていること。
 */
export async function setSubmissionPlanned(
  uid: string,
  docId: string,
  planned: boolean
): Promise<void> {
  if (!adminDb) throw new Error("データベース接続エラー");
  const db = adminDb;
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`documents/${docId}`);
    const target = await tx.get(ref);
    const t = target.data();
    if (!t || t.userId !== uid) throw new Error("書類が見つかりません");
    const siblings = planned
      ? (await tx.get(db.collection("documents").where("userId", "==", uid))).docs.filter((d) => {
          const x = d.data();
          return (
            d.id !== docId &&
            x.submissionPlanned === true &&
            x.type === t.type &&
            x.universityId === t.universityId &&
            x.facultyId === t.facultyId
          );
        })
      : [];
    for (const s of siblings) tx.update(s.ref, { submissionPlanned: false });
    tx.update(ref, { submissionPlanned: planned });
  });
}

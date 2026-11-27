/**
 * 同じ学部に出す書類のセット（2026-11-27、独自書類を含めて一般化）。
 *
 * 同じ学部に複数の書類を出す生徒の書類は、役割を分けて書く必要がある。没案もあるので、
 * セットにするのは生徒が「提出予定」にした書類どうし。セットは保存せず、毎回ここで引く。
 * 提出予定は同じ学部・同じ枠（submissionSlotKey。独自書類は名前ごと）で1通だけ。
 */
import { adminDb } from "@/lib/firebase/admin";
import {
  documentTypeLabel,
  normalizeDocumentQuestion,
  submissionSlotKey,
} from "./kind";

/** セットの相手として使う本文の最低字数（書きかけの数行は比べない） */
const MIN_SET_CHARS = 100;
/** 並べる相手の最大数（自分を入れて4通） */
export const MAX_SET_OTHERS = 3;

export interface SetDocument {
  id: string;
  /** 生の種類（志望理由書 / 自己推薦書 / 独自書類 …） */
  type: string;
  /** 表示名（独自書類は生徒が付けた名前） */
  name: string;
  title: string;
  content: string;
  /** 募集要項の設問。空ならキーごと無い */
  question?: string;
}

const TYPE_ORDER: Record<string, number> = { 志望理由書: 0, 自己推薦書: 1 };

/**
 * 同じ学部の、ほかの枠の提出予定の書類（最大 MAX_SET_OTHERS 通）。無ければ空配列。
 * 自分と同じ枠は入れない（提出予定でない別案などと全文が重なって見えるため）。
 * 生徒の書類は数件なので userId だけで読み、残りはメモリで絞る（既存の一覧と同じクエリ）。
 */
export async function findSubmissionSet(params: {
  uid: string;
  universityId: unknown;
  facultyId: unknown;
  type: unknown;
  customName?: unknown;
  excludeId?: string;
}): Promise<SetDocument[]> {
  if (!adminDb) return [];
  if (typeof params.universityId !== "string" || typeof params.facultyId !== "string") return [];
  const ownSlot = submissionSlotKey({ type: params.type, customName: params.customName });
  const snap = await adminDb.collection("documents").where("userId", "==", params.uid).get();
  const found: { doc: SetDocument; createdAt: string }[] = [];
  for (const d of snap.docs) {
    if (d.id === params.excludeId) continue;
    const x = d.data();
    if (
      x.submissionPlanned !== true ||
      x.universityId !== params.universityId ||
      x.facultyId !== params.facultyId ||
      typeof x.type !== "string" ||
      submissionSlotKey(x) === ownSlot ||
      typeof x.content !== "string" ||
      x.content.trim().length < MIN_SET_CHARS
    ) {
      continue;
    }
    const name = documentTypeLabel(x);
    const question = normalizeDocumentQuestion(x.question);
    found.push({
      doc: {
        id: d.id,
        type: x.type,
        name,
        title: typeof x.title === "string" && x.title ? x.title : name,
        content: x.content,
        ...(question ? { question } : {}),
      },
      createdAt: typeof x.createdAt === "string" ? x.createdAt : "",
    });
  }
  found.sort(
    (a, b) =>
      (TYPE_ORDER[a.doc.type] ?? 2) - (TYPE_ORDER[b.doc.type] ?? 2) ||
      a.createdAt.localeCompare(b.createdAt)
  );
  return found.slice(0, MAX_SET_OTHERS).map((f) => f.doc);
}

/**
 * 提出予定を付け外しする。付けるときは、同じ学部・同じ枠のほかの書類の印を同じトランザクションで外す。
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
            submissionSlotKey(x) === submissionSlotKey(t) &&
            x.universityId === t.universityId &&
            x.facultyId === t.facultyId
          );
        })
      : [];
    for (const s of siblings) tx.update(s.ref, { submissionPlanned: false });
    tx.update(ref, { submissionPlanned: planned });
  });
}

/**
 * 面接官と採点に渡す、受験生の提出書類。
 *
 * 本番の面接は提出した書類をもとに深掘りされ、書類と答えが食い違うと
 * そこを突かれる。以前は採点に書類を渡しておらず、食い違いを指摘できなかった。
 *
 * 提出する書類は1通とは限らない（志望理由書＋自己推薦書など）。生徒が面接の
 * 開始画面で選んだ書類を渡し、どの書類の話かが分かるようにタイトルも付ける
 * （2026-10-07）。選ばれなかったときだけ、志望校の書類から自動で1通選ぶ。
 */
import { defaultDocumentTitle } from "@/lib/documents/title";
import { MAX_INTERVIEW_DOCUMENTS } from "./document-limit";

/** 1通あたりの上限（採点・面接官の入力を膨らませない） */
const MAX_CHARS_PER_DOCUMENT = 2000;

type DocData = FirebaseFirestore.DocumentData;

function titleOf(d: DocData): string {
  return (
    (typeof d.title === "string" && d.title.trim()) ||
    defaultDocumentTitle(d.universityName ?? "", d.facultyName ?? "", d.type ?? "")
  );
}

/**
 * 面接官・採点に渡す形。どの書類かが分かるようにタイトルと種類を付ける。
 * 見出しを【】にすると、本文に残った「【原体験を入力】」と区別が付かないので、
 * 1通ずつ <document> で囲む。
 */
function formatDocuments(docs: DocData[]): string {
  const attr = (v: string) => v.replace(/["<>]/g, "");
  return docs
    .map(
      (d) =>
        `<document title="${attr(titleOf(d))}" type="${attr(String(d.type ?? ""))}">\n` +
        `${String(d.content).slice(0, MAX_CHARS_PER_DOCUMENT)}\n</document>`
    )
    .join("\n");
}

function hasBody(d: DocData): boolean {
  return typeof d.content === "string" && d.content.trim().length >= 100;
}

/**
 * 生徒が選んだ書類を読む。本人の書類だけを使い、本文が無いものは除く。
 * 空の配列は「渡さない」を選んだという意味なので、空文字を返す。
 */
export async function loadSelectedDocumentsForInterview(
  db: FirebaseFirestore.Firestore,
  userId: string,
  documentIds: string[]
): Promise<string> {
  const ids = [...new Set(documentIds.filter((id) => typeof id === "string" && id))].slice(
    0,
    MAX_INTERVIEW_DOCUMENTS
  );
  if (ids.length === 0) return "";
  const snaps = await Promise.all(ids.map((id) => db.doc(`documents/${id}`).get()));
  const docs = snaps
    .map((s) => s.data())
    .filter((d): d is DocData => !!d && d.userId === userId && hasBody(d));
  return formatDocuments(docs);
}

/** 選ばれなかったときの自動選択。志望校の志望理由書・自己推薦書から1通 */
export async function loadStatementForInterview(
  db: FirebaseFirestore.Firestore,
  userId: string,
  universityId: string,
  facultyId: string
): Promise<string> {
  if (!universityId) return "";
  const snap = await db.collection("documents").where("userId", "==", userId).get();
  const candidates = snap.docs
    .map((d) => d.data())
    .filter(
      (d) =>
        d.universityId === universityId &&
        (d.type === "志望理由書" || d.type === "自己推薦書") &&
        hasBody(d)
    )
    // 完成した書類 → 同じ学部 → 新しい順。新しさだけで選ぶと、空欄入りの下書きが
    // 完成版より先に選ばれる（エミュレータで【原体験を入力】の下書きが渡った）
    .sort((a, b) => {
      const sa = a.status === "final" ? 0 : 1;
      const sb = b.status === "final" ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const fa = a.facultyId === facultyId ? 0 : 1;
      const fb = b.facultyId === facultyId ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
    });
  const doc = candidates[0];
  return doc ? formatDocuments([doc]) : "";
}

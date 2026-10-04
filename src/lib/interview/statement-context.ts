/**
 * 面接の採点に渡す、その志望校向けの志望理由書。
 *
 * 本番の面接は提出した書類をもとに深掘りされ、書類と答えが食い違うと
 * そこを突かれる。以前は採点に書類を渡しておらず、食い違いを指摘できなかった。
 */

/** 長すぎる書類は先頭だけ渡す（採点の入力を膨らませない） */
const MAX_CHARS = 2000;

export async function loadStatementForInterview(
  db: FirebaseFirestore.Firestore,
  userId: string,
  universityId: string,
  facultyId: string
): Promise<string> {
  if (!universityId) return "";
  const snap = await db
    .collection("documents")
    .where("userId", "==", userId)
    .get();
  const candidates = snap.docs
    .map((d) => d.data())
    .filter(
      (d) =>
        d.universityId === universityId &&
        (d.type === "志望理由書" || d.type === "自己推薦書") &&
        typeof d.content === "string" &&
        d.content.trim().length >= 100
    )
    // 同じ学部の書類を先に、その中で新しい順
    .sort((a, b) => {
      const fa = a.facultyId === facultyId ? 0 : 1;
      const fb = b.facultyId === facultyId ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
    });
  const doc = candidates[0];
  if (!doc) return "";
  return `【${doc.type}】\n${String(doc.content).slice(0, MAX_CHARS)}`;
}

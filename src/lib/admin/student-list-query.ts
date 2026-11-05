/**
 * 生徒一覧の絞り込みと並べ替え（サーバーと画面で共用する純関数）。
 *
 * 以前は検索欄の1文字ごとにサーバーへ投げ直し、そのたびに全生徒の答案・面接・
 * 宿題などを読み直していた。一覧は1回だけ取得し、絞り込み・並べ替えは手元で行う。
 * API の search/sort/university/rank 引数は互換のために残し、同じ関数を通す。
 */
import type { StudentListItem } from "@/lib/types/admin";

export interface StudentListQuery {
  search?: string | null;
  sort?: string | null;
  order?: string | null;
  university?: string | null;
  rank?: string | null;
}

const RANK_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

export function filterAndSortStudents(
  students: StudentListItem[],
  q: StudentListQuery
): StudentListItem[] {
  let filtered = students;
  if (q.search) {
    const s = q.search.toLowerCase();
    filtered = filtered.filter(
      (x) =>
        x.displayName.toLowerCase().includes(s) ||
        x.email.toLowerCase().includes(s)
    );
  }
  if (q.university) {
    filtered = filtered.filter((x) => x.targetUniversities.includes(q.university!));
  }
  if (q.rank) {
    filtered = filtered.filter((x) => x.currentSkillRank === q.rank);
  }
  const sort = q.sort || "lastActivity";
  const order = q.order || "desc";
  return [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sort === "score") {
      cmp = (a.latestScore ?? -1) - (b.latestScore ?? -1);
    } else if (sort === "name") {
      cmp = a.displayName.localeCompare(b.displayName, "ja");
    } else if (sort === "rank" || sort === "interviewRank") {
      const field = sort === "interviewRank" ? "currentInterviewRank" : "currentSkillRank";
      const aRank = a[field] ? RANK_ORDER[a[field] as string] : 99;
      const bRank = b[field] ? RANK_ORDER[b[field] as string] : 99;
      cmp = aRank - bRank;
    } else {
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      cmp = aTime - bTime;
    }
    return order === "asc" ? cmp : -cmp;
  });
}

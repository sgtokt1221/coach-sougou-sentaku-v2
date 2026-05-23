"use client";

import { useAuthSWR } from "@/lib/api/swr";
import type { HomeworkAssignment } from "@/lib/types/homework";

/**
 * サイドバーの「宿題」リンクに表示する未提出件数バッジ。
 * 0 件なら何も表示しない (Sidebar が null を空表示扱いするため)。
 */
export function HomeworkBadge() {
  const { data } = useAuthSWR<HomeworkAssignment[]>("/api/student/homework");
  const count = data?.length ?? 0;
  if (count === 0) return null;
  return (
    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {count}
    </span>
  );
}

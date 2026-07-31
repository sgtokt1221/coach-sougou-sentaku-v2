"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAuthSWR } from "@/lib/api/swr";
import type { SubmissionKind } from "@/lib/api/submission-kinds";

export interface UnviewedSubmissionsData {
  total: number;
  /** 生徒 uid → 未確認件数 */
  byStudent: Record<string, number>;
  /** 種別ごとの未確認 ID */
  ids: Partial<Record<SubmissionKind, string[]>>;
}

/**
 * 自分がまだ開いていない提出物の件数。
 * サイドバー・下部ナビ・生徒一覧で同じキーを使い、SWR キャッシュを共有する。
 */
export function useUnviewedSubmissions(enabled = true) {
  const { data, mutate } = useAuthSWR<UnviewedSubmissionsData>(
    enabled ? "/api/admin/unviewed-submissions" : null,
    { refreshInterval: 60000 },
  );
  return { data, mutate };
}

/** サイドバーの「通知」に出す未確認件数バッジ。 */
export function UnviewedSubmissionsBadge() {
  const { data } = useUnviewedSubmissions();
  const count = data?.total ?? 0;
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** 生徒一覧の行に出す未確認件数バッジ。 */
export function StudentUnviewedBadge({ studentId }: { studentId: string }) {
  const { data } = useUnviewedSubmissions();
  const count = data?.byStudent?.[studentId] ?? 0;
  if (count === 0) return null;
  return (
    <span
      title="まだ開いていない提出物"
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

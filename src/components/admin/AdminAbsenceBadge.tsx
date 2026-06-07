"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAuthSWR } from "@/lib/api/swr";
import type { Session } from "@/lib/types/session";

/**
 * AdminAbsenceBadge - 今後の予定で生徒が欠席連絡したセッション数のバッジ。
 * Sidebar の admin「セッション」ナビ右側に表示（プッシュ通知に依存しない気づき用）。
 */
export function AdminAbsenceBadge() {
  const { data } = useAuthSWR<Session[]>("/api/sessions?status=cancelled", {
    refreshInterval: 60000,
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const count = Array.isArray(data)
    ? data.filter(
        (s) =>
          s.absenceReportedBy === "student" &&
          new Date(s.scheduledAt).getTime() >= startOfToday.getTime()
      ).length
    : 0;

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

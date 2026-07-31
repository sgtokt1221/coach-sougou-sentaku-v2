"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAuthSWR } from "@/lib/api/swr";

/**
 * FeedbackBadge - 未読フィードバック数を赤い丸バッジで表示
 * Sidebar のフィードバックナビアイテム右側に配置する
 */
export function FeedbackBadge() {
  const { data } = useAuthSWR<{ unreadCount: number }>(
    "/api/student/feedback?countOnly=true",
    { refreshInterval: 60000 }
  );

  const count = data?.unreadCount ?? 0;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold leading-none tabular-nums text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAuthSWR } from "@/lib/api/swr";

/**
 * AdminMessagesBadge - コーチ宛の未読メッセージ数バッジ。
 * Sidebar の「メッセージ」ナビ右側に表示する。
 */
export function AdminMessagesBadge() {
  const { data } = useAuthSWR<{ unreadCount: number }>(
    "/api/admin/messages?countOnly=true",
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
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAuthSWR } from "@/lib/api/swr";

interface TeacherStudentUnread {
  unreadByTeacher?: number;
}

/**
 * TeacherMessagesBadge - 講師のメッセージ未読数バッジ（統合）。
 * 「管理者に連絡」の未読 + 担当生徒スレッドの未読を合算して表示する。
 * Sidebar の「メッセージ」ナビ右側に表示する。
 */
export function TeacherMessagesBadge() {
  const { data: adminData } = useAuthSWR<{ unreadCount: number }>(
    "/api/teacher/feedback?countOnly=true",
    { refreshInterval: 60000 }
  );
  const { data: students } = useAuthSWR<TeacherStudentUnread[]>(
    "/api/teacher/students",
    { refreshInterval: 60000 }
  );

  const studentUnread = (students ?? []).reduce(
    (sum, s) => sum + (s.unreadByTeacher ?? 0),
    0
  );
  const count = (adminData?.unreadCount ?? 0) + studentUnread;

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

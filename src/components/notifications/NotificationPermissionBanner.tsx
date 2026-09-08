"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  requestNotificationPermission,
  saveFcmToken,
} from "@/lib/firebase/messaging";

export function NotificationPermissionBanner() {
  const { user, userProfile } = useAuth();
  // 何が届くかは立場で違う。生徒向けの文言をスタッフに出すと自分事にならない
  const isStaff =
    userProfile?.role === "admin" ||
    userProfile?.role === "teacher" ||
    userProfile?.role === "superadmin";
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    const dismissed = sessionStorage.getItem("notification-banner-dismissed");
    if (dismissed) return;
    // SSR との食い違いを避けつつ、effect 内の同期 setState にもしない
    const t = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const token = await requestNotificationPermission();
      if (token && user) {
        const idToken = await user.getIdToken();
        await saveFcmToken(idToken, token);
        toast.success("通知を有効にしました");
      }
    } catch (e) {
      // 黙って閉じると「有効にしたつもり」のまま届かない。失敗は見せる
      toast.error(
        e instanceof Error ? e.message : "通知の有効化に失敗しました"
      );
    }
    setVisible(false);
    setRequesting(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("notification-banner-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="border-primary/20 from-primary/5 to-primary/10 relative rounded-xl border bg-gradient-to-r p-4">
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground absolute top-2 right-2 rounded-md p-1 transition-colors"
        aria-label="閉じる"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
          <Bell className="text-primary size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold">
            通知を有効にしませんか？
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {isStaff
              ? "生徒からの返信や出欠の連絡を、開いていないときにもお知らせします"
              : "書類の提出期限やセッションのリマインダーをお知らせします"}
          </p>
          <button
            onClick={handleEnable}
            disabled={requesting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Bell className="size-3.5" />
            {requesting ? "設定中..." : "通知を有効にする"}
          </button>
        </div>
      </div>
    </div>
  );
}

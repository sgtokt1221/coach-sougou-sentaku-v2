"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestNotificationPermission, saveFcmToken } from "@/lib/firebase/messaging";

export function NotificationPermissionBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    const dismissed = sessionStorage.getItem("notification-banner-dismissed");
    if (dismissed) return;
    setVisible(true);
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const token = await requestNotificationPermission();
      if (token && user) {
        const idToken = await user.getIdToken();
        await saveFcmToken(idToken, token);
      }
    } catch {
      // Silently handle - user may have denied
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
    <div className="relative rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label="閉じる"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Bell className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            通知を有効にしませんか？
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            書類の提出期限やセッションのリマインダーをお知らせします
          </p>
          <button
            onClick={handleEnable}
            disabled={requesting}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Bell className="size-3.5" />
            {requesting ? "設定中..." : "通知を有効にする"}
          </button>
        </div>
      </div>
    </div>
  );
}

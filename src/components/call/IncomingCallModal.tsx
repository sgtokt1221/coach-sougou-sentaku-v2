"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIncomingCall } from "@/lib/hooks/useIncomingCall";

/**
 * 着信モーダル。AppLayout に置いて全画面共通で鳴らす。
 *
 * アプリを開いている間は Firestore の購読で確実に出る。プッシュ通知は
 * アプリを閉じているときの補助（iOS は PWA でないと届かない）。
 *
 * 位置と z-index は FloatingStudentChat に合わせている（下部ナビ z-50 より上）。
 */
export function IncomingCallModal() {
  const { user } = useAuth();
  const router = useRouter();
  const call = useIncomingCall(user?.uid);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  if (!mounted || !call) return null;

  const others = call.participants?.filter((p) => p.uid !== user?.uid) ?? [];
  const isGroup = call.participantUids.length > 2;

  async function accept() {
    if (!call) return;
    setBusy(true);
    router.push(`/call/${call.id}`);
  }

  async function decline() {
    if (!call) return;
    setBusy(true);
    try {
      await authFetch(`/api/calls/${call.id}/decline`, { method: "POST" });
    } catch (err) {
      console.warn("[IncomingCallModal] decline failed", err);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={call.id}
        initial={shouldReduceMotion ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -16 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        role="dialog"
        aria-label="着信"
        className="bg-card fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 z-[70] w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border p-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>{getInitials(call.hostName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{call.hostName}</p>
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Video className="size-3" />
              {isGroup
                ? `グループ通話（${call.participantUids.length}人）`
                : "ビデオ通話の呼び出し"}
            </p>
          </div>
        </div>

        {isGroup && others.length > 0 && (
          <p className="text-muted-foreground mt-2 truncate text-xs">
            {others.map((p) => p.name).join("、")}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={decline}
          >
            <PhoneOff className="size-4" />
            断る
          </Button>
          <Button className="flex-1" disabled={busy} onClick={accept}>
            <Phone className="size-4" />
            参加する
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

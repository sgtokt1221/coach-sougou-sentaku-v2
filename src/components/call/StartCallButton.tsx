"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { isLiveKitConfiguredClient } from "@/lib/livekit/client-config";

/**
 * チャット画面から通話を始めるボタン。
 *
 * PC では各ページのヘッダ行に置く。スマホでは ChatThread の composerAccessory に
 * compact で渡し、入力欄の並びに出す（見出しの右端は親指が届きにくい）。
 * 発信できるのは管理者と講師だけ（サーバ側でも requireRole で弾く）。
 */
export function StartCallButton({
  participantUids,
  sessionId,
  label = "通話",
  compact = false,
  className,
}: {
  participantUids: string[];
  /** セッションから始めた通話に紐づける。あとで記録を辿るのに使う */
  sessionId?: string;
  label?: string;
  /** アイコンだけの小さいボタンにする（入力欄の並びに置くとき） */
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // 鍵が入っていない環境ではボタン自体を出さない
  if (!isLiveKitConfiguredClient()) return null;

  async function start() {
    setBusy(true);
    try {
      const res = await authFetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantUids,
          ...(sessionId ? { sessionId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.callId) {
        toast.error(data.error ?? "通話を開始できませんでした");
        return;
      }
      router.push(`/call/${data.callId}`);
    } catch (err) {
      console.warn("[StartCallButton] start failed", err);
      toast.error("通話を開始できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size={compact ? "icon" : "sm"}
      variant={compact ? "ghost" : "outline"}
      className={className}
      disabled={busy || participantUids.length === 0}
      onClick={start}
      aria-label="ビデオ通話を開始"
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Video className="size-4" />
      )}
      {!compact && label}
    </Button>
  );
}

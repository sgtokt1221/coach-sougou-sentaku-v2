"use client";

import { useState } from "react";
import { Circle, Loader2, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import type { Call } from "@/lib/types/call";

/**
 * 録画の操作と状態表示。
 *
 * 押した瞬間には録り始めない。参加者の同意がそろってから始まる。
 * 録画中は全員に赤い表示を出す（録られていることを隠さない）。
 */
export function RecordingBar({
  call,
  isHost,
}: {
  call: Call;
  isHost: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const rec = call.recording;
  const status = rec?.status;

  async function send(action: "request" | "stop") {
    setBusy(true);
    try {
      const res = await authFetch(`/api/calls/${call.id}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "録画を操作できませんでした");
      }
    } catch (err) {
      console.warn("[RecordingBar] action failed", err);
      toast.error("録画を操作できませんでした");
    } finally {
      setBusy(false);
    }
  }

  // 録画中は全員に見せる
  if (status === "recording") {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1.5">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-70" />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-xs font-medium text-red-500">録画中</span>
        {isHost && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            disabled={busy}
            onClick={() => send("stop")}
          >
            <Square className="size-3" />
            停止
          </Button>
        )}
      </div>
    );
  }

  if (status === "processing") {
    return (
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3 animate-spin" />
        録画を保存しています
      </span>
    );
  }

  if (!isHost) return null;

  if (status === "awaiting_consent") {
    return (
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3 animate-spin" />
        録画の同意を待っています
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => send("request")}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Circle className="size-4 fill-red-500 text-red-500" />
        )}
        録画
      </Button>
      {status === "declined" && (
        <span className="text-muted-foreground text-xs">
          同意が得られなかったため録画していません
        </span>
      )}
      {status === "failed" && (
        <span className="text-xs text-red-500">
          {rec?.error ?? "録画に失敗しました"}
        </span>
      )}
    </div>
  );
}

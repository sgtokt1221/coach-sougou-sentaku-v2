"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CallRoom } from "@/components/call/CallRoom";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CallView } from "@/lib/types/call";

/**
 * 通話ページ。役割を問わず同じ URL を開く。
 *
 * /student/ 配下に置かないのは、管理者と講師も同じページに来るため。
 * 認可はサーバ側の participantUids で行うので、パスでは分けない。
 */
export default function CallPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [call, setCall] = useState<CallView | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/calls/${callId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "通話を開けませんでした");
          return;
        }
        setCall(data.call as CallView);
      } catch (err) {
        console.warn("[CallPage] load failed", err);
        if (!cancelled) setError("通話を開けませんでした");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callId, user, authLoading]);

  if (authLoading || (!call && !error)) {
    return (
      <div className="flex h-dvh items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-muted-foreground text-sm">読み込み中...</span>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <p className="text-sm font-medium">{error || "通話が見つかりません"}</p>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-black">
      <CallRoom call={call} isHost={call.hostUid === user?.uid} />
    </div>
  );
}

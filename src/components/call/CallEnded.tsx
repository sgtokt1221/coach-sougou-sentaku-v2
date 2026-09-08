"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PhoneOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import type { Call, CallView } from "@/lib/types/call";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${String(s).padStart(2, "0")}秒`;
}

/**
 * 通話が終わったあとの画面。録画があれば講師・管理者だけが再生できる。
 *
 * 再生URLはこの画面から都度取りに行く。通話ドキュメントには URL を
 * 置いていない（参加者全員が Firestore から直接読めるため）。
 */
export function CallEnded({ call }: { call: Call | CallView }) {
  const router = useRouter();
  const rec = (call as Call).recording;
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "denied" | "none">("idle");

  // 停止直後は書き出し中。done になるまで数十秒かかることがある
  const processing = rec?.status === "processing";
  // 取得中かどうかは state を増やさずに導く（effect 内で同期 setState しない）
  const loading = rec?.status === "done" && !url && state === "idle";

  useEffect(() => {
    if (rec?.status !== "done") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/calls/${call.id}/recording`);
        if (cancelled) return;
        if (res.status === 403) {
          setState("denied");
          return;
        }
        if (!res.ok) {
          setState("none");
          return;
        }
        const data = await res.json();
        if (!data.url) {
          setState("none");
          return;
        }
        setUrl(data.url);
      } catch (err) {
        console.warn("[CallEnded] recording fetch failed", err);
        if (!cancelled) setState("none");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call.id, rec?.status]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <PhoneOff className="text-muted-foreground size-8" />
      <p className="text-sm font-medium text-white">通話を終了しました</p>

      {processing && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Loader2 className="size-3 animate-spin" />
          録画を保存しています。しばらくすると見られるようになります
        </p>
      )}

      {loading && (
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
      )}

      {rec?.status === "done" && state === "denied" && (
        <p className="text-muted-foreground text-xs">
          この通話は録画されました。録画は担当の講師と管理者が確認します
        </p>
      )}

      {url && (
        <div className="w-full max-w-2xl">
          <video src={url} controls className="w-full rounded-lg border" />
          <p className="text-muted-foreground mt-1 text-xs">
            録画
            {rec?.durationSec ? `・${formatDuration(rec.durationSec)}` : ""}
          </p>
        </div>
      )}

      {rec?.status === "failed" && (
        <p className="text-xs text-red-400">
          {rec.error ?? "録画に失敗しました"}
        </p>
      )}

      {rec?.status === "done" && state === "none" && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Play className="size-3" />
          録画を取得できませんでした
        </p>
      )}

      <Button variant="outline" onClick={() => router.back()}>
        戻る
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";

interface StatusResponse {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

function GoogleBrandIcon() {
  // Google 公式 G ロゴ (ブランドガイドライン準拠)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      className="size-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2581h2.9087c1.7018-1.5668 2.6832-3.874 2.6832-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8618-3.0477.8618-2.344 0-4.3282-1.5832-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1731 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

export function GoogleCalendarIntegration() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, mutate, isLoading } = useAuthSWR<StatusResponse>(
    "/api/admin/google/status",
  );
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connectedMsg = searchParams.get("google_connected") === "1";
  const errorMsg = searchParams.get("google_error");

  const handleConnect = () => {
    window.location.href = "/api/admin/google/connect";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await authFetch("/api/admin/google/disconnect", { method: "POST" });
      await mutate();
      setDisconnectOpen(false);
    } catch (err) {
      console.error(err);
      alert("連携解除に失敗しました");
    } finally {
      setDisconnecting(false);
    }
  };

  const connected = data?.connected === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="size-4 text-teal-600" />
          Google Calendar 連携
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectedMsg && !errorMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            連携が完了しました
          </div>
        )}
        {errorMsg && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            連携に失敗しました ({errorMsg})
          </div>
        )}

        {isLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        ) : connected ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {data?.email ?? "連携済み"}
                </div>
                {data?.connectedAt && (
                  <div className="text-xs text-muted-foreground">
                    連携日: {new Date(data.connectedAt).toLocaleDateString("ja-JP")}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisconnectOpen(true)}
              className="cursor-pointer text-muted-foreground hover:text-destructive"
            >
              連携を解除
            </Button>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                連携すると以下が自動化されます:
              </p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>セッション作成と同時に Google Calendar にイベント追加</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Google Meet リンクの自動生成</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>生徒の Calendar にもゲスト招待で自動同期</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={handleConnect}
              variant="outline"
              className="gap-3 bg-white text-gray-900 border-gray-300 hover:bg-gray-50 dark:bg-white dark:text-gray-900 cursor-pointer"
            >
              <GoogleBrandIcon />
              Continue with Google
            </Button>
            <p className="text-[11px] text-muted-foreground">
              解除はいつでも可能 · スコープは Calendar events のみ
            </p>
          </>
        )}
      </CardContent>

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>連携を解除しますか?</DialogTitle>
            <DialogDescription>
              Google Calendar との連携を解除します。既に作成済みの Calendar イベントは残ります。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectOpen(false)}
              disabled={disconnecting}
              className="cursor-pointer"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="cursor-pointer bg-rose-500 hover:bg-rose-600 text-white"
            >
              {disconnecting && <Loader2 className="mr-1 size-4 animate-spin" />}
              解除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

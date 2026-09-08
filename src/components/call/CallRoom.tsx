"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import type { CallView } from "@/lib/types/call";

/** 接続に失敗しても諦めるまでの回数 */
const MAX_CONNECT_ATTEMPTS = 3;

type Phase = "loading" | "connecting" | "connected" | "ended" | "error";

interface TokenResponse {
  token?: string;
  url?: string;
  error?: string;
}

/**
 * 通話の画面。
 *
 * トークンは入室時にだけ使う。リロードすると取り直す（有効期限10分）。
 * ルーム名はサーバが通話ドキュメントから決めるので、ここでは扱わない。
 */
export function CallRoom({
  call,
  isHost,
}: {
  call: CallView;
  isHost: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [token, setToken] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const attemptsRef = useRef(0);

  const fetchToken = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await authFetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.id }),
      });
      const data = (await res.json()) as TokenResponse;
      if (!res.ok || !data.token || !data.url) {
        setMessage(data.error ?? "通話に接続できませんでした");
        setPhase("error");
        return;
      }
      setToken(data.token);
      setServerUrl(data.url);
      setPhase("connecting");
    } catch (err) {
      console.warn("[CallRoom] token fetch failed", err);
      setMessage("通話に接続できませんでした");
      setPhase("error");
    }
  }, [call.id]);

  useEffect(() => {
    if (call.status === "ended") {
      setPhase("ended");
      return;
    }
    void fetchToken();
  }, [call.status, fetchToken]);

  const leave = useCallback(async () => {
    // 発信者が抜けたら通話ごと終わらせる。参加者はただ抜けるだけ
    if (isHost) {
      try {
        await authFetch(`/api/calls/${call.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ended" }),
        });
      } catch (err) {
        console.warn("[CallRoom] end call failed", err);
      }
    }
    setPhase("ended");
  }, [call.id, isHost]);

  if (phase === "ended") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <PhoneOff className="text-muted-foreground size-8" />
        <p className="text-sm font-medium">通話を終了しました</p>
        <Button variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-medium">{message}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            戻る
          </Button>
          <Button onClick={() => void fetchToken()}>もう一度試す</Button>
        </div>
      </div>
    );
  }

  if (phase === "loading" || !token || !serverUrl) {
    return (
      <div className="flex h-full items-center justify-center gap-2 p-6">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-muted-foreground text-sm">
          通話に接続しています...
        </span>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video
      audio
      // 画面いっぱいに広げる。data-lk-theme は LiveKit の既定スタイル
      data-lk-theme="default"
      className="h-full"
      onConnected={() => {
        attemptsRef.current = 0;
        setPhase("connected");
      }}
      onDisconnected={() => void leave()}
      onError={(err) => {
        attemptsRef.current += 1;
        console.warn("[CallRoom] room error", err);
        if (attemptsRef.current >= MAX_CONNECT_ATTEMPTS) {
          setMessage("接続が不安定です。もう一度おかけ直しください");
          setPhase("error");
        }
      }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}

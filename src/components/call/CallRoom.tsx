"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { useCallRealtime } from "@/lib/hooks/useCallRealtime";
import { CallEnded } from "@/components/call/CallEnded";
import { RecordingBar } from "@/components/call/RecordingBar";
import { RecordingConsentModal } from "@/components/call/RecordingConsentModal";
import type { Call, CallView } from "@/lib/types/call";

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
  viewerUid,
}: {
  call: CallView;
  isHost: boolean;
  viewerUid?: string;
}) {
  const router = useRouter();
  /**
   * 録画の同意要求と録画中の表示は、通話中に相手側から降ってくる。
   * 入室時に一度読んだ call だけでは追えないので実時間で購読する。
   */
  const { call: live } = useCallRealtime(call.id);
  const current: Call | CallView = live ?? call;
  const [phase, setPhase] = useState<Phase>("loading");
  const [token, setToken] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const attemptsRef = useRef(0);

  /**
   * トークンを取り直す。初回は phase の初期値が "loading" なので、
   * ここで同期に setState しない（effect 内の同期更新を避ける）。
   */
  const fetchToken = useCallback(async () => {
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

  /**
   * 相手が終了させた場合も含め、終了は通話ドキュメントから導く。
   * ここで setPhase すると effect 内の同期更新になるので状態は増やさない。
   */
  const ended = phase === "ended" || current.status === "ended";

  useEffect(() => {
    if (call.status === "ended") return;
    // トークン取得はサーバーとの同期そのもの（effect の本来の用途）。
    // 状態更新はすべて await の後に起きるが、静的解析では追えないため個別に外す。
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (ended) {
    // 録画の書き出しは通話が終わってから進むので、購読中の最新を渡す
    return <CallEnded call={current} />;
  }

  if (phase === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-medium">{message}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            戻る
          </Button>
          <Button
            onClick={() => {
              setPhase("loading");
              void fetchToken();
            }}
          >
            もう一度試す
          </Button>
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

  const rec = (current as Call).recording;
  const needsConsent =
    !isHost &&
    rec?.status === "awaiting_consent" &&
    viewerUid !== undefined &&
    rec.consent?.[viewerUid] === undefined;

  return (
    <>
      {needsConsent && (
        <RecordingConsentModal
          callId={call.id}
          requestedAt={rec?.requestedAt}
          hostName={call.hostName}
        />
      )}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3 py-2">
        <RecordingBar call={current as Call} isHost={isHost} />
      </div>
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
    </>
  );
}

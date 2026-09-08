"use client";

import { useEffect, useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import { CALL_CONSENT_TIMEOUT_SEC } from "@/lib/types/call";

/**
 * 録画の同意を求める画面。
 *
 * 既存の授業録音の案内（StudentRecordingJoinModal）は「マイクの音声のみ・
 * カメラ映像は記録されません」と書いてあり、映像を録るこの機能には使えない。
 * 何が記録され、誰が見るのかを具体的に書く。
 *
 * 返事をしないまま時間が過ぎたら録画は始まらない（サーバ側で未同意として扱う）。
 */
export function RecordingConsentModal({
  callId,
  requestedAt,
  hostName,
}: {
  callId: string;
  requestedAt?: string;
  hostName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [remain, setRemain] = useState<number | null>(null);

  useEffect(() => {
    if (!requestedAt) return;
    const asked = new Date(requestedAt).getTime();
    if (!Number.isFinite(asked)) return;
    const tick = () => {
      const left = Math.ceil(
        (asked + CALL_CONSENT_TIMEOUT_SEC * 1000 - Date.now()) / 1000
      );
      setRemain(left > 0 ? left : 0);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [requestedAt]);

  async function answer(granted: boolean) {
    setBusy(true);
    try {
      await authFetch(`/api/calls/${callId}/recording/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ granted }),
      });
    } catch (err) {
      console.warn("[RecordingConsentModal] answer failed", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card w-[min(26rem,100%)] rounded-2xl border p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <Video className="text-primary size-5" />
          <h2 className="text-base font-bold">この通話を録画します</h2>
        </div>

        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {hostName} さんが録画を始めようとしています。
          <br />
          録画されるのは<strong className="text-foreground">
            通話中の映像と音声
          </strong>
          です。指導の記録として、担当の講師と教室の管理者だけが見ます。
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          断っても通話は続けられます。全員の同意がそろわなければ録画は始まりません。
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => answer(false)}
          >
            録画しない
          </Button>
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() => answer(true)}
          >
            同意する
          </Button>
        </div>

        {remain !== null && (
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            {remain > 0
              ? `あと ${remain} 秒で自動的に「録画しない」になります`
              : "時間切れです。録画は始まりません"}
          </p>
        )}
      </div>
    </div>
  );
}

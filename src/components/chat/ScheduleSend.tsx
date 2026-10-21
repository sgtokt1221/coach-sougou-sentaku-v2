"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { stripRichText } from "@/lib/chat/rich-text";
import type { ScheduledFeedback } from "@/lib/types/feedback";

/** datetime-local の値（端末の時刻、秒なし） */
function toLocalInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 初期値は30分以上先の、次のちょうどの時刻 */
function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d);
}

export function formatScheduledAt(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 予約時刻を選ぶ行。ポップオーバーにしないのは、FB のモーダル（modal={false}）の
 * 中で使うと、外へ描かれた部品を押した時点で「外側クリック」として閉じるため。
 */
export function ScheduleTimeRow({
  busy,
  disabled,
  onConfirm,
  onClose,
}: {
  busy: boolean;
  disabled?: boolean;
  /** ISO（UTC）で渡す */
  onConfirm: (scheduledAtIso: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(defaultScheduleValue);
  const now = new Date();
  const max = new Date(now.getTime() + 30 * 86400_000);
  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5">
      <Clock className="text-muted-foreground size-4 shrink-0" />
      <Input
        type="datetime-local"
        value={value}
        min={toLocalInputValue(now)}
        max={toLocalInputValue(max)}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-auto min-w-0 flex-1 text-base sm:text-sm"
      />
      <Button
        type="button"
        size="sm"
        disabled={busy || disabled || !value}
        onClick={() => onConfirm(new Date(value).toISOString())}
      >
        {busy && <Loader2 className="mr-1 size-3 animate-spin" />}
        予約する
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8"
        onClick={onClose}
        aria-label="予約をやめる"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function scheduledFeedbackKey(studentId: string, targetId?: string) {
  return `/api/admin/students/${studentId}/feedback/scheduled${
    targetId ? `?targetId=${encodeURIComponent(targetId)}` : ""
  }`;
}

/**
 * 予約一覧を読み直す（targetId 付き・無しの両方）。
 * キャッシュは SwrCacheProvider が持つので、swr から直接 import した mutate では
 * 届かない（黙って何も起きない）。必ず useSWRConfig の mutate を使う。
 */
export function useRefreshScheduledFeedback() {
  const { mutate } = useSWRConfig();
  return (studentId: string) => {
    const prefix = scheduledFeedbackKey(studentId);
    return mutate(
      (key) => typeof key === "string" && key.startsWith(prefix),
      undefined,
      { revalidate: true }
    );
  };
}

/** コーチ→生徒の送信。scheduledAt を付けると予約になる。失敗時はサーバーの文で投げる */
export async function postCoachFeedback(
  studentId: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await authFetch(`/api/admin/students/${studentId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "送信に失敗しました");
  }
}

/** 送信待ちの予約。取り消せる */
export function ScheduledFeedbackList({
  studentId,
  targetId,
}: {
  studentId: string;
  targetId?: string;
}) {
  const key = scheduledFeedbackKey(studentId, targetId);
  const { data, mutate: reload } = useAuthSWR<ScheduledFeedback[]>(key);
  const [canceling, setCanceling] = useState<string | null>(null);
  const refresh = useRefreshScheduledFeedback();

  if (!data || data.length === 0) return null;

  async function cancel(id: string) {
    setCanceling(id);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/feedback/scheduled/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "取り消せませんでした");
      }
      await refresh(studentId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取り消せませんでした");
      void reload();
    } finally {
      setCanceling(null);
    }
  }

  return (
    <div className="space-y-1">
      {data.map((s) => (
        <div
          key={s.id}
          className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs"
        >
          <Clock className="text-primary size-3.5 shrink-0" />
          <span className="text-primary shrink-0 font-medium">
            {formatScheduledAt(s.scheduledAt)}
          </span>
          <span className="text-muted-foreground min-w-0 flex-1 truncate">
            {stripRichText(s.message).trim() ||
              s.reference?.label ||
              (s.attachments?.length ? "[添付ファイル]" : "")}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            disabled={canceling === s.id}
            onClick={() => cancel(s.id)}
            aria-label="予約を取り消す"
          >
            {canceling === s.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <X className="size-3" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { AlertTriangle, Check, Cloud, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DraftSyncStatus } from "@/hooks/usePersistentDraft";

interface DraftSaveIndicatorProps {
  status: DraftSyncStatus;
  restored?: boolean;
  lastSavedAt?: Date | null;
  onSaveNow?: () => void;
  className?: string;
}

export function DraftSaveIndicator({
  status,
  restored = false,
  lastSavedAt,
  onSaveNow,
  className = "",
}: DraftSaveIndicatorProps) {
  const time = lastSavedAt?.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const content =
    status === "loading"
      ? { Icon: Loader2, text: "下書きを確認中", iconClass: "animate-spin" }
      : status === "saving"
        ? { Icon: Loader2, text: "途中保存中...", iconClass: "animate-spin" }
        : status === "error"
          ? {
              Icon: AlertTriangle,
              text: "クラウド同期に失敗（入力はこの端末に保存されます）",
              iconClass: "text-amber-600",
            }
          : restored
            ? {
                Icon: Cloud,
                text: "前回の続きから再開しました",
                iconClass: "text-teal-600",
              }
            : status === "saved"
              ? {
                  Icon: Check,
                  text: time ? `${time} に自動保存済み` : "自動保存済み",
                  iconClass: "text-emerald-600",
                }
              : {
                  Icon: Cloud,
                  text: "入力内容は自動保存されます",
                  iconClass: "",
                };

  return (
    <div
      className={`text-muted-foreground flex min-h-8 flex-wrap items-center justify-between gap-2 text-xs ${className}`}
      aria-live="polite"
    >
      <span className="flex items-center gap-1.5">
        <content.Icon className={`size-3.5 ${content.iconClass}`} />
        {content.text}
      </span>
      {onSaveNow && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          onClick={onSaveNow}
          disabled={status === "loading" || status === "saving"}
        >
          <Save className="size-3.5" />
          今すぐ保存
        </Button>
      )}
    </div>
  );
}

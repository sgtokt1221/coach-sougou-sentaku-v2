"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

type BannerState = "recording" | "uploading" | "done" | "error";

interface Props {
  state: BannerState;
  durationSec: number;
  errorMessage?: string;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StudentRecordingBanner({
  state,
  durationSec,
  errorMessage,
}: Props) {
  if (state === "recording") {
    return (
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-rose-200 bg-rose-50/90 backdrop-blur px-4 py-2 text-sm dark:border-rose-900 dark:bg-rose-950/50">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-rose-500" />
        </span>
        <span className="font-medium text-rose-800 dark:text-rose-200">
          授業録音中
        </span>
        <span className="font-mono tabular-nums text-rose-700 dark:text-rose-300">
          {formatTime(durationSec)}
        </span>
      </div>
    );
  }
  if (state === "uploading") {
    return (
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-amber-200 bg-amber-50/90 backdrop-blur px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/50">
        <Loader2 className="size-4 animate-spin text-amber-600" />
        <span className="text-amber-800 dark:text-amber-200">
          録音をアップロード中...
        </span>
      </div>
    );
  }
  if (state === "done") {
    return (
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-emerald-200 bg-emerald-50/90 backdrop-blur px-4 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/50">
        <CheckCircle2 className="size-4 text-emerald-600" />
        <span className="text-emerald-800 dark:text-emerald-200">
          授業録音ありがとうございました
        </span>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-rose-200 bg-rose-50/90 backdrop-blur px-4 py-2 text-sm dark:border-rose-900 dark:bg-rose-950/50">
        <span className="text-rose-800 dark:text-rose-200">
          録音アップロードに失敗: {errorMessage ?? "不明なエラー"}
        </span>
      </div>
    );
  }
  return null;
}

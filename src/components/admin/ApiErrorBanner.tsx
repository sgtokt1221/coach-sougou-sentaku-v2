"use client";

import { AlertTriangle } from "lucide-react";
import type { ApiError } from "@/lib/api/swr";

interface Props {
  /** useAuthSWR の error または同様の Error。null/undefined なら何も描画しない */
  error: ApiError | Error | undefined | null;
  /** 見出し。「〇〇の取得に失敗しました」など */
  title?: string;
}

/**
 * admin 画面共通の API エラー表示バナー。
 *
 * `useAuthSWR` から返るエラーオブジェクトをそのまま渡せば、サーバー側で
 * 付与された `detail` (発生メッセージ) と `step` (失敗段階) を画面に
 * 表示する。データなし状態と区別して「データ取得に失敗したのか / 元から
 * データがないのか」を読み取れるようにするのが目的。
 */
export function ApiErrorBanner({
  error,
  title = "データの取得に失敗しました",
}: Props) {
  if (!error) return null;
  const apiError = error as ApiError;
  const detail = apiError.detail ?? apiError.message;
  const step = apiError.step;
  return (
    <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-destructive">
        <AlertTriangle className="size-3.5" />
        {title}
      </p>
      <p className="break-all text-destructive/90">
        {step ? `[${step}] ` : ""}
        {detail}
      </p>
    </div>
  );
}

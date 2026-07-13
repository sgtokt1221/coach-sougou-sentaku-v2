"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PageHeader の props。
 */
export interface PageHeaderProps {
  /** ページタイトル。長い大学名・生徒名でも truncate される。 */
  title: ReactNode;
  /** タイトル下の補足説明。 */
  description?: ReactNode;
  /** タイトル左に表示するアイコン。 */
  icon?: ReactNode;
  /** 戻るボタンの押下ハンドラ。指定時のみ戻るボタンを表示。 */
  backAction?: () => void;
  /** タイトル右（モバイルでは下）に表示する操作領域。 */
  actions?: ReactNode;
  /** 説明の下に表示するメタ情報（バッジ等）。 */
  meta?: ReactNode;
  /** 余白・フォントを詰めた高密度表示にする。 */
  compact?: boolean;
}

/**
 * レスポンシブなページ見出し。
 *
 * モバイルはタイトル行と操作行を縦積み、`sm` 以上で横並びにする。
 * タイトル領域は `min-w-0` + `truncate` で長い名称でもレイアウトを崩さない。
 * 戻るボタンはモバイルで 44px タップ領域を確保し、`lg` 以上で通常密度に戻す。
 *
 * @param props - {@link PageHeaderProps}
 */
export function PageHeader({
  title,
  description,
  icon,
  backAction,
  actions,
  meta,
  compact,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        compact && "mb-3 gap-2",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {backAction && (
          <Button
            variant="ghost"
            size="icon"
            onClick={backAction}
            aria-label="戻る"
            className="min-h-11 min-w-11 shrink-0 lg:min-h-9 lg:min-w-9"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}
        {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h1
            className={cn(
              "truncate text-xl font-bold lg:text-2xl",
              compact && "text-lg lg:text-xl",
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          )}
          {meta && <div className="mt-1">{meta}</div>}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

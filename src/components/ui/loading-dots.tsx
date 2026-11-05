import { cn } from "@/lib/utils";

/**
 * 3つの点が順に跳ねる、小さな読み込み表示（送信中のボタン・AIが書いている吹き出し）。
 * 色は文字色を引き継ぐ（ボタンの中では白、吹き出しの中では緑など）。
 * 動きを減らす設定では globals.css の prefers-reduced-motion で止まる。
 */
export function LoadingDots({
  className,
  label = "読み込み中",
}: {
  className?: string;
  /** 読み上げ用 */
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <span className="loading-dot size-1.5 rounded-full bg-current" />
      <span className="loading-dot size-1.5 rounded-full bg-current [animation-delay:0.15s]" />
      <span className="loading-dot size-1.5 rounded-full bg-current [animation-delay:0.3s]" />
    </span>
  );
}

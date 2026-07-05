"use client";

import { cn } from "@/lib/utils";

const PRESETS = [400, 600, 800, 1200, 2000];

/**
 * 小論文の字数制限セレクタ（数値入力＋プリセット）。
 * テキスト/画像/音声の各提出フローで共通利用し、設定字数を採点(定量評価)に反映させる。
 */
export function CharLimitSelector({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">字数制限</span>
        <input
          type="number"
          min={50}
          max={5000}
          step={50}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isFinite(n)) return;
            onChange(Math.min(5000, Math.max(50, n)));
          }}
          className="w-20 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-muted-foreground">字</span>
      </div>
      <div className="flex items-center gap-1">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`cursor-pointer rounded border px-2 py-1 text-xs transition-colors ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

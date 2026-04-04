"use client";

import type { Payload } from "recharts/types/component/DefaultTooltipContent";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Payload<number, string>[];
  label?: string;
}

export function CustomTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 shadow-lg backdrop-blur-md">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={String(entry.dataKey ?? i)} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium" style={{ color: entry.color }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

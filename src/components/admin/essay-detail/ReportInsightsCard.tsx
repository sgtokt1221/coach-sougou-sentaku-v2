"use client";

import { sourceEngagementLabel } from "@/lib/essay/source-engagement";
import type { ReportInsights } from "@/lib/types/essay";

/**
 * レポート課題の読み取り（課題文への触れ方と誤読）。生徒の結果画面は札だけなので、
 * 管理画面では根拠と誤読まで出して、先生が添削の妥当性を確かめられるようにする。
 */
export function ReportInsightsCard({ insights }: { insights: ReportInsights }) {
  const misreadings = (insights.misreadings ?? []).filter((m) => m.trim());
  if (!insights.engagementLevel && misreadings.length === 0) return null;
  return (
    <div className="bg-muted grid gap-3 rounded-xl p-4">
      {insights.engagementLevel && (
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-xs font-bold">
            <span className="text-muted-foreground">課題文への触れ方</span>
            <span className="bg-background rounded-full px-2.5 py-0.5">
              {sourceEngagementLabel(insights.engagementLevel)}
            </span>
          </p>
          {insights.engagementBasis && (
            <p className="text-sm leading-relaxed">
              {insights.engagementBasis}
            </p>
          )}
        </div>
      )}
      {misreadings.length > 0 && (
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs font-bold">誤読</p>
          {misreadings.map((m) => (
            <p key={m} className="text-sm leading-relaxed">
              {m}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

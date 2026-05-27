"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Mic, Award, Layers } from "lucide-react";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";

interface WeaknessTopChartProps {
  weaknesses: WeaknessRecord[];
}

interface WeaknessChartData {
  area: string;
  count: number;
  source: "essay" | "interview" | "skill_check" | "interview_skill_check" | "lesson" | "both";
  severity: "critical" | "warning" | "improving" | "resolved" | null;
}

/**
 * source別の色 + アイコン マッピング
 */
const SOURCE_META: Record<
  string,
  { color: string; bg: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  essay: { color: "#0ea5e9", bg: "bg-sky-500", label: "小論文", icon: FileText },
  interview: { color: "#6366f1", bg: "bg-indigo-500", label: "面接", icon: Mic },
  skill_check: { color: "#10b981", bg: "bg-emerald-500", label: "スキルチェック", icon: Award },
  both: { color: "#8b5cf6", bg: "bg-violet-500", label: "複数", icon: Layers },
};

/**
 * 重点弱点 Top 5 表示。
 *
 * BarChart を撤去して div ベースのランキングリストに変更。
 * 旧実装は recharts Tooltip が画面右端で見切れて弱点名 (= 長文) が
 * 読めない問題があった。 新実装は弱点名を **常時 全文表示** し、
 * 横棒は count の比率バーとして横に並べる。 ホバー不要で一目で
 * 内容と件数が分かる。
 */
export function WeaknessTopChart({ weaknesses }: WeaknessTopChartProps) {
  // 未解決弱点のみフィルタ → count降順ソート → Top5
  const unresolvedWeaknesses = weaknesses.filter((w) => !w.resolved);
  const sortedWeaknesses = unresolvedWeaknesses.sort((a, b) => b.count - a.count);
  const top5 = sortedWeaknesses.slice(0, 5);
  const remainingCount = Math.max(0, unresolvedWeaknesses.length - 5);

  const chartData: WeaknessChartData[] = top5.map((w) => ({
    area: w.area,
    count: w.count,
    source: w.source,
    severity: getWeaknessReminderLevel(w),
  }));

  const maxCount = Math.max(1, ...chartData.map((d) => d.count));

  if (unresolvedWeaknesses.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            重点弱点 Top 5
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            現在、未解決弱点はありません
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4" />
          重点弱点 Top 5
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {chartData.map((item, idx) => {
            const meta = SOURCE_META[item.source] ?? SOURCE_META.both;
            const Icon = meta.icon;
            const ratio = (item.count / maxCount) * 100;
            return (
              <li key={`${item.area}-${idx}`} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <p className="break-words text-sm leading-snug">{item.area}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <Icon className="size-3 text-muted-foreground" />
                    <span className="tabular-nums">{item.count}回</span>
                  </div>
                </div>
                <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${meta.bg} transition-all`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* 残りの弱点数表示 */}
        {remainingCount > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-center text-sm text-muted-foreground">
              他 {remainingCount} 件の弱点があります
            </p>
          </div>
        )}

        {/* 出所別凡例 */}
        <div className="mt-3 border-t pt-3">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {Object.entries(SOURCE_META).map(([key, m]) => (
              <div key={key} className="flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-sm"
                  style={{ backgroundColor: m.color }}
                />
                {m.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

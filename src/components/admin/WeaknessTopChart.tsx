"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  FileText,
  Mic,
  Award,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";
import {
  WEAKNESS_GROUP_LABELS,
  WEAKNESS_GROUP_ORDER,
  weaknessDescriptionOf,
  weaknessGroupOf,
  type WeaknessGroupKey,
} from "@/lib/growth/weakness-taxonomy";

interface WeaknessTopChartProps {
  weaknesses: WeaknessRecord[];
}

/** カテゴリ別 + 出所別の色マッピング */
const CATEGORY_COLORS: Record<WeaknessGroupKey, { bg: string; hex: string }> = {
  structure: { bg: "bg-sky-500", hex: "#0ea5e9" },
  logic: { bg: "bg-indigo-500", hex: "#6366f1" },
  expression: { bg: "bg-emerald-500", hex: "#10b981" },
  apAlignment: { bg: "bg-amber-500", hex: "#f59e0b" },
  responsiveness: { bg: "bg-teal-500", hex: "#14b8a6" },
  originality: { bg: "bg-violet-500", hex: "#8b5cf6" },
  reasoningMaturity: { bg: "bg-rose-500", hex: "#f43f5e" },
  other: { bg: "bg-slate-400", hex: "#94a3b8" },
  interview: { bg: "bg-fuchsia-500", hex: "#d946ef" },
};

const SOURCE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  essay: FileText,
  interview: Mic,
  skill_check: Award,
  both: Layers,
};

interface CategoryGroup {
  category: WeaknessGroupKey;
  label: string;
  totalCount: number;
  items: WeaknessRecord[];
}

/**
 * 重点弱点 表示。
 *
 * カテゴリ (= essay 5 軸 + その他) 単位で集計し、 ホバー / 展開で
 * 内部の個別弱点リストが見える。 細分化問題への対策:
 * - 個別弱点が「具体性の欠如」 「具体例の不足」 等で文言違い重複しても
 *   同じ「表現力」 カテゴリに集約されて Top 5 (= 上位 6 カテゴリ) で
 *   全体傾向が一目で見える
 * - 展開すれば個別弱点も全部見える (= 粒度も保持)
 *
 * 分類は weaknessGroupOf()（小論文は層、面接の弱点 iv.* は「面接」に分ける）。
 * 文言だけで分類し直すと「反対意見への配慮」等が「その他」に落ちていた。
 */
export function WeaknessTopChart({ weaknesses }: WeaknessTopChartProps) {
  const [expanded, setExpanded] = useState<Set<WeaknessGroupKey>>(new Set());

  const groups: CategoryGroup[] = useMemo(() => {
    const unresolved = weaknesses.filter((w) => !w.resolved);
    const byCategory = new Map<WeaknessGroupKey, WeaknessRecord[]>();
    for (const w of unresolved) {
      const cat = weaknessGroupOf(w);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(w);
    }

    return WEAKNESS_GROUP_ORDER.flatMap<CategoryGroup>((cat) => {
      const items = byCategory.get(cat) ?? [];
      if (items.length === 0) return [];
      const total = items.reduce((s, w) => s + (w.count ?? 1), 0);
      // 内部は count 降順 → declined / 重要度高い順
      const sorted = [...items].sort((a, b) => (b.count ?? 1) - (a.count ?? 1));
      return [
        {
          category: cat,
          label: WEAKNESS_GROUP_LABELS[cat],
          totalCount: total,
          items: sorted,
        },
      ];
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [weaknesses]);

  const unresolvedCount = weaknesses.filter((w) => !w.resolved).length;

  if (unresolvedCount === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            重点弱点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
            現在、 未解決弱点はありません
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCategoryCount = Math.max(1, ...groups.map((g) => g.totalCount));

  const toggle = (cat: WeaknessGroupKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4" />
          重点弱点 (カテゴリ別)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {groups.map((g) => {
            const color = CATEGORY_COLORS[g.category];
            const ratio = (g.totalCount / maxCategoryCount) * 100;
            const isOpen = expanded.has(g.category);
            return (
              <li key={g.category}>
                <button
                  type="button"
                  onClick={() => toggle(g.category)}
                  className="hover:bg-accent w-full rounded-md p-2 text-left transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="text-muted-foreground size-4" />
                      ) : (
                        <ChevronRight className="text-muted-foreground size-4" />
                      )}
                      <span className="text-sm font-medium">{g.label}</span>
                      <span className="text-muted-foreground text-xs">
                        ({g.items.length}項目)
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {g.totalCount}回
                    </span>
                  </div>
                  <div className="bg-muted mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full">
                    <div
                      className={`h-full ${color.bg} transition-all`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <ul className="mt-1 ml-6 space-y-1.5 border-l pl-3 text-xs">
                    {g.items.map((w, idx) => {
                      const SourceIcon = SOURCE_ICONS[w.source] ?? Layers;
                      const severity = getWeaknessReminderLevel(w);
                      const description =
                        w.description || weaknessDescriptionOf(w);
                      return (
                        <li
                          key={`${w.area}-${idx}`}
                          className="flex items-start justify-between gap-2 rounded p-1.5"
                        >
                          <div className="flex min-w-0 items-start gap-1.5">
                            <SourceIcon className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                            <div className="min-w-0">
                              <span className="leading-snug break-words">
                                {w.area}
                              </span>
                              {description && (
                                <p className="text-muted-foreground text-[11px] leading-snug">
                                  {description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 tabular-nums ${
                              severity === "critical"
                                ? "font-semibold text-rose-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {w.count ?? 1}回
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-3 border-t pt-3">
          <div className="text-muted-foreground flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
            {WEAKNESS_GROUP_ORDER.map((k) => (
              <div key={k} className="flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[k].hex }}
                />
                {WEAKNESS_GROUP_LABELS[k]}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-center text-[10px]">
            未解決 {unresolvedCount} 件の弱点を {groups.length} カテゴリに集約
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

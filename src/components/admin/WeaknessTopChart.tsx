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
  categorizeWeakness,
  ESSAY_CATEGORY_LABELS,
  ESSAY_CATEGORY_ORDER,
  type EssayCategoryKey,
} from "@/lib/growth/weakness-category";

interface WeaknessTopChartProps {
  weaknesses: WeaknessRecord[];
}

/** カテゴリ別 + 出所別の色マッピング */
const CATEGORY_COLORS: Record<EssayCategoryKey, { bg: string; hex: string }> = {
  structure: { bg: "bg-sky-500", hex: "#0ea5e9" },
  logic: { bg: "bg-indigo-500", hex: "#6366f1" },
  expression: { bg: "bg-emerald-500", hex: "#10b981" },
  apAlignment: { bg: "bg-amber-500", hex: "#f59e0b" },
  originality: { bg: "bg-violet-500", hex: "#8b5cf6" },
  reasoningMaturity: { bg: "bg-rose-500", hex: "#f43f5e" },
  other: { bg: "bg-slate-400", hex: "#94a3b8" },
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
  category: EssayCategoryKey;
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
 * 既存の categorizeWeakness() を再利用 (= データ層変更なし)。
 */
export function WeaknessTopChart({ weaknesses }: WeaknessTopChartProps) {
  const [expanded, setExpanded] = useState<Set<EssayCategoryKey>>(new Set());

  const groups: CategoryGroup[] = useMemo(() => {
    const unresolved = weaknesses.filter((w) => !w.resolved);
    const byCategory = new Map<EssayCategoryKey, WeaknessRecord[]>();
    for (const w of unresolved) {
      const cat = categorizeWeakness(w.area);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(w);
    }

    return ESSAY_CATEGORY_ORDER.flatMap<CategoryGroup>((cat) => {
      const items = byCategory.get(cat) ?? [];
      if (items.length === 0) return [];
      const total = items.reduce((s, w) => s + (w.count ?? 1), 0);
      // 内部は count 降順 → declined / 重要度高い順
      const sorted = [...items].sort(
        (a, b) => (b.count ?? 1) - (a.count ?? 1),
      );
      return [
        {
          category: cat,
          label: ESSAY_CATEGORY_LABELS[cat],
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
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            現在、 未解決弱点はありません
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCategoryCount = Math.max(1, ...groups.map((g) => g.totalCount));

  const toggle = (cat: EssayCategoryKey) => {
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
                  className="w-full rounded-md p-2 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{g.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({g.items.length}項目)
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {g.totalCount}回
                    </span>
                  </div>
                  <div className="ml-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${color.bg} transition-all`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <ul className="ml-6 mt-1 space-y-1.5 border-l pl-3 text-xs">
                    {g.items.map((w, idx) => {
                      const SourceIcon = SOURCE_ICONS[w.source] ?? Layers;
                      const severity = getWeaknessReminderLevel(w);
                      return (
                        <li
                          key={`${w.area}-${idx}`}
                          className="flex items-start justify-between gap-2 rounded p-1.5"
                        >
                          <div className="flex min-w-0 items-start gap-1.5">
                            <SourceIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                            <span className="break-words leading-snug">
                              {w.area}
                            </span>
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
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {ESSAY_CATEGORY_ORDER.map((k) => (
              <div key={k} className="flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[k].hex }}
                />
                {ESSAY_CATEGORY_LABELS[k]}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            未解決 {unresolvedCount} 件の弱点を {groups.length} カテゴリに集約
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

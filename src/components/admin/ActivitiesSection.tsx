"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CheckCircle2, ChevronDown } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import {
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
  type StructuredActivityData,
} from "@/lib/types/activity";
import { InlineFeedbackButton } from "@/components/admin/InlineFeedbackButton";

interface ActivityListItem {
  id: string;
  title: string;
  category: ActivityCategory;
  period: { start: string; end: string };
  description: string;
  isStructured: boolean;
  structuredData: StructuredActivityData | null;
  updatedAt: string;
}

/** 構造化データの1項目（本文） */
function StructField({ label, value }: { label: string; value?: string }) {
  if (!value || !value.trim()) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-xs leading-relaxed">{value}</p>
    </div>
  );
}

/** 構造化データの1項目（箇条書き） */
function StructList({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <ul className="mt-0.5 space-y-0.5 text-xs leading-relaxed">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1">
            <span className="text-muted-foreground">・</span>
            <span className="whitespace-pre-wrap">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  leadership: "bg-purple-100 text-purple-700 border-purple-300",
  volunteer: "bg-emerald-100 text-emerald-700 border-emerald-300",
  research: "bg-sky-100 text-sky-700 border-sky-300",
  club: "bg-amber-100 text-amber-700 border-amber-300",
  internship: "bg-cyan-100 text-cyan-700 border-cyan-300",
  competition: "bg-rose-100 text-rose-700 border-rose-300",
  other: "bg-gray-100 text-gray-700 border-gray-300",
};

export function ActivitiesSection({ studentId }: { studentId: string }) {
  const { data, isLoading, error } = useAuthSWR<ActivityListItem[]>(
    `/api/admin/students/${studentId}/activities`
  );
  const activities = data ?? [];
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // カテゴリ別集計
  const categoryCounts = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="size-4" />
          活動実績
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        {error ? (
          <ApiErrorBanner error={error} title="活動実績の取得に失敗しました" />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Briefcase className="size-8" />
            <p>まだ活動実績がありません</p>
          </div>
        ) : (
          <>
            {/* Category summary */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <Badge
                  key={cat}
                  variant="outline"
                  className={CATEGORY_COLORS[cat as ActivityCategory]}
                >
                  {ACTIVITY_CATEGORY_LABELS[cat as ActivityCategory]} {count}件
                </Badge>
              ))}
            </div>

            {/* Activity cards（クリックで全文＋構造化データを展開） */}
            <div className="space-y-2">
              {activities.map((act) => {
                const open = openIds.has(act.id);
                const sd = act.structuredData;
                return (
                  <div key={act.id} className="rounded-lg border">
                    <div className="flex items-start justify-between p-3">
                      <button
                        type="button"
                        onClick={() => toggle(act.id)}
                        className="min-w-0 flex-1 space-y-1 text-left"
                        aria-expanded={open}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                          />
                          <p className="truncate text-sm font-medium">{act.title}</p>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] ${CATEGORY_COLORS[act.category]}`}
                          >
                            {ACTIVITY_CATEGORY_LABELS[act.category]}
                          </Badge>
                        </div>
                        {!open && (
                          <p className="pl-5 text-xs text-muted-foreground line-clamp-1">
                            {act.description}
                          </p>
                        )}
                        <p className="pl-5 text-xs text-muted-foreground">
                          {act.period.start} ~ {act.period.end}
                        </p>
                      </button>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        {act.isStructured ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-400 bg-emerald-50 text-[10px] text-emerald-700"
                          >
                            <CheckCircle2 className="size-3" />
                            AI構造化済み
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            未構造化
                          </Badge>
                        )}
                        <InlineFeedbackButton
                          studentId={studentId}
                          type="activity"
                          targetId={act.id}
                          targetLabel={act.title}
                          compact
                        />
                      </div>
                    </div>

                    {open && (
                      <div className="space-y-3 border-t px-3 py-3 pl-8">
                        <StructField label="説明（全文）" value={act.description} />
                        {sd && (
                          <>
                            <StructField label="動機・きっかけ" value={sd.motivation} />
                            <StructList label="取り組んだこと" items={sd.actions} />
                            <StructList label="成果" items={sd.results} />
                            <StructList label="学んだこと" items={sd.learnings} />
                            <StructField label="自己PR・APとの接続" value={sd.connection} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

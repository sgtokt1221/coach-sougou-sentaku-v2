"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import {
  ACTIVITY_CATEGORY_LABELS,
  type Activity,
} from "@/lib/types/activity";

/**
 * セッション画面内で活動実績を読み取り表示するダイアログ。
 * 管理者APIから取得（閲覧のみ）。
 */
export default function ActivityDetailDialog({
  studentId,
  activityId,
  open,
  onOpenChange,
}: {
  studentId: string;
  activityId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !activityId) return;
    let active = true;
    setLoading(true);
    setData(null);
    authFetch(`/api/admin/students/${studentId}/activities/${activityId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, activityId, studentId]);

  const sd = data?.structuredData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="size-5" />
            活動実績詳細
          </DialogTitle>
          {data && (
            <DialogDescription>
              {ACTIVITY_CATEGORY_LABELS[data.category] ?? data.category}
              {data.period?.start
                ? ` - ${data.period.start}${data.period.end ? ` 〜 ${data.period.end}` : ""}`
                : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            データの取得に失敗しました
          </p>
        ) : (
          <div className="space-y-6 py-2">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">{data.title}</h3>
              {data.description && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                  {data.description}
                </p>
              )}
            </div>

            {sd && (
              <>
                <Separator />
                <div className="space-y-4 text-sm">
                  {sd.motivation && (
                    <div className="space-y-1">
                      <h4 className="font-medium">動機・きっかけ</h4>
                      <p className="text-muted-foreground leading-relaxed">{sd.motivation}</p>
                    </div>
                  )}
                  {sd.actions?.length > 0 && (
                    <ListBlock label="取り組み・行動" items={sd.actions} />
                  )}
                  {sd.results?.length > 0 && (
                    <ListBlock label="成果" items={sd.results} />
                  )}
                  {sd.learnings?.length > 0 && (
                    <ListBlock label="学び" items={sd.learnings} />
                  )}
                  {sd.connection && (
                    <div className="space-y-1">
                      <h4 className="font-medium">志望との結びつき</h4>
                      <p className="text-muted-foreground leading-relaxed">{sd.connection}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {data.optimizations?.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">AP別最適化</h3>
                  {data.optimizations.map((opt, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {opt.universityName} {opt.facultyName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          合致度 {opt.alignmentScore}
                        </Badge>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                        {opt.optimizedText}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <h4 className="font-medium">{label}</h4>
      <ul className="space-y-1 pl-5">
        {items.map((t, i) => (
          <li key={i} className="list-disc text-muted-foreground leading-relaxed">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

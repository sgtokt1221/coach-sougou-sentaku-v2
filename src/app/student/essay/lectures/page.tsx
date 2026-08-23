"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { getAllLectures } from "@/data/essay-lectures";
import type { LectureProgressItem } from "@/app/api/essay/lecture/history/route";

const PHASES: { key: string; label: string; orders: number[] }[] = [
  { key: "intro", label: "導入", orders: [1] },
  { key: "form", label: "型を組む", orders: [2, 3, 4, 5, 6, 7, 8] },
  { key: "content", label: "中身の質", orders: [9, 10, 11] },
  { key: "read", label: "読む・分析", orders: [12, 13, 14] },
  { key: "finish", label: "仕上げる", orders: [15] },
];

export default function EssayLecturesPage() {
  const lectures = getAllLectures();
  const { data: progress } = useAuthSWR<LectureProgressItem[]>(
    "/api/essay/lecture/history?userId=current"
  );
  const doneMap = new Map((progress ?? []).map((p) => [p.lectureId, p]));

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 lg:space-y-6 lg:px-6 lg:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold lg:text-xl">
          <GraduationCap className="size-5" />
          小論文講座
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          小論文の書き方を基礎から学ぶ全{lectures.length}
          講。各講の最後に関連問題を解くと、結果が添削履歴に残ります。
        </p>
      </div>

      <div className="space-y-6">
        {PHASES.map((phase) => {
          const items = lectures.filter((l) => phase.orders.includes(l.order));
          if (items.length === 0) return null;
          return (
            <section key={phase.key} className="space-y-3">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide">
                {phase.label}
              </h2>
              {items.map((lec) => {
                const done = doneMap.get(lec.id);
                return (
                  <Card
                    key={lec.id}
                    className="transition-shadow hover:shadow-md"
                  >
                    <Link
                      href={`/student/essay/lectures/${lec.id}`}
                      className="block"
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full font-bold">
                          {lec.order}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {lec.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {lec.level}
                            </Badge>
                            {done && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="size-3.5" />
                                受講済み {done.total}/{done.scoreMaximum}
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                            {lec.summary}
                          </p>
                          <p className="text-muted-foreground/80 mt-1 flex items-center gap-1 text-[11px]">
                            <Clock className="size-3" />約{lec.durationMin}分
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                      </CardContent>
                    </Link>
                  </Card>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

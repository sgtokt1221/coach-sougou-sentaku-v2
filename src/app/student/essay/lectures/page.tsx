"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { getAllLectures } from "@/data/essay-lectures";
import type { LectureProgressItem } from "@/app/api/essay/lecture/history/route";

export default function EssayLecturesPage() {
  const lectures = getAllLectures();
  const { data: progress } = useAuthSWR<LectureProgressItem[]>(
    "/api/essay/lecture/history?userId=current",
  );
  const doneMap = new Map((progress ?? []).map((p) => [p.lectureId, p]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
          <GraduationCap className="size-5" />
          小論文講座
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          小論文の書き方を基礎から学ぶ全{lectures.length}講。各講の最後に関連問題を解くと、結果が添削履歴に残ります。
        </p>
      </div>

      <div className="space-y-3">
        {lectures.map((lec) => {
          const done = doneMap.get(lec.id);
          return (
            <Card
              key={lec.id}
              className="transition-shadow hover:shadow-md"
            >
              <Link href={`/student/essay/lectures/${lec.id}`} className="block">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {lec.order}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{lec.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {lec.level}
                      </Badge>
                      {done && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="size-3.5" />
                          受講済み {done.total}/50
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {lec.summary}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <Clock className="size-3" />
                      約{lec.durationMin}分
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

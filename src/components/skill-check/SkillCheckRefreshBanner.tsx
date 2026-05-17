"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";

interface Props {
  daysSinceLast: number;
}

export function SkillCheckRefreshBanner({ daysSinceLast }: Props) {
  return (
    <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/20">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
          <RefreshCcw className="size-5 text-amber-700 dark:text-amber-200" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            ベンチマーク再測定のおすすめ（前回から {daysSinceLast} 日）
          </p>
          <p className="text-xs text-muted-foreground">
            日々の添削・面接練習は今のランクに反映されています。SC を再測定するとベンチマーク基準が更新され、ランクの精度がさらに上がります。
          </p>
        </div>
        <Link
          href="/student/skill-check/new"
          className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          再測定する
        </Link>
      </CardContent>
    </Card>
  );
}

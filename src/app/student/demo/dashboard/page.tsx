"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trees, FileText, TrendingUp, Target } from "lucide-react";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

export default function DemoDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          今日のあなたの状況を一目で確認できます
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card data-tour="growth-tree" className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trees className="size-4 text-emerald-600" />
              成長の木
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-xl bg-gradient-to-b from-sky-50 to-emerald-50">
              <div className="text-center">
                <Trees className="mx-auto size-24 text-emerald-500" />
                <p className="mt-2 text-sm font-medium">現在レベル: 4</p>
                <p className="text-xs text-muted-foreground">
                  添削 12本 / 面接 5回 を達成
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-tour="weekly-todo" className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-amber-500" />
              今週やること
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "自己分析の続きを進める (Step 4)",
              "過去問1本を時間内で解く",
              "志望理由書の第2段落を推敲",
            ].map((todo, i) => (
              <div
                key={i}
                className="rounded-lg border p-2 text-sm"
              >
                <span className="mr-2 font-medium text-primary">
                  {i + 1}.
                </span>
                {todo}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card data-tour="recent-essays" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            直近の添削
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { title: "地域社会における若者の役割", score: 80, date: "3日前", trend: "up" },
              { title: "AIと雇用の未来", score: 74, date: "1週間前", trend: "up" },
              { title: "グローバル化と地域文化", score: 68, date: "2週間前", trend: "flat" },
            ].map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{e.score} / 100</Badge>
                  <TrendingUp className="size-4 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS.dashboard} />
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Star } from "lucide-react";
import { INTERVIEW_DRILL_MOCK } from "@/components/tutorial/mockData";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

export default function DemoInterviewDrillPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">面接ドリル</h1>
        <p className="text-sm text-muted-foreground">
          カテゴリを選んで短時間トレーニング
        </p>
      </div>

      <Card data-tour="drill-categories" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-amber-500" />
            カテゴリ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {INTERVIEW_DRILL_MOCK.categories.map((c) => (
              <div
                key={c.name}
                className={`rounded-lg p-3 text-center text-sm font-medium ${c.color}`}
              >
                {c.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">問題</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-xl bg-muted/40 p-4 text-base leading-relaxed">
            {INTERVIEW_DRILL_MOCK.question}
          </p>
        </CardContent>
      </Card>

      <Card data-tour="drill-score" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">あなたの回答の評価</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: INTERVIEW_DRILL_MOCK.maxScore }).map(
              (_, i) => (
                <Star
                  key={i}
                  className={`size-6 ${
                    i < INTERVIEW_DRILL_MOCK.score
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              )
            )}
            <span className="ml-2 font-bold">
              {INTERVIEW_DRILL_MOCK.score}/{INTERVIEW_DRILL_MOCK.maxScore}
            </span>
          </div>
          <div>
            <Badge variant="outline" className="mb-2">
              フィードバック
            </Badge>
            <p className="text-sm">{INTERVIEW_DRILL_MOCK.feedback}</p>
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">
              改善例
            </Badge>
            <p className="rounded-lg border-l-2 border-primary/50 bg-muted/20 p-3 text-sm">
              {INTERVIEW_DRILL_MOCK.betterAnswer}
            </p>
          </div>
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS["interview-drill"]} />
    </div>
  );
}

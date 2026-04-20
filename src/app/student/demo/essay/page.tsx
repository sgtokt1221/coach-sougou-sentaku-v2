"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lightbulb } from "lucide-react";
import { ESSAY_MOCK } from "@/components/tutorial/mockData";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

export default function DemoEssayPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">小論文添削結果</h1>
        <p className="text-sm text-muted-foreground">
          AIによる4軸評価と改善提案が即座に返ってきます
        </p>
      </div>

      <Card data-tour="essay-score" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">総合評価</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <div className="text-5xl font-bold">
                {ESSAY_MOCK.totalScore}
                <span className="text-lg text-muted-foreground">
                  /{ESSAY_MOCK.totalMax}
                </span>
              </div>
              <Badge variant="secondary" className="mt-2">
                ランク B
              </Badge>
            </div>
            <div className="flex-1 space-y-2">
              {ESSAY_MOCK.scores.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs">
                    <span>{s.label}</span>
                    <span className="font-medium">
                      {s.score}/{s.max}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(s.score / s.max) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-tour="essay-good" className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-emerald-500" />
              良い点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ESSAY_MOCK.goodPoints.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg border-l-2 border-emerald-400 bg-emerald-50 p-2 text-sm"
                >
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card data-tour="essay-improve" className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-amber-500" />
              改善点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ESSAY_MOCK.improvements.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg border-l-2 border-amber-400 bg-amber-50 p-2 text-sm"
                >
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">提出された小論文</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
            {ESSAY_MOCK.text}
          </p>
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS.essay} />
    </div>
  );
}

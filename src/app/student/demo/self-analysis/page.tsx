"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Check } from "lucide-react";
import { SELF_ANALYSIS_MOCK } from "@/components/tutorial/mockData";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

const STEP_LABELS = [
  "価値観",
  "強み",
  "弱み",
  "原体験",
  "興味関心",
  "将来像",
  "志望理由",
];

export default function DemoSelfAnalysisPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">自己分析</h1>
        <p className="text-sm text-muted-foreground">
          AIとの7ステップ対話で、あなたの価値観を言語化します
        </p>
      </div>

      <Card data-tour="sa-steps" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-amber-500" />
            進捗 ({SELF_ANALYSIS_MOCK.completedSteps} / 7)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const done = stepNum <= SELF_ANALYSIS_MOCK.completedSteps;
              const current = stepNum === SELF_ANALYSIS_MOCK.currentStep;
              return (
                <div
                  key={label}
                  className={`rounded-lg border p-2 text-center text-xs ${
                    done
                      ? "bg-emerald-50 border-emerald-200"
                      : current
                      ? "bg-amber-50 border-amber-200 ring-2 ring-amber-300"
                      : "bg-muted/40"
                  }`}
                >
                  {done && <Check className="mx-auto size-3 text-emerald-600" />}
                  <p className="mt-1 font-medium">{label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card data-tour="sa-chat" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">AIとの対話</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SELF_ANALYSIS_MOCK.messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.role === "ai" && (
                  <Badge variant="outline" className="mb-1 text-[10px]">
                    AI
                  </Badge>
                )}
                <p>{m.content}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS["self-analysis"]} />
    </div>
  );
}

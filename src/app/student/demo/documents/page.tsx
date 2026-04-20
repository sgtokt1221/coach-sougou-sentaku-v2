"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileEdit, Clock } from "lucide-react";
import { DOCUMENTS_MOCK } from "@/components/tutorial/mockData";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

export default function DemoDocumentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">志望理由書</h1>
        <p className="text-sm text-muted-foreground">
          大学ごとに必要な書類をエディタで執筆し、AI添削を受けられます
        </p>
      </div>

      <Card data-tour="docs-progress" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileEdit className="size-4 text-violet-500" />
            {DOCUMENTS_MOCK.universityName} {DOCUMENTS_MOCK.facultyName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">完成度</span>
              <span className="font-bold text-violet-700">
                {DOCUMENTS_MOCK.completionRate}%
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-violet-600"
                style={{ width: `${DOCUMENTS_MOCK.completionRate}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {DOCUMENTS_MOCK.documents.map((d) => (
              <div
                key={d.title}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{d.title}</p>
                    <Badge
                      variant={d.status === "reviewed" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {d.statusLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.wordCount} / {d.targetWordCount} 字
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-rose-600">
                  <Clock className="size-3" />
                  残り {d.daysLeft}日
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-tour="docs-feedback" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">AI添削 (3軸評価)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            {DOCUMENTS_MOCK.feedback.scores.map((s) => (
              <div
                key={s.label}
                className="rounded-lg bg-muted/40 p-3"
              >
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">
                  {s.score}
                  <span className="text-sm font-normal">/{s.max}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="rounded-lg border-l-4 border-violet-400 bg-violet-50 p-3 text-sm leading-relaxed">
            {DOCUMENTS_MOCK.feedback.overall}
          </p>
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS.documents} />
    </div>
  );
}

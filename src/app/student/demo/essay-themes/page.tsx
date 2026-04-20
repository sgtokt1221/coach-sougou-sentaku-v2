"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Target as TargetIcon } from "lucide-react";
import { ESSAY_THEMES_MOCK } from "@/components/tutorial/mockData";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

export default function DemoEssayThemesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">テーマ・過去問</h1>
        <p className="text-sm text-muted-foreground">
          志望学部の頻出テーマと過去問から練習できます
        </p>
      </div>

      <Card data-tour="themes-list" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" />
            おすすめテーマ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ESSAY_THEMES_MOCK.themes.map((t, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <p className="text-base font-bold">{t.title}</p>
                {t.isRecommended && (
                  <Badge className="bg-amber-500">おすすめ</Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{t.difficultyLabel}</Badge>
                <span>{t.field}</span>
                <span>・{t.wordLimit}字</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.relatedAP.map((ap) => (
                  <Badge key={ap} variant="secondary" className="text-[10px]">
                    {ap}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-tour="past-question" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="size-4 text-rose-500" />
            過去問に挑戦
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 p-5">
            <p className="text-xs text-muted-foreground">
              {ESSAY_THEMES_MOCK.pastQuestion.universityName}{" "}
              {ESSAY_THEMES_MOCK.pastQuestion.facultyName}{" "}
              {ESSAY_THEMES_MOCK.pastQuestion.year}年
            </p>
            <p className="mt-2 text-lg font-bold">
              {ESSAY_THEMES_MOCK.pastQuestion.title}
            </p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                制限 {ESSAY_THEMES_MOCK.pastQuestion.timeLimit}分
              </span>
              <span>
                {ESSAY_THEMES_MOCK.pastQuestion.wordLimit}字以内
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS["essay-themes"]} />
    </div>
  );
}

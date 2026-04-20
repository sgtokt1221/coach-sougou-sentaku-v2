"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { UNIVERSITY_MATCH_MOCK } from "@/components/tutorial/mockData";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

const FIT_COLORS: Record<string, string> = {
  "ぴったり校": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "おすすめ校": "bg-sky-100 text-sky-700 border-sky-200",
  "検討校": "bg-amber-100 text-amber-700 border-amber-200",
};

export default function DemoUniversitiesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">志望校マッチング</h1>
        <p className="text-sm text-muted-foreground">
          あなたのプロフィールと大学ごとのAPを照合し、合致度をスコアリングします
        </p>
      </div>

      <div className="space-y-3" data-tour="match-result">
        {UNIVERSITY_MATCH_MOCK.results.map((r, i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-5 text-primary" />
                    <p className="text-base font-bold">
                      {r.universityName} {r.facultyName}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={FIT_COLORS[r.fitRecommendation]}
                >
                  {r.fitRecommendation}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    マッチ度
                  </p>
                  <p className="text-2xl font-bold">
                    {r.matchScore}
                    <span className="text-sm font-normal">%</span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    AP合致度
                  </p>
                  <p className="text-2xl font-bold">
                    {r.apFitScore}
                    <span className="text-sm font-normal">%</span>
                  </p>
                </div>
              </div>

              <div
                className="rounded-lg border-l-4 border-primary/60 bg-muted/20 p-3"
                data-tour={i === 0 ? "match-reason" : undefined}
              >
                <p className="text-xs text-muted-foreground">マッチ理由</p>
                <p className="mt-1 text-sm">{r.apFitReason}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TutorialDriver step={DEMO_STEPS.universities} />
    </div>
  );
}

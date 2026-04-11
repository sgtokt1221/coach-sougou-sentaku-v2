"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { AppearanceAnalysis, AppearanceIssue } from "@/lib/types/interview";

interface AppearanceReportProps {
  analysis: AppearanceAnalysis;
}

const CATEGORY_LABELS: Record<AppearanceIssue["category"], string> = {
  clothing: "服装",
  hair: "髪型",
  grooming: "顔まわり",
  posture: "姿勢",
  object: "不適切な物",
  background: "背景",
  lighting: "照明",
};

const SEVERITY_STYLES: Record<AppearanceIssue["severity"], { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  info: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
};

function ScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export default function AppearanceReport({ analysis }: AppearanceReportProps) {
  const scoreColor = ScoreColor(analysis.score);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shirt className="size-4" />
          身だしなみチェック
          <span className={`ml-auto text-2xl font-bold tabular-nums ${scoreColor}`}>
            {analysis.score}
            <span className="text-sm font-normal text-muted-foreground">/10</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis.issues.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="size-4" />
            <span className="text-sm">問題は見つかりませんでした</span>
          </div>
        ) : (
          <div className="space-y-2">
            {analysis.issues.map((issue, i) => {
              const style = SEVERITY_STYLES[issue.severity];
              const Icon = style.icon;
              return (
                <div key={i} className={`flex items-start gap-2 rounded-md p-2.5 ${style.bg}`}>
                  <Icon className={`size-4 mt-0.5 shrink-0 ${style.color}`} />
                  <div>
                    <span className={`text-xs font-medium ${style.color}`}>
                      {CATEGORY_LABELS[issue.category]}
                    </span>
                    <p className="text-sm text-foreground">{issue.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm text-muted-foreground leading-relaxed pt-1">
          {analysis.advice}
        </p>
      </CardContent>
    </Card>
  );
}

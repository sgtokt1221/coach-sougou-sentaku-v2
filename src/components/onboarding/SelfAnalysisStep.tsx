"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Clock, Sparkles, ArrowRight } from "lucide-react";

interface Props {
  onSkip: () => void;
  onTake: () => void;
}

/**
 * オンボーディング: 自己分析の案内ステップ（最終ステップ）。
 * 実際の自己分析は /student/self-analysis（7ステップ）。
 */
export function SelfAnalysisStep({ onSkip, onTake }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950">
              <Lightbulb className="size-6 text-teal-700 dark:text-teal-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold">自己分析</h3>
              <p className="text-muted-foreground text-xs">
                価値観・強み・将来像を言語化。出願書類と面接の土台になります
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Clock className="text-muted-foreground mt-0.5 size-4" />
              <div>
                <p className="font-medium">AIと対話で進む</p>
                <p className="text-muted-foreground text-xs">
                  途中保存OK・好きなときに再開
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="text-muted-foreground mt-0.5 size-4" />
              <div>
                <p className="font-medium">自分の軸が見える</p>
                <p className="text-muted-foreground text-xs">
                  志望理由書・面接の説得力が上がる
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 text-muted-foreground rounded-md p-3 text-xs">
            <Badge variant="outline" className="mb-1">
              最初におすすめ
            </Badge>
            <p>
              先に自己分析をしておくと、このあとの小論文・面接で「自分の言葉」を使いやすくなります。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onSkip}>
          後で行う
        </Button>
        <Button onClick={onTake}>
          自己分析を始める <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

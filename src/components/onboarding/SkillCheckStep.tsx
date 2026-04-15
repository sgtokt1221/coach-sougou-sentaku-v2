"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge, Clock, Target, ArrowRight } from "lucide-react";

interface Props {
  onSkip: () => void;
  onTake: () => void;
}

export function SkillCheckStep({ onSkip, onTake }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <Gauge className="size-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold">小論文スキルチェック</h3>
              <p className="text-xs text-muted-foreground">
                今のスキルを測定し、成長を定量的に追うための出発点
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">約30分</p>
                <p className="text-xs text-muted-foreground">800字目安の論述</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">S〜Dのランク判定</p>
                <p className="text-xs text-muted-foreground">5軸のレーダーも同時に表示</p>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="mb-1">月次更新</Badge>
            <p>
              スキルチェックは月1回のペースで受けられます。受けるたびにスコアが更新され、
              成長がダッシュボードで見える化されます。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onSkip}>
          後で受ける
        </Button>
        <Button onClick={onTake}>
          スキルチェックを受ける <ArrowRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

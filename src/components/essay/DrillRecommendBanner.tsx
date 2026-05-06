"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { DrillRecommendation } from "@/lib/types/drill-recommendation";

interface DrillRecommendBannerProps {
  recommendations: DrillRecommendation[];
}

export function DrillRecommendBanner({ recommendations }: DrillRecommendBannerProps) {
  if (recommendations.length === 0) {
    return null;
  }

  // 上位2-3件を表示
  const displayRecommendations = recommendations.slice(0, 3);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">おすすめの過去問</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRecommendations.map((recommendation) => {
            const { pastQuestion, reasons } = recommendation;
            return (
              <div key={pastQuestion.id} className="space-y-2">
                <h4 className="font-medium text-sm leading-tight">
                  {pastQuestion.theme}
                </h4>
                <div className="text-xs text-muted-foreground">
                  {pastQuestion.universityName} {pastQuestion.facultyName}
                </div>

                {reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reasons.slice(0, 2).map((reason, reasonIndex) => (
                      <Badge
                        key={reasonIndex}
                        variant="secondary"
                        className="text-xs"
                      >
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button asChild size="sm" variant="outline" className="w-full text-xs">
                  <Link href={`/student/essay/new?pastQuestion=${pastQuestion.id}`}>
                    選択する
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
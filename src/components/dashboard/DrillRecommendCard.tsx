"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { DrillRecommendation } from "@/lib/types/drill-recommendation";

interface DrillRecommendCardProps {
  recommendation: DrillRecommendation;
}

export function DrillRecommendCard({ recommendation }: DrillRecommendCardProps) {
  const { pastQuestion, reasons } = recommendation;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium leading-tight">
          {pastQuestion.theme}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{pastQuestion.universityName}</span>
          <span>{pastQuestion.facultyName}</span>
          {pastQuestion.wordLimit && (
            <span>({pastQuestion.wordLimit}字)</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {pastQuestion.description}
        </p>

        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reasons.map((reason, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs"
              >
                {reason}
              </Badge>
            ))}
          </div>
        )}

        <Button asChild size="sm" className="w-full">
          <Link href={`/student/essay/new?pastQuestion=${pastQuestion.id}`}>
            練習する
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
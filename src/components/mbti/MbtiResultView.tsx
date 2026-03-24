"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MBTI_TYPES } from "@/data/mbti-types";
import { MBTI_FACULTY_MAPPING } from "@/data/mbti-faculty-mapping";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Sparkles, Target } from "lucide-react";

interface MbtiResultViewProps {
  mbtiType: string;
}

export function MbtiResultView({ mbtiType }: MbtiResultViewProps) {
  const typeInfo = MBTI_TYPES[mbtiType];
  const fieldMapping = MBTI_FACULTY_MAPPING[mbtiType];

  const radarData = useMemo(() => {
    if (!fieldMapping) return [];
    return fieldMapping.map((f) => ({
      field: f.field.replace("・", "\n"),
      score: f.score,
      fullMark: 100,
    }));
  }, [fieldMapping]);

  const topFields = useMemo(() => {
    if (!fieldMapping) return [];
    return [...fieldMapping].sort((a, b) => b.score - a.score).slice(0, 4);
  }, [fieldMapping]);

  if (!typeInfo || !fieldMapping) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {mbtiType} - {typeInfo.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{typeInfo.description}</p>

          <div>
            <p className="text-sm font-medium mb-2">強み</p>
            <div className="flex flex-wrap gap-2">
              {typeInfo.strengths.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            学部適性マップ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="field"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                />
                <Radar
                  name="適性スコア"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium">おすすめ学部 TOP4</p>
            {topFields.map((f, i) => (
              <div
                key={f.field}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{f.field}</p>
                    <Badge variant="outline" className="text-xs">
                      {f.score}点
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { UNIVERSITY_MATCH_MOCK } from "../mockData";

function fitBadgeStyle(fit: string): string {
  switch (fit) {
    case "ぴったり校": return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "おすすめ校": return "bg-blue-100 text-blue-800 border-blue-300";
    case "検討校": return "bg-amber-100 text-amber-800 border-amber-300";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
}

export function UniversityMatchPreview() {
  return (
    <div className="space-y-2">
      {UNIVERSITY_MATCH_MOCK.results.map((result, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 ${scoreBg(result.apFitScore)}`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-xs">{result.universityName}</span>
            <span className="text-muted-foreground text-xs">{result.facultyName}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${fitBadgeStyle(result.fitRecommendation)}`}>
              {result.fitRecommendation}
            </Badge>
            <span className={`text-xs font-bold ${scoreColor(result.apFitScore)}`}>
              適合度 {result.apFitScore}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              (出願要件 {result.matchScore}%)
            </span>
          </div>
          {result.apFitReason && (
            <p className="text-[10px] text-primary/80 mt-1 leading-snug">{result.apFitReason}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{result.admissionPolicy}</p>
        </div>
      ))}
    </div>
  );
}

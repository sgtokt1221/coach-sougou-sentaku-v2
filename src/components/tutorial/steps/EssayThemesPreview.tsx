"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Sparkles } from "lucide-react";
import { ESSAY_THEMES_MOCK } from "../mockData";

const DIFFICULTY_STYLES: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 border-emerald-300",
  2: "bg-amber-100 text-amber-800 border-amber-300",
  3: "bg-rose-100 text-rose-800 border-rose-300",
};

export function EssayThemesPreview() {
  const { themes, pastQuestion } = ESSAY_THEMES_MOCK;

  return (
    <div className="space-y-3">
      {/* テーマカード */}
      <div className="space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground">テーマ練習</span>
        {themes.map((theme, i) => (
          <div key={i} className="rounded-xl border bg-background p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${DIFFICULTY_STYLES[theme.difficulty]}`}>
                {theme.difficultyLabel}
              </Badge>
              {theme.isRecommended && (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  <Sparkles className="size-2.5 mr-0.5" />
                  おすすめ
                </Badge>
              )}
            </div>
            <p className="text-xs font-medium leading-snug">{theme.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{theme.field}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <FileText className="size-2.5" />{theme.wordLimit}字
              </span>
            </div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {theme.relatedAP.map((ap) => (
                <span key={ap} className="text-[9px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {ap}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 過去問カード */}
      <div className="space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground">大学別過去問</span>
        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">{pastQuestion.universityName}</Badge>
            <Badge variant="outline" className="text-[10px]">{pastQuestion.facultyName}</Badge>
            <span className="text-[10px] text-muted-foreground">{pastQuestion.year}年</span>
          </div>
          <p className="text-xs font-medium leading-snug">{pastQuestion.title}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <FileText className="size-2.5" />{pastQuestion.wordLimit}字
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="size-2.5" />{pastQuestion.timeLimit}分
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

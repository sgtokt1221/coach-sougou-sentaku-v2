"use client";

import { useState } from "react";
import { ChevronDown, BookOpen, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FacultyTopic, TopicSection } from "@/data/faculty-topics/types";
import {
  parseHighlightedLine,
  stripHighlights,
} from "@/lib/topics/highlightParser";
import { CopyButton } from "./CopyButton";

interface TopicCardProps {
  topic: FacultyTopic;
}

function renderBody(body: string) {
  // 改行で分割して、各行をハイライトパース
  const lines = body.split("\n");
  return lines.map((line, idx) => (
    <p key={idx} className="text-sm leading-relaxed">
      {parseHighlightedLine(line)}
    </p>
  ));
}

function buildFullText(topic: FacultyTopic): string {
  const lines: string[] = [];
  lines.push(`【${topic.title}】`);
  lines.push(topic.summary);
  lines.push("");
  for (const section of topic.sections) {
    lines.push(section.heading);
    lines.push(stripHighlights(section.body));
    lines.push("");
  }
  lines.push("▼ 練習問題");
  lines.push(topic.practiceQuestion);
  return lines.join("\n");
}

function SectionItem({ section }: { section: TopicSection }) {
  return (
    <div className="border-l-2 border-muted pl-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-sm font-semibold text-foreground">
          {section.heading}
        </h4>
        <CopyButton
          text={stripHighlights(section.body)}
          label="コピー"
        />
      </div>
      <div className="space-y-1">{renderBody(section.body)}</div>
    </div>
  );
}

export function TopicCard({ topic }: TopicCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* ヘッダー */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-left flex items-start justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] shrink-0">
                #{topic.number}
              </Badge>
              <h3 className="text-base font-bold">{topic.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{topic.summary}</p>
          </div>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <>
            <div className="flex justify-end">
              <CopyButton
                text={buildFullText(topic)}
                label="全文コピー"
                className="border border-border"
              />
            </div>

            {/* セクション群 */}
            <div className="space-y-2">
              {topic.sections.map((section) => (
                <SectionItem key={section.id} section={section} />
              ))}
            </div>

            {/* 練習問題 */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <BookOpen className="size-3.5" />
                練習問題
              </div>
              <p className="text-sm leading-relaxed">{topic.practiceQuestion}</p>
            </div>

            {/* 関連ネタ */}
            {topic.relatedTopicIds.length > 0 && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Link2 className="size-3.5 mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  <span>関連ネタ:</span>
                  {topic.relatedTopicIds.map((id) => (
                    <Badge key={id} variant="secondary" className="text-[10px]">
                      {id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

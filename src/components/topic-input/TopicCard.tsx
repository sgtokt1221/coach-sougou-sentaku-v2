"use client";

import { useState, forwardRef } from "react";
import { ChevronDown, BookOpen, Link2, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FacultyTopic, TopicSection } from "@/data/faculty-topics/types";
import {
  parseHighlightedLine,
  stripHighlights,
} from "@/lib/topics/highlightParser";
import { CopyButton } from "./CopyButton";

interface TopicCardProps {
  topic: FacultyTopic;
  /** 制御モード: 親が isOpen を管理する場合に渡す */
  isOpen?: boolean;
  /** 制御モード: 開閉切替のコールバック */
  onToggle?: () => void;
  /**
   * 関連ネタボタンのクリックハンドラ。
   * 親が ID から topic を解決し、必要なら別カテゴリへの切替＋スクロールを行う。
   */
  onRelatedClick?: (topicId: string) => void;
  /** ID から関連ネタのタイトルを引けるマップ（親から渡す） */
  topicTitleMap?: Record<string, string>;
}

function renderBody(body: string) {
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
  if (topic.practiceAnswer) {
    lines.push("");
    lines.push("▼ 解答例");
    lines.push(topic.practiceAnswer);
  }
  return lines.join("\n");
}

function SectionItem({ section }: { section: TopicSection }) {
  return (
    <div className="border-l-2 border-muted pl-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-sm font-semibold text-foreground">
          {section.heading}
        </h4>
        <CopyButton text={stripHighlights(section.body)} label="コピー" />
      </div>
      <div className="space-y-1">{renderBody(section.body)}</div>
    </div>
  );
}

export const TopicCard = forwardRef<HTMLDivElement, TopicCardProps>(
  function TopicCard(
    { topic, isOpen, onToggle, onRelatedClick, topicTitleMap },
    ref,
  ) {
    // 非制御モード用の内部 state（親から isOpen が渡されない場合のみ使う）
    const [internalOpen, setInternalOpen] = useState(false);
    const open = isOpen ?? internalOpen;
    const toggle = onToggle ?? (() => setInternalOpen((v) => !v));

    const [showAnswer, setShowAnswer] = useState(false);

    return (
      <Card ref={ref} className="w-full scroll-mt-24">
        <CardContent className="w-full p-4 space-y-3">
          {/* ヘッダー */}
          <button
            type="button"
            onClick={toggle}
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

              {/* 練習問題 + 解答例 */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <BookOpen className="size-3.5" />
                  練習問題
                </div>
                <p className="text-sm leading-relaxed">
                  {topic.practiceQuestion}
                </p>

                {topic.practiceAnswer && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAnswer((v) => !v)}
                      className="h-7 px-2 text-xs gap-1.5"
                    >
                      <Lightbulb className="size-3.5" />
                      {showAnswer ? "解答例を隠す" : "解答例を見る"}
                    </Button>
                    {showAnswer && (
                      <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3">
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-1.5">
                          解答例
                        </p>
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                          {topic.practiceAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 関連ネタ */}
              {topic.relatedTopicIds.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Link2 className="size-3.5" />
                    関連ネタ
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topic.relatedTopicIds.map((id) => {
                      const title = topicTitleMap?.[id];
                      if (!title) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onRelatedClick?.(id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted hover:border-foreground/30 transition-colors"
                        >
                          <Link2 className="size-3" />
                          {title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  },
);

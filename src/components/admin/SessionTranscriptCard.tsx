"use client";

import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LessonTranscriptRecord } from "@/lib/types/session";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 授業記録 (話者分離した録音文字起こし) を表示する折り畳みカード。
 * 講師=emerald / 生徒=sky のラベルと相対時刻を付ける。
 */
export function SessionTranscriptCard({
  transcript,
}: {
  transcript?: LessonTranscriptRecord;
}) {
  const [open, setOpen] = useState(false);

  // 文字起こし自体が未実行なら何も出さない。
  if (!transcript) return null;

  // 文字起こしは実行されたがセグメントが空 (録音が短い/無音等) の場合は、
  // 黙って消さずに理由を伝える。
  if (transcript.segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            授業記録 (文字起こし)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            録音が短い、または無音だったため、文字起こしできる音声がありませんでした。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          授業記録 (文字起こし)
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="cursor-pointer"
        >
          {open ? "閉じる" : `表示 (${transcript.segments.length})`}
          <ChevronDown
            className={`ml-1 size-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-1.5 max-h-[480px] overflow-y-auto">
          {transcript.segments.map((seg, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
                {formatTimestamp(seg.start)}
              </span>
              <div className="flex-1">
                <span
                  className={`mr-1 text-xs font-medium ${
                    seg.speaker === "teacher"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-sky-600 dark:text-sky-400"
                  }`}
                >
                  [{seg.speaker === "teacher" ? "講師" : "生徒"}]
                </span>
                <span>{seg.text}</span>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

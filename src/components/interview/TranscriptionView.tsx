"use client";

import type { Transcription, TranscriptionSegment } from "@/lib/types/interview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TranscriptionViewProps {
  transcription: Transcription;
}

export function TranscriptionView({ transcription }: TranscriptionViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="size-4" />
          文字起こし
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          言語: {transcription.language} / 長さ: {formatTimestamp(transcription.duration)}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {transcription.segments.map((segment: TranscriptionSegment, i: number) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="text-xs text-muted-foreground font-mono shrink-0 pt-0.5 w-20">
              {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
            </span>
            <div className="flex-1">
              {segment.speaker && (
                <span className={`text-xs font-medium mr-1 ${
                  segment.speaker === "ai" ? "text-blue-600" : "text-emerald-600"
                }`}>
                  [{segment.speaker === "ai" ? "面接官" : "受験生"}]
                </span>
              )}
              <span>{segment.text}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

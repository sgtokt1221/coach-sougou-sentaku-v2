"use client";

import { Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AudioPlayback from "@/components/interview/AudioPlayback";
import type { Session } from "@/lib/types/session";

/**
 * 授業録音 (講師 / 生徒) の再生カード。
 * recordingUrl / studentRecordingUrl が存在するときだけ表示する。
 * 文字起こしが空 (録音が短い等) でも、録音そのものは聴けるようにするのが目的。
 */
export function SessionRecordingCard({ session }: { session: Session }) {
  const hasTeacher = !!session.recordingUrl;
  const hasStudent = !!session.studentRecordingUrl;
  if (!hasTeacher && !hasStudent) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="size-4" />
          授業録音
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasTeacher && <AudioPlayback src={session.recordingUrl!} label="講師" />}
        {hasStudent && (
          <AudioPlayback src={session.studentRecordingUrl!} label="生徒" />
        )}
      </CardContent>
    </Card>
  );
}

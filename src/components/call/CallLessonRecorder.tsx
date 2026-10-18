"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { SessionLifecycleBar } from "@/components/admin/SessionLifecycleBar";
import { StudentRecordingController } from "@/components/student/StudentRecordingController";
import type { Session } from "@/lib/types/session";

/**
 * セッションから始めた通話で、授業を録音する。
 *
 * 講師は通話画面で「授業を開始 / 授業を終了」を押し、生徒は参加の案内に応じて自分のマイクを録る。
 * セッション画面と同じ部品をそのまま使う。オンラインの授業はこれまで、通話に移ると
 * セッション画面の録音が消え、生徒側の録音も止まっていた。
 *
 * 通話ページの直下に置く（CallRoom の中に置くと、通話の終了で画面ごと消えて録音を失う）。
 */
export function CallLessonRecorder({
  sessionId,
  role,
}: {
  sessionId: string;
  role: "teacher" | "student";
}) {
  if (role === "student") {
    return (
      <div className="absolute inset-x-0 top-0 z-30">
        <StudentRecordingController sessionId={sessionId} />
      </div>
    );
  }
  return <TeacherLessonPanel sessionId={sessionId} />;
}

function TeacherLessonPanel({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = (await res.json()) as Session;
        if (!cancelled) setSession(data);
      } catch (err) {
        console.warn("[CallLessonRecorder] session load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!session) return null;
  return (
    <div className="absolute top-14 right-3 z-30 w-[min(28rem,calc(100%-1.5rem))]">
      <SessionLifecycleBar
        sessionId={sessionId}
        session={session}
        onSessionUpdate={setSession}
      />
    </div>
  );
}

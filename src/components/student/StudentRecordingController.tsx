"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { useSessionRealtime } from "@/lib/hooks/useSessionRealtime";
import { useSessionRecorder } from "@/lib/audio/useSessionRecorder";
import { StudentRecordingJoinModal } from "./StudentRecordingJoinModal";
import { StudentRecordingBanner } from "./StudentRecordingBanner";

interface Props {
  sessionId: string;
  teacherName?: string;
}

type Phase = "idle" | "prompted" | "recording" | "uploading" | "done" | "error" | "skipped";

/**
 * 生徒側の録音フロー全体を制御する client component。
 * - Firestore onSnapshot で session を購読
 * - teacherRecording=true を検知したら JoinModal 表示
 * - 参加承認で MediaRecorder 起動 + join-recording API
 * - stopRequestedAt を検知したら自動停止 + アップロード
 */
export function StudentRecordingController({ sessionId, teacherName }: Props) {
  const { session } = useSessionRealtime(sessionId);
  const recorder = useSessionRecorder({ acquireOnMount: false });
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const hasHandledStopRef = useRef(false);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  // 講師が録音開始したら Modal 表示
  useEffect(() => {
    if (!session) return;
    const state = session.recordingState;
    if (!state) return;
    if (
      phase === "idle" &&
      state.teacherRecording &&
      !state.stopRequestedAt &&
      !state.studentRecording
    ) {
      setPhase("prompted");
    }
  }, [session, phase]);

  // 講師が「授業を終了」押下 (stopRequestedAt) を検知したら自動停止 + アップロード
  useEffect(() => {
    if (!session) return;
    const stopAt = session.recordingState?.stopRequestedAt;
    if (!stopAt || hasHandledStopRef.current) return;
    if (phase !== "recording") return;
    hasHandledStopRef.current = true;
    (async () => {
      setPhase("uploading");
      try {
        const blob = await recorder.stop();
        if (!blob) throw new Error("録音停止に失敗");
        const form = new FormData();
        form.append(
          "file",
          new File([blob], "student-recording.webm", {
            type: blob.type || "audio/webm",
          }),
        );
        form.append("durationSec", String(recorder.durationSec));
        const res = await authFetch(
          `/api/student/sessions/${sessionId}/recording`,
          { method: "POST", body: form },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "アップロード失敗");
        }
        if (!isUnmountedRef.current) {
          setPhase("done");
          setTimeout(() => {
            if (!isUnmountedRef.current) setPhase("idle");
          }, 3000);
        }
      } catch (err) {
        console.error("[student-recording] upload failed:", err);
        if (!isUnmountedRef.current) {
          setErrorMessage(
            err instanceof Error ? err.message : "アップロード失敗",
          );
          setPhase("error");
          setTimeout(() => {
            if (!isUnmountedRef.current) setPhase("idle");
          }, 5000);
        }
      }
    })();
  }, [session, phase, recorder, sessionId]);

  const handleJoin = async () => {
    const ok = await recorder.acquirePermission();
    if (!ok) {
      throw new Error(
        "マイクアクセスが必要です。ブラウザ設定で許可してください。",
      );
    }
    const started = await recorder.start();
    if (!started) {
      throw new Error("録音を開始できませんでした");
    }
    const res = await authFetch(
      `/api/student/sessions/${sessionId}/join-recording`,
      { method: "POST" },
    );
    if (!res.ok) {
      await recorder.stop();
      throw new Error("参加登録に失敗しました");
    }
    setPhase("recording");
    hasHandledStopRef.current = false;
  };

  const handleSkip = () => {
    setPhase("skipped");
  };

  const showBanner =
    phase === "recording" ||
    phase === "uploading" ||
    phase === "done" ||
    phase === "error";

  return (
    <>
      {showBanner && (
        <StudentRecordingBanner
          state={
            phase === "recording"
              ? "recording"
              : phase === "uploading"
                ? "uploading"
                : phase === "done"
                  ? "done"
                  : "error"
          }
          durationSec={recorder.durationSec}
          errorMessage={errorMessage}
        />
      )}
      <StudentRecordingJoinModal
        open={phase === "prompted"}
        onJoin={handleJoin}
        onSkip={handleSkip}
        teacherName={teacherName}
      />
    </>
  );
}

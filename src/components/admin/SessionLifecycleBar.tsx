"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Play,
  Square,
  CheckCircle2,
  CircleX,
  Loader2,
  Mic,
  MicOff,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/api/client";
import { useSessionRecorder } from "@/lib/audio/useSessionRecorder";
import type { Session } from "@/lib/types/session";

interface Props {
  sessionId: string;
  session: Session;
  onSessionUpdate: (s: Session) => void;
}

type PostFlowStep =
  | "idle"
  | "stopping"
  | "uploading"
  | "transcribing"
  | "completed"
  | "error";

const MAX_RECORDING_SEC = 150 * 60; // 150min hard limit
const WARN_RECORDING_SEC = 120 * 60;
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Waveform({ level }: { level: number }) {
  const bars = 8;
  const heights = useMemo(() => {
    const base = Math.max(0.15, level);
    return Array.from({ length: bars }, (_, i) => {
      const wave = Math.sin((Date.now() / 100 + i) * 0.4);
      const h = Math.min(1, Math.max(0.15, base * (0.6 + Math.abs(wave) * 0.6)));
      return h;
    });
  }, [level]);
  return (
    <div className="flex items-end gap-0.5 h-5">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-rose-500 transition-all"
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function SessionLifecycleBar({ sessionId, session, onSessionUpdate }: Props) {
  const recorder = useSessionRecorder({ acquireOnMount: true });
  const [postFlow, setPostFlow] = useState<PostFlowStep>("idle");
  const [postError, setPostError] = useState<string | null>(null);

  const permissionIssue =
    recorder.state === "error-permission" ||
    recorder.state === "error-unsupported";

  const exceedsLimit = recorder.durationSec >= MAX_RECORDING_SEC;
  const approachingLimit =
    recorder.durationSec >= WARN_RECORDING_SEC && !exceedsLimit;

  // 上限到達で自動停止
  useEffect(() => {
    if (recorder.state === "recording" && exceedsLimit) {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exceedsLimit, recorder.state]);

  const handleStart = async () => {
    const ok = await recorder.start();
    if (!ok) return;
    try {
      const res = await authFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "in_progress",
          startedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Session;
        onSessionUpdate(updated);
      }
    } catch (err) {
      console.warn("[lifecycle] status update failed:", err);
    }
  };

  const handleStop = async () => {
    setPostFlow("stopping");
    setPostError(null);
    const blob = await recorder.stop();
    if (!blob) {
      setPostError("録音停止に失敗しました");
      setPostFlow("error");
      return;
    }
    if (blob.size > MAX_SIZE_BYTES) {
      setPostError(
        `録音ファイルが 25MB を超えました (${Math.round(blob.size / 1024 / 1024)}MB)。短めに分割して再録音してください。`,
      );
      setPostFlow("error");
      return;
    }

    // Upload
    setPostFlow("uploading");
    try {
      const form = new FormData();
      form.append(
        "file",
        new File([blob], "recording.webm", {
          type: blob.type || "audio/webm",
        }),
      );
      form.append("durationSec", String(recorder.durationSec));
      const up = await authFetch(`/api/admin/sessions/${sessionId}/recording`, {
        method: "POST",
        body: form,
      });
      if (!up.ok) {
        const data = await up.json().catch(() => ({}));
        throw new Error(data.error ?? "アップロード失敗");
      }
      const upData = (await up.json()) as {
        recordingUrl: string;
        recordingPath: string;
        recordingSizeBytes: number;
        recordingDurationSec: number;
      };
      onSessionUpdate({
        ...session,
        ...upData,
        status: "completed",
        endedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      setPostError(err instanceof Error ? err.message : "アップロード失敗");
      setPostFlow("error");
      return;
    }

    // Transcribe
    setPostFlow("transcribing");
    try {
      const tr = await authFetch(
        `/api/admin/sessions/${sessionId}/transcribe-recording`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto: true }),
        },
      );
      if (!tr.ok) {
        const data = await tr.json().catch(() => ({}));
        throw new Error(data.error ?? "文字起こし失敗");
      }
      const trData = (await tr.json()) as {
        transcription: Session["transcription"];
        debriefNotes: string;
      };
      onSessionUpdate({
        ...session,
        status: "completed",
        endedAt: new Date().toISOString(),
        transcription: trData.transcription,
        debrief: {
          ...(session.debrief ?? {
            notes: "",
            newWeaknessAreas: [],
            parentSummary: "",
            nextAgendaSeed: "",
            capturedAt: "",
          }),
          notes: trData.debriefNotes,
          capturedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error(err);
      setPostError(
        err instanceof Error ? err.message : "文字起こしに失敗しました",
      );
      // transcription 失敗でも録音自体は完了しているので status は completed のまま
    }

    // Patch status → completed
    try {
      await authFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          endedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn("[lifecycle] complete status update failed:", err);
    }

    setPostFlow("completed");
  };

  const renderMicBar = () => {
    if (permissionIssue) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/30">
          <MicOff className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="flex-1 text-rose-800 dark:text-rose-200">
            {recorder.error ?? "マイクアクセスが許可されていません"}。ブラウザ設定で許可してください。
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => recorder.acquirePermission()}
            className="cursor-pointer"
          >
            再試行
          </Button>
        </div>
      );
    }
    if (recorder.state === "requesting-permission") {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <Loader2 className="size-4 text-amber-600 animate-spin shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">
            マイクアクセスを確認中...
          </span>
        </div>
      );
    }
    if (recorder.state === "idle") {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <Mic className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="flex-1 text-amber-800 dark:text-amber-200">
            授業前にマイクアクセスを許可してください
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => recorder.acquirePermission()}
            className="cursor-pointer"
          >
            許可する
          </Button>
        </div>
      );
    }
    return null;
  };

  const renderScheduled = () => (
    <div className="flex flex-col gap-3">
      {renderMicBar()}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          準備ができたら授業を開始してください
        </div>
        <Button
          onClick={handleStart}
          disabled={recorder.state !== "ready"}
          size="lg"
          className="cursor-pointer gap-2 bg-teal-500 hover:bg-teal-600 text-white"
        >
          <Play className="size-5" />
          授業を開始
        </Button>
      </div>
    </div>
  );

  const renderInProgress = () => (
    <div className="flex flex-col gap-3">
      {approachingLimit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-800 dark:text-amber-200">
            25MB 制限に近づいています。あと {Math.max(0, MAX_RECORDING_SEC - recorder.durationSec)} 秒ほどで上限停止します。
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-rose-500" />
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {formatTime(recorder.durationSec)}
          </span>
          <Waveform level={recorder.peakLevel} />
        </div>
        <Button
          onClick={handleStop}
          size="lg"
          className="cursor-pointer gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Square className="size-5" />
          授業を終了
        </Button>
      </div>
    </div>
  );

  const renderPostFlow = () => {
    const steps: Array<{ key: PostFlowStep; label: string }> = [
      { key: "stopping", label: "停止中" },
      { key: "uploading", label: "アップロード中" },
      { key: "transcribing", label: "文字起こし中" },
      { key: "completed", label: "完了" },
    ];
    const currentIdx = steps.findIndex((s) => s.key === postFlow);
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className={`flex items-center gap-1.5 text-xs ${
              i < currentIdx
                ? "text-emerald-600"
                : i === currentIdx
                  ? "text-teal-600 font-medium"
                  : "text-muted-foreground/60"
            }`}
          >
            {i < currentIdx ? (
              <CheckCircle2 className="size-4" />
            ) : i === currentIdx && postFlow !== "completed" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className="size-2 rounded-full bg-current" />
            )}
            {s.label}
          </div>
        ))}
      </div>
    );
  };

  const renderCompleted = () => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-3" />
          授業完了
        </Badge>
        {session.endedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(session.endedAt).toLocaleString("ja-JP")}
          </span>
        )}
        {session.recordingDurationSec !== undefined && (
          <span className="text-xs text-muted-foreground">
            · {formatTime(session.recordingDurationSec)}
          </span>
        )}
      </div>
    </div>
  );

  const renderCancelled = () => (
    <Badge
      variant="outline"
      className="gap-1 border-rose-200 bg-rose-50 text-rose-700"
    >
      <CircleX className="size-3" />
      キャンセル済み
    </Badge>
  );

  return (
    <Card>
      <CardContent className="p-4">
        {postFlow !== "idle" && postFlow !== "completed" && renderPostFlow()}
        {postFlow === "error" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {postError}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPostFlow("idle");
                setPostError(null);
                recorder.reset();
              }}
              className="ml-2 cursor-pointer"
            >
              やり直す
            </Button>
          </div>
        )}
        {postFlow === "idle" && (
          <>
            {session.status === "scheduled" && renderScheduled()}
            {session.status === "in_progress" &&
              recorder.state === "recording" &&
              renderInProgress()}
            {session.status === "in_progress" &&
              recorder.state !== "recording" &&
              renderScheduled()}
            {session.status === "completed" && renderCompleted()}
            {session.status === "cancelled" && renderCancelled()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

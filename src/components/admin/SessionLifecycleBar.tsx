"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Play,
  Square,
  CheckCircle2,
  CircleX,
  Loader2,
  Mic,
  MicOff,
  AlertTriangle,
  Upload,
  Download,
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
  /**
   * 「授業を開始」を出すか。オンラインの回はセッション画面では出さず、通話画面で録る
   * （両方で録れると二重に録音される）。取り込みと完了表示はどちらでも出す。
   */
  allowStart?: boolean;
}

type PostFlowStep =
  | "idle"
  | "stopping"
  | "uploading"
  | "transcribing"
  | "analyzing"
  | "completed"
  | "error";

const MAX_RECORDING_SEC = 150 * 60; // 150min hard limit
const WARN_RECORDING_SEC = 120 * 60;
const MAX_SIZE_BYTES = 25 * 1024 * 1024;
/**
 * 録音のビットレート。25MB（文字起こしの上限）に150分が収まる値。
 * 既定の 24kbps だと約138分で25MBを超え、上限の150分まで録ると保存できなかった。
 */
const RECORDING_BITS_PER_SECOND = 20_000;
/** 録音中に生徒の参加を確かめる間隔 */
const STUDENT_POLL_MS = 10_000;

/** 生徒側のアップロードが完了するまで session ドキュメントをポーリング (最大 timeoutMs) */
async function waitForStudentUpload(
  sessionId: string,
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await authFetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const s = (await res.json()) as Session;
        if (s.studentRecordingPath) return true;
        if (!s.recordingState?.studentRecording && !s.studentRecordingPath) {
          // 生徒がアップロードせずに早期離脱したケース → 待たない
          return false;
        }
      }
    } catch {
      // 無視してリトライ
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

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

export function SessionLifecycleBar({
  sessionId,
  session,
  onSessionUpdate,
  allowStart = true,
}: Props) {
  const recorder = useSessionRecorder({
    // 開始できない画面ではマイクの許可を求めない
    acquireOnMount: allowStart,
    audioBitsPerSecond: RECORDING_BITS_PER_SECOND,
  });
  const [postFlow, setPostFlow] = useState<PostFlowStep>("idle");
  const [postError, setPostError] = useState<string | null>(null);
  /** 録音は保存できたが、文字起こし・振り返りの下書きが失敗したとき */
  const [postWarning, setPostWarning] = useState<string | null>(null);
  /**
   * 録音中に生徒が参加したか。画面は開いた時点の session しか持たないので、
   * 録音中だけサーバーに確かめに行く。
   */
  const [studentJoined, setStudentJoined] = useState(false);

  const permissionIssue =
    recorder.state === "error-permission" ||
    recorder.state === "error-unsupported";

  const exceedsLimit = recorder.durationSec >= MAX_RECORDING_SEC;
  const approachingLimit =
    recorder.durationSec >= WARN_RECORDING_SEC && !exceedsLimit;

  useEffect(() => {
    if (recorder.state !== "recording") return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await authFetch(`/api/sessions/${sessionId}`);
        if (!res.ok || cancelled) return;
        const s = (await res.json()) as Session;
        if (!cancelled) setStudentJoined(Boolean(s.recordingState?.studentRecording));
      } catch {
        // 次の確認で取り直す
      }
    };
    void check();
    const timer = window.setInterval(check, STUDENT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [recorder.state, sessionId]);

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
    setStudentJoined(false);
    const startedAt = new Date().toISOString();
    try {
      const res = await authFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "in_progress",
          startedAt,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Session;
        onSessionUpdate(updated);
      }
    } catch (err) {
      console.warn("[lifecycle] status update failed:", err);
    }
    // Phase 2: recordingState を更新して生徒側に通知
    try {
      await authFetch(
        `/api/admin/sessions/${sessionId}/recording-state`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherRecording: true,
            teacherStartedAt: startedAt,
          }),
        },
      );
    } catch (err) {
      console.warn("[lifecycle] recording-state update failed:", err);
    }
  };

  const handleStop = async () => {
    setPostFlow("stopping");
    setPostError(null);
    const stopRequestedAt = new Date().toISOString();
    // Phase 2: 生徒側に停止シグナル (生徒が参加している場合のみ意味を持つ)
    try {
      await authFetch(
        `/api/admin/sessions/${sessionId}/recording-state`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherRecording: false,
            stopRequestedAt,
          }),
        },
      );
    } catch (err) {
      console.warn("[lifecycle] stop signal failed:", err);
    }

    const blob = await recorder.stop();
    if (!blob) {
      setPostError("録音停止に失敗しました");
      setPostFlow("error");
      return;
    }
    // 生徒が参加していれば、生徒側のアップロードを最大60秒待つ。
    // 開いた時点の session ではなく、サーバーの今の状態で判断する
    await uploadAndTranscribe(
      new File([blob], "recording", { type: blob.type || "audio/webm" }),
      recorder.durationSec,
      { waitForStudent: true },
    );
  };

  /**
   * 録音を保存し、文字起こし → 振り返りの下書きまで進めて、授業を完了にする。
   * 授業の終了・取り込み・再アップロードのどれもここを通る（取り込みは以前、
   * 保存だけして文字起こしにもサーバー側の完了にも進まなかった）。
   */
  const uploadAndTranscribe = async (
    file: File,
    durationSec: number,
    opts: { waitForStudent?: boolean } = {},
  ) => {
    if (file.size > MAX_SIZE_BYTES) {
      setPostError(
        `録音ファイルが 25MB を超えています (${Math.round(file.size / 1024 / 1024)}MB)。分割してください。`,
      );
      setPostFlow("error");
      return;
    }
    setPostError(null);
    setPostWarning(null);
    setPostFlow("uploading");
    let next: Session;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("durationSec", String(durationSec));
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
      next = {
        ...session,
        ...upData,
        // 前の録音の文字起こしはサーバー側で消えている
        transcription: undefined,
        lessonTranscript: undefined,
        status: "completed",
        endedAt: new Date().toISOString(),
      };
      onSessionUpdate(next);
    } catch (err) {
      console.error(err);
      setPostError(err instanceof Error ? err.message : "アップロード失敗");
      setPostFlow("error");
      return;
    }

    // 録音は保存できたので、ここから先が失敗しても授業は完了にする
    try {
      await authFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          endedAt: next.endedAt,
        }),
      });
    } catch (err) {
      console.warn("[lifecycle] complete status update failed:", err);
    }

    if (opts.waitForStudent) {
      setPostFlow("transcribing");
      await waitForStudentUpload(sessionId, 60_000);
    }

    await transcribeAndReflect(next);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** 端末に保存済みの録音ファイルをこのセッションに取り込む（救出した録音の復旧・事前録音） */
  const handleUploadFile = (file: File) => {
    void uploadAndTranscribe(file, 0);
  };

  /**
   * 保存済みの録音を文字起こしし、振り返りを下書きする。失敗しても録音は残っているので、
   * 授業は完了のまま警告を出す（以前はエラーを捨てて、失敗が画面に出なかった）。
   */
  const transcribeAndReflect = async (base: Session) => {
    setPostWarning(null);
    setPostFlow("transcribing");
    let next = base;
    try {
      const tr = await authFetch(
        `/api/admin/sessions/${sessionId}/merge-transcriptions`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      if (!tr.ok) {
        const data = await tr.json().catch(() => ({}));
        throw new Error(data.error ?? "文字起こしに失敗しました");
      }
      const trData = (await tr.json()) as {
        lessonTranscript?: Session["lessonTranscript"];
      };
      next = { ...next, lessonTranscript: trData.lessonTranscript };
      onSessionUpdate(next);
      if (trData.lessonTranscript?.fullText?.trim()) {
        setPostFlow("analyzing");
        const ex = await authFetch(
          `/api/admin/sessions/${sessionId}/extract-reflection`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
        );
        if (!ex.ok) throw new Error("振り返りの下書きに失敗しました");
        const exData = (await ex.json()) as {
          debrief: Session["debrief"];
          summary?: Session["summary"] | null;
        };
        next = {
          ...next,
          ...(exData.debrief ? { debrief: exData.debrief } : {}),
          ...(exData.summary ? { summary: exData.summary } : {}),
        };
        onSessionUpdate(next);
      }
    } catch (err) {
      console.error(err);
      setPostWarning(
        `録音は保存しました。${err instanceof Error ? err.message : "文字起こしに失敗しました"}`,
      );
    }
    setPostFlow("completed");
  };

  /** メモリ上の録音（recorder.blob）を端末にダウンロードする（アップロード失敗時の保全）。 */
  const handleDownloadRecording = () => {
    const b = recorder.blob;
    if (!b) return;
    const t = b.type || "";
    const ext = t.includes("ogg") ? "ogg" : t.includes("mp4") ? "m4a" : t.includes("wav") ? "wav" : "webm";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `session-recording.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /** メモリ上の録音（recorder.blob）をそのままサーバへ送り直す（失敗時の再送。録音し直し不要）。 */
  const handleReuploadRecording = () => {
    const b = recorder.blob;
    if (!b) return;
    const file = new File([b], "recording.webm", { type: b.type || "audio/webm" });
    void uploadAndTranscribe(file, recorder.durationSec, { waitForStudent: true });
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
      {allowStart && renderMicBar()}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {allowStart && "準備ができたら授業を開始してください"}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/webm,video/mp4"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUploadFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer gap-1.5 text-muted-foreground"
            title="端末に保存済みの録音ファイルをこのセッションに取り込む"
          >
            <Upload className="size-4" />
            録音ファイルを取り込む
          </Button>
          {allowStart && (
            <Button
              onClick={handleStart}
              disabled={recorder.state !== "ready"}
              size="lg"
              className="cursor-pointer gap-2 bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Play className="size-5" />
              授業を開始
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderInProgress = () => (
    <div className="flex flex-col gap-3">
      {approachingLimit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-800 dark:text-amber-200">
            録音の上限（150分）に近づいています。あと {Math.ceil(Math.max(0, MAX_RECORDING_SEC - recorder.durationSec) / 60)} 分ほどで自動で終了します。
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
          {studentJoined && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              生徒参加中
            </Badge>
          )}
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
      { key: "analyzing", label: "分析中" },
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
    <div className="flex flex-col gap-3">
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
      {postWarning && session.recordingPath && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">{postWarning}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void transcribeAndReflect(session)}
            className="cursor-pointer"
          >
            文字起こしをやり直す
          </Button>
        </div>
      )}
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
            <div className="mt-2 flex flex-wrap gap-2">
              {recorder.blob && (
                <Button
                  size="sm"
                  onClick={handleReuploadRecording}
                  className="cursor-pointer gap-1.5"
                  title="録音し直さず、同じ録音をもう一度サーバへ送ります"
                >
                  <Upload className="size-4" />
                  この録音を再アップロード
                </Button>
              )}
              {recorder.blob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadRecording}
                  className="cursor-pointer gap-1.5"
                  title="録音を端末に保存（やり直すと消えるため保全用）"
                >
                  <Download className="size-4" />
                  録音をダウンロード
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (
                    recorder.blob &&
                    !window.confirm(
                      "この録音を破棄してやり直しますか？録音は削除され、元に戻せません。",
                    )
                  ) {
                    return;
                  }
                  setPostFlow("idle");
                  setPostError(null);
                  recorder.reset();
                }}
                className="cursor-pointer text-muted-foreground"
              >
                やり直す
              </Button>
            </div>
          </div>
        )}
        {(postFlow === "idle" || postFlow === "completed") && (
          <>
            {/* 録音中は状態に関係なく終了ボタンを出す（状態の更新に失敗しても止められるように） */}
            {recorder.state === "recording" && renderInProgress()}
            {/* 「終了」は予定時刻を過ぎただけの回。録音の開始・取り込みはまだできる */}
            {recorder.state !== "recording" &&
              (session.status === "scheduled" ||
                session.status === "in_progress" ||
                session.status === "ended") &&
              renderScheduled()}
            {session.status === "completed" && renderCompleted()}
            {session.status === "cancelled" && renderCancelled()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

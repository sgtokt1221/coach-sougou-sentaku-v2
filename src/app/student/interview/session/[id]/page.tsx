"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, StopCircle, ChevronDown, ChevronUp, Video, VideoOff, Pencil, Check, X, BookOpenCheck } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { InterviewMessage, InterviewMode, InterviewInputMode, VoiceAnalysis, VideoAnalysis, AppearanceAnalysis } from "@/lib/types/interview";
import type { WeaknessRecord } from "@/lib/types/growth";
import { useRealtimeInterview } from "@/hooks/useRealtimeInterview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import { FluidLoader } from "@/components/shared/FluidLoader";
import VoiceAnalyzer, { refineWithTranscription } from "@/components/interview/VoiceAnalyzer";
import VideoAnalyzer from "@/components/interview/VideoAnalyzer";
import CameraPreview from "@/components/interview/CameraPreview";
import {
  splitIntoUtterances,
  DEFAULT_INTERVIEWER,
  GD_SPEAKERS,
} from "@/lib/interview/speakers";

interface SessionInfo {
  universityId: string;
  facultyId: string;
  mode: InterviewMode;
  inputMode?: InterviewInputMode;
  universityContext: {
    universityName: string;
    facultyName: string;
    admissionPolicy: string;
  };
  openingMessage: string;
  presentationContent?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
  const [appearanceAnalysis, setAppearanceAnalysis] = useState<AppearanceAnalysis | null>(null);
  const [appearanceAlert, setAppearanceAlert] = useState<string | null>(null);
  const [gazeAlert, setGazeAlert] = useState<string | null>(null);
  const gazeAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // カンペ機能: 自分の弱点とAPを常時参照できるように
  const [weaknesses, setWeaknesses] = useState<WeaknessRecord[]>([]);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  /** Realtime API を試したか (成功/失敗問わず 1 回だけ試行) */
  const realtimeTriedRef = useRef(false);
  /** Realtime 経路が有効 (true なら従来 Claude 経路は使わない) */
  const [realtimeActive, setRealtimeActive] = useState(false);
  const realtime = useRealtimeInterview({
    mode: sessionInfo?.mode ?? "individual",
    universityId: sessionInfo?.universityId,
    facultyId: sessionInfo?.facultyId,
    universityName: sessionInfo?.universityContext.universityName ?? "",
    facultyName: sessionInfo?.universityContext.facultyName ?? "",
    admissionPolicy: sessionInfo?.universityContext.admissionPolicy ?? "",
    weaknessList: weaknesses.map((w) => `- ${w.area}(${w.count}回)`).join("\n") || "（過去の弱点なし）",
    presentationContent: sessionInfo?.presentationContent,
    onMessageAppend: (m) => {
      setMessages((prev) => [...prev, m]);
    },
  });
  const appearanceCheckCount = useRef(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  /** 編集中のメッセージインデックス。null なら編集していない */
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const startEditMessage = useCallback((idx: number) => {
    setEditingIdx(idx);
    setEditDraft(messages[idx]?.content ?? "");
  }, [messages]);

  const commitEditMessage = useCallback(() => {
    if (editingIdx === null) return;
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditingIdx(null);
      return;
    }
    setMessages((prev) =>
      prev.map((m, i) => (i === editingIdx ? { ...m, content: trimmed } : m)),
    );
    setEditingIdx(null);
    setEditDraft("");
  }, [editingIdx, editDraft]);

  const cancelEditMessage = useCallback(() => {
    setEditingIdx(null);
    setEditDraft("");
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load session info from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`interview_session_${sessionId}`);
    if (!stored) return;

    const info: SessionInfo = JSON.parse(stored);
    setSessionInfo(info);

    // 音声モードは Realtime API が transcript を append するので pre-insert しない
    // テキストモードは Claude 生成の openingMessage を初期表示
    if (info.inputMode === "voice") {
      setMessages([]);
    } else {
      setMessages([{ role: "ai", content: info.openingMessage }]);
    }

    // 音声モードはカメラを自動有効化 (顔認識・視線指導)
    if (info.inputMode === "voice") {
      setCameraEnabled(true);
    }
  }, [sessionId]);

  // Restore messages from sessionStorage backup
  useEffect(() => {
    const backup = sessionStorage.getItem(`interview_messages_${sessionId}`);
    if (backup) {
      const parsed: InterviewMessage[] = JSON.parse(backup);
      if (parsed.length > 0) {
        setMessages(parsed);
      }
    }
  }, [sessionId]);

  // Camera initialization
  useEffect(() => {
    if (!cameraEnabled || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        setVideoStream(s);
      })
      .catch(() => {
        setCameraEnabled(false);
      });
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setVideoStream(null);
      }
    };
  }, [cameraEnabled]);

  // Appearance check via Claude Vision
  const runAppearanceCheck = useCallback(async () => {
    if (!videoStream || appearanceCheckCount.current >= 3) return;
    try {
      const video = document.querySelector("video");
      if (!video) return;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 320, 240);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const imageBase64 = dataUrl.split(",")[1];

      const res = await authFetch("/api/interview/appearance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });
      if (!res.ok) return;
      const analysis: AppearanceAnalysis = await res.json();
      setAppearanceAnalysis(analysis);
      appearanceCheckCount.current++;

      const critical = analysis.issues.filter((i) => i.severity === "critical");
      if (critical.length > 0) {
        setAppearanceAlert(critical.map((i) => i.description).join("、"));
        setTimeout(() => setAppearanceAlert(null), 8000);
      }
    } catch {
      // 外見チェック失敗は無視
    }
  }, [videoStream]);

  // Run appearance check on camera start and every 5 minutes
  useEffect(() => {
    if (!videoStream) return;
    // Initial check after 3 seconds (let camera stabilize)
    const initialTimeout = setTimeout(runAppearanceCheck, 3000);
    // Periodic check every 5 minutes
    const interval = setInterval(runAppearanceCheck, 5 * 60 * 1000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [videoStream, runAppearanceCheck]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Realtime API: 音声モードなら 1 度だけ接続を試みる (個人/プレゼン/口頭試問/GD 全モード対応)
  useEffect(() => {
    if (!sessionInfo || realtimeTriedRef.current) return;
    if (sessionInfo.inputMode !== "voice") return;

    realtimeTriedRef.current = true;
    (async () => {
      const result = await realtime.start();
      if (result.success) {
        setRealtimeActive(true);
        setCameraEnabled(true); // カメラ分析は引き続き有効
      }
    })();
  }, [sessionInfo, realtime]);

  // カンペ用: 自分の弱点を取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/growth/weaknesses?context=dashboard");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setWeaknesses(data.weaknesses ?? []);
      } catch {
        /* 弱点取得失敗は静かに無視 (カンペ表示だけなので致命的ではない) */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ページ unmount 時に Realtime セッションと gaze タイマーを片付ける
  useEffect(() => {
    return () => {
      if (gazeAlertTimerRef.current) {
        clearTimeout(gazeAlertTimerRef.current);
        gazeAlertTimerRef.current = null;
      }
      // Realtime セッションを明示終了 (useRealtimeInterview 内にも cleanup あり)
      realtime.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Backup messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(`interview_messages_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // テキストモード専用の送信ハンドラ (Claude 経由)
  // 音声モードは Realtime API が直接音声をやり取りするため、このフローは使わない
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const studentMessage: InterviewMessage = { role: "student", content: text };
    const updatedMessages = [...messages, studentMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await authFetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: updatedMessages,
          mode: sessionInfo?.mode,
          universityContext: sessionInfo?.universityContext,
          presentationContent: sessionInfo?.presentationContent,
          elapsedSeconds: elapsed,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.content }]);
      if (!data.isActive) {
        setShowEndDialog(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠ 通信エラーが発生しました。もう一度お話しください。" },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, sessionId, sessionInfo, elapsed]);

  async function handleEnd() {
    setIsEnding(true);
    try {
      console.log("[handleEnd] Sending messages:", messages.length, "turns, duration:", elapsed);
      console.log("[handleEnd] Messages:", JSON.stringify(messages.map(m => ({ role: m.role, content: m.content.slice(0, 50) }))));

      // フィラー・相槌検出のため、ユーザー発言の文字起こしを集約して refineWithTranscription を呼ぶ
      let refinedVoiceAnalysis = voiceAnalysis;
      if (voiceAnalysis) {
        const studentTexts = messages
          .filter((m) => m.role === "student")
          .map((m) => m.content)
          .join(" ");
        if (studentTexts.length > 0) {
          refinedVoiceAnalysis = refineWithTranscription(
            voiceAnalysis,
            studentTexts,
            elapsed,
          );
        }
      }

      const res = await authFetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, messages, duration: elapsed,
          mode: sessionInfo?.mode,
          presentationContent: sessionInfo?.presentationContent,
          ...(refinedVoiceAnalysis ? { voiceAnalysis: refinedVoiceAnalysis } : {}),
          ...(videoAnalysis ? { videoAnalysis } : {}),
          ...(appearanceAnalysis ? { appearanceAnalysis } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Store result for immediate display on result page
      sessionStorage.setItem(`interview_result_${data.interviewId}`, JSON.stringify({
        ...data,
        messages,
        universityName: sessionInfo?.universityContext?.universityName ?? "",
        facultyName: sessionInfo?.universityContext?.facultyName ?? "",
        mode: sessionInfo?.mode ?? "individual",
        duration: elapsed,
        practicedAt: new Date().toISOString(),
      }));
      sessionStorage.removeItem(`interview_session_${sessionId}`);
      sessionStorage.removeItem(`interview_messages_${sessionId}`);
      router.push(`/student/interview/${data.interviewId}/result`);
    } catch (err) {
      console.error("Interview end failed:", err);
      alert("面接結果の生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsEnding(false);
      setShowEndDialog(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // 修飾キーなしの Enter は送信しない (IME 確定との衝突防止)
    // 送信: Cmd/Ctrl+Enter または Shift+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isVoiceMode = sessionInfo?.inputMode === "voice";
  const modeLabel = sessionInfo ? INTERVIEW_MODE_LABELS[sessionInfo.mode] : "";

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-76px)] lg:h-[calc(100dvh-3.5rem)] max-w-2xl lg:max-w-3xl mx-auto">
      {/* 採点中ローディング */}
      <FluidLoader
        visible={isEnding}
        title="AI が採点中"
        stages={[
          "会話内容を分析しています...",
          "論理性と構成力を評価しています...",
          "AP との合致度を判定しています...",
          "改善ポイントを整理しています...",
          "最終スコアを算出しています...",
        ]}
        stageInterval={2200}
        subtitle="通常 10〜20 秒かかります"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div>
          <p className="font-semibold text-sm">
            {sessionInfo
              ? `${sessionInfo.universityContext.universityName} ${sessionInfo.universityContext.facultyName}`
              : "面接セッション"}
          </p>
          <p className="text-xs text-muted-foreground">
            {modeLabel}
            {sessionInfo?.mode === "group_discussion" && " — 教員3名 + 他受験生3名が参加"}
            {sessionInfo?.mode === "presentation" && " — プレゼン後に質疑応答"}
            {sessionInfo?.mode === "oral_exam" && " — 専門知識を問う試問"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCameraEnabled((v) => !v)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${cameraEnabled ? "text-emerald-600 bg-emerald-50" : "text-muted-foreground hover:text-foreground"}`}
            title={cameraEnabled ? "カメラ分析ON" : "カメラ分析OFF"}
          >
            {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </button>
          <button
            onClick={() => setCheatSheetOpen((v) => !v)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${cheatSheetOpen ? "text-sky-600 bg-sky-50" : "text-muted-foreground hover:text-foreground"}`}
            title={cheatSheetOpen ? "カンペを閉じる" : "弱点とAPをカンペ表示"}
          >
            <BookOpenCheck className="size-4" />
          </button>
          <span
            className={`text-sm font-mono tabular-nums ${
              sessionInfo?.mode === "group_discussion" && elapsed >= 14 * 60
                ? "text-rose-600 font-semibold"
                : sessionInfo?.mode === "group_discussion" && elapsed >= 11 * 60
                  ? "text-amber-600 font-semibold"
                  : "text-muted-foreground"
            }`}
          >
            {formatTime(elapsed)}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEndDialog(true)}
          >
            <StopCircle className="size-4 mr-1" />
            終了
          </Button>
        </div>
      </div>

      {/* Appearance alert */}
      {appearanceAlert && (
        <div className="mx-4 mt-2 rounded-lg border border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-300 animate-in fade-in slide-in-from-top-2">
          <strong>身だしなみ:</strong> {appearanceAlert}
        </div>
      )}


      {/* Gaze alert (リアルタイム視線指導) */}
      {gazeAlert && (
        <div className="mx-4 mt-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 animate-in fade-in slide-in-from-top-2">
          <strong>目線:</strong> {gazeAlert}
        </div>
      )}

      {/* カンペ: 弱点 + アドミッションポリシー */}
      {cheatSheetOpen && sessionInfo && (
        <div className="mx-4 mt-2 rounded-lg border border-sky-300 bg-sky-50/60 dark:border-sky-700 dark:bg-sky-950/20 shrink-0 animate-in fade-in slide-in-from-top-2">
          <div className="max-h-[38vh] overflow-y-auto px-3 py-2.5 space-y-3">
            {/* 指摘されている弱点 */}
            <div>
              <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-200 mb-1.5">
                ⚠ 自分の弱点 (カンペ)
              </p>
              {weaknesses.length === 0 ? (
                <p className="text-xs text-muted-foreground">指摘された弱点はまだありません</p>
              ) : (
                <ul className="space-y-0.5">
                  {weaknesses
                    .filter((w) => !w.resolved)
                    .slice(0, 8)
                    .map((w) => (
                      <li key={w.area} className="text-xs text-foreground/90 flex items-center gap-1.5">
                        <span className="inline-block size-1.5 rounded-full bg-rose-400" />
                        <span className="flex-1">{w.area}</span>
                        <span className="text-[10px] text-muted-foreground">{w.count}回</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            {/* アドミッションポリシー */}
            <div>
              <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-200 mb-1.5">
                📘 {sessionInfo.universityContext.universityName} {sessionInfo.universityContext.facultyName} のAP
              </p>
              <p className="text-xs leading-relaxed text-foreground/85 whitespace-pre-wrap">
                {sessionInfo.universityContext.admissionPolicy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {sessionInfo?.mode === "group_discussion" && messages.length > 0 && (
          <div className="mb-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">
              👥 集団討論の参加者
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(GD_SPEAKERS).map((sp) => (
                <span
                  key={sp.role}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${sp.colorClass}`}
                  title={sp.description}
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-white/70 text-[9px] font-bold">
                    {sp.avatar}
                  </span>
                  {sp.displayName}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  あ
                </span>
                あなた
              </span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "student") {
            const isEditing = editingIdx === i;
            return (
              <div key={i} className="flex justify-end group">
                {isEditing ? (
                  <div className="w-full max-w-[90%] lg:max-w-[80%] rounded-2xl rounded-tr-sm border-2 border-primary bg-primary/5 p-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full min-h-[60px] text-sm bg-background rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          commitEditMessage();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEditMessage();
                        }
                      }}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        ⌘+Enterで保存 / Escでキャンセル
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={cancelEditMessage}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                          type="button"
                        >
                          <X className="size-3" />
                          取消
                        </button>
                        <button
                          onClick={commitEditMessage}
                          className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                          type="button"
                        >
                          <Check className="size-3" />
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEditMessage(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
                      title="発言を編集(誤変換を修正)"
                      aria-label="発言を編集"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <div className="max-w-[85%] lg:max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // AI 発言: GDモードなら複数発言を話者別カードに分解、それ以外は従来の吹き出し
          if (sessionInfo?.mode === "group_discussion") {
            const utterances = splitIntoUtterances(msg.content, DEFAULT_INTERVIEWER);
            return (
              <div key={i} className="flex flex-col gap-2">
                {utterances.map((u, j) => (
                  <div key={j} className="flex justify-start">
                    <div
                      className={`max-w-[90%] lg:max-w-[80%] rounded-2xl rounded-tl-sm border px-3 py-2 ${u.profile.colorClass}`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="flex size-5 items-center justify-center rounded-full bg-white/70 text-[10px] font-bold">
                          {u.profile.avatar}
                        </span>
                        <span className="text-xs font-semibold">
                          {u.profile.displayName}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {u.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // 個人面接・プレゼン・口頭試問: 従来通り
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] lg:max-w-[75%] rounded-2xl rounded-tl-sm bg-muted text-foreground px-4 py-2 text-sm">
                {msg.content}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Memo area */}
      <div className="px-4 border-t shrink-0">
        <button
          onClick={() => setMemoOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-muted-foreground py-2"
        >
          {memoOpen ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          メモ
        </button>
        {memoOpen && (
          <textarea
            className="w-full h-20 text-xs rounded border bg-muted/50 p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring mb-2"
            placeholder="面接中のメモ（採点には影響しません）"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-background shrink-0">
        {isVoiceMode ? (
          // 音声モードは OpenAI Realtime API が直接双方向音声を扱う
          realtimeActive ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              マイクが常時有効です。自然に話してください
            </div>
          ) : realtime.status === "fallback_rate_limited" ? (
            <div className="flex flex-col items-center justify-center gap-1 py-3 text-sm text-amber-700">
              <span>音声モードの面接は 7 日に 1 回までです</span>
              {realtime.nextAvailableAt && (
                <span className="text-[12px]">
                  次回は {new Date(realtime.nextAvailableAt).toLocaleDateString("ja-JP")} から利用できます
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">それまではテキストモードで練習できます</span>
            </div>
          ) : realtime.status === "fallback_error" ? (
            <div className="flex flex-col items-center justify-center gap-1 py-3 text-sm text-rose-600">
              <span>Realtime 接続に失敗しました</span>
              {realtime.error && <span className="text-[11px] font-mono">{realtime.error.slice(0, 200)}</span>}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <span className="inline-flex size-2 rounded-full bg-sky-500 animate-pulse" />
              Realtime セッションを準備中... ({realtime.status})
            </div>
          )
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-lg border bg-background px-3 py-2.5 lg:px-4 lg:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="回答を入力 (Cmd/Ctrl+Enter で送信)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              <Send className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Camera Preview & Video Analyzer */}
      {videoStream && <CameraPreview mediaStream={videoStream} />}
      {videoStream && (
        <VideoAnalyzer
          mediaStream={videoStream}
          isRecording={!isEnding && elapsed > 0}
          onAnalysisComplete={setVideoAnalysis}
          onGazeAlert={(msg) => {
            setGazeAlert(msg);
            if (gazeAlertTimerRef.current) clearTimeout(gazeAlertTimerRef.current);
            gazeAlertTimerRef.current = setTimeout(() => setGazeAlert(null), 6000);
          }}
        />
      )}

      {/* Voice Analyzer (音声モード時のみ、Realtime のマイクストリームを共有) */}
      {isVoiceMode && realtime.micStream && (
        <VoiceAnalyzer
          mediaStream={realtime.micStream}
          isRecording={realtimeActive && !isEnding}
          onAnalysisComplete={setVoiceAnalysis}
        />
      )}

      {/* End Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>面接を終了しますか？</DialogTitle>
            <DialogDescription>
              採点・フィードバックを受けるか、評価なしで終了できます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              disabled={isEnding}
            >
              続ける
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                realtime.stop();
                router.push("/student/interview/history");
              }}
              disabled={isEnding}
            >
              評価せずに終了
            </Button>
            <Button onClick={handleEnd} disabled={isEnding}>
              {isEnding ? "採点中..." : "終了して採点"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Send, StopCircle, ChevronDown, ChevronUp, Video, VideoOff, Pencil, Check, X, BookOpenCheck, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StudentProfile } from "@/lib/types/user";
import type { InterviewMessage, InterviewMode, InterviewInputMode, VoiceAnalysis, VideoAnalysis, AppearanceAnalysis } from "@/lib/types/interview";
import { getWeaknessReminderLevel, type WeaknessRecord } from "@/lib/types/growth";
import { useRealtimeInterview } from "@/hooks/useRealtimeInterview";
import type { VoiceProvider } from "@/lib/interview/realtime/voice-session-factory";
import { resolveVoiceProvider } from "@/lib/interview/voice-provider";
import { stripFillers } from "@/lib/interview/transcript";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import { FluidLoader } from "@/components/shared/FluidLoader";
import VoiceAnalyzer, { refineWithTranscription, type VoiceAnalyzerHandle } from "@/components/interview/VoiceAnalyzer";
import VideoAnalyzer, { type VideoAnalyzerHandle } from "@/components/interview/VideoAnalyzer";
import CameraPreview from "@/components/interview/CameraPreview";
import { SavedDrillsReference } from "@/components/interview/SavedDrillsReference";
import { BestAnswersReference } from "@/components/interview/BestAnswersReference";
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
  /** 音声プロバイダ（/new で選択。未指定なら resolveVoiceProvider で解決） */
  voiceProvider?: VoiceProvider;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// === 弱点カンペ用ヘルパー ===

const CHEAT_BADGE_MAP: Record<"critical" | "warning" | "improving", { label: string; cls: string }> = {
  critical: { label: "重要", cls: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900" },
  warning: { label: "要注意", cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900" },
  improving: { label: "改善中", cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900" },
};

const CHEAT_SOURCE_LABEL: Record<WeaknessRecord["source"], string> = {
  interview: "面接由来",
  interview_skill_check: "面接由来",
  both: "面接・小論文",
  lesson: "授業由来",
  essay: "小論文由来",
  skill_check: "小論文由来",
};

function isInterviewSource(s: WeaknessRecord["source"]): boolean {
  return s === "interview" || s === "interview_skill_check" || s === "both" || s === "lesson";
}

/**
 * カンペ用ソート: 1) 面接由来を上に  2) severity 強い順  3) count 降順
 * resolved は除外。
 */
function sortCheatWeaknesses(list: WeaknessRecord[]): WeaknessRecord[] {
  const weight: Record<string, number> = { critical: 3, warning: 2, normal: 1, improving: 0 };
  return [...list]
    .filter((w) => !w.resolved)
    .sort((a, b) => {
      const ai = isInterviewSource(a.source) ? 1 : 0;
      const bi = isInterviewSource(b.source) ? 1 : 0;
      if (ai !== bi) return bi - ai;
      const al = getWeaknessReminderLevel(a) ?? "normal";
      const bl = getWeaknessReminderLevel(b) ?? "normal";
      if (weight[al] !== weight[bl]) return weight[bl] - weight[al];
      return b.count - a.count;
    });
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;
  const { userProfile } = useAuth();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  // フィラー件数分析用に、除去前の生の生徒発話を保持（表示/保存は除去済みを使う）
  const rawStudentTextsRef = useRef<string[]>([]);
  // 生徒バブルの識別子採番（「認識中…」→STT結果の差し替え対象特定用）
  const studentMsgIdRef = useRef(0);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
  // 終了時に確定値を同期取得するための ref (state 反映待ちのレース回避)
  const voiceAnalyzerRef = useRef<VoiceAnalyzerHandle | null>(null);
  const videoAnalyzerRef = useRef<VideoAnalyzerHandle | null>(null);
  const [appearanceAnalysis, setAppearanceAnalysis] = useState<AppearanceAnalysis | null>(null);
  const [appearanceAlert, setAppearanceAlert] = useState<string | null>(null);
  const [gazeAlert, setGazeAlert] = useState<string | null>(null);
  const gazeAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // カンペ機能: 自分の弱点とAPを常時参照できるように
  const [weaknesses, setWeaknesses] = useState<WeaknessRecord[]>([]);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  /** 弱点カンペ: 初期は 3 件、クリックで 5 件まで展開 */
  const [cheatExpanded, setCheatExpanded] = useState(false);
  /** Realtime API を試したか (成功/失敗問わず 1 回だけ試行) */
  const realtimeTriedRef = useRef(false);
  /** 履歴から再開した場合の過去メッセージ（音声 seed / テキスト復元に使用） */
  const resumeMessagesRef = useRef<InterviewMessage[] | null>(null);
  /** 終了処理に入ったら自動保存を止めるフラグ */
  const endedRef = useRef(false);
  /** Realtime 経路が有効 (true なら従来 Claude 経路は使わない) */
  const [realtimeActive, setRealtimeActive] = useState(false);

  /**
   * 生徒の発話音声(WAV)を専用STT(gpt-4o-transcribe + 語彙ヒント)に通し、「認識中…」
   * バブルを高精度テキストへ差し替える。語彙ヒントに大学/学部・氏名/高校を渡す。
   * 音声なし/STT失敗/空のときは Gemini 内蔵文字起こし(fallbackText)にフォールバック。
   */
  const sttStudentTurn = useCallback(
    async (id: string, audioWavBase64: string | undefined, fallbackText: string) => {
      const finalize = (content: string) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content, correcting: false } : m)),
        );
      if (!audioWavBase64) {
        finalize(fallbackText);
        return;
      }
      try {
        const res = await authFetch("/api/interview/stt-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioWavBase64,
            universityName: sessionInfo?.universityContext.universityName,
            facultyName: sessionInfo?.universityContext.facultyName,
            studentName: userProfile?.displayName,
            highSchoolName: (userProfile as StudentProfile | null)?.school,
          }),
        });
        const data = await res.json().catch(() => null);
        const text =
          data && typeof data.text === "string" && data.text.trim()
            ? data.text
            : fallbackText;
        finalize(text);
      } catch {
        finalize(fallbackText);
      }
    },
    [sessionInfo, userProfile],
  );

  const realtime = useRealtimeInterview({
    mode: sessionInfo?.mode ?? "individual",
    // 音声プロバイダ: /new の選択 → なければ localStorage 上書き/env で解決（既定 openai）。
    // GD は当面 openai 固定（hook 側で吸収）。
    provider: sessionInfo?.voiceProvider ?? resolveVoiceProvider(),
    universityId: sessionInfo?.universityId,
    facultyId: sessionInfo?.facultyId,
    universityName: sessionInfo?.universityContext.universityName ?? "",
    facultyName: sessionInfo?.universityContext.facultyName ?? "",
    admissionPolicy: sessionInfo?.universityContext.admissionPolicy ?? "",
    weaknessList: weaknesses.map((w) => `- ${w.area}(${w.count}回)`).join("\n") || "（過去の弱点なし）",
    presentationContent: sessionInfo?.presentationContent,
    onMessageAppend: (m, audioWavBase64) => {
      if (m.role === "student") {
        // 生テキストは件数分析用に保持
        rawStudentTextsRef.current.push(m.content);
        const fallback = stripFillers(m.content);
        const id = `s${studentMsgIdRef.current++}`;
        // 誤変換を見せないよう、まず「認識中…」で表示（順序保持のため即 append）→
        // 裏で専用STTに通し、返ったら差し替え（音声なし/失敗時は fallback を採用）。
        setMessages((prev) => [
          ...prev,
          { role: "student", content: "認識中…", id, correcting: true },
        ]);
        void sttStudentTurn(id, audioWavBase64, fallback);
      } else {
        setMessages((prev) => [...prev, m]);
      }
    },
    onMessageUpdateLast: (patch) => {
      setMessages((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].role !== "ai") return prev;
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
        return copy;
      });
    },
    onMessageUpdateByResponseId: (responseId, patch) => {
      // delta ストリーミングは responseId 指定で安全に update する
      // (並行 response 時の最後のバブル誤上書きを防ぐ)
      setMessages((prev) => {
        const idx = prev.findLastIndex(
          (m) => m.role === "ai" && m.responseId === responseId,
        );
        if (idx < 0) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...patch };
        return copy;
      });
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

  // セッション情報・会話の初期化。sessionStorage 優先、無ければ Firestore から再開復元。
  useEffect(() => {
    if (!sessionId) return;
    const stored = sessionStorage.getItem(`interview_session_${sessionId}`);
    if (stored) {
      const info: SessionInfo = JSON.parse(stored);
      setSessionInfo(info);
      // sessionStorage に会話バックアップがあれば復元
      const backup = sessionStorage.getItem(`interview_messages_${sessionId}`);
      const parsed: InterviewMessage[] =
        backup ? JSON.parse(backup) : [];
      if (parsed.length > 0) {
        setMessages(parsed);
        resumeMessagesRef.current = parsed;
      } else if (info.inputMode === "voice") {
        setMessages([]);
      } else {
        setMessages([{ role: "ai", content: info.openingMessage }]);
      }
      if (info.inputMode === "voice") setCameraEnabled(true);
      return;
    }

    // sessionStorage 無し（履歴からの再開）→ Firestore から復元
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/interview/${sessionId}/messages`);
        if (!res.ok || cancelled) return;
        const doc = await res.json();
        if (doc.status === "completed") {
          router.replace(`/student/interview/${sessionId}/result`);
          return;
        }
        const info: SessionInfo = {
          universityId: doc.universityId ?? "",
          facultyId: doc.facultyId ?? "",
          mode: doc.mode ?? "individual",
          inputMode: doc.inputMode ?? "text",
          universityContext: doc.universityContext ?? {
            universityName: "",
            facultyName: "",
            admissionPolicy: "",
          },
          openingMessage: doc.openingMessage ?? "",
        };
        if (cancelled) return;
        setSessionInfo(info);
        const msgs: InterviewMessage[] = Array.isArray(doc.messages) ? doc.messages : [];
        resumeMessagesRef.current = msgs;
        if (msgs.length > 0) {
          setMessages(msgs);
        } else if (info.inputMode === "voice") {
          setMessages([]);
        } else {
          setMessages([{ role: "ai", content: info.openingMessage }]);
        }
        if (info.inputMode === "voice") setCameraEnabled(true);
      } catch {
        /* 復元失敗は無視 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

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
      const prior = resumeMessagesRef.current;
      const result = await realtime.start(
        prior && prior.length > 0 ? { priorMessages: prior } : undefined
      );
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

  // 会話を Firestore に自動保存（履歴からの再開用）。終了処理中は保存しない。
  useEffect(() => {
    if (!sessionId || endedRef.current) return;
    const real = messages.filter((m) => !m.isThinking && !m.correcting && m.content?.trim());
    if (real.length === 0) return;
    const timer = setTimeout(() => {
      authFetch(`/api/interview/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: real }),
      }).catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [messages, sessionId]);

  // タブ非表示/離脱時に最新会話を即時 flush（ブラウザを閉じても残す）
  useEffect(() => {
    function flush() {
      if (endedRef.current) return;
      const real = messages.filter((m) => !m.isThinking && !m.correcting && m.content?.trim());
      if (real.length === 0) return;
      authFetch(`/api/interview/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: real }),
        keepalive: true,
      }).catch(() => {});
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
    endedRef.current = true;
    setIsEnding(true);
    try {
      console.log("[handleEnd] Sending messages:", messages.length, "turns, duration:", elapsed);
      console.log("[handleEnd] Messages:", JSON.stringify(messages.map(m => ({ role: m.role, content: m.content.slice(0, 50) }))));

      // 終了時は flush() で蓄積データから確定値を同期取得する。
      // (アナライザの stop 時 emit→setState は handleEnd の後に反映されるため、
      //  state を読むと毎回 null になり「分析されませんでした」になる=レース回避)
      const finalVoice = voiceAnalyzerRef.current?.flush() ?? voiceAnalysis;
      const finalVideo = videoAnalyzerRef.current?.flush() ?? videoAnalysis;

      // フィラー・相槌検出のため、ユーザー発言の文字起こしを集約して refineWithTranscription を呼ぶ
      let refinedVoiceAnalysis = finalVoice;
      if (finalVoice) {
        // フィラー件数は除去前の生テキストから数える（表示/保存は除去済み）
        const studentTexts = rawStudentTextsRef.current.join(" ");
        if (studentTexts.length > 0) {
          refinedVoiceAnalysis = refineWithTranscription(
            finalVoice,
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
          ...(finalVideo ? { videoAnalysis: finalVideo } : {}),
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

  function renderCheatSheet() {
    if (!sessionInfo) return null;
    const sortedWeaknesses = sortCheatWeaknesses(weaknesses);
    const totalShowable = Math.min(sortedWeaknesses.length, 5);
    const displayLimit = cheatExpanded ? 5 : 3;
    const visible = sortedWeaknesses.slice(0, displayLimit);
    const remaining = totalShowable - visible.length;
    return (
      <>
        {/* 指摘されている弱点 */}
        <div>
          <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-200 mb-1.5">
            ⚠ 自分の弱点 (カンペ)
          </p>
          {sortedWeaknesses.length === 0 ? (
            <p className="text-xs text-muted-foreground">指摘された弱点はまだありません</p>
          ) : (
            <>
              <ul className="space-y-1">
                {visible.map((w) => {
                  const level = getWeaknessReminderLevel(w);
                  const badge = level && level !== "resolved" ? CHEAT_BADGE_MAP[level] : null;
                  const trend = w.improving
                    ? { Icon: TrendingDown, cls: "text-emerald-500" }
                    : w.count >= 5
                    ? { Icon: TrendingUp, cls: "text-rose-500" }
                    : null;
                  return (
                    <li
                      key={w.area}
                      className="rounded border border-slate-200/70 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/30 px-2 py-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        {badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                        <span className="text-xs font-medium flex-1 line-clamp-1 text-foreground/90">
                          {w.area}
                        </span>
                        {trend && <trend.Icon className={`size-3 shrink-0 ${trend.cls}`} />}
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {w.count}回
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {CHEAT_SOURCE_LABEL[w.source]}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setCheatExpanded(true)}
                  className="text-[11px] text-sky-700 dark:text-sky-300 hover:underline mt-1.5"
                >
                  ▼ あと {remaining}件
                </button>
              )}
            </>
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
        {/* ドリルで磨いたベスト回答（参考） */}
        <BestAnswersReference
          universityId={sessionInfo.universityId}
          facultyId={sessionInfo.facultyId}
        />
        {/* 保存したテーマ別ドリルの問答（参考） */}
        <SavedDrillsReference />
      </>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-76px)] lg:h-[calc(100dvh-3.5rem)] w-full">
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
            className={`lg:hidden p-1.5 rounded-md transition-colors cursor-pointer ${cheatSheetOpen ? "text-sky-600 bg-sky-50" : "text-muted-foreground hover:text-foreground"}`}
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

      {/* 2カラムコンテナ: 左=カンペ(PC固定) / 右=チャット領域 */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 左サイドバー: カンペ常時表示 (lg以上のみ) */}
        {sessionInfo && (
          <aside className="hidden lg:flex flex-col lg:w-[360px] xl:w-[440px] shrink-0 border-r bg-sky-50/30 dark:bg-sky-950/10 overflow-y-auto">
            <div className="px-4 py-3 space-y-4">
              {renderCheatSheet()}
            </div>
          </aside>
        )}

        {/* 右カラム: alerts / messages / memo / input */}
        <div className="flex-1 flex flex-col min-w-0">

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

      {/* カンペ: 弱点 + アドミッションポリシー (モバイル: 上部ドロワー / PC: 左サイドバー) */}
      {cheatSheetOpen && sessionInfo && (
        <div className="lg:hidden mx-4 mt-2 rounded-lg border border-sky-300 bg-sky-50/60 dark:border-sky-700 dark:bg-sky-950/20 shrink-0 animate-in fade-in slide-in-from-top-2">
          <div className="max-h-[38vh] overflow-y-auto px-3 py-2.5 space-y-3">
            {renderCheatSheet()}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {/* 討論テーマ: 司会が開幕で読み上げるのと同じテーマを常時表示 */}
        {sessionInfo?.mode === "group_discussion" && (
          <div className="sticky top-0 z-40 mb-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 shadow-md">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              本日のテーマ
            </p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-foreground">
              {realtime.gdTheme ?? "テーマを準備しています…"}
            </p>
          </div>
        )}

        {/* ユーザーターンランプ: GD で自分の発話タイミングを明示 */}
        {sessionInfo?.mode === "group_discussion" && (
          <div
            className={`sticky top-12 z-30 mb-3 rounded-lg border-2 p-3 shadow-md transition-all ${
              realtime.isUserTurn
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                : "border-slate-300 bg-slate-50 dark:bg-slate-900/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="relative flex size-3.5">
                {realtime.isUserTurn && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-3.5 rounded-full ${
                    realtime.isUserTurn ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
              </span>
              <p
                className={`text-sm font-bold ${
                  realtime.isUserTurn
                    ? "text-emerald-900 dark:text-emerald-200"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {realtime.isUserTurn
                  ? "あなたの番です — マイクが ON です"
                  : `${
                      realtime.currentSpeaker === "moderator"
                        ? "司会"
                        : realtime.currentSpeaker === "peer_bold"
                          ? "健太さん"
                          : realtime.currentSpeaker === "peer_careful"
                            ? "美咲さん"
                            : realtime.currentSpeaker === "peer_creative"
                              ? "翔太さん"
                              : realtime.currentSpeaker === "professor_logic"
                                ? "佐藤教授"
                                : realtime.currentSpeaker === "professor_practical"
                                  ? "田中准教授"
                                  : "他の参加者"
                    }が話しています — 待機中`}
              </p>
            </div>
          </div>
        )}

        {/* ユーザーターンランプ (個人/プレゼン/口頭試問の音声面接): AI 発話中は入力不可、
            喋り終わったら「あなたのターンです」がぬるっと出てマイク ON になる */}
        {isVoiceMode &&
          sessionInfo?.mode !== "group_discussion" &&
          realtime.status === "connected" && (
            <div
              key={realtime.isUserTurn ? "your-turn" : "ai-turn"}
              className={`sticky top-0 z-30 mb-3 rounded-lg border-2 p-3 shadow-md transition-all duration-500 animate-in fade-in slide-in-from-top-1 ${
                realtime.isUserTurn
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : "border-slate-300 bg-slate-50 dark:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex size-3.5">
                  {realtime.isUserTurn && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex size-3.5 rounded-full ${
                      realtime.isUserTurn ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                </span>
                <p
                  className={`text-sm font-bold ${
                    realtime.isUserTurn
                      ? "text-emerald-900 dark:text-emerald-200"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {realtime.isUserTurn
                    ? "あなたのターンです — マイクが ON です"
                    : "面接官が話しています — お待ちください"}
                </p>
              </div>
            </div>
          )}

        {sessionInfo?.mode === "group_discussion" && realtime.isAwaitingNext && (
          <div className="mb-3 flex flex-col items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              発言が終わりました。準備ができたら次の話者へ進めてください。
            </p>
            <Button
              size="sm"
              onClick={realtime.advanceGdTurn}
              className="gap-1.5"
            >
              次の話者へ
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

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
                ) : msg.correcting ? (
                  <div className="max-w-[85%] lg:max-w-[75%] rounded-2xl rounded-tr-sm bg-primary/50 text-primary-foreground px-4 py-2 text-sm italic animate-pulse">
                    {msg.content}
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
                      {msg.isThinking && !u.body ? (
                        <span className="flex items-center gap-1 py-0.5">
                          <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                          <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                          <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
                        </span>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {u.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // 個人面接・プレゼン・口頭試問: 従来通り
          // 「考え中」プレースホルダーは bouncing dots で表現する
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] lg:max-w-[75%] rounded-2xl rounded-tl-sm bg-muted text-foreground px-4 py-2 text-sm">
                {msg.isThinking && !msg.content ? (
                  <span className="flex items-center gap-1 py-0.5">
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
                  </span>
                ) : (
                  msg.content
                )}
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

      {/* Input: テキストモードは常時、音声モードはレート制限・エラー時のみ */}
      {(!isVoiceMode ||
        realtime.status === "fallback_rate_limited" ||
        realtime.status === "fallback_error") && (
      <div className="px-4 py-3 border-t bg-background shrink-0">
        {isVoiceMode ? (
          realtime.status === "fallback_rate_limited" ? (
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
              <span>接続に失敗しました</span>
              {realtime.error && <span className="text-[11px] font-mono">{realtime.error.slice(0, 200)}</span>}
            </div>
          ) : null
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
      )}

        </div>
      </div>
      {/* /2カラムコンテナ */}

      {/* Camera Preview & Video Analyzer */}
      {videoStream && <CameraPreview mediaStream={videoStream} />}
      {videoStream && (
        <VideoAnalyzer
          ref={videoAnalyzerRef}
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
          ref={voiceAnalyzerRef}
          mediaStream={realtime.micStream}
          isRecording={realtimeActive && !isEnding}
          paused={!realtime.isUserTurn}
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

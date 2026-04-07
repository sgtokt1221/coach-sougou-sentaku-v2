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
import { Send, StopCircle, ChevronDown, ChevronUp, Video, VideoOff } from "lucide-react";
import type { InterviewMessage, InterviewMode, InterviewInputMode, VoiceAnalysis, VideoAnalysis, AppearanceAnalysis } from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import VoiceRecorder from "@/components/interview/VoiceRecorder";
import ContinuousVoiceRecorder from "@/components/interview/ContinuousVoiceRecorder";
import VoiceAnalyzer from "@/components/interview/VoiceAnalyzer";
import VideoAnalyzer from "@/components/interview/VideoAnalyzer";
import CameraPreview from "@/components/interview/CameraPreview";

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
  const appearanceCheckCount = useRef(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakText = useCallback(async (text: string) => {
    try {
      setAiSpeaking(true);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "alloy" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn("[TTS] API returned", res.status);
        setAiSpeaking(false);
        return;
      }

      const contentType = res.headers.get("Content-Type") ?? "";
      if (!contentType.startsWith("audio/")) {
        console.warn("[TTS] Unexpected Content-Type:", contentType);
        setAiSpeaking(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Stop previous
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.src = "";
      }

      const audio = new Audio(url);
      audio.preload = "auto";
      ttsAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setAiSpeaking(false);
      };
      audio.onerror = () => {
        console.warn("[TTS] Audio playback error");
        URL.revokeObjectURL(url);
        setAiSpeaking(false);
      };

      // Wait for audio to be ready before playing
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error("Audio decode failed"));
        audio.load();
      });
      await audio.play();
    } catch (err) {
      console.warn("[TTS] Error:", err instanceof Error ? err.message : err);
      setAiSpeaking(false);
    }
  }, []);

  // Load session info from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`interview_session_${sessionId}`);
    if (stored) {
      const info: SessionInfo = JSON.parse(stored);
      setSessionInfo(info);
      setMessages([{ role: "ai", content: info.openingMessage }]);
      if (info.inputMode === "voice") {
        speakText(info.openingMessage);
        setCameraEnabled(true);
      }
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

      const res = await fetch("/api/interview/appearance-check", {
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

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const studentMessage: InterviewMessage = { role: "student", content: text };
    const updatedMessages = [...messages, studentMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: updatedMessages,
          mode: sessionInfo?.mode,
          universityContext: sessionInfo?.universityContext,
          presentationContent: sessionInfo?.presentationContent,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.content }]);
      if (sessionInfo?.inputMode === "voice") {
        speakText(data.content);
      }
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
  }, [input, isLoading, messages, sessionId]);

  async function handleEnd() {
    setIsEnding(true);
    try {
      console.log("[handleEnd] Sending messages:", messages.length, "turns, duration:", elapsed);
      console.log("[handleEnd] Messages:", JSON.stringify(messages.map(m => ({ role: m.role, content: m.content.slice(0, 50) }))));
      const res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, messages, duration: elapsed,
          mode: sessionInfo?.mode,
          presentationContent: sessionInfo?.presentationContent,
          ...(voiceAnalysis ? { voiceAnalysis } : {}),
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const handleVoiceComplete = useCallback(
    async (audioBase64: string, mimeType: string) => {
      if (isLoading) return;
      setIsLoading(true);

      try {
        const res = await fetch("/api/interview/voice-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            audioBase64,
            mimeType,
            messages,
            mode: sessionInfo?.mode,
            universityContext: sessionInfo?.universityContext,
            presentationContent: sessionInfo?.presentationContent,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          { role: "student", content: data.transcribedText },
          { role: "ai", content: data.aiResponse },
        ]);
        speakText(data.aiResponse);

        if (!data.isActive) {
          setShowEndDialog(true);
        }
      } catch {
        const errorMsg = "⚠ 音声の処理に失敗しました。もう一度お話しください。";
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: errorMsg },
        ]);
        speakText(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId]
  );

  const isVoiceMode = sessionInfo?.inputMode === "voice";
  const modeLabel = sessionInfo ? INTERVIEW_MODE_LABELS[sessionInfo.mode] : "";

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-76px)] lg:h-[calc(100dvh-3.5rem)] max-w-2xl lg:max-w-3xl mx-auto">
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
            {sessionInfo?.mode === "group_discussion" && " — 複数の面接官が参加"}
            {sessionInfo?.mode === "presentation" && " — プレゼン後に質疑応答"}
            {sessionInfo?.mode === "oral_exam" && " — 専門知識を問う試問"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCameraEnabled((v) => !v)}
            className={`p-1.5 rounded-md transition-colors ${cameraEnabled ? "text-emerald-600 bg-emerald-50" : "text-muted-foreground hover:text-foreground"}`}
            title={cameraEnabled ? "カメラ分析ON" : "カメラ分析OFF"}
          >
            {cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </button>
          <span className="text-sm font-mono tabular-nums text-muted-foreground">
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

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={["flex", msg.role === "student" ? "justify-end" : "justify-start"].join(
              " "
            )}
          >
            <div
              className={[
                "max-w-[85%] lg:max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                msg.role === "ai"
                  ? "bg-muted text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm",
              ].join(" ")}
            >
              {msg.content}
            </div>
          </div>
        ))}

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
          <ContinuousVoiceRecorder
            autoStart
            onRecordingComplete={handleVoiceComplete}
            onStreamReady={(stream) => setMediaStream(stream)}
            onInterrupt={() => {
              // Stop TTS playback when user starts speaking
              if (ttsAudioRef.current) {
                ttsAudioRef.current.pause();
                ttsAudioRef.current.src = "";
              }
              setAiSpeaking(false);
            }}
            disabled={isLoading}
            aiSpeaking={aiSpeaking}
          />
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-lg border bg-background px-3 py-2.5 lg:px-4 lg:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="回答を入力してください..."
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

      {/* Voice Analyzer (hidden, analysis engine only) */}
      {isVoiceMode && (
        <VoiceAnalyzer
          mediaStream={mediaStream}
          isRecording={!!mediaStream && !isLoading}
          onAnalysisComplete={setVoiceAnalysis}
        />
      )}

      {/* Camera Preview & Video Analyzer */}
      {videoStream && <CameraPreview mediaStream={videoStream} />}
      {videoStream && (
        <VideoAnalyzer
          mediaStream={videoStream}
          isRecording={!isEnding && elapsed > 0}
          onAnalysisComplete={setVideoAnalysis}
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
                // Stop TTS/recording
                if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ""; }
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

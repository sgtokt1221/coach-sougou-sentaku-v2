"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { authFetch } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Timer, Mic } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeInterview } from "@/hooks/useRealtimeInterview";
import VoiceAnalyzer, { refineWithTranscription } from "@/components/interview/VoiceAnalyzer";
import { INTERVIEW_SKILL_CHECK_MAX_TURNS } from "@/lib/types/interview-skill-check";
import type { VoiceAnalysis } from "@/lib/types/interview";

/** VoiceAnalysis を /end に渡す日本語サマリー文字列に整形 */
function buildVoiceSummary(a: VoiceAnalysis): string {
  const topFillers = (a.fillerWords ?? [])
    .slice(0, 3)
    .map((f) => `${f.word}(${f.count})`)
    .join("・");
  const parts = [
    `話速 ${Math.round(a.speechRate)}字/分(推奨${a.recommendedRate})`,
    `フィラー ${a.fillerCount}回(${a.fillerRate.toFixed(1)}/分)${topFillers ? ` 主なもの:${topFillers}` : ""}`,
    `長い沈黙 ${a.pauseAnalysis.longPauses}回`,
    `声量変動 ${a.volumeVariation.toFixed(2)}`,
    `総合声質 ${a.overallVoiceScore}/10`,
  ];
  return parts.join(" / ");
}

/**
 * 面接スキルチェックの音声(Realtime)受験UI。
 * 既存の音声模擬面接(useRealtimeInterview)を、スキルチェック専用エンドポイント＋5ターン制御で流用。
 */
export function RealtimeSkillCheck() {
  const router = useRouter();
  const realtime = useRealtimeInterview({
    mode: "individual",
    tokenEndpoint: "/api/interview-skill-check/realtime-session",
    universityName: "-",
    facultyName: "-",
    admissionPolicy: "-",
  });

  const [elapsedSec, setElapsedSec] = useState(0);
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [ended, setEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);
  const startTimeRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const studentTurns = realtime.messages.filter((m) => m.role === "student").length;
  const reachedLimit = studentTurns >= INTERVIEW_SKILL_CHECK_MAX_TURNS;
  const connected = realtime.status === "connected";

  // マウント時に1度だけ開始
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startTimeRef.current = Date.now();
    void realtime.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!connected || ended) return;
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [connected, ended]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realtime.messages.length]);

  async function handleFinish() {
    if (submitting) return;
    setSubmitting(true);
    setEnded(true);
    realtime.stop();

    const cleanMessages = realtime.messages
      .filter((m) => m.content?.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    let voiceSummary: string | undefined;
    if (voiceAnalysis) {
      const studentText = cleanMessages
        .filter((m) => m.role === "student")
        .map((m) => m.content)
        .join(" ");
      const refined = studentText
        ? refineWithTranscription(voiceAnalysis, studentText, elapsedSec)
        : voiceAnalysis;
      voiceSummary = buildVoiceSummary(refined);
    }

    try {
      const res = await authFetch("/api/interview-skill-check/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "realtime",
          messages: cleanMessages,
          durationSec: elapsedSec,
          voiceSummary,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "採点に失敗しました");
      }
      const data = await res.json();
      try {
        sessionStorage.setItem("interviewSkillCheckResult", JSON.stringify(data.result));
      } catch {}
      await Promise.all([
        mutate("/api/interview-skill-check/status"),
        mutate("/api/interview/history?userId=current"),
      ]);
      router.push(`/student/interview-skill-check/${data.result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "採点に失敗しました");
      setSubmitting(false);
    }
  }

  // レート制限
  if (realtime.status === "fallback_rate_limited") {
    const next = realtime.nextAvailableAt
      ? new Date(realtime.nextAvailableAt).toLocaleDateString("ja-JP")
      : null;
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center text-sm">
          <p>音声でのスキルチェックは7日に1回までです{next ? `（次回 ${next} から）` : ""}。</p>
          <p className="text-muted-foreground">それまではテキストで受験できます。</p>
          <Button variant="outline" onClick={() => router.refresh()}>
            戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 接続失敗
  if (realtime.status === "fallback_error") {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center text-sm">
          <p>音声面接の開始に失敗しました（マイク許可・通信環境をご確認ください）。</p>
          {realtime.error && <p className="text-xs text-muted-foreground">{realtime.error}</p>}
          <Button variant="outline" onClick={() => router.refresh()}>
            やり直す
          </Button>
        </CardContent>
      </Card>
    );
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      {/* 音声分析（マイクストリームから話速・フィラー） */}
      <VoiceAnalyzer
        mediaStream={realtime.micStream}
        isRecording={connected && !ended}
        onAnalysisComplete={setVoiceAnalysis}
      />

      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Mic className="size-5 text-primary" />
          面接スキルチェック（音声）
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline">
            ターン {Math.min(studentTurns, INTERVIEW_SKILL_CHECK_MAX_TURNS)} / {INTERVIEW_SKILL_CHECK_MAX_TURNS}
          </Badge>
          <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
            <Timer className="size-4" />
            {mm}:{ss}
          </span>
        </div>
      </div>

      {!connected && !ended && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            面接官に接続しています...（マイクの使用を許可してください）
          </CardContent>
        </Card>
      )}

      {(connected || ended) && (
        <Card className="min-h-[45vh]">
          <CardContent className="space-y-4 py-4">
            {realtime.messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    m.role === "student" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Badge variant="outline" className="mb-1 text-[10px]">
                    {m.role === "student" ? "あなた" : "面接官"}
                  </Badge>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>
      )}

      {connected && (
        <Card className={reachedLimit ? "border-emerald-300 bg-emerald-50/40" : ""}>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">
              {reachedLimit
                ? "面接は終了です。準備ができたら採点してください。"
                : "面接官の質問に声で答えてください。"}
            </p>
            <Button disabled={!reachedLimit || submitting} onClick={handleFinish}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 size-4 animate-spin" /> 採点中...
                </>
              ) : (
                "採点する"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

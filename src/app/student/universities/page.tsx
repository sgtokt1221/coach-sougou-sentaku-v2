"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectionTypeBadge } from "@/components/shared/SelectionTypeBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap,
  Search,
  ArrowRight,
  Sparkles,
  MessageCircle,
  BarChart3,
  Send,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { buildMatchingVoiceInstructions } from "@/lib/ai/prompts/voice-chat-realtime";
import { EmptyState } from "@/components/shared/EmptyState";
import type { MatchResult, MatchingResponse, FitRecommendation } from "@/lib/types/matching";
import { FluidLoader } from "@/components/shared/FluidLoader";
import { SuggestPanel, ResultSkeleton } from "@/components/shared/SuggestPanel";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import type { StudentProfile } from "@/lib/types/user";

const CERT_TYPES = [
  { value: "EIKEN", label: "英検" },
  { value: "TOEIC", label: "TOEIC" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "IELTS", label: "IELTS" },
  { value: "TEAP", label: "TEAP" },
  { value: "GTEC", label: "GTEC" },
] as const;

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50";
  if (score >= 60) return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50";
  return "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50";
}

function recommendationVariant(r: string): "default" | "secondary" | "destructive" {
  if (r === "適正校") return "default";
  if (r === "挑戦校") return "secondary";
  return "destructive";
}

function fitBadgeStyle(fit?: FitRecommendation): string {
  switch (fit) {
    case "ぴったり校": return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "おすすめ校": return "bg-blue-100 text-blue-800 border-blue-300";
    case "検討校": return "bg-amber-100 text-amber-800 border-amber-300";
    case "要件不足": return "bg-rose-100 text-rose-800 border-rose-300";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function ResultCard({ result }: { result: MatchResult }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const hasFit = result.apFitScore != null;
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow border overflow-visible ${hasFit ? scoreBg(result.apFitScore!) : scoreBg(result.matchScore)}`}
      onClick={() => setExpanded((prev) => !prev)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{result.universityName}</span>
              <span className="text-muted-foreground text-sm">{result.facultyName}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <SelectionTypeBadge type={result.selectionType} size="sm" />
              {result.fitRecommendation ? (
                <Badge variant="outline" className={fitBadgeStyle(result.fitRecommendation)}>
                  {result.fitRecommendation}
                </Badge>
              ) : (
                <Badge variant={recommendationVariant(result.recommendation)}>
                  {result.recommendation}
                </Badge>
              )}
              {hasFit ? (
                <>
                  <span className={`text-sm font-bold ${scoreColor(result.apFitScore!)}`}>
                    適合度 {result.apFitScore}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (出願要件 {result.matchScore}%)
                  </span>
                </>
              ) : (
                <span className={`text-sm font-bold ${scoreColor(result.matchScore)}`}>
                  マッチ度 {result.matchScore}%
                </span>
              )}
            </div>
            {result.apFitReason && (
              <p className="text-xs text-primary/80 mt-1.5 leading-snug">
                {result.apFitReason}
              </p>
            )}
            <p className={`text-xs text-muted-foreground mt-2 ${expanded ? "" : "line-clamp-2"}`}>
              {result.admissionPolicy}
            </p>
            {expanded && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/student/universities/${result.universityId}/${result.facultyId}`);
                }}
              >
                詳細を見る
                <ArrowRight className="size-3.5 ml-1" />
              </Button>
            )}
          </div>
          <ArrowRight className={`size-4 text-muted-foreground shrink-0 mt-1 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UniversitiesPage() {
  const { userProfile } = useAuth();
  const [mode, setMode] = useState<"ai" | "match" | "suggest">("ai");
  const [gpa, setGpa] = useState("");
  const [certType, setCertType] = useState("");
  const [certScore, setCertScore] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; matched: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate from profile
  useEffect(() => {
    const profile = userProfile as StudentProfile | null;
    if (!profile) return;
    if (profile.gpa != null && !gpa) {
      setGpa(String(profile.gpa));
    }
    if (profile.englishCerts?.length && !certType) {
      const first = profile.englishCerts[0];
      setCertType(first.type);
      setCertScore(first.score ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  async function handleMatch() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (gpa) params.set("gpa", gpa);
      if (certType) params.set("certType", certType);
      if (certScore) params.set("certScore", certScore);

      const res = await fetch(`/api/matching?${params.toString()}`);
      if (!res.ok) throw new Error("マッチング取得に失敗しました");
      const data: MatchingResponse = await res.json();
      setResults(data.results);
      setSummary({ total: data.totalUniversities, matched: data.matchedCount });
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-8">
      <div className="flex items-center gap-2 mb-5 lg:mb-6">
        <GraduationCap className="size-6 text-primary" />
        <h1 className="text-xl font-bold">志望校マッチング</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 mb-6">
        <button
          onClick={() => setMode("ai")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="size-4" />
          AI相談
        </button>
        <button
          onClick={() => setMode("match")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "match" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="size-4" />
          スコア一覧
        </button>
      </div>

      {mode === "ai" ? (
        <MatchingChat
          profile={{ gpa: gpa ? parseFloat(gpa) : undefined, englishCerts: certType ? [{ type: certType, score: certScore || undefined }] : undefined }}
          onFitComputed={(fitResults) => {
            setResults(fitResults);
            setSummary({ total: fitResults.length, matched: fitResults.filter((r) => r.matchScore >= 60).length });
            setMode("match");
          }}
        />
      ) : mode === "suggest" ? (
        <SuggestPanel />
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">プロフィール入力</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.1"
                  min="0"
                  max="4.3"
                  placeholder="例: 3.8"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>英語資格の種類</Label>
                  <Select value={certType || "_none"} onValueChange={(v: string | null) => setCertType(!v || v === "_none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">なし</SelectItem>
                      {CERT_TYPES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certScore">スコア / 級</Label>
                  <Input
                    id="certScore"
                    placeholder="例: 750 / 準1級"
                    value={certScore}
                    onChange={(e) => setCertScore(e.target.value)}
                    disabled={!certType}
                  />
                </div>
              </div>

              <Separator />

              <Button className="w-full" onClick={handleMatch} disabled={loading}>
                <Search className="size-4 mr-2" />
                {loading ? "マッチング中..." : "マッチング実行"}
              </Button>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded p-3">{error}</p>
              )}
            </CardContent>
          </Card>

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <ResultSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && results !== null && (
            <div className="space-y-3">
              {summary && (
                <p className="text-sm text-muted-foreground">
                  {summary.total}大学を分析 ・ 適正〜挑戦校: {summary.matched}学部
                </p>
              )}
              {results.length === 0 ? (
                <Card>
                  <CardContent>
                    <EmptyState
                      icon={GraduationCap}
                      title="マッチする大学が見つかりませんでした"
                      description="条件を変更して再度お試しください"
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.map((r) => (
                    <ResultCard key={`${r.universityId}-${r.facultyId}`} result={r} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface Suggestion {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  reason: string;
}

function MatchingChat({ profile, onFitComputed }: { profile: { gpa?: number; englishCerts?: { type: string; score?: string }[] }; onFitComputed?: (results: MatchResult[]) => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; suggestions?: Suggestion[] }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [computing, setComputing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceChat = useVoiceChat();

  // チャットの会話が十分 (3 ターン以上) になったら診断ボタンを表示
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const canCompute = userMessageCount >= 2 && !loading && !computing;

  async function handleComputeFit() {
    setComputing(true);
    try {
      // 1. 希望サマリー抽出
      const extractRes = await authFetch("/api/matching/extract-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: messages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!extractRes.ok) throw new Error("希望の抽出に失敗しました");
      const { preferences } = await extractRes.json();

      // 2. AI 適合度一括計算
      const fitRes = await authFetch("/api/matching/compute-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      if (!fitRes.ok) throw new Error("適合度の計算に失敗しました");
      const data = await fitRes.json();

      onFitComputed?.(data.results ?? []);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `適合度の計算中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`,
      }]);
    } finally {
      setComputing(false);
    }
  }

  const toggleVoice = useCallback(async () => {
    if (voiceChat.isActive) {
      voiceChat.stop();
      return;
    }
    const instructions = buildMatchingVoiceInstructions(profile);
    await voiceChat.start({
      instructions,
      voice: "alloy",
      transcriptionHint: "総合型選抜、東京大学、京都大学、大阪大学、早稲田大学、慶應義塾大学、同志社大学、立命館大学、関西大学、関西学院大学、明治大学、青山学院大学、立教大学、中央大学、法政大学、近畿大学、龍谷大学、アドミッションポリシー、志望理由、学部、文学部、法学部、経済学部、商学部、経営学部、社会学部、情報学部、工学部、理学部、医学部、薬学部、国際学部、グローバル・コミュニケーション学部、探究学習、英検、TOEIC、TOEFL",
      onUserTranscript: (text) => {
        if (text.trim()) setMessages((prev) => [...prev, { role: "user", content: text }]);
      },
      onAssistantTranscript: (text) => {
        if (text.trim()) setMessages((prev) => [...prev, { role: "assistant", content: text }]);
      },
    });
  }, [voiceChat, profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // 自己分析が完了している場合、自動で初回メッセージを送信
  useEffect(() => {
    const uid = user?.uid;
    if (autoStarted || !uid) return;
    async function checkAndStart() {
      try {
        const res = await authFetch(`/api/self-analysis?userId=${uid}`);
        if (!res.ok) return;
        const sa = await res.json();
        if (sa?.isComplete) {
          setAutoStarted(true);
          await sendMessage("自己分析の結果を踏まえて、私に合いそうな志望校を教えてください。");
        }
      } catch {}
    }
    checkAndStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function sendMessage(text: string) {
    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await authFetch("/api/matching/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, profile }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response, suggestions: data.suggestions }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "申し訳ありません、エラーが発生しました。もう一度お試しください。" }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
      <div className="mb-3 flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant={voiceChat.isActive ? "default" : "outline"}
          onClick={toggleVoice}
          disabled={voiceChat.status === "requesting_token" || voiceChat.status === "connecting"}
        >
          {voiceChat.isActive ? <Mic className="size-4 mr-1" /> : <MicOff className="size-4 mr-1" />}
          {voiceChat.status === "requesting_token" || voiceChat.status === "connecting"
            ? "接続中..."
            : voiceChat.isActive
              ? "音声会話中 (タップで停止)"
              : "音声で相談する"}
        </Button>
        {voiceChat.error && (
          <span className="text-xs text-rose-600">{voiceChat.error.slice(0, 80)}</span>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="size-10 text-primary/40 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              AIに相談して、あなたに合った志望校を見つけましょう。
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              興味のある分野や将来の目標を教えてください。
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.suggestions.map((s, j) => (
                    <button
                      key={j}
                      onClick={() => router.push(`/student/universities/${s.universityId}/${s.facultyId}`)}
                      className="w-full text-left rounded-lg border border-border/50 bg-background/80 p-3 hover:bg-background transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="size-4 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.universityName} {s.facultyName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground shrink-0 ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* 適合度計算ローディング */}
      <FluidLoader
        visible={computing}
        title="AI が適合度を診断中"
        stages={[
          "会話内容から希望を整理しています...",
          "自己分析データを照合しています...",
          "各大学の AP と比較しています...",
          "適合度スコアを算出しています...",
        ]}
        stageInterval={3000}
        subtitle="通常 15〜30 秒かかります"
      />

      <div className="border-t pt-3 space-y-2">
        {canCompute && (
          <Button
            onClick={handleComputeFit}
            variant="default"
            className="w-full gap-2"
            disabled={computing}
          >
            <Sparkles className="size-4" />
            この会話をもとに適合度を診断する
          </Button>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="興味のある分野や将来の目標を入力..."
            disabled={loading || computing}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || computing || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

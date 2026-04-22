"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Lightbulb,
  User,
  BookOpen,
  Target,
  Newspaper,
  Play,
  RotateCcw,
  Loader2,
  Check,
  Trophy,
  TrendingUp,
  Mic,
  Keyboard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api/client";
import { DRILL_CATEGORIES, type DrillCategory } from "@/lib/ai/prompts/interview-drill";
import VoiceRecorder from "@/components/interview/VoiceRecorder";

interface DrillScore {
  category: DrillCategory;
  score: number;
  question: string;
  answer: string;
}

interface DrillState {
  step: "category" | "question" | "result" | "summary";
  currentCategory: DrillCategory | null;
  currentQuestion: string;
  currentAnswer: string;
  scores: { score: number; feedback: string; betterAnswer: string }[];
  loading: boolean;
  sessionStarted: boolean;
  error: string | null;
}

const CATEGORY_ICONS = {
  "志望理由": Target,
  "自己PR": User,
  "学問関心": BookOpen,
  "将来ビジョン": Lightbulb,
  "時事問題": Newspaper,
} as const;

const CATEGORY_COLORS = {
  "志望理由": "bg-sky-500",
  "自己PR": "bg-emerald-500",
  "学問関心": "bg-purple-500",
  "将来ビジョン": "bg-amber-500",
  "時事問題": "bg-rose-500",
} as const;

export default function InterviewDrillPage() {
  const router = useRouter();
  const [state, setState] = useState<DrillState>({
    step: "category",
    currentCategory: null,
    currentQuestion: "",
    currentAnswer: "",
    scores: [],
    loading: false,
    sessionStarted: false,
    error: null,
  });

  const [sessionScores, setSessionScores] = useState<DrillScore[]>([]);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // 音声録音完了時: Whisper で文字起こしして textarea に追記
  const handleVoiceRecorded = useCallback(async (audioBase64: string, mimeType: string) => {
    setTranscribing(true);
    setTranscribeError(null);
    try {
      const res = await authFetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, mimeType, language: "ja" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const text = (data.transcription?.fullText ?? "").trim();
      if (text) {
        setState((prev) => ({
          ...prev,
          currentAnswer: prev.currentAnswer
            ? `${prev.currentAnswer}${prev.currentAnswer.endsWith("。") ? "" : "。"}${text}`
            : text,
        }));
      } else {
        setTranscribeError("音声を認識できませんでした。もう一度お試しください。");
      }
    } catch (err) {
      console.error("Transcribe failed", err);
      setTranscribeError(err instanceof Error ? err.message : "文字起こしに失敗しました");
    } finally {
      setTranscribing(false);
    }
  }, []);

  // カテゴリ選択
  const handleCategorySelect = useCallback(async (category: DrillCategory) => {
    setState(prev => ({ ...prev, loading: true, currentCategory: category, error: null }));

    try {
      const response = await authFetch("/api/interview/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "question",
          category,
          // TODO: 志望校情報をcontextから取得
          // universityId: "...",
          // facultyId: "..."
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "不明な エラー" }));
        throw new Error(errorData.error || "質問生成に失敗しました");
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        step: "question",
        currentQuestion: data.question || `${category}について、あなたの考えや経験を教えてください。`,
        currentAnswer: "",
        loading: false,
        sessionStarted: true,
      }));
    } catch (error) {
      console.error("Question generation error:", error);
      // フォールバック質問を設定
      const fallbackQuestions = {
        "志望理由": "なぜこの大学・学部を志望されたのですか？具体的なきっかけがあれば教えてください。",
        "自己PR": "あなたが最も力を入れて取り組んできたことについて教えてください。",
        "学問関心": "志望する分野に興味を持ったきっかけや、深めたい領域について教えてください。",
        "将来ビジョン": "大学卒業後、どのような分野で活躍したいと考えていますか？",
        "時事問題": "最近気になっているニュースや社会問題について、あなたの意見を聞かせてください。"
      };

      setState(prev => ({
        ...prev,
        step: "question",
        currentQuestion: fallbackQuestions[category],
        currentAnswer: "",
        loading: false,
        sessionStarted: true,
        error: error instanceof Error ? error.message : "質問生成でエラーが発生しましたが、フォールバック質問を表示しています。",
      }));
    }
  }, []);

  // 回答送信
  const handleAnswerSubmit = useCallback(async () => {
    if (!state.currentAnswer.trim() || !state.currentCategory) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authFetch("/api/interview/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          question: state.currentQuestion,
          answer: state.currentAnswer,
          // TODO: 志望校情報をcontextから取得
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "不明なエラー" }));
        throw new Error(errorData.error || "評価に失敗しました");
      }

      const evaluation = await response.json();

      const newScore: DrillScore = {
        category: state.currentCategory,
        score: evaluation.score || 3,
        question: state.currentQuestion,
        answer: state.currentAnswer,
      };

      const updatedScores = [...sessionScores, newScore];
      setSessionScores(updatedScores);

      setState(prev => ({
        ...prev,
        step: "result",
        scores: [{
          score: evaluation.score || 3,
          feedback: evaluation.feedback || "回答をありがとうございました。",
          betterAnswer: evaluation.betterAnswer || "具体的なエピソードを交えると、より説得力のある回答になります。"
        }],
        loading: false,
      }));
    } catch (error) {
      console.error("Answer evaluation error:", error);

      // フォールバック評価
      const fallbackScore = state.currentAnswer.length < 30 ? 2 : state.currentAnswer.length < 100 ? 3 : 4;
      const newScore: DrillScore = {
        category: state.currentCategory,
        score: fallbackScore,
        question: state.currentQuestion,
        answer: state.currentAnswer,
      };

      const updatedScores = [...sessionScores, newScore];
      setSessionScores(updatedScores);

      setState(prev => ({
        ...prev,
        step: "result",
        scores: [{
          score: fallbackScore,
          feedback: "評価処理でエラーが発生しましたが、基本的な採点を行いました。回答をありがとうございました。",
          betterAnswer: "より具体的なエピソードや経験を交えて説明することで、説得力のある回答になります。"
        }],
        loading: false,
        error: error instanceof Error ? error.message : "評価でエラーが発生しましたが、基本的な採点を行いました。",
      }));
    }
  }, [state.currentAnswer, state.currentQuestion, state.currentCategory, sessionScores]);

  // 次の問題
  const handleNextQuestion = useCallback(() => {
    if (sessionScores.length >= 5) {
      setState(prev => ({ ...prev, step: "summary" }));
    } else {
      setState(prev => ({
        ...prev,
        step: "category",
        currentCategory: null,
        currentQuestion: "",
        currentAnswer: "",
        scores: [],
      }));
    }
  }, [sessionScores.length]);

  // リセット
  const handleReset = useCallback(() => {
    setState({
      step: "category",
      currentCategory: null,
      currentQuestion: "",
      currentAnswer: "",
      scores: [],
      loading: false,
      sessionStarted: false,
      error: null,
    });
    setSessionScores([]);
  }, []);

  // 平均スコア計算
  const averageScore = sessionScores.length > 0
    ? sessionScores.reduce((sum, s) => sum + s.score, 0) / sessionScores.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">面接ドリル練習</h1>
              <p className="text-sm text-slate-600">短時間で反復練習できる軽い練習モード</p>
            </div>
          </div>

          {/* セッション情報 */}
          {state.sessionStarted && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-600">セッション進行</div>
                <div className="font-medium">
                  {sessionScores.length}/5 問完了
                </div>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 w-8 rounded-full",
                      i < sessionScores.length
                        ? "bg-primary"
                        : "bg-slate-200"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 現在のスコア推移（小さいバー） */}
        {sessionScores.length > 0 && state.step !== "summary" && (
          <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">今回のスコア推移</span>
                <span className="text-sm font-medium text-slate-900">
                  平均 {averageScore.toFixed(1)}/5.0
                </span>
              </div>
              <div className="flex gap-1">
                {sessionScores.map((score, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 bg-slate-200 rounded overflow-hidden"
                  >
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        score.score >= 4 ? "bg-emerald-500" :
                        score.score >= 3 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${(score.score / 5) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* エラーメッセージ */}
        {state.error && (
          <Card className="bg-rose-50 border-rose-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-rose-800">
                <div className="h-4 w-4 rounded-full bg-rose-500" />
                <p className="text-sm">{state.error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* メインコンテンツ */}
        {state.step === "category" && (
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  カテゴリを選択してください
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {DRILL_CATEGORIES.map((category) => {
                    const Icon = CATEGORY_ICONS[category];
                    const colorClass = CATEGORY_COLORS[category];
                    const isCompleted = sessionScores.some(s => s.category === category);

                    return (
                      <Button
                        key={category}
                        variant="outline"
                        onClick={() => handleCategorySelect(category)}
                        disabled={state.loading || isCompleted}
                        className={cn(
                          "h-24 flex flex-col gap-2 relative",
                          "hover:shadow-lg transition-all duration-200",
                          "border-slate-200 bg-white/50 hover:bg-white/80",
                          isCompleted && "opacity-50"
                        )}
                      >
                        {isCompleted && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-emerald-600" />
                        )}
                        <div className={cn("p-2 rounded-lg", colorClass)}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {category}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {state.step === "question" && (
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {state.currentCategory && (
                    <>
                      <div className={cn("p-2 rounded-lg", CATEGORY_COLORS[state.currentCategory])}>
                        <div className="h-5 w-5 text-white flex items-center justify-center">
                          {state.currentCategory === "志望理由" && <Target className="h-5 w-5" />}
                          {state.currentCategory === "自己PR" && <User className="h-5 w-5" />}
                          {state.currentCategory === "学問関心" && <BookOpen className="h-5 w-5" />}
                          {state.currentCategory === "将来ビジョン" && <Lightbulb className="h-5 w-5" />}
                          {state.currentCategory === "時事問題" && <Newspaper className="h-5 w-5" />}
                        </div>
                      </div>
                      {state.currentCategory}
                    </>
                  )}
                </CardTitle>
                <Badge variant="outline">{sessionScores.length + 1}/5 問目</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-lg border-l-4 border-primary">
                <p className="text-slate-800 leading-relaxed">
                  {state.currentQuestion}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    あなたの回答
                  </label>
                  <div className="flex gap-1 rounded-lg border bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setInputMode("text")}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        inputMode === "text" ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <Keyboard className="h-3 w-3" />
                      テキスト
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("voice")}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        inputMode === "voice" ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <Mic className="h-3 w-3" />
                      音声
                    </button>
                  </div>
                </div>
                <Textarea
                  value={state.currentAnswer}
                  onChange={(e) => setState(prev => ({ ...prev, currentAnswer: e.target.value }))}
                  placeholder={inputMode === "voice"
                    ? "下のマイクで話すと自動で文字起こしされます。直接の編集も可能です..."
                    : "2-3分程度で回答できる内容で答えてください..."}
                  className="min-h-32 resize-none"
                  disabled={state.loading}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>文字数: {state.currentAnswer.length}文字</span>
                  {transcribing && (
                    <span className="flex items-center gap-1 text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      文字起こし中...
                    </span>
                  )}
                </div>

                {inputMode === "voice" && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <VoiceRecorder
                      onRecordingComplete={handleVoiceRecorded}
                      disabled={state.loading || transcribing}
                    />
                    {transcribeError && (
                      <p className="mt-2 text-center text-xs text-rose-600">{transcribeError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAnswerSubmit}
                  disabled={!state.currentAnswer.trim() || state.loading}
                  className="flex-1"
                >
                  {state.loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      評価中...
                    </>
                  ) : (
                    "回答を送信"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setState(prev => ({ ...prev, step: "category" }))}
                  disabled={state.loading}
                >
                  戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {state.step === "result" && state.scores[0] && (
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                評価結果
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* スコア表示 */}
              <div className="text-center py-6">
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  {state.scores[0].score}/5
                </div>
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-4 h-4 rounded-full",
                        i < state.scores[0].score
                          ? "bg-amber-400"
                          : "bg-slate-200"
                      )}
                    />
                  ))}
                </div>
                <Progress
                  value={(state.scores[0].score / 5) * 100}
                  className="w-32 mx-auto"
                />
              </div>

              {/* フィードバック */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-slate-900 mb-2">フィードバック</h3>
                  <p className="text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-lg">
                    {state.scores[0].feedback}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-slate-900 mb-2">より良い回答例</h3>
                  <p className="text-slate-700 leading-relaxed p-4 bg-sky-50 rounded-lg border-l-4 border-sky-400">
                    {state.scores[0].betterAnswer}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleNextQuestion} className="flex-1">
                  {sessionScores.length >= 4 ? "結果を見る" : "次の問題"}
                </Button>
                <Button variant="outline" onClick={() => handleCategorySelect(state.currentCategory!)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  同じカテゴリをもう一度
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {state.step === "summary" && (
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                セッション完了
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6">
                <div className="text-3xl font-bold text-slate-900 mb-2">
                  平均 {averageScore.toFixed(1)}/5.0
                </div>
                <p className="text-slate-600">5問のドリル練習が完了しました</p>
              </div>

              {/* カテゴリ別結果 */}
              <div className="space-y-3">
                <h3 className="font-medium text-slate-900">カテゴリ別結果</h3>
                {sessionScores.map((score, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", CATEGORY_COLORS[score.category])}>
                        <div className="h-4 w-4 text-white flex items-center justify-center">
                          {score.category === "志望理由" && <Target className="h-4 w-4" />}
                          {score.category === "自己PR" && <User className="h-4 w-4" />}
                          {score.category === "学問関心" && <BookOpen className="h-4 w-4" />}
                          {score.category === "将来ビジョン" && <Lightbulb className="h-4 w-4" />}
                          {score.category === "時事問題" && <Newspaper className="h-4 w-4" />}
                        </div>
                      </div>
                      <span className="font-medium text-slate-700">{score.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, j) => (
                          <div
                            key={j}
                            className={cn(
                              "w-3 h-3 rounded-full",
                              j < score.score ? "bg-amber-400" : "bg-slate-200"
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-slate-900 ml-2">
                        {score.score}/5
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleReset} className="flex-1">
                  新しいセッションを開始
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/student/interview/new")}
                >
                  本格面接に挑戦
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
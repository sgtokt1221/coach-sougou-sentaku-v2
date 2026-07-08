// src/app/student/essay/logic-drill/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  History,
  Sparkles,
  ScanSearch,
  Timer,
  ArrowRight,
  ClipboardList,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import {
  LOGIC_DRILL_TYPES,
  LOGIC_DRILL_TYPE_LABELS,
  FLAW_KIND_LABELS,
  DEFAULT_QUICK_LOGIC_SEC,
  type LogicDrillType,
  type LogicDrillItem,
  type LogicDrillAnswer,
  type LogicDrillResult,
  type FlawKind,
} from "@/lib/types/logic-drill";
import { getRotatedLogicDrillType, pickLogicDrillItem } from "@/lib/logic-drill/rotation";
import { TourNextButton } from "@/components/student/TourNextButton";

/** "YYYY-MM-DD"（ローカル日付）。SSRとの齟齬を避けクライアントで確定する。 */
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 問題型ごとのアイコンと一言説明（入口ヒーロー用） */
const TYPE_META: Record<LogicDrillType, { icon: typeof ScanSearch; tagline: string }> = {
  flaw_finder: { icon: ScanSearch, tagline: "意見文の欠陥（飛躍・すり替え等）を見抜いて直す" },
  quick_logic: { icon: Timer, tagline: "お題に賛否＋理由3つを制限時間で組み立てる" },
  skeleton: { icon: ClipboardList, tagline: "主張・根拠・具体例・反論応答の4枠で骨組みを作る" },
  abstraction: { icon: ArrowRight, tagline: "抽象と具体を行き来して言い換える" },
  rebuttal: { icon: PenLine, tagline: "最強の反論を想定し、それに応答する" },
  compare: { icon: ScanSearch, tagline: "2つの選択肢を対比して理由つきで選ぶ" },
  question_framing: { icon: Sparkles, tagline: "曖昧なテーマから論じるべき問いを立てる" },
  alexandra: { icon: Timer, tagline: "係り受けを正確に読み取る4択問題" },
};

const HOW_IT_WORKS: { Icon: typeof ClipboardList; title: string; desc: string }[] = [
  { Icon: ClipboardList, title: "お題が出る", desc: "日替わりの型" },
  { Icon: PenLine, title: "自分で組む", desc: "主張と根拠を言語化" },
  { Icon: Sparkles, title: "AIが採点", desc: "論理3軸＋赤ペン" },
];

type Step = "select" | "drill" | "result";

function LogicDrillInner() {
  const search = useSearchParams();
  const forcedType = search.get("type") as LogicDrillType | null;

  const [date] = useState(todayStr);
  const [step, setStep] = useState<Step>("select");
  const [drillType, setDrillType] = useState<LogicDrillType>(
    forcedType && LOGIC_DRILL_TYPES.includes(forcedType)
      ? forcedType
      : getRotatedLogicDrillType(todayStr()),
  );
  const [item, setItem] = useState<LogicDrillItem | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<LogicDrillResult | null>(null);

  // flaw_finder の回答
  const [selectedFlaw, setSelectedFlaw] = useState<FlawKind | null>(null);
  const [flawExplanation, setFlawExplanation] = useState("");
  const [flawFix, setFlawFix] = useState("");
  // quick_logic の回答
  const [stance, setStance] = useState<"agree" | "disagree" | null>(null);
  const [reasons, setReasons] = useState<string[]>(["", "", ""]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // skeleton の回答
  const [skClaim, setSkClaim] = useState("");
  const [skGrounds, setSkGrounds] = useState("");
  const [skExample, setSkExample] = useState("");
  const [skRebuttal, setSkRebuttal] = useState("");
  // abstraction の回答
  const [absText, setAbsText] = useState("");
  // rebuttal の回答
  const [rebCounter, setRebCounter] = useState("");
  const [rebResponse, setRebResponse] = useState("");
  // compare の回答
  const [cmpContrast, setCmpContrast] = useState("");
  const [cmpChoice, setCmpChoice] = useState<"A" | "B" | null>(null);
  const [cmpReason, setCmpReason] = useState("");
  // question_framing の回答
  const [qfQuestion, setQfQuestion] = useState("");
  const [qfWhy, setQfWhy] = useState("");
  // alexandra の回答
  const [alexIndex, setAlexIndex] = useState<number | null>(null);

  // ?type= 指定時は select を飛ばして即開始
  useEffect(() => {
    if (forcedType && LOGIC_DRILL_TYPES.includes(forcedType)) {
      start(forcedType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start(type: LogicDrillType) {
    const picked = pickLogicDrillItem(type, date);
    if (!picked) {
      toast.error("問題の取得に失敗しました");
      return;
    }
    setDrillType(type);
    setItem(picked);
    setResult(null);
    setSelectedFlaw(null);
    setFlawExplanation("");
    setFlawFix("");
    setStance(null);
    setReasons(["", "", ""]);
    setSkClaim("");
    setSkGrounds("");
    setSkExample("");
    setSkRebuttal("");
    setAbsText("");
    setRebCounter("");
    setRebResponse("");
    setCmpContrast("");
    setCmpChoice(null);
    setCmpReason("");
    setQfQuestion("");
    setQfWhy("");
    setAlexIndex(null);
    if (picked.type === "quick_logic") {
      setTimeLeft(picked.timeLimitSec ?? DEFAULT_QUICK_LOGIC_SEC);
    } else {
      setTimeLeft(null);
    }
    setStep("drill");
  }

  // quick_logic タイマー
  useEffect(() => {
    if (step !== "drill" || timeLeft === null) return;
    if (timeLeft <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => (v === null ? v : v - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeLeft]);

  const answer: LogicDrillAnswer | null = useMemo(() => {
    if (!item) return null;
    if (item.type === "flaw_finder") {
      if (!selectedFlaw) return null;
      return { type: "flaw_finder", selectedFlaw, explanation: flawExplanation, fix: flawFix };
    }
    if (item.type === "quick_logic") {
      if (stance === null) return null;
      return { type: "quick_logic", stance, reasons };
    }
    if (item.type === "skeleton") {
      if (!skClaim.trim() || !skGrounds.trim() || !skExample.trim() || !skRebuttal.trim()) return null;
      return { type: "skeleton", claim: skClaim, grounds: skGrounds, example: skExample, rebuttal: skRebuttal };
    }
    if (item.type === "abstraction") {
      if (!absText.trim()) return null;
      return { type: "abstraction", text: absText };
    }
    if (item.type === "rebuttal") {
      if (!rebCounter.trim() || !rebResponse.trim()) return null;
      return { type: "rebuttal", counterArgument: rebCounter, response: rebResponse };
    }
    if (item.type === "compare") {
      if (!cmpContrast.trim() || cmpChoice === null || !cmpReason.trim()) return null;
      return { type: "compare", contrast: cmpContrast, choice: cmpChoice, reason: cmpReason };
    }
    if (item.type === "question_framing") {
      if (!qfQuestion.trim() || !qfWhy.trim()) return null;
      return { type: "question_framing", question: qfQuestion, why: qfWhy };
    }
    // alexandra
    if (alexIndex === null) return null;
    return { type: "alexandra", selectedIndex: alexIndex };
  }, [
    item,
    selectedFlaw,
    flawExplanation,
    flawFix,
    stance,
    reasons,
    skClaim,
    skGrounds,
    skExample,
    skRebuttal,
    absText,
    rebCounter,
    rebResponse,
    cmpContrast,
    cmpChoice,
    cmpReason,
    qfQuestion,
    qfWhy,
    alexIndex,
  ]);

  async function submit() {
    if (!item || !answer || evaluating) return;
    setEvaluating(true);
    try {
      const res = await authFetch("/api/essay/logic-drill/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drillType: item.type, itemId: item.id, answer }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LogicDrillResult;
      setResult(data);
      setStep("result");
    } catch (err) {
      console.error("logic-drill evaluate failed", err);
      toast.error("採点に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/student/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold">論理ドリル</h1>
        </div>
        <Link href="/student/essay/logic-drill/history">
          <Button variant="outline" size="sm" className="gap-1">
            <History className="size-4" /> 履歴
          </Button>
        </Link>
      </div>

      {step === "select" && (
        <div className="space-y-4">
          {/* 入口ヒーロー */}
          <section className="relative isolate overflow-hidden rounded-[22px] p-5 text-white shadow-[0_16px_44px_-22px_rgba(79,70,229,0.6)]">
            <div className="absolute inset-0 -z-20 bg-[linear-gradient(120deg,#4f46e5_0%,#6366f1_45%,#0891b2_115%)]" />
            <div className="absolute -right-8 -top-12 -z-10 size-48 rounded-full bg-cyan-300/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-6 -z-10 size-48 rounded-full bg-indigo-300/30 blur-3xl" />
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              <Sparkles className="size-3.5" />
              Logic Drill
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">論理ドリル</h2>
            <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-white/85">
              主張を筋道立てて言葉にする力を、短時間の反復で鍛えます。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {HOW_IT_WORKS.map((s) => (
                <div
                  key={s.title}
                  className="rounded-xl bg-white/10 p-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm"
                >
                  <s.Icon className="mx-auto size-4 text-white/90" />
                  <p className="mt-1 text-[11.5px] font-semibold leading-tight">{s.title}</p>
                  <p className="text-[10px] leading-tight text-white/70">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 型の選択（今日のおすすめを強調） */}
          <p className="px-1 text-xs font-medium text-muted-foreground">
            今日のおすすめから、または好きな型で始めましょう
          </p>
          <div className="space-y-2.5">
            {LOGIC_DRILL_TYPES.map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              const recommended = t === getRotatedLogicDrillType(date);
              return (
                <button
                  key={t}
                  onClick={() => start(t)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    recommended
                      ? "border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50/60 dark:border-teal-800 dark:from-teal-950/30 dark:to-emerald-950/20"
                      : "border-border/60 bg-card hover:border-teal-200"
                  }`}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                      recommended
                        ? "bg-teal-500 text-white"
                        : "bg-muted text-muted-foreground group-hover:bg-teal-100 group-hover:text-teal-700 dark:group-hover:bg-teal-950/40"
                    }`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold">{LOGIC_DRILL_TYPE_LABELS[t]}</span>
                      {recommended && (
                        <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          今日のおすすめ
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {meta.tagline}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "drill" && item?.type === "flaw_finder" && (
        <div className="space-y-4">
          <Card><CardContent className="py-4 text-sm leading-relaxed">{item.prompt}</CardContent></Card>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">どの欠陥か</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FLAW_KIND_LABELS) as FlawKind[]).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={selectedFlaw === k ? "default" : "outline"}
                  onClick={() => setSelectedFlaw(k)}
                >
                  {FLAW_KIND_LABELS[k]}
                </Button>
              ))}
            </div>
          </div>
          <Textarea placeholder="どこがどう論理的におかしいか説明" value={flawExplanation} onChange={(e) => setFlawExplanation(e.target.value)} />
          <Textarea placeholder="論理が通るよう修正した文" value={flawFix} onChange={(e) => setFlawFix(e.target.value)} />
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "quick_logic" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{item.prompt}</p>
            {timeLeft !== null && (
              <span className="text-sm tabular-nums text-muted-foreground">
                残り {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={stance === "agree" ? "default" : "outline"} onClick={() => setStance("agree")}>賛成</Button>
            <Button size="sm" variant={stance === "disagree" ? "default" : "outline"} onClick={() => setStance("disagree")}>反対</Button>
          </div>
          {reasons.map((r, i) => (
            <Textarea
              key={i}
              placeholder={`理由${i + 1}`}
              value={r}
              onChange={(e) => setReasons((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "skeleton" && (
        <div className="space-y-4">
          <Card><CardContent className="py-4 text-sm leading-relaxed">
            <p className="mb-1 text-xs font-medium text-muted-foreground">テーマ</p>
            {item.prompt}
          </CardContent></Card>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">主張</p>
              <Textarea placeholder="このテーマに対する自分の主張" value={skClaim} onChange={(e) => setSkClaim(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">根拠</p>
              <Textarea placeholder="主張を支える根拠" value={skGrounds} onChange={(e) => setSkGrounds(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">具体例</p>
              <Textarea placeholder="根拠を裏づける具体例" value={skExample} onChange={(e) => setSkExample(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">反論への応答</p>
              <Textarea placeholder="想定される反論と、それへの応答" value={skRebuttal} onChange={(e) => setSkRebuttal(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "abstraction" && (
        <div className="space-y-4">
          <p className="font-medium">
            {item.direction === "concretize"
              ? "この抽象的な主張を、具体例で説明してみましょう"
              : "この具体例を一般化して、主張にしてみましょう"}
          </p>
          <Card><CardContent className="py-4 text-sm leading-relaxed">{item.prompt}</CardContent></Card>
          <Textarea
            placeholder={item.direction === "concretize" ? "具体例で説明" : "一般化した主張"}
            value={absText}
            onChange={(e) => setAbsText(e.target.value)}
          />
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "rebuttal" && (
        <div className="space-y-4">
          <Card><CardContent className="py-4 text-sm leading-relaxed">
            <p className="mb-1 text-xs font-medium text-muted-foreground">自分の主張／テーマ</p>
            {item.prompt}
          </CardContent></Card>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">最強の反論</p>
            <Textarea placeholder="自説に対する最も強い反論を想定して書く" value={rebCounter} onChange={(e) => setRebCounter(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">それへの応答</p>
            <Textarea placeholder="その反論への応答（再反論）" value={rebResponse} onChange={(e) => setRebResponse(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "compare" && (
        <div className="space-y-4">
          <Card><CardContent className="py-4 text-sm leading-relaxed">
            <p className="mb-1 text-xs font-medium text-muted-foreground">問い</p>
            {item.prompt}
          </CardContent></Card>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Card><CardContent className="py-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">A</p>
              {item.optionA}
            </CardContent></Card>
            <Card><CardContent className="py-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">B</p>
              {item.optionB}
            </CardContent></Card>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">対比</p>
            <Textarea placeholder="2つの選択肢を軸を立てて対比する" value={cmpContrast} onChange={(e) => setCmpContrast(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">どちらを選ぶか</p>
            <div className="flex gap-2">
              <Button size="sm" variant={cmpChoice === "A" ? "default" : "outline"} onClick={() => setCmpChoice("A")}>Aを選ぶ</Button>
              <Button size="sm" variant={cmpChoice === "B" ? "default" : "outline"} onClick={() => setCmpChoice("B")}>Bを選ぶ</Button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">理由</p>
            <Textarea placeholder="なぜそちらを選ぶのか" value={cmpReason} onChange={(e) => setCmpReason(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "question_framing" && (
        <div className="space-y-4">
          <Card><CardContent className="py-4 text-sm leading-relaxed">
            <p className="mb-1 text-xs font-medium text-muted-foreground">曖昧なテーマ</p>
            {item.prompt}
          </CardContent></Card>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">立てた問い</p>
            <Textarea placeholder="このテーマから論じるべき問い（論点）を立てる" value={qfQuestion} onChange={(e) => setQfQuestion(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">なぜその問いか</p>
            <Textarea placeholder="その問いを立てた理由" value={qfWhy} onChange={(e) => setQfWhy(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "drill" && item?.type === "alexandra" && (
        <div className="space-y-4">
          <Card><CardContent className="py-4 text-sm leading-relaxed">{item.prompt}</CardContent></Card>
          <div className="space-y-2">
            {item.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => setAlexIndex(i)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all ${
                  alexIndex === i
                    ? "border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30"
                    : "border-border/60 bg-card hover:border-teal-200"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    alexIndex === i ? "border-teal-500 bg-teal-500 text-white" : "border-muted-foreground/40 text-muted-foreground"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1">{choice}</span>
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={!answer || evaluating} onClick={() => submit()}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : "採点する"}
          </Button>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          {result.feedback.mcqCorrect !== undefined ? (
            <Card
              className={
                result.feedback.mcqCorrect
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
              }
            >
              <CardContent className="py-5 text-center">
                <p
                  className={`text-2xl font-bold ${
                    result.feedback.mcqCorrect ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {result.feedback.mcqCorrect ? "正解" : "不正解"}
                </p>
                {result.feedback.modelAnswer && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {result.feedback.modelAnswer}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                {([["consistency", "一貫性"], ["validity", "妥当性"], ["structure", "構成"]] as const).map(([key, label]) => (
                  <Card key={key}><CardContent className="py-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{result.scores[key]}<span className="text-xs">/5</span></p>
                  </CardContent></Card>
                ))}
              </div>
              {result.feedback.flawCorrect !== undefined && (
                <p className={`text-sm font-medium ${result.feedback.flawCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                  欠陥の同定: {result.feedback.flawCorrect ? "正解" : "不正解"}
                </p>
              )}
              <Card><CardContent className="py-4 space-y-2 text-sm">
                <p><b>良い点:</b> {result.feedback.good}</p>
                <p><b>改善:</b> {result.feedback.improve}</p>
                {result.feedback.modelAnswer && <p className="text-muted-foreground"><b>模範:</b> {result.feedback.modelAnswer}</p>}
              </CardContent></Card>
            </>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => start(drillType)}>もう一度</Button>
            <Link href="/student/essay/logic-drill/history" className="flex-1"><Button variant="outline" className="w-full">履歴</Button></Link>
          </div>
          <TourNextButton />
        </div>
      )}
    </div>
  );
}

export default function LogicDrillPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="size-5 animate-spin" /></div>}>
      <LogicDrillInner />
    </Suspense>
  );
}

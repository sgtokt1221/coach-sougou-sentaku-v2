// src/app/student/essay/logic-drill/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, History } from "lucide-react";
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
    if (stance === null) return null;
    return { type: "quick_logic", stance, reasons };
  }, [item, selectedFlaw, flawExplanation, flawFix, stance, reasons]);

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
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            今日のおすすめ: <b>{LOGIC_DRILL_TYPE_LABELS[getRotatedLogicDrillType(date)]}</b>
          </p>
          {LOGIC_DRILL_TYPES.map((t) => (
            <Card key={t} className="cursor-pointer hover:bg-accent/40" onClick={() => start(t)}>
              <CardContent className="py-4">
                <p className="font-medium">{LOGIC_DRILL_TYPE_LABELS[t]}</p>
              </CardContent>
            </Card>
          ))}
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

      {step === "result" && result && (
        <div className="space-y-4">
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

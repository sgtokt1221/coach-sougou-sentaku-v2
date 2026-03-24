"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export const INTEREST_OPTIONS = [
  "法律・政治",
  "ビジネス・経済",
  "国際・異文化",
  "理工・情報",
  "社会・福祉",
  "教育",
  "文学・人文",
  "環境・農学",
  "医療・健康",
] as const;

export const STRENGTH_OPTIONS = [
  "リーダーシップ",
  "語学力",
  "論理的思考",
  "課題解決力",
  "コミュニケーション力",
  "創造性",
  "研究力",
  "協調性",
] as const;

export const ACTIVITY_OPTIONS = [
  "ボランティア",
  "部活動",
  "留学・国際交流",
  "研究・論文",
  "コンテスト・大会",
  "生徒会・リーダー",
  "起業・ビジネス",
  "地域活動",
] as const;

export interface SuggestResult {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  admissionPolicy: string;
  matchScore: number;
  matchReasons: string[];
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

export function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border hover:bg-muted"
      }`}
    >
      {selected && <CheckCircle2 className="size-3.5" />}
      {label}
    </button>
  );
}

export function SuggestResultCard({
  result,
  onClick,
}: {
  result: SuggestResult;
  onClick?: () => void;
}) {
  const router = useRouter();
  const handleClick = onClick ?? (() =>
    router.push(`/student/universities/${result.universityId}/${result.facultyId}`)
  );
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow border ${scoreBg(result.matchScore)}`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{result.universityName}</span>
              <span className="text-muted-foreground text-sm">{result.facultyName}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="default" className="bg-primary/90">
                <Sparkles className="size-3 mr-1" />
                AP適合度 {result.matchScore}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {result.admissionPolicy}
            </p>
            {result.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.matchReasons.map((reason) => (
                  <Badge key={reason} variant="outline" className="text-xs font-normal">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ResultSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

interface SuggestPanelProps {
  onSelectUniversity?: (universityId: string, facultyId: string) => void;
}

export function SuggestPanel({ onSelectUniversity }: SuggestPanelProps = {}) {
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [futureGoal, setFutureGoal] = useState("");
  const [results, setResults] = useState<SuggestResult[] | null>(null);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/matching/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, strengths, activities, futureGoal }),
      });
      if (!res.ok) throw new Error("サジェスト取得に失敗しました");
      const data = await res.json();
      setResults(data.results);
      setTotalAnalyzed(data.totalAnalyzed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const canProceed = [
    interests.length > 0,
    strengths.length > 0,
    activities.length > 0,
    true,
  ];

  const steps = [
    {
      title: "興味のある分野を選んでください",
      subtitle: "複数選択OK",
      content: (
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              selected={interests.includes(opt)}
              onClick={() => toggleItem(interests, opt, setInterests)}
            />
          ))}
        </div>
      ),
    },
    {
      title: "あなたの強みは？",
      subtitle: "複数選択OK",
      content: (
        <div className="flex flex-wrap gap-2">
          {STRENGTH_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              selected={strengths.includes(opt)}
              onClick={() => toggleItem(strengths, opt, setStrengths)}
            />
          ))}
        </div>
      ),
    },
    {
      title: "力を入れている活動は？",
      subtitle: "複数選択OK",
      content: (
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              selected={activities.includes(opt)}
              onClick={() => toggleItem(activities, opt, setActivities)}
            />
          ))}
        </div>
      ),
    },
    {
      title: "将来やりたいこと・目標",
      subtitle: "任意 - 入力するとより正確にマッチします",
      content: (
        <Textarea
          placeholder="例: 国際機関で途上国の教育支援に携わりたい"
          value={futureGoal}
          onChange={(e) => setFutureGoal(e.target.value)}
          rows={3}
        />
      ),
    },
  ];

  if (results !== null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalAnalyzed}学部のAPを分析 ・ {results.length}件がマッチ
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setResults(null);
              setStep(0);
              setInterests([]);
              setStrengths([]);
              setActivities([]);
              setFutureGoal("");
            }}
          >
            やり直す
          </Button>
        </div>
        {results.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              条件に合う大学が見つかりませんでした。回答を変えて再度お試しください。
            </CardContent>
          </Card>
        ) : (
          results.map((r) => (
            <SuggestResultCard
              key={`${r.universityId}-${r.facultyId}`}
              result={r}
              onClick={
                onSelectUniversity
                  ? () => onSelectUniversity(r.universityId, r.facultyId)
                  : undefined
              }
            />
          ))
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{steps[step].title}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {step + 1} / {steps.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{steps[step].subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps[step].content}

        <Separator />

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            戻る
          </Button>
          {step < steps.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed[step]}
            >
              次へ
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSuggest}
              disabled={loading || (interests.length === 0 && strengths.length === 0)}
            >
              <Sparkles className="size-4 mr-1" />
              {loading ? "分析中..." : "APからサジェスト"}
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded p-3">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

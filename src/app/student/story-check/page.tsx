"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  Target,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import type { StoryCheckReport, AxisScore, ContradictionItem } from "@/lib/types/story-check";

interface UniversityOption {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
}

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
        ? "text-amber-500"
        : "text-rose-500";
  const bgColor =
    score >= 80
      ? "bg-emerald-500/10"
      : score >= 60
        ? "bg-amber-500/10"
        : "bg-rose-500/10";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold",
        bgColor,
        color,
        size === "lg" ? "h-24 w-24 text-3xl" : "h-12 w-12 text-lg"
      )}
    >
      {score}
    </div>
  );
}

function AxisScoreCard({ axis }: { axis: AxisScore }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScoreCircle score={axis.score} size="sm" />
            <div>
              <p className="font-medium text-sm">{axis.axis}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {axis.assessment}
              </p>
            </div>
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
        </div>
        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">{axis.assessment}</p>
            {axis.evidence.length > 0 && (
              <ul className="space-y-1">
                {axis.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContradictionCard({ item }: { item: ContradictionItem }) {
  const severityConfig = {
    critical: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10", label: "重大" },
    warning: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10", label: "注意" },
    info: { icon: Info, color: "text-sky-500", bg: "bg-sky-500/10", label: "情報" },
  };
  const config = severityConfig[item.severity];
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-full p-1.5", config.bg)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {config.label}
              </Badge>
            </div>
            <p className="text-sm">{item.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5">
                {item.source1.title}
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="rounded bg-muted px-1.5 py-0.5">
                {item.source2.title}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StoryCheckPage() {
  const [selectedTarget, setSelectedTarget] = useState<UniversityOption | null>(null);
  const [report, setReport] = useState<StoryCheckReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [reportMeta, setReportMeta] = useState<{ universityName: string; facultyName: string } | null>(null);

  // Fetch target universities from matching results
  const { data: matchingData } = useAuthSWR<{
    results: {
      universityId: string;
      universityName: string;
      facultyId: string;
      facultyName: string;
    }[];
  }>("/api/matching");

  const targets: UniversityOption[] = matchingData?.results?.slice(0, 10).map((r) => ({
    universityId: r.universityId,
    universityName: r.universityName,
    facultyId: r.facultyId,
    facultyName: r.facultyName,
  })) || [];

  async function runCheck() {
    if (!selectedTarget) return;
    setChecking(true);
    setReport(null);
    try {
      const res = await authFetch("/api/story-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId: selectedTarget.universityId,
          facultyId: selectedTarget.facultyId,
        }),
      });
      const data = await res.json();
      setReport(data.report);
      setReportMeta({ universityName: data.universityName, facultyName: data.facultyName });
    } catch {
      // Error handling
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <BookCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">合格ストーリー一貫性チェック</h1>
          <p className="text-sm text-muted-foreground">
            全書類・面接・活動を横断分析し、ストーリーの一貫性を7軸で評価します
          </p>
        </div>
      </div>

      {/* University Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            チェック対象の大学・学部を選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                志望校データを読み込み中...
              </p>
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {targets.map((t) => (
                <button
                  key={`${t.universityId}-${t.facultyId}`}
                  onClick={() => setSelectedTarget(t)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent/50",
                    selectedTarget?.universityId === t.universityId &&
                      selectedTarget?.facultyId === t.facultyId
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <span className="font-medium">{t.universityName}</span>
                  <span className="text-muted-foreground"> - {t.facultyName}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button
              onClick={runCheck}
              disabled={!selectedTarget || checking}
              className="w-full"
            >
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <BookCheck className="mr-2 h-4 w-4" />
                  一貫性チェックを実行
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report */}
      {report && reportMeta && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4 md:flex-row">
                <ScoreCircle score={report.overallScore} />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-lg font-bold">
                    {reportMeta.universityName} {reportMeta.facultyName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.overallAssessment}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          {report.storyStrengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ストーリーの強み
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.storyStrengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 7-Axis Scores */}
          <div>
            <h3 className="mb-3 text-base font-semibold">7軸分析</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {report.axisScores.map((axis, i) => (
                <AxisScoreCard key={i} axis={axis} />
              ))}
            </div>
          </div>

          {/* Contradictions */}
          {report.contradictions.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold">矛盾・不整合</h3>
              <div className="space-y-3">
                {report.contradictions.map((c, i) => (
                  <ContradictionCard key={i} item={c} />
                ))}
              </div>
            </div>
          )}

          {/* Weak Connections */}
          {report.weakConnections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">接続が弱いエリア</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.weakConnections.map((w, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm font-medium">{w.area}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {w.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {report.actionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">改善アクション</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.actionItems.map((item, i) => {
                    const priorityConfig = {
                      high: { color: "bg-rose-500", label: "優先" },
                      medium: { color: "bg-amber-500", label: "中" },
                      low: { color: "bg-sky-500", label: "低" },
                    };
                    const config = priorityConfig[item.priority];

                    return (
                      <div key={i} className="flex items-start gap-3">
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                        >
                          <span
                            className={cn(
                              "mr-1 inline-block h-2 w-2 rounded-full",
                              config.color
                            )}
                          />
                          {config.label}
                        </Badge>
                        <div>
                          <p className="text-sm">{item.action}</p>
                          <p className="text-xs text-muted-foreground">
                            対象: {item.targetMaterial}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

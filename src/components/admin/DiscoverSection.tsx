"use client";

/**
 * 管理者の生徒詳細ページに埋め込む Discover (自己分析 + 志望校マッチング) 閲覧セクション。
 * 読み取り専用。GrowthTree をクリック無効で表示し、マッチング結果はコンパクトに並べる。
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, GraduationCap, Star, Target } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { GrowthTree } from "@/components/self-analysis/GrowthTree";
import type { SelfAnalysis } from "@/lib/types/self-analysis";
import type { MatchResult } from "@/lib/types/matching";

interface DiscoverSectionProps {
  studentId: string;
}

interface MatchingResponse {
  results: MatchResult[];
  totalUniversities: number;
  matchedCount: number;
  targetUniversities: string[];
}

export function DiscoverSection({ studentId }: DiscoverSectionProps) {
  const [selfAnalysis, setSelfAnalysis] = useState<SelfAnalysis | null>(null);
  const [saError, setSaError] = useState<string | null>(null);
  const [matching, setMatching] = useState<MatchingResponse | null>(null);
  const [loadingSa, setLoadingSa] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/admin/students/${studentId}/self-analysis`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setSelfAnalysis(data);
        } else {
          const body = await res.text().catch(() => "");
          setSaError(`HTTP ${res.status}: ${body}`);
        }
      } catch (err) {
        if (!cancelled) setSaError(err instanceof Error ? err.message : "取得失敗");
      } finally {
        if (!cancelled) setLoadingSa(false);
      }
    })();
    (async () => {
      try {
        const res = await authFetch(`/api/admin/students/${studentId}/matching`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setMatching(data);
        }
      } catch (err) {
        console.warn("[DiscoverSection] matching fetch failed", err);
      } finally {
        if (!cancelled) setLoadingMatch(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // 自己分析の完了状況と step データを GrowthTree 用に整形
  const saCompletedSteps = selfAnalysis?.completedSteps ?? 0;
  const saStepsData: Record<number, Record<string, unknown>> = {};
  if (selfAnalysis) {
    const STEP_KEYS = [
      "values",
      "strengths",
      "weaknesses",
      "interests",
      "vision",
      "identity",
    ] as const;
    STEP_KEYS.forEach((key, i) => {
      const val = (selfAnalysis as unknown as Record<string, unknown>)[key];
      if (val && typeof val === "object" && Object.keys(val as object).length > 0) {
        saStepsData[i + 1] = val as Record<string, unknown>;
      }
    });
  }

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Lightbulb className="size-4 text-amber-500" />
        Discover — 自己分析 / 志望校マッチング
      </h2>

      {/* 自己分析の木 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="size-3.5" />
            自己分析の進捗
            <span className="ml-auto text-xs tabular-nums">
              {saCompletedSteps}/7 ステップ
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSa ? (
            <Skeleton className="h-[340px] w-full rounded-xl" />
          ) : selfAnalysis ? (
            <GrowthTree
              completedSteps={saCompletedSteps}
              stepsData={saStepsData}
            />
          ) : saError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">自己分析データの取得に失敗しました</p>
              <p className="text-xs text-destructive mt-1">{saError}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              まだ自己分析を始めていません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 志望校マッチング */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <GraduationCap className="size-3.5" />
            志望校マッチング
            {matching && (
              <span className="ml-auto text-xs text-muted-foreground">
                {matching.matchedCount}/{matching.totalUniversities} 校マッチ
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMatch ? (
            <Skeleton className="h-32 w-full" />
          ) : !matching || matching.results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              マッチング結果がありません
            </p>
          ) : (
            <div className="space-y-4">
              {/* 生徒が選択済みの志望校 */}
              {matching.targetUniversities.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    この生徒が選んでいる志望校 ({matching.targetUniversities.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {matching.targetUniversities.map((uid) => (
                      <Badge key={uid} variant="secondary" className="text-xs">
                        {uid}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* マッチ度の高い Top 5 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  マッチ度トップ 5
                </p>
                <div className="space-y-2">
                  {matching.results.slice(0, 5).map((r, i) => {
                    const unmet = [
                      ...(r.gpaCheck && !r.gpaCheck.met ? [r.gpaCheck.requirement] : []),
                      ...(r.certCheck && !r.certCheck.met ? [r.certCheck.requirement] : []),
                      ...(r.requirementChecks ?? [])
                        .filter((c) => !c.met)
                        .map((c) => c.requirement),
                    ];
                    return (
                      <div
                        key={`${r.universityId}-${r.facultyId}`}
                        className="flex items-center gap-3 rounded-md border border-border/50 p-2.5"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {r.universityName} {r.facultyName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] py-0">
                              {r.recommendation}
                            </Badge>
                            {unmet.length > 0 && (
                              <span className="text-[11px] text-rose-600 truncate">
                                不足: {unmet.slice(0, 2).join(", ")}
                                {unmet.length > 2 ? ` 他${unmet.length - 2}件` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star
                            className={`size-3.5 ${
                              r.matchScore >= 80
                                ? "text-emerald-500"
                                : r.matchScore >= 60
                                  ? "text-amber-500"
                                  : "text-slate-400"
                            }`}
                          />
                          <span className="text-sm font-semibold tabular-nums">
                            {r.matchScore}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

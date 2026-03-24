"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { MatchResult, MatchingResponse } from "@/lib/types/matching";
import { SuggestPanel, ResultSkeleton } from "@/components/shared/SuggestPanel";

const CERT_TYPES = ["EIKEN", "TOEIC", "TOEFL", "IELTS", "TEAP", "GTEC"] as const;

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

function ResultCard({ result }: { result: MatchResult }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow border overflow-visible ${scoreBg(result.matchScore)}`}
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
              <Badge variant={recommendationVariant(result.recommendation)}>
                {result.recommendation}
              </Badge>
              <span className={`text-sm font-bold ${scoreColor(result.matchScore)}`}>
                マッチ度 {result.matchScore}%
              </span>
            </div>
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
  const [mode, setMode] = useState<"match" | "suggest">("match");
  const [gpa, setGpa] = useState("");
  const [certType, setCertType] = useState("");
  const [certScore, setCertScore] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; matched: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      {/* Suggest CTA banner (shown in match mode) */}
      {mode === "match" && (
        <button
          type="button"
          onClick={() => setMode("suggest")}
          className="w-full mb-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10 hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                志望校がまだ決まっていない方へ
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                かんたんな質問に答えるだけで、あなたに合った大学・学部をAP基準でサジェストします
              </p>
            </div>
            <ArrowRight className="size-4 text-primary shrink-0 ml-auto" />
          </div>
        </button>
      )}

      {/* Back to match mode (shown in suggest mode) */}
      {mode === "suggest" && (
        <button
          type="button"
          onClick={() => setMode("match")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowRight className="size-3.5 rotate-180" />
          志望校マッチングに戻る
        </button>
      )}

      {mode === "suggest" ? (
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
                        <SelectItem key={c} value={c}>
                          {c}
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
                results.map((r) => (
                  <ResultCard key={`${r.universityId}-${r.facultyId}`} result={r} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

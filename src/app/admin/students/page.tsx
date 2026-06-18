"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowUpDown, Users, UserPlus, Filter, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, GraduationCap, RotateCcw, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { motion, useReducedMotion } from "framer-motion";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { StudentListItem } from "@/lib/types/admin";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
import { isGraduated } from "@/lib/utils/grade";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

type SortKey = "lastActivity" | "score" | "name" | "rank" | "interviewRank";
type StatusFilter = "all" | "attention" | "healthy" | "graduated";

/** 加入からの経過を「3 日前 / 2 週間前 / 5 ヶ月前 / 1 年 2 ヶ月前」 の形で返す */
function formatJoinElapsed(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return "今日";
  if (days < 14) return `${days}日前`;
  if (days < 60) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years}年${months}ヶ月前` : `${years}年前`;
}

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function scoreTrendIcon(trend: StudentListItem["scoreTrend"]) {
  switch (trend) {
    case "up":
      return <TrendingUp className="size-4 text-emerald-500" />;
    case "down":
      return <TrendingDown className="size-4 text-rose-500" />;
    case "flat":
      return <Minus className="size-4 text-muted-foreground" />;
    default:
      return <span className="text-muted-foreground">-</span>;
  }
}

/** 弱点の改善傾向インジケーター (生徒一覧用) */
function weaknessTrendIndicator(trend: StudentListItem["weaknessTrend"]) {
  switch (trend) {
    case "improving":
      return (
        <span
          title="弱点が改善傾向"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
        >
          <TrendingUp className="size-3" />
          改善
        </span>
      );
    case "declining":
      return (
        <span
          title="弱点が停滞・繰り返し"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400"
        >
          <TrendingDown className="size-3" />
          停滞
        </span>
      );
    case "stable":
      return (
        <span
          title="弱点は横ばい"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
        >
          <Minus className="size-3" />
          横ばい
        </span>
      );
    default:
      return null;
  }
}

/** 小論文 / 面接 を区別するモノグラムマーク */
function Monogram({ kind }: { kind: "essay" | "interview" }) {
  const isEssay = kind === "essay";
  return (
    <span
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-bold leading-none ${
        isEssay
          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
          : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
      }`}
      title={isEssay ? "小論文" : "面接"}
    >
      {isEssay ? "小" : "面"}
    </span>
  );
}

/** 最終活動の種別ラベル */
const ACTIVITY_LABEL: Record<
  NonNullable<StudentListItem["lastActivity"]>["type"],
  string
> = {
  essay: "小論文添削",
  interview: "模擬面接",
  skillCheck: "小論文スキルチェック",
  interviewSkillCheck: "面接スキルチェック",
  summaryDrill: "要約ドリル",
  activity: "活動登録",
};

/**
 * 要対応 判定。アラートが1件でもある、または締切超過の未提出宿題がある生徒。
 * 「順調」はこの否定 (相補的) なので、卒業生以外は必ずどちらか一方に入る。
 */
function needsAttention(s: StudentListItem): boolean {
  return s.alertFlags.length > 0 || s.hasOverdueHomework === true;
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { mutate } = useSWRConfig();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastActivity");
  const [universityFilter, setUniversityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  /** 卒業生 → 浪人 切替 (= 「現役に戻す」 ボタン) */
  const markAsRonin = async (uid: string, displayName: string) => {
    if (!confirm(`${displayName} を浪人として現役リストに戻しますか?`)) return;
    try {
      const res = await authFetch(`/api/admin/students/${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRonin: true }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      toast.success(`${displayName} を浪人として復帰させました`);
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/admin/students"),
      );
    } catch (err) {
      console.error(err);
      toast.error("操作に失敗しました");
    }
  };

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("sort", sortKey);
  if (universityFilter) params.set("university", universityFilter);
  const { data: rawData, isLoading, error: studentsError } = useAuthSWR<StudentListItem[]>(
    `/api/admin/students?${params.toString()}`
  );

  // ステータスフィルタをクライアントサイドで適用
  // 「卒業生」 タブ以外では卒業生を非表示にし、 通常リストを汚さない
  const filteredStudents = useMemo(() => {
    if (!rawData) return [];

    const visible =
      statusFilter === "graduated"
        ? rawData.filter((s) => isGraduated(s.grade, s.gradeUpdatedAt, s.isRonin))
        : rawData.filter((s) => !isGraduated(s.grade, s.gradeUpdatedAt, s.isRonin));

    if (statusFilter === "all" || statusFilter === "graduated") return visible;

    if (statusFilter === "attention") return visible.filter(needsAttention);
    if (statusFilter === "healthy") return visible.filter((s) => !needsAttention(s));
    return visible;
  }, [rawData, statusFilter]);

  /** タブ別件数 (卒業生を除いた現役 + 卒業生数) */
  const tabCounts = useMemo(() => {
    const all = rawData ?? [];
    const active = all.filter(
      (s) => !isGraduated(s.grade, s.gradeUpdatedAt, s.isRonin),
    );
    const attention = active.filter(needsAttention).length;
    return {
      all: active.length,
      attention,
      healthy: active.length - attention,
      graduated: all.length - active.length,
    };
  }, [rawData]);

  const students = filteredStudents;
  const loading = isLoading;

  // フィルタなしの全データから志望校一覧を取得（フィルタ用）
  const allParams = new URLSearchParams();
  allParams.set("sort", sortKey);
  const { data: allStudents } = useAuthSWR<StudentListItem[]>(
    `/api/admin/students?${allParams.toString()}`
  );
  const allCompoundIds = useMemo(() => {
    if (!allStudents) return [];
    const set = new Set<string>();
    allStudents.forEach((s) => s.targetUniversities.forEach((u) => set.add(u)));
    return [...set];
  }, [allStudents]);

  const [uniNameMap, setUniNameMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (allCompoundIds.length === 0) return;
    fetch(`/api/universities/resolve?ids=${allCompoundIds.join(",")}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const r of d.resolved ?? []) {
          map[`${r.universityId}:${r.facultyId}`] = `${r.universityName} ${r.facultyName}`;
        }
        setUniNameMap(map);
      })
      .catch(() => {});
  }, [allCompoundIds]);

  const resolveUniName = (compoundId: string) => uniNameMap[compoundId] ?? compoundId;

  const universityOptions = useMemo(() => {
    return allCompoundIds
      .map((id) => ({ id, name: uniNameMap[id] ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [allCompoundIds, uniNameMap]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "lastActivity", label: "最終活動" },
    { key: "score", label: "スコア" },
    { key: "rank", label: "小論文ランク" },
    { key: "interviewRank", label: "面接ランク" },
    { key: "name", label: "名前" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">生徒一覧</h1>
          <p className="text-sm text-muted-foreground">全生徒の状況を確認できます</p>
        </div>
        <Button onClick={() => router.push("/admin/students/new")}>
          <UserPlus className="mr-2 size-4" />
          生徒を追加
        </Button>
      </div>

      {/* Search, Filter & Sort */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3 max-w-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="名前・メールで検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={universityFilter}
              onValueChange={(v) => setUniversityFilter(v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 size-4 text-muted-foreground" />
                <SelectValue placeholder="志望校で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての志望校</SelectItem>
                {universityOptions.map((uni) => (
                  <SelectItem key={uni.id} value={uni.id}>
                    {uni.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            {sortOptions.map((opt) => (
              <Button
                key={opt.key}
                variant={sortKey === opt.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSortKey(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">ステータス:</span>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={statusFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="h-7"
            >
              全員 ({tabCounts.all})
            </Button>
            <Button
              variant={statusFilter === "attention" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("attention")}
              className="h-7 gap-1.5"
            >
              <AlertCircle className="size-3" />
              要対応 ({tabCounts.attention})
            </Button>
            <Button
              variant={statusFilter === "healthy" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("healthy")}
              className="h-7 gap-1.5"
            >
              <CheckCircle2 className="size-3" />
              順調 ({tabCounts.healthy})
            </Button>
            <Button
              variant={statusFilter === "graduated" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("graduated")}
              className="h-7 gap-1.5"
            >
              <GraduationCap className="size-3" />
              卒業生 ({tabCounts.graduated})
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      {studentsError && (
        <ApiErrorBanner error={studentsError} title="生徒一覧の取得に失敗しました" />
      )}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "該当する生徒が見つかりません" : "生徒がまだ登録されていません"}
              description={search ? "検索条件を変更してお試しください" : undefined}
            />
          ) : (
            <>
              {/* スマホ: カード表示（横長テーブルは見切れるため切替） */}
              <div className="divide-y sm:hidden">
                {students.map((s) => (
                  <div
                    key={s.uid}
                    onClick={() => router.push(`/admin/students/${s.uid}`)}
                    className={`cursor-pointer p-3 ${
                      s.hasOverdueHomework
                        ? "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30"
                        : "active:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        <AvatarImage src={s.photoURL ?? undefined} alt={s.displayName} />
                        <AvatarFallback>{getInitials(s.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </div>

                    {s.targetUniversities.length > 0 && (
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        志望: {resolveUniName(s.targetUniversities[0])}
                        {s.targetUniversities.length > 1 ? ` 他${s.targetUniversities.length - 1}校` : ""}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">小論</span>
                        {s.currentSkillRank ? (
                          <SkillRankBadge rank={s.currentSkillRank} size="sm" animate={false} />
                        ) : (
                          <span className="text-muted-foreground">未</span>
                        )}
                        {s.latestScore !== null && (
                          <span className={`font-bold ${scoreColor(s.latestScore)}`}>{s.latestScore}</span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">面接</span>
                        {s.currentInterviewRank ? (
                          <SkillRankBadge rank={s.currentInterviewRank} size="sm" animate={false} />
                        ) : (
                          <span className="text-muted-foreground">未</span>
                        )}
                        {s.latestInterviewScore != null && (
                          <span className={`font-bold ${scoreColor(s.latestInterviewScore)}`}>{s.latestInterviewScore}</span>
                        )}
                      </span>
                      {s.activeWeaknessCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">弱点</span>
                          <Badge
                            variant={s.activeWeaknessCount >= 5 ? "destructive" : "secondary"}
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {s.activeWeaknessCount}
                          </Badge>
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                      <span>ログイン {s.lastSeenAt ? formatJoinElapsed(s.lastSeenAt) : "—"}</span>
                      {s.lastActivity && (
                        <span>
                          {ACTIVITY_LABEL[s.lastActivity.type]} {formatJoinElapsed(s.lastActivity.at)}
                        </span>
                      )}
                    </div>

                    {s.hasOverdueHomework && (
                      <Badge variant="destructive" className="mt-2 gap-1 text-[10px] font-bold">
                        <AlertCircle className="size-3" />
                        宿題提出期限切れ
                      </Badge>
                    )}
                    {statusFilter === "graduated" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markAsRonin(s.uid, s.displayName);
                        }}
                      >
                        <RotateCcw className="size-3" />
                        現役に戻す
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* タブレット以上: テーブル */}
              <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">名前</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">志望校</th>
                    <th className="px-4 py-3 text-center font-medium">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">小論文</span>
                      ランク
                    </th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">面接</span>
                      ランク
                    </th>
                    <th className="px-4 py-3 text-center font-medium">最新スコア</th>
                    <th className="px-4 py-3 text-center font-medium hidden lg:table-cell">推移</th>
                    <th className="px-4 py-3 text-center font-medium hidden lg:table-cell">弱点</th>
                    <th className="px-4 py-3 text-center font-medium">最終ログイン</th>
                    <th className="px-4 py-3 text-center font-medium">最終活動</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    return (
                      <motion.tr
                        key={s.uid}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.05 }}
                        className={`cursor-pointer border-b transition-colors ${
                          s.hasOverdueHomework
                            ? "border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => router.push(`/admin/students/${s.uid}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar size="sm">
                              <AvatarImage src={s.photoURL ?? undefined} alt={s.displayName} />
                              <AvatarFallback>{getInitials(s.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium">{s.displayName}</p>
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                              {s.createdAt && (
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  加入 {formatJoinElapsed(s.createdAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {s.targetUniversities.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{resolveUniName(s.targetUniversities[0])}</span>
                              {s.targetUniversities.length > 1 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  他{s.targetUniversities.length - 1}校
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.currentSkillRank ? (
                            <SkillRankBadge
                              rank={s.currentSkillRank}
                              size="sm"
                              animate={false}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">未</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {s.currentInterviewRank ? (
                            <SkillRankBadge
                              rank={s.currentInterviewRank}
                              size="sm"
                              animate={false}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">未</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1 text-sm">
                            <span className="inline-flex items-center gap-1">
                              <Monogram kind="essay" />
                              {s.latestScore !== null ? (
                                <span className={`font-bold ${scoreColor(s.latestScore)}`}>
                                  {s.latestScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Monogram kind="interview" />
                              {s.latestInterviewScore != null ? (
                                <span className={`font-bold ${scoreColor(s.latestInterviewScore)}`}>
                                  {s.latestInterviewScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1">
                              <Monogram kind="essay" />
                              {scoreTrendIcon(s.scoreTrend)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Monogram kind="interview" />
                              {scoreTrendIcon(s.interviewScoreTrend ?? null)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <div className="flex flex-col items-center gap-1">
                            {s.activeWeaknessCount > 0 ? (
                              <Badge
                                variant={s.activeWeaknessCount >= 5 ? "destructive" : "secondary"}
                                className={[
                                  "text-xs transition-transform hover:scale-110",
                                  s.activeWeaknessCount >= 5 ? "animate-pulse" : "",
                                ].join(" ")}
                              >
                                {s.activeWeaknessCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                            {weaknessTrendIndicator(s.weaknessTrend)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-muted-foreground">
                            {s.lastSeenAt ? formatJoinElapsed(s.lastSeenAt) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            {s.hasOverdueHomework && (
                              <Badge
                                variant="destructive"
                                className="gap-1 text-[10px] font-bold animate-pulse"
                              >
                                <AlertCircle className="size-3" />
                                宿題提出期限切れ
                              </Badge>
                            )}
                            {s.lastActivity ? (
                              <div className="leading-tight">
                                <span className="text-xs font-medium">
                                  {ACTIVITY_LABEL[s.lastActivity.type]}
                                </span>
                                <span className="block text-[10px] text-muted-foreground">
                                  {formatJoinElapsed(s.lastActivity.at)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            {statusFilter === "graduated" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void markAsRonin(s.uid, s.displayName);
                                }}
                              >
                                <RotateCcw className="size-3" />
                                現役に戻す
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

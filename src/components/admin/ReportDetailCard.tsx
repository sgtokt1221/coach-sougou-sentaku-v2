"use client";

import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Mic,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Lightbulb,
  Award,
  Pencil,
  Save,
  X,
  Loader2,
  MessageSquare,
  EyeOff,
  Sparkles,
  Calendar,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { AssignHomeworkButton } from "@/components/admin/AssignHomeworkButton";
import { scoreToSkillRank } from "@/lib/history-rank";
import { resolveUsage } from "@/lib/growth/practice-questions-helpers";
import type { GrowthReport, PracticeQuestion } from "@/lib/types/growth-report";
import type { HomeworkAssignment } from "@/lib/types/homework";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * スコア増減を矢印付きで表示する。
 * 既存の他コンポーネントからも import されているため命名を維持。
 */
export function ScoreChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3.5" />
        +{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
        <TrendingDown className="size-3.5" />
        {change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
      <Minus className="size-3.5" />
      0
    </span>
  );
}

/**
 * 弱点の改善状況バッジ (既存命名維持)。
 */
export function WeaknessStatusBadge({
  status,
}: {
  status: "improved" | "stable" | "declined";
}) {
  switch (status) {
    case "improved":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="mr-1 size-3" />
          改善
        </Badge>
      );
    case "declined":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 size-3" />
          悪化
        </Badge>
      );
    case "stable":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 size-3" />
          横ばい
        </Badge>
      );
  }
}

interface Props {
  report: GrowthReport;
  /** true なら編集ボタンを表示しない (生徒画面用) */
  readOnly?: boolean;
  /** 編集 PATCH が成功した時に呼ばれる。親で mutate を回す等に使う */
  onUpdated?: (next: GrowthReport) => void;
  /** true なら期間・生成日メタヘッダーを表示しない (詳細画面側で大きく出す場合用) */
  hideMetaHeader?: boolean;
}

/**
 * 成長レポート 1 件分の詳細カード (インフォグラフィック表現)。
 *
 * 利用箇所:
 * - /admin/reports 一覧の展開
 * - /admin/students/[id] GrowthReportsSection
 * - /admin/reports/print 印刷ページ
 * - /student/growth (TeacherReportsSection 経由)
 *
 * 管理者・講師向けには編集モードを提供。
 * 編集可能項目: overallAssessment / recommendations / teacherComment / sharedWithStudent
 */
export function ReportDetailCard({
  report,
  readOnly,
  onUpdated,
  hideMetaHeader,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState(report.overallAssessment ?? "");
  const [recs, setRecs] = useState<string[]>(report.recommendations ?? []);
  const [comment, setComment] = useState(report.teacherComment ?? "");
  const [shared, setShared] = useState<boolean>(
    report.sharedWithStudent !== false
  );
  const [practiceQs, setPracticeQs] = useState<PracticeQuestion[]>(
    report.practiceQuestions ?? []
  );
  const [generatingPq, setGeneratingPq] = useState(false);

  const generatePracticeQuestions = async () => {
    setGeneratingPq(true);
    try {
      const res = await authFetch(
        `/api/admin/reports/${report.studentId}/${report.id}/generate-practice-questions`,
        { method: "POST" }
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
          step?: string;
        };
        throw new Error(
          payload.detail
            ? `[${payload.step ?? "?"}] ${payload.detail}`
            : payload.error ?? "類題の生成に失敗しました"
        );
      }
      const updated = (await res.json()) as GrowthReport;
      toast.success(`類題を ${updated.practiceQuestions?.length ?? 0} 件生成しました`);
      onUpdated?.(updated);
    } catch (err) {
      console.error("[ReportDetailCard] generate practice questions failed:", err);
      toast.error(err instanceof Error ? err.message : "類題の生成に失敗しました");
    } finally {
      setGeneratingPq(false);
    }
  };

  const startEdit = () => {
    setAssessment(report.overallAssessment ?? "");
    setRecs(report.recommendations ?? []);
    setComment(report.teacherComment ?? "");
    setShared(report.sharedWithStudent !== false);
    setPracticeQs(report.practiceQuestions ?? []);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch(
        `/api/admin/reports/${report.studentId}/${report.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overallAssessment: assessment,
            recommendations: recs.filter((r) => r.trim().length > 0),
            teacherComment: comment,
            sharedWithStudent: shared,
            // 上下ボタンで並び替えた順序を確実に保存するため、配列 index で order を再付与
            practiceQuestions: practiceQs
              .filter((q) => q.title.trim().length > 0)
              .map((q, idx) => ({ ...q, order: idx })),
          }),
        }
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
          step?: string;
        };
        throw new Error(
          payload.detail
            ? `[${payload.step ?? "?"}] ${payload.detail}`
            : payload.error ?? "保存に失敗しました"
        );
      }
      const updated = (await res.json()) as GrowthReport;
      toast.success("レポートを更新しました");
      setEditing(false);
      onUpdated?.(updated);
    } catch (err) {
      console.error("[ReportDetailCard] save failed:", err);
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 print:space-y-2">
      {/* 印刷専用 1 行サマリーバー (詳細画面側でヘッダーを大きく出している場合は省略) */}
      {!hideMetaHeader && (
        <div className="hidden print:flex print:flex-wrap print:items-center print:justify-between print:gap-x-4 print:gap-y-1 print:border-b print:border-gray-300 print:pb-1.5 print:text-[10pt]">
          <span className="print:font-semibold">
            {report.studentName || "生徒"} ・
            {report.period === "weekly" ? "週次" : "月次"}成長レポート
          </span>
          <span className="print:text-gray-600">
            {formatDate(report.startDate)} 〜 {formatDate(report.endDate)} (生成{" "}
            {formatDate(report.generatedAt)})
          </span>
        </div>
      )}

      {/* 編集ツールバー */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {typeof report.editedAt === "string" && report.editedAt.length > 0 && (
              <span>
                最終編集: {new Date(report.editedAt).toLocaleString("ja-JP")}
              </span>
            )}
            {report.sharedWithStudent === false && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <EyeOff className="size-3" />
                生徒非公開
              </Badge>
            )}
          </div>
          {editing ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="mr-1 size-3.5" />
                キャンセル
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 size-3.5" />
                )}
                保存
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Pencil className="mr-1 size-3.5" />
              編集
            </Button>
          )}
        </div>
      )}

      {/* 期間・生成日 メタヘッダー (詳細画面で先出しする場合は非表示。印刷時は専用バーで代替) */}
      {!hideMetaHeader && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground print:hidden">
          <Badge variant="outline" className="text-[10px]">
            {report.period === "weekly" ? "週次" : "月次"}
          </Badge>
          <div className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            <span>期間:</span>
            <span className="font-medium text-foreground">
              {formatDate(report.startDate)} 〜 {formatDate(report.endDate)}
            </span>
          </div>
          <div className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            <span>生成日:</span>
            <span className="font-medium text-foreground">{formatDate(report.generatedAt)}</span>
          </div>
        </div>
      )}

      {/* 学力サマリ 2 カラム */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2 print:break-inside-avoid">
        <StatsSummaryCard
          kind="essay"
          stats={report.essayStats}
          max={50}
        />
        <StatsSummaryCard
          kind="interview"
          stats={report.interviewStats}
          max={40}
        />
      </div>

      {/* 2 カラム本文 (lg 以上 / 印刷時も 2 カラム維持) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2 print:gap-3">
        {/* 左カラム: 弱点進捗 + 類題 */}
        <div className="space-y-4 print:space-y-2">
          {report.weaknessProgress.length > 0 && (
            <div className="print:break-inside-avoid">
              <h4 className="mb-2 text-sm font-semibold">弱点の進捗</h4>
              <div className="space-y-2 print:space-y-1">
                {report.weaknessProgress.map((w) => {
                  const prevPct = Math.max(0, Math.min(100, (w.previousScore / 10) * 100));
                  const currPct = Math.max(0, Math.min(100, (w.currentScore / 10) * 100));
                  const barColor =
                    w.status === "improved"
                      ? "bg-emerald-400"
                      : w.status === "declined"
                        ? "bg-rose-400"
                        : "bg-amber-400";
                  return (
                    <div
                      key={w.weakness}
                      className="rounded-md border bg-white p-3 dark:bg-card print:break-inside-avoid print:p-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{w.weakness}</span>
                        <WeaknessStatusBadge status={w.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`absolute inset-y-0 left-0 ${barColor}`}
                            style={{ width: `${currPct}%` }}
                          />
                          <div
                            className="absolute inset-y-0 w-px bg-slate-400"
                            style={{ left: `${prevPct}%` }}
                            aria-label="前回スコア位置"
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums">
                          {w.previousScore} → {w.currentScore}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {w.attempts} 回指摘
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 類題 (priority で表示分岐) */}
          {!editing &&
            !readOnly &&
            (report.practiceQuestions?.length ?? 0) === 0 && (
              <div className="rounded-md border border-dashed bg-muted/30 p-3 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Sparkles className="size-4 text-emerald-600" />
                    <span className="font-medium">次に取り組む類題</span>
                    <span className="text-xs text-muted-foreground">
                      (まだ生成されていません)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generatePracticeQuestions}
                    disabled={generatingPq}
                  >
                    {generatingPq ? (
                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 size-3.5" />
                    )}
                    類題を生成する
                  </Button>
                </div>
              </div>
            )}

          {(editing || (report.practiceQuestions?.length ?? 0) > 0) && (
            <div className="print:break-inside-avoid">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="size-4 text-emerald-600" />
                次に取り組む類題
                <span className="text-[10px] font-normal text-muted-foreground">
                  (今週の弱点克服用)
                </span>
              </h4>
              {editing ? (
                <div className="space-y-2">
                  {practiceQs.map((q, i) => (
                    <div
                      key={q.id}
                      className="rounded-md border bg-white p-3 dark:bg-card"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const next = [...practiceQs];
                            next[i] = {
                              ...next[i],
                              type: e.target.value as "essay" | "interview",
                            };
                            setPracticeQs(next);
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value="essay">小論文</option>
                          <option value="interview">面接</option>
                        </select>
                        <select
                          value={resolveUsage(q)}
                          onChange={(e) => {
                            const usage = e.target.value as
                              | "lesson"
                              | "homework"
                              | "extra";
                            const next = [...practiceQs];
                            next[i] = {
                              ...next[i],
                              usage,
                              // 互換維持: priority も同期更新
                              priority:
                                usage === "lesson" ? "primary" : "secondary",
                            };
                            setPracticeQs(next);
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value="lesson">授業中</option>
                          <option value="homework">宿題</option>
                          <option value="extra">予備</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={i === 0}
                          onClick={() => {
                            const next = [...practiceQs];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            setPracticeQs(next);
                          }}
                          aria-label="上に移動"
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={i === practiceQs.length - 1}
                          onClick={() => {
                            const next = [...practiceQs];
                            [next[i + 1], next[i]] = [next[i], next[i + 1]];
                            setPracticeQs(next);
                          }}
                          aria-label="下に移動"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPracticeQs(practiceQs.filter((_, idx) => idx !== i))
                          }
                          aria-label="この類題を削除"
                          className="ml-auto"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={q.title}
                        onChange={(e) => {
                          const next = [...practiceQs];
                          next[i] = { ...next[i], title: e.target.value };
                          setPracticeQs(next);
                        }}
                        rows={2}
                        placeholder="題目 / 質問文 (短く)"
                        className="mt-2 text-sm"
                      />
                      <Textarea
                        value={q.relatedWeakness ?? ""}
                        onChange={(e) => {
                          const next = [...practiceQs];
                          next[i] = { ...next[i], relatedWeakness: e.target.value };
                          setPracticeQs(next);
                        }}
                        rows={1}
                        placeholder="関連弱点 (今週の論理性が X 点だったので、など)"
                        className="mt-1 text-xs"
                      />
                      <Textarea
                        value={q.modelAnswer ?? ""}
                        onChange={(e) => {
                          const next = [...practiceQs];
                          next[i] = { ...next[i], modelAnswer: e.target.value };
                          setPracticeQs(next);
                        }}
                        rows={4}
                        placeholder="解答例 (小論文: 400-500 字 / 面接: 80-150 字)"
                        className="mt-1 text-xs"
                      />
                      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={q.homeworkAssignable !== false}
                          onChange={(e) => {
                            const next = [...practiceQs];
                            next[i] = {
                              ...next[i],
                              homeworkAssignable: e.target.checked,
                            };
                            setPracticeQs(next);
                          }}
                          className="size-3.5"
                        />
                        <span>
                          宿題として配布可
                          <span className="ml-1 text-[10px]">
                            (短答系など模擬面接 / 小論文として成立しないものは外す)
                          </span>
                        </span>
                      </label>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPracticeQs([
                        ...practiceQs,
                        {
                          id: `pq_${Date.now()}_${practiceQs.length}`,
                          type: "essay",
                          usage: "lesson",
                          priority: "primary",
                          title: "",
                          relatedWeakness: "",
                          order: practiceQs.length,
                          homeworkAssignable: true,
                        },
                      ])
                    }
                  >
                    ＋ 類題を追加
                  </Button>
                </div>
              ) : (
                <PracticeQuestionsList
                  questions={report.practiceQuestions ?? []}
                  studentId={report.studentId}
                  reportId={report.id}
                  canAssign={!readOnly}
                />
              )}
            </div>
          )}
        </div>

        {/* 右カラム: 推奨アクション + 総合評価 + 講師コメント */}
        <div className="space-y-4 print:space-y-2">
          <div className="print:break-inside-avoid">
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Lightbulb className="size-4 text-amber-600" />
              推奨アクション
            </h4>
            {editing ? (
              <div className="space-y-2">
                {recs.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea
                      value={r}
                      onChange={(e) => {
                        const next = [...recs];
                        next[i] = e.target.value;
                        setRecs(next);
                      }}
                      rows={2}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRecs(recs.filter((_, idx) => idx !== i))}
                      aria-label="この項目を削除"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecs([...recs, ""])}
                >
                  ＋ 項目を追加
                </Button>
              </div>
            ) : (
              <div className="space-y-2 print:space-y-1">
                {report.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 dark:border-amber-900 dark:from-amber-950/30 dark:to-orange-950/30 print:break-inside-avoid print:border-gray-300 print:bg-white print:p-1.5"
                  >
                    <Lightbulb className="mb-1 size-4 text-amber-600 dark:text-amber-400 print:hidden" />
                    <p className="text-xs leading-relaxed">{r}</p>
                  </div>
                ))}
                {report.recommendations.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    推奨アクションは記録されていません
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 総合評価 */}
          <div className="rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-4 dark:border-teal-900 dark:from-teal-950/30 dark:to-cyan-950/30 print:break-inside-avoid print:border print:border-gray-400 print:bg-white print:p-2">
            <div className="mb-2 flex items-center gap-2">
              <Award className="size-5 text-teal-600 dark:text-teal-400" />
              <span className="font-semibold">総合評価</span>
            </div>
            {editing ? (
              <Textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                rows={4}
                className="bg-white text-sm"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {report.overallAssessment}
              </p>
            )}
          </div>

          {/* 講師コメント */}
          {(editing || report.teacherComment) && (
            <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-4 dark:border-purple-900 dark:from-purple-950/30 dark:to-violet-950/30 print:break-inside-avoid print:border print:border-gray-400 print:bg-white print:p-2">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare className="size-5 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold">講師コメント</span>
              </div>
              {editing ? (
                <>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="授業で観察した内容や、生徒・親に直接伝えたいことを書いてください"
                    className="bg-white text-sm"
                  />
                  <label className="mt-3 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={shared}
                      onChange={(e) => setShared(e.target.checked)}
                    />
                    <span>生徒の成長タブに公開する</span>
                  </label>
                </>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {report.teacherComment}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 類題リスト表示 (read-only)。
 * Phase 4 から「問題バンク」UI に変更。タブで授業中/宿題/予備/すべてを切り替え。
 *
 * 分類は `resolveUsage(q)` 経由 (usage > priority 推定)。
 * 印刷時はタブ枠を隠し、「すべて」タブの中身だけが縦に並ぶように制御。
 * カード見た目は usage = "lesson" のみ強調 (sky/emerald 系)、それ以外は控えめ。
 *
 * Phase 6 から: 配布マップを取得し、PracticeQuestionCard に「宿題として配布」
 * ボタン (or 配布済バッジ) を表示する。
 */
function PracticeQuestionsList({
  questions,
  studentId,
  reportId,
  canAssign,
}: {
  questions: PracticeQuestion[];
  studentId?: string;
  reportId?: string;
  /** true なら配布ボタンを表示 (admin/teacher のみ) */
  canAssign?: boolean;
}) {
  // 配布済みリストを取得 (admin/teacher のみ)
  const { data: assignments, mutate: mutateAssignments } = useAuthSWR<HomeworkAssignment[]>(
    canAssign && studentId && reportId
      ? `/api/admin/reports/${studentId}/${reportId}/assign-homework`
      : null,
  );
  const assignmentMap = useMemo(() => {
    const map = new Map<string, HomeworkAssignment>();
    for (const a of assignments ?? []) {
      map.set(a.practiceQuestionId, a);
    }
    return map;
  }, [assignments]);

  const grouped = useMemo(() => {
    const out: Record<"lesson" | "homework" | "extra", PracticeQuestion[]> = {
      lesson: [],
      homework: [],
      extra: [],
    };
    for (const q of questions) {
      out[resolveUsage(q)].push(q);
    }
    return out;
  }, [questions]);

  const usageLabel: Record<"lesson" | "homework" | "extra", string> = {
    lesson: "授業中",
    homework: "宿題",
    extra: "予備",
  };

  const renderList = (usage: "lesson" | "homework" | "extra") => {
    const list = grouped[usage];
    if (list.length === 0) {
      return (
        <p className="py-4 text-center text-xs text-muted-foreground">
          このカテゴリーには類題がありません
        </p>
      );
    }
    const variant = usage === "lesson" ? "primary" : "secondary";
    return (
      <div className="space-y-2">
        {list.map((pq) => (
          <PracticeQuestionCard
            key={pq.id}
            pq={pq}
            variant={variant}
            assignmentControl={
              canAssign && studentId && reportId
                ? {
                    studentId,
                    reportId,
                    existing: assignmentMap.get(pq.id),
                    onMutated: () => mutateAssignments(),
                  }
                : undefined
            }
          />
        ))}
      </div>
    );
  };

  const allByUsage = (["lesson", "homework", "extra"] as const).filter(
    (u) => grouped[u].length > 0,
  );

  const [tab, setTab] = useState<"lesson" | "homework" | "extra" | "all">(
    "lesson",
  );

  return (
    <>
      {/* 画面用: SegmentControl + 条件分岐 (印刷時非表示) */}
      <div className="print:hidden">
        <SegmentControl
          value={tab}
          onChange={setTab}
          options={[
            { id: "lesson", label: "授業中", count: grouped.lesson.length },
            { id: "homework", label: "宿題", count: grouped.homework.length },
            { id: "extra", label: "予備", count: grouped.extra.length },
            { id: "all", label: "すべて", count: questions.length },
          ]}
          size="sm"
          defaultAccent="emerald"
        />
        <div className="mt-3">
          {tab === "lesson" && renderList("lesson")}
          {tab === "homework" && renderList("homework")}
          {tab === "extra" && renderList("extra")}
          {tab === "all" && (
            <div className="space-y-4">
              {allByUsage.map((usage) => (
                <div key={usage}>
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {usageLabel[usage]} ({grouped[usage].length})
                  </h5>
                  {renderList(usage)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/*
        印刷用: タブ枠なしで全件直接表示 (lesson → homework → extra の順)。
        TabsContent の forceMount 非対応に対応するため別途レンダリング。
      */}
      <div className="hidden print:block">
        <div className="space-y-2">
          {allByUsage.map((usage) => (
            <div key={usage} className="print:break-inside-avoid">
              <h5 className="mb-1 text-[10pt] font-semibold uppercase tracking-wide text-muted-foreground">
                {usageLabel[usage]} ({grouped[usage].length})
              </h5>
              {renderList(usage)}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PracticeQuestionCard({
  pq,
  variant,
  assignmentControl,
}: {
  pq: PracticeQuestion;
  variant: "primary" | "secondary";
  assignmentControl?: {
    studentId: string;
    reportId: string;
    existing?: HomeworkAssignment;
    onMutated?: () => void;
  };
}) {
  const isPrimary = variant === "primary";
  const isEssay = pq.type === "essay";

  return (
    <div
      className={`rounded-lg border p-3 print:break-inside-avoid print:p-2 ${
        isPrimary
          ? isEssay
            ? "border-sky-300 bg-gradient-to-br from-sky-50 to-cyan-50 shadow-sm dark:border-sky-800 dark:from-sky-950/40 dark:to-cyan-950/40 print:border-gray-300 print:bg-white print:shadow-none"
            : "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-950/40 print:border-gray-300 print:bg-white print:shadow-none"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {isEssay ? <FileText className="size-3" /> : <Mic className="size-3" />}
        <span>{isEssay ? "小論文" : "面接"}</span>
        {isPrimary ? (
          <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
            授業中
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            宿題
          </Badge>
        )}
        {pq.difficulty && (
          <Badge
            variant="outline"
            className={`text-[10px] ${
              pq.difficulty === "advanced"
                ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"
                : pq.difficulty === "basic"
                  ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                  : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
            }`}
          >
            {pq.difficulty === "basic"
              ? "基礎"
              : pq.difficulty === "advanced"
                ? "応用"
                : "標準"}
          </Badge>
        )}
        {typeof pq.estimatedMinutes === "number" && pq.estimatedMinutes > 0 && (
          <Badge variant="outline" className="text-[10px]">
            目安 {pq.estimatedMinutes} 分
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm font-medium leading-snug">{pq.title}</p>
      {pq.objective && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/70">目的:</span>{" "}
          {pq.objective}
        </p>
      )}
      {pq.relatedWeakness && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          関連: {pq.relatedWeakness}
        </p>
      )}
      {pq.hints && pq.hints.length > 0 && (
        <details className="mt-2 print:hidden">
          <summary className="cursor-pointer text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            ヒント ({pq.hints.length})
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            {pq.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </details>
      )}
      {pq.rubric && pq.rubric.length > 0 && (
        <details className="mt-2 print:hidden">
          <summary className="cursor-pointer text-[10px] font-semibold text-sky-700 dark:text-sky-400">
            評価観点 ({pq.rubric.length})
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            {pq.rubric.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}
      {pq.teacherNotes && (
        <details className="mt-2 print:hidden">
          <summary className="cursor-pointer text-[10px] font-semibold text-purple-700 dark:text-purple-400">
            講師メモ
          </summary>
          <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
            {pq.teacherNotes}
          </p>
        </details>
      )}
      {pq.modelAnswer &&
        (isPrimary ? (
          <div className="mt-2 rounded bg-white/70 p-2 dark:bg-black/20 print:hidden">
            <div className="mb-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              解答例
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">
              {pq.modelAnswer}
            </p>
          </div>
        ) : (
          <details className="mt-2 print:hidden">
            <summary className="cursor-pointer text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              解答例を見る
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs leading-relaxed">
              {pq.modelAnswer}
            </p>
          </details>
        ))}
      {assignmentControl && (
        <div className="mt-2 flex justify-end print:hidden">
          <AssignHomeworkButton
            studentId={assignmentControl.studentId}
            reportId={assignmentControl.reportId}
            practiceQuestionId={pq.id}
            existing={assignmentControl.existing}
            onMutated={assignmentControl.onMutated}
            assignable={pq.homeworkAssignable !== false}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 学力サマリーカード (小論文 or 面接)。
 *
 * 表示:
 * - 種別アイコン + 「今期 N 件」バッジ
 * - 大きく平均スコア + SkillRankBadge
 * - 先期比 +X.X 点 (ScoreChangeIndicator)
 * - ランクが変動した場合は「ランク {prev} → {current}」バッジ
 * - 得意 / 課題 (essay のみ、bestCategory / worstCategory がある時)
 */
function StatsSummaryCard({
  kind,
  stats,
  max,
}: {
  kind: "essay" | "interview";
  stats: {
    count: number;
    avgScore: number;
    scoreChange: number;
    bestCategory?: string;
    worstCategory?: string;
    categoryAverages?: Record<string, number>;
  };
  max: number;
}) {
  const isEssay = kind === "essay";
  const currentRank = scoreToSkillRank(stats.avgScore, max);
  // 先期スコアは 0 未満にならないよう clamp
  const prevAvg = Math.max(0, stats.avgScore - stats.scoreChange);
  const prevRank = scoreToSkillRank(prevAvg, max);
  const rankChanged = currentRank !== prevRank && stats.count > 0;

  // レーダーチャート用データ (5 軸)
  const radarData = useMemo(() => {
    const c = stats.categoryAverages;
    if (!c) return null;
    if (isEssay) {
      return [
        { subject: "構成", value: c.structure ?? 0 },
        { subject: "論理性", value: c.logic ?? 0 },
        { subject: "表現力", value: c.expression ?? 0 },
        { subject: "AP合致度", value: c.apAlignment ?? 0 },
        { subject: "独自性", value: c.originality ?? 0 },
      ];
    }
    return [
      { subject: "明確さ", value: c.clarity ?? 0 },
      { subject: "AP合致度", value: c.apAlignment ?? 0 },
      { subject: "熱意", value: c.enthusiasm ?? 0 },
      { subject: "具体性", value: c.specificity ?? 0 },
      { subject: "ボディランゲージ", value: c.bodyLanguage ?? 0 },
    ];
  }, [isEssay, stats.categoryAverages]);

  return (
    <div
      className={`rounded-lg border p-4 print:p-2 print:break-inside-avoid ${
        isEssay
          ? "border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/30 print:border-gray-300 print:bg-white"
          : "border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/30 print:border-gray-300 print:bg-white"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div
          className={`flex items-center gap-2 text-sm font-semibold ${
            isEssay
              ? "text-teal-700 dark:text-teal-300"
              : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {isEssay ? (
            <FileText className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
          {isEssay ? "小論文" : "面接"}
        </div>
        <Badge variant="secondary" className="text-[10px]">
          今期 {stats.count} 件
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <SkillRankBadge rank={currentRank} size="lg" animate={false} />
        <div>
          <div className="text-3xl font-bold tabular-nums">
            {stats.avgScore}
            <span className="ml-1 text-sm text-muted-foreground">/{max}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">先期比</span>
            <ScoreChangeIndicator change={stats.scoreChange} />
            <span className="text-muted-foreground">点</span>
            {rankChanged && (
              <Badge
                variant="outline"
                className="ml-0.5 gap-0.5 text-[10px]"
                title={`スコアランクが ${prevRank} から ${currentRank} に変動`}
              >
                ランク {prevRank} → {currentRank}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {isEssay && (stats.bestCategory || stats.worstCategory) && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {stats.bestCategory && (
            <div className="rounded bg-white/60 p-2 dark:bg-black/20">
              <div className="text-muted-foreground">得意</div>
              <div className="font-medium text-emerald-700 dark:text-emerald-400">
                {stats.bestCategory}
              </div>
            </div>
          )}
          {stats.worstCategory && (
            <div className="rounded bg-white/60 p-2 dark:bg-black/20">
              <div className="text-muted-foreground">課題</div>
              <div className="font-medium text-rose-700 dark:text-rose-400">
                {stats.worstCategory}
              </div>
            </div>
          )}
        </div>
      )}
      {radarData && stats.count > 0 && (
        <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto] print:grid-cols-[minmax(0,1fr)_auto] print:break-inside-avoid">
          <div className="mx-auto aspect-square w-full max-w-[200px] print:max-w-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid gridType="polygon" stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#475569", fontSize: 10 }}
                />
                <PolarRadiusAxis
                  domain={[0, 10]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke={isEssay ? "#0d9488" : "#e11d48"}
                  fill={isEssay ? "#14b8a6" : "#fb7185"}
                  fillOpacity={0.25}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-[110px] space-y-1 text-xs">
            {radarData.map((item) => (
              <li
                key={item.subject}
                className="flex items-center justify-between gap-2 rounded bg-white/60 px-2 py-1 dark:bg-black/20"
              >
                <span className="text-muted-foreground">{item.subject}</span>
                <span className="font-medium tabular-nums">
                  {item.value.toFixed(1)}
                  <span className="ml-0.5 text-[10px] text-muted-foreground">
                    /10
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import type { GrowthReport, PracticeQuestion } from "@/lib/types/growth-report";

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
            practiceQuestions: practiceQs.filter((q) => q.title.trim().length > 0),
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
    <div className="space-y-4">
      {/* 編集ツールバー */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {report.editedAt && (
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

      {/* 期間・生成日 メタヘッダー (詳細画面で先出しする場合は非表示) */}
      {!hideMetaHeader && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* 小論文 */}
        <div className="rounded-lg border border-teal-200 bg-gradient-to-br from-teal-50 to-sky-50 p-4 dark:border-teal-900 dark:from-teal-950/30 dark:to-sky-950/30">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
            <FileText className="size-4" />
            小論文 ({report.essayStats.count}件)
          </div>
          <div className="flex items-center gap-3">
            <SkillRankBadge
              rank={scoreToSkillRank(report.essayStats.avgScore, 50)}
              size="lg"
              animate={false}
            />
            <div>
              <div className="text-3xl font-bold tabular-nums">
                {report.essayStats.avgScore}
                <span className="ml-1 text-sm text-muted-foreground">/50</span>
              </div>
              <div className="mt-1 text-sm">
                <ScoreChangeIndicator change={report.essayStats.scoreChange} />
              </div>
            </div>
          </div>
          {(report.essayStats.bestCategory || report.essayStats.worstCategory) && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {report.essayStats.bestCategory && (
                <div className="rounded bg-white/60 p-2 dark:bg-black/20">
                  <div className="text-muted-foreground">得意</div>
                  <div className="font-medium text-emerald-700 dark:text-emerald-400">
                    {report.essayStats.bestCategory}
                  </div>
                </div>
              )}
              {report.essayStats.worstCategory && (
                <div className="rounded bg-white/60 p-2 dark:bg-black/20">
                  <div className="text-muted-foreground">課題</div>
                  <div className="font-medium text-rose-700 dark:text-rose-400">
                    {report.essayStats.worstCategory}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 面接 */}
        <div className="rounded-lg border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/30">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <Mic className="size-4" />
            面接 ({report.interviewStats.count}件)
          </div>
          <div className="flex items-center gap-3">
            <SkillRankBadge
              rank={scoreToSkillRank(report.interviewStats.avgScore, 40)}
              size="lg"
              animate={false}
            />
            <div>
              <div className="text-3xl font-bold tabular-nums">
                {report.interviewStats.avgScore}
                <span className="ml-1 text-sm text-muted-foreground">/40</span>
              </div>
              <div className="mt-1 text-sm">
                <ScoreChangeIndicator change={report.interviewStats.scoreChange} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 カラム本文 (lg 以上のみ。print 時は 1 カラム維持) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-1 print:gap-3">
        {/* 左カラム: 弱点進捗 + 類題 */}
        <div className="space-y-4">
          {report.weaknessProgress.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">弱点の進捗</h4>
              <div className="space-y-2">
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
                      className="rounded-md border bg-white p-3 dark:bg-card"
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
              <div className="rounded-md border border-dashed bg-muted/30 p-3">
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
            <div>
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
                          value={q.priority ?? "secondary"}
                          onChange={(e) => {
                            const next = [...practiceQs];
                            next[i] = {
                              ...next[i],
                              priority: e.target.value as "primary" | "secondary",
                            };
                            setPracticeQs(next);
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value="primary">授業中 (必須)</option>
                          <option value="secondary">宿題 (補助)</option>
                        </select>
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
                          priority: "primary",
                          title: "",
                          relatedWeakness: "",
                        },
                      ])
                    }
                  >
                    ＋ 類題を追加
                  </Button>
                </div>
              ) : (
                <PracticeQuestionsList questions={report.practiceQuestions ?? []} />
              )}
            </div>
          )}
        </div>

        {/* 右カラム: 推奨アクション + 総合評価 + 講師コメント */}
        <div className="space-y-4">
          <div>
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
              <div className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 dark:border-amber-900 dark:from-amber-950/30 dark:to-orange-950/30"
                  >
                    <Lightbulb className="mb-1 size-4 text-amber-600 dark:text-amber-400" />
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
          <div className="rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-4 dark:border-teal-900 dark:from-teal-950/30 dark:to-cyan-950/30">
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
            <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-4 dark:border-purple-900 dark:from-purple-950/30 dark:to-violet-950/30">
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
 * - primary (授業中必須): 強調表示 + modelAnswer 常時展開
 * - secondary (宿題用): 控えめ表示 + modelAnswer は <details> で折り畳み
 * - priority 未設定の旧データは secondary 扱い
 */
function PracticeQuestionsList({ questions }: { questions: PracticeQuestion[] }) {
  const primary = questions.filter((q) => q.priority === "primary");
  const secondary = questions.filter((q) => q.priority !== "primary");

  return (
    <div className="space-y-3">
      {primary.length > 0 && (
        <div className="space-y-2">
          {primary.map((pq) => (
            <PracticeQuestionCard key={pq.id} pq={pq} variant="primary" />
          ))}
        </div>
      )}
      {secondary.length > 0 && (
        <div className="space-y-2">
          {primary.length > 0 && (
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              宿題用 (補助)
            </div>
          )}
          {secondary.map((pq) => (
            <PracticeQuestionCard key={pq.id} pq={pq} variant="secondary" />
          ))}
        </div>
      )}
    </div>
  );
}

function PracticeQuestionCard({
  pq,
  variant,
}: {
  pq: PracticeQuestion;
  variant: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  const isEssay = pq.type === "essay";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isPrimary
          ? isEssay
            ? "border-sky-300 bg-gradient-to-br from-sky-50 to-cyan-50 shadow-sm dark:border-sky-800 dark:from-sky-950/40 dark:to-cyan-950/40"
            : "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-950/40"
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
      </div>
      <p className="mt-1 text-sm font-medium leading-snug">{pq.title}</p>
      {pq.relatedWeakness && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          関連: {pq.relatedWeakness}
        </p>
      )}
      {pq.modelAnswer &&
        (isPrimary ? (
          <div className="mt-2 rounded bg-white/70 p-2 dark:bg-black/20">
            <div className="mb-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              解答例
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">
              {pq.modelAnswer}
            </p>
          </div>
        ) : (
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              解答例を見る
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs leading-relaxed">
              {pq.modelAnswer}
            </p>
          </details>
        ))}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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
  Clock,
  Lightbulb,
  Award,
  Pencil,
  Save,
  X,
  Loader2,
  MessageSquare,
  EyeOff,
  Calendar,
  Users,
  Activity,
  FileCheck2,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import {
  categorizeWeakness,
  ESSAY_CATEGORY_LABELS,
  ESSAY_CATEGORY_ORDER,
  type EssayCategoryKey,
} from "@/lib/growth/weakness-category";
import type { GrowthReport } from "@/lib/types/growth-report";

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

  const startEdit = () => {
    setAssessment(report.overallAssessment ?? "");
    setRecs(report.recommendations ?? []);
    setComment(report.teacherComment ?? "");
    setShared(report.sharedWithStudent !== false);
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
        {/* 左カラム: 弱点進捗 */}
        <div className="space-y-4 print:space-y-2">
          {report.weaknessProgress.length > 0 && (
            <WeaknessProgressByCategory items={report.weaknessProgress} />
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

      {/* 面談・活動実績・出願書類の補助セクション (新フィールドがある場合のみ表示。旧レポートには無い) */}
      {(report.sessionDigest || report.activitySummary || report.documentSummary) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
          {report.sessionDigest && report.sessionDigest.totalCount > 0 && (
            <SessionDigestSection digest={report.sessionDigest} />
          )}
          {report.activitySummary && report.activitySummary.totalCount > 0 && (
            <ActivitySummarySection summary={report.activitySummary} />
          )}
          {report.documentSummary && report.documentSummary.total > 0 && (
            <DocumentSummarySection summary={report.documentSummary} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 面談セッションの反映 (要約・アクションアイテム・次回アジェンダ) を表示する。
 * `GrowthReport.sessionDigest` がある場合のみ呼ばれる。
 */
function SessionDigestSection({
  digest,
}: {
  digest: NonNullable<GrowthReport["sessionDigest"]>;
}) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-3 dark:border-sky-900 dark:bg-sky-950/20 print:break-inside-avoid print:border-gray-300 print:bg-white print:p-2">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-sky-800 dark:text-sky-300">
        <Users className="size-4" />
        面談 {digest.totalCount} 回
      </h4>
      <div className="space-y-2 print:space-y-1.5">
        {digest.sessions.map((s, i) => (
          <div
            key={i}
            className="rounded-md border bg-white p-2.5 text-xs dark:bg-card print:break-inside-avoid print:border-gray-300 print:p-1.5"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-1 font-medium">
              <span>{formatDate(s.date)}</span>
              {s.goal && (
                <span className="text-muted-foreground">目標: {s.goal}</span>
              )}
            </div>
            {s.summaryPoints.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 leading-relaxed">
                {s.summaryPoints.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            )}
            {s.actionItems.length > 0 && (
              <div className="mt-1.5">
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  アクションアイテム:
                </span>
                <ul className="list-disc space-y-0.5 pl-4 leading-relaxed">
                  {s.actionItems.map((a, j) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {s.nextAgenda && (
              <div className="mt-1.5 text-muted-foreground">
                次回アジェンダ: {s.nextAgenda}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 活動実績の集計 (直近分のハイライト) を表示する。
 * `GrowthReport.activitySummary` がある場合のみ呼ばれる。
 */
function ActivitySummarySection({
  summary,
}: {
  summary: NonNullable<GrowthReport["activitySummary"]>;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900 dark:bg-emerald-950/20 print:break-inside-avoid print:border-gray-300 print:bg-white print:p-2">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        <Activity className="size-4" />
        活動実績 {summary.totalCount} 件
      </h4>
      {summary.highlights.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
          {summary.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">記録なし</p>
      )}
    </div>
  );
}

/**
 * 出願書類の状況 (完成/進行中件数と直近締切) を表示する。
 * `GrowthReport.documentSummary` がある場合のみ呼ばれる。
 */
function DocumentSummarySection({
  summary,
}: {
  summary: NonNullable<GrowthReport["documentSummary"]>;
}) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-3 dark:border-orange-900 dark:bg-orange-950/20 print:break-inside-avoid print:border-gray-300 print:bg-white print:p-2">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-orange-800 dark:text-orange-300">
        <FileCheck2 className="size-4" />
        出願書類 完成 {summary.completed}/全 {summary.total} ・進行中 {summary.inProgress}
      </h4>
      {summary.upcomingDeadlines.length > 0 ? (
        <ul className="space-y-1 text-xs leading-relaxed">
          {summary.upcomingDeadlines.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span>{d.title}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatDate(d.deadline)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">直近の締切はありません</p>
      )}
    </div>
  );
}

/**
 * 弱点進捗を essay 5 軸カテゴリ (構成 / 論証 / 表現力 / AP合致 / 独自性) +
 * その他 でグルーピングして表示。 印刷時もコンパクトに収まる 1 行リスト形式。
 *
 * カテゴリ判定は `categorizeWeakness` (キーワードマッチング)。
 * 件数 0 のカテゴリは表示しない。
 */
function WeaknessProgressByCategory({
  items,
}: {
  items: GrowthReport["weaknessProgress"];
}) {
  const grouped = useMemo(() => {
    const out: Record<EssayCategoryKey, typeof items> = {
      structure: [],
      logic: [],
      expression: [],
      apAlignment: [],
      originality: [],
      reasoningMaturity: [],
      other: [],
    };
    for (const w of items) {
      out[categorizeWeakness(w.weakness)].push(w);
    }
    const statusRank = (s: string) =>
      s === "declined" ? 0 : s === "stable" ? 1 : 2;
    for (const k of Object.keys(out) as EssayCategoryKey[]) {
      out[k].sort((a, b) => {
        const sd = statusRank(a.status) - statusRank(b.status);
        return sd !== 0 ? sd : b.attempts - a.attempts;
      });
    }
    return out;
  }, [items]);

  const visible = ESSAY_CATEGORY_ORDER.filter((c) => grouped[c].length > 0);

  return (
    <div className="print:break-inside-avoid">
      <h4 className="mb-2 text-sm font-semibold">弱点の進捗 (分野別)</h4>
      <div className="space-y-2 print:space-y-1.5">
        {visible.map((cat) => (
          <div
            key={cat}
            className="rounded-md border bg-white p-2.5 dark:bg-card print:break-inside-avoid print:border-gray-300 print:p-1.5"
          >
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold print:mb-1 print:text-[10pt]">
              <span>{ESSAY_CATEGORY_LABELS[cat]}</span>
              <span className="text-[10px] text-muted-foreground print:text-[8pt]">
                {grouped[cat].length} 件
              </span>
            </div>
            <ul className="space-y-1.5 text-xs print:space-y-1 print:text-[9pt]">
              {grouped[cat].map((w) => (
                <li
                  key={w.weakness}
                  className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                >
                  <span className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
                    {w.weakness}
                  </span>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:pt-0.5">
                    <span className="tabular-nums text-muted-foreground">
                      {w.previousScore}→{w.currentScore}
                    </span>
                    <WeaknessStatusBadge status={w.status} />
                    <span className="text-[10px] text-muted-foreground print:text-[8pt]">
                      {w.attempts}回
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
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
export function StatsSummaryCard({
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
        <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto] print:grid-cols-1 print:gap-2 print:break-inside-avoid">
          {/*
            印刷で ResponsiveContainer はサイズ測定が不整合になり、SVG/軸ラベルが
            箱を超えてはみ出すため、固定サイズの RadarChart を中央寄せで使う。
            margin で軸ラベルが SVG 内に収まるようにする。
          */}
          <div className="mx-auto w-[200px] max-w-full overflow-hidden">
            <RadarChart
              data={radarData}
              width={200}
              height={180}
              outerRadius="68%"
              margin={{ top: 18, right: 28, bottom: 18, left: 28 }}
            >
              <PolarGrid gridType="polygon" stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#475569", fontSize: 10 }}
              />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke={isEssay ? "#0d9488" : "#e11d48"}
                fill={isEssay ? "#14b8a6" : "#fb7185"}
                fillOpacity={0.25}
                isAnimationActive={false}
              />
            </RadarChart>
          </div>
          <ul className="grid grid-cols-1 gap-1 text-xs print:grid-cols-2 print:gap-x-3 print:gap-y-0.5 print:text-[9pt]">
            {radarData.map((item) => (
              <li
                key={item.subject}
                className="flex items-center justify-between gap-2 rounded bg-white/60 px-2 py-1 dark:bg-black/20 print:bg-white print:px-1 print:py-0.5"
              >
                <span className="text-muted-foreground">{item.subject}</span>
                <span className="font-medium tabular-nums">
                  {item.value.toFixed(1)}
                  <span className="ml-0.5 text-[10px] text-muted-foreground print:text-[8pt]">
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

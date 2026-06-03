"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/api/client";
import EssayDetailDialog from "@/components/sessions/EssayDetailDialog";
import InterviewDetailDialog from "@/components/sessions/InterviewDetailDialog";
import ReportDetailDialog from "@/components/sessions/ReportDetailDialog";
import DocumentDetailDialog from "@/components/sessions/DocumentDetailDialog";
import ActivityDetailDialog from "@/components/sessions/ActivityDetailDialog";
import { SkillCheckDetailDialog } from "@/components/admin/SkillCheckDetailDialog";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import type { SkillRank } from "@/lib/types/skill-check";
import type { SkillCheckResult } from "@/lib/types/skill-check";
import type { InterviewSkillCheckResult } from "@/lib/types/interview-skill-check";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  FileText,
  Mic,
  FolderOpen,
  Award,
  ClipboardCheck,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

interface ArtifactItem {
  id: string;
  at?: string;
  label: string;
  sub?: string;
  score?: number | null;
  rank?: string | null;
  status?: string | null;
  skillKind?: "essay" | "interview";
}
interface ScoreDelta {
  count: number;
  avg: number | null;
  prevAvg: number | null;
  delta: number | null;
}
interface ArtifactsResponse {
  studentId?: string;
  window: { start: string | null; end: string };
  artifacts: {
    essays: ArtifactItem[];
    interviews: ArtifactItem[];
    documents: ArtifactItem[];
    activities: ArtifactItem[];
    skillChecks: ArtifactItem[];
    reports: ArtifactItem[];
  };
  scoreSummary: { essay: ScoreDelta; interview: ScoreDelta };
}

interface Props {
  endpoint: string;
  /** 生徒ポータルなら詳細ページへのリンクを張る */
  studentView?: boolean;
}

const fmtDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}`;
};

function ScoreTile({ label, s }: { label: string; s: ScoreDelta }) {
  if (s.count === 0 && s.avg === null) return null;
  const d = s.delta;
  const Icon = d === null || d === 0 ? Minus : d > 0 ? TrendingUp : TrendingDown;
  const color = d === null || d === 0 ? "text-muted-foreground" : d > 0 ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="flex-1 min-w-[120px] rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}（{s.count}件）</span>
        {d !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
            <Icon className="size-3" />
            {d > 0 ? `+${d}` : d}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-xl font-bold">{s.avg ?? "—"}</span>
        <span className="text-[11px] text-muted-foreground">平均点</span>
      </div>
    </div>
  );
}

const GROUP_ICON: Record<string, LucideIcon> = {
  essays: FileText,
  interviews: Mic,
  documents: FolderOpen,
  activities: Award,
  skillChecks: ClipboardCheck,
  reports: FileBarChart,
};

export default function SessionArtifactsPanel({ endpoint, studentView = false }: Props) {
  const [data, setData] = useState<ArtifactsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    authFetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  const studentId = data?.studentId;
  const [essayDialogId, setEssayDialogId] = useState<string | null>(null);
  const [interviewDialogId, setInterviewDialogId] = useState<string | null>(null);
  const [reportDialogId, setReportDialogId] = useState<string | null>(null);
  const [documentDialogId, setDocumentDialogId] = useState<string | null>(null);
  const [activityDialogId, setActivityDialogId] = useState<string | null>(null);
  // スキルチェック詳細 (管理者ビュー)。result を取得してダイアログ表示
  const [skillDialog, setSkillDialog] = useState<
    | { kind: "essay"; result: SkillCheckResult }
    | { kind: "interview"; result: InterviewSkillCheckResult }
    | null
  >(null);
  const [skillLoadingId, setSkillLoadingId] = useState<string | null>(null);

  async function openSkillDetail(it: ArtifactItem) {
    if (!studentId) return;
    const kind = it.skillKind === "interview" ? "interview" : "essay";
    const path = kind === "interview" ? "interview-skill-check" : "skill-check";
    setSkillLoadingId(it.id);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/${path}/${it.id}`);
      if (!res.ok) return;
      const result = await res.json();
      setSkillDialog(
        kind === "interview"
          ? { kind: "interview", result }
          : { kind: "essay", result },
      );
    } catch {
      // ignore
    } finally {
      setSkillLoadingId(null);
    }
  }

  // 管理者ビューで、セッション内ダイアログで開く種別か
  const dialogKindOf = (kind: string): "essays" | "interviews" | null =>
    !studentView && (kind === "essays" || kind === "interviews") ? (kind as "essays" | "interviews") : null;

  const hrefOf = (kind: string, it: ArtifactItem): string | null => {
    const id = it.id;
    if (studentView) {
      switch (kind) {
        case "essays":
          return `/student/essay/${id}`;
        case "interviews":
          return `/student/interview/${id}/result`;
        case "documents":
          return `/student/documents/${id}`;
        case "activities":
          return `/student/activities/${id}`;
        case "skillChecks":
          return it.skillKind === "interview"
            ? `/student/interview-skill-check/${id}`
            : `/student/skill-check/${id}`;
        case "reports":
          return `/student/growth/reports/${id}`;
        default:
          return null;
      }
    }
    // 管理者/講師。全グループをセッション内ダイアログで開くため null を返す（下で onClick 処理）。
    // 録音中にページ遷移するとコンポーネントがアンマウントされ録音が破棄されるため、遷移させない。
    return null;
  };

  const groups: { key: keyof ArtifactsResponse["artifacts"]; title: string }[] = [
    { key: "essays", title: "小論文" },
    { key: "interviews", title: "模擬面接" },
    { key: "documents", title: "出願書類" },
    { key: "activities", title: "活動実績" },
    { key: "skillChecks", title: "スキルチェック" },
    { key: "reports", title: "成長レポート" },
  ];

  const total = data
    ? groups.reduce((n, g) => n + data.artifacts[g.key].length, 0)
    : 0;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">前回のセッション以降の取り組み</CardTitle>
          {!studentView && studentId && (
            <Link
              href={`/admin/students/${studentId}`}
              className="text-xs text-primary hover:underline flex-shrink-0"
            >
              生徒の詳細・履歴を開く
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">取得できませんでした</p>
        ) : (
          <>
            {/* スコア変化 */}
            {(data.scoreSummary.essay.avg !== null || data.scoreSummary.interview.avg !== null) && (
              <div className="flex gap-2">
                <ScoreTile label="小論文" s={data.scoreSummary.essay} />
                <ScoreTile label="面接" s={data.scoreSummary.interview} />
              </div>
            )}

            {total === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                この期間の取り組みはありません
              </p>
            ) : (
              <div className="space-y-3">
                {groups.map((g) => {
                  const items = data.artifacts[g.key];
                  if (items.length === 0) return null;
                  const GroupIcon = GROUP_ICON[g.key] ?? FileText;
                  return (
                    <div key={g.key} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <GroupIcon className="size-3.5" />
                        <span>{g.title}</span>
                        <span className="text-[11px]">{items.length}</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((it) => {
                          const href = hrefOf(g.key, it);
                          const dialogKind = dialogKindOf(g.key);
                          const isAdminSkill = !studentView && g.key === "skillChecks" && !!studentId;
                          // 管理者ビューで reports/documents/activities をセッション内ダイアログで開く
                          const adminDialogKind =
                            !studentView &&
                            !!studentId &&
                            (g.key === "reports" || g.key === "documents" || g.key === "activities")
                              ? g.key
                              : null;
                          const clickable = !!href || !!dialogKind || isAdminSkill || !!adminDialogKind;
                          const inner = (
                            <div
                              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                                clickable ? "hover:bg-accent hover:border-primary/40 cursor-pointer" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <GroupIcon className="size-4 text-muted-foreground flex-shrink-0" />
                                {it.at && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0 w-9">
                                    {fmtDate(it.at)}
                                  </span>
                                )}
                                <span className="truncate">{it.label}</span>
                                {it.sub && (
                                  <span className="text-xs text-muted-foreground truncate">{it.sub}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {it.rank && (
                                  <SkillRankBadge
                                    rank={it.rank as SkillRank}
                                    size="sm"
                                    animate={false}
                                  />
                                )}
                                {typeof it.score === "number" && (
                                  <Badge variant="outline" className="text-xs">{it.score}点</Badge>
                                )}
                                {it.status && (
                                  <Badge variant="secondary" className="text-xs">{it.status}</Badge>
                                )}
                                {clickable && <ChevronRight className="size-4 text-muted-foreground" />}
                              </div>
                            </div>
                          );
                          if (href) {
                            return (
                              <Link key={it.id} href={href} className="block">
                                {inner}
                              </Link>
                            );
                          }
                          if (dialogKind) {
                            return (
                              <button
                                key={it.id}
                                type="button"
                                className="block w-full text-left"
                                onClick={() =>
                                  dialogKind === "essays"
                                    ? setEssayDialogId(it.id)
                                    : setInterviewDialogId(it.id)
                                }
                              >
                                {inner}
                              </button>
                            );
                          }
                          if (isAdminSkill) {
                            return (
                              <button
                                key={it.id}
                                type="button"
                                className="block w-full text-left"
                                disabled={skillLoadingId === it.id}
                                onClick={() => openSkillDetail(it)}
                              >
                                {inner}
                              </button>
                            );
                          }
                          if (adminDialogKind) {
                            return (
                              <button
                                key={it.id}
                                type="button"
                                className="block w-full text-left"
                                onClick={() => {
                                  if (adminDialogKind === "reports") setReportDialogId(it.id);
                                  else if (adminDialogKind === "documents") setDocumentDialogId(it.id);
                                  else setActivityDialogId(it.id);
                                }}
                              >
                                {inner}
                              </button>
                            );
                          }
                          return <div key={it.id}>{inner}</div>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>

    {!studentView && studentId && (
      <>
        <EssayDetailDialog
          studentId={studentId}
          essayId={essayDialogId}
          open={essayDialogId !== null}
          onOpenChange={(o) => !o && setEssayDialogId(null)}
        />
        <InterviewDetailDialog
          studentId={studentId}
          interviewId={interviewDialogId}
          open={interviewDialogId !== null}
          onOpenChange={(o) => !o && setInterviewDialogId(null)}
        />
        <SkillCheckDetailDialog
          open={skillDialog !== null}
          onOpenChange={(o) => !o && setSkillDialog(null)}
          kind={skillDialog?.kind ?? "essay"}
          result={skillDialog?.result ?? null}
        />
        <ReportDetailDialog
          studentId={studentId}
          reportId={reportDialogId}
          open={reportDialogId !== null}
          onOpenChange={(o) => !o && setReportDialogId(null)}
        />
        <DocumentDetailDialog
          studentId={studentId}
          documentId={documentDialogId}
          open={documentDialogId !== null}
          onOpenChange={(o) => !o && setDocumentDialogId(null)}
        />
        <ActivityDetailDialog
          studentId={studentId}
          activityId={activityDialogId}
          open={activityDialogId !== null}
          onOpenChange={(o) => !o && setActivityDialogId(null)}
        />
      </>
    )}
    </>
  );
}

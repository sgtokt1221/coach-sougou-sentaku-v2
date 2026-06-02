"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/api/client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ArtifactItem {
  id: string;
  at?: string;
  label: string;
  sub?: string;
  score?: number | null;
  rank?: string | null;
  status?: string | null;
}
interface ScoreDelta {
  count: number;
  avg: number | null;
  prevAvg: number | null;
  delta: number | null;
}
interface ArtifactsResponse {
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

function DeltaChip({ label, s }: { label: string; s: ScoreDelta }) {
  if (s.count === 0 && s.avg === null) return null;
  const d = s.delta;
  const Icon = d === null || d === 0 ? Minus : d > 0 ? TrendingUp : TrendingDown;
  const color = d === null || d === 0 ? "text-muted-foreground" : d > 0 ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">平均 {s.avg ?? "—"}</span>
      {d !== null && (
        <span className={`flex items-center gap-0.5 ${color}`}>
          <Icon className="size-3" />
          {d > 0 ? `+${d}` : d}
        </span>
      )}
    </div>
  );
}

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

  const hrefOf = (kind: string, id: string): string | null => {
    if (!studentView) return null;
    switch (kind) {
      case "essays":
        return `/student/essay/${id}`;
      case "interviews":
        return `/student/interview/${id}/result`;
      case "documents":
        return `/student/documents/${id}`;
      case "activities":
        return `/student/activities/${id}`;
      case "reports":
        return `/student/growth`;
      default:
        return null;
    }
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">前回のセッション以降の取り組み</CardTitle>
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
              <div className="flex flex-wrap gap-2">
                <DeltaChip label="小論文" s={data.scoreSummary.essay} />
                <DeltaChip label="面接" s={data.scoreSummary.interview} />
              </div>
            )}

            {total === 0 ? (
              <p className="text-sm text-muted-foreground">この期間の取り組みはありません</p>
            ) : (
              <div className="space-y-3">
                {groups.map((g) => {
                  const items = data.artifacts[g.key];
                  if (items.length === 0) return null;
                  return (
                    <div key={g.key} className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {g.title}（{items.length}）
                      </p>
                      <div className="space-y-1">
                        {items.map((it) => {
                          const href = hrefOf(g.key, it.id);
                          const inner = (
                            <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                {it.at && (
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {fmtDate(it.at)}
                                  </span>
                                )}
                                <span className="truncate">{it.label}</span>
                                {it.sub && (
                                  <span className="text-xs text-muted-foreground truncate">{it.sub}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {it.rank && <Badge variant="secondary" className="text-xs">{it.rank}</Badge>}
                                {typeof it.score === "number" && (
                                  <Badge variant="outline" className="text-xs">{it.score}点</Badge>
                                )}
                                {it.status && (
                                  <Badge variant="secondary" className="text-xs">{it.status}</Badge>
                                )}
                              </div>
                            </div>
                          );
                          return href ? (
                            <Link key={it.id} href={href} className="block">
                              {inner}
                            </Link>
                          ) : (
                            <div key={it.id}>{inner}</div>
                          );
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
  );
}

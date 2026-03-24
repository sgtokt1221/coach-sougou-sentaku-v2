"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, TrendingUp, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthSWR } from "@/lib/api/swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EssayHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  topic: string;
  submittedAt: string;
  status: "reviewed" | "reviewing" | "pending" | "error";
  totalScore: number;
  scores: {
    structure: number;
    logic: number;
    expression: number;
    apAlignment: number;
    originality: number;
  };
}

const mockHistory: EssayHistoryItem[] = [
  {
    id: "essay-1",
    universityName: "京都大学",
    facultyName: "文学部",
    topic: "グローバル化と日本の未来",
    submittedAt: "2026-03-21",
    status: "reviewed",
    totalScore: 33,
    scores: { structure: 7, logic: 6, expression: 8, apAlignment: 5, originality: 7 },
  },
  {
    id: "essay-2",
    universityName: "大阪大学",
    facultyName: "法学部",
    topic: "民主主義の課題",
    submittedAt: "2026-03-14",
    status: "reviewed",
    totalScore: 29,
    scores: { structure: 6, logic: 5, expression: 7, apAlignment: 5, originality: 6 },
  },
  {
    id: "essay-3",
    universityName: "東北大学",
    facultyName: "文学部",
    topic: "AI時代の人間性",
    submittedAt: "2026-03-07",
    status: "reviewed",
    totalScore: 25,
    scores: { structure: 5, logic: 5, expression: 5, apAlignment: 4, originality: 6 },
  },
  {
    id: "essay-4",
    universityName: "京都大学",
    facultyName: "法学部",
    topic: "",
    submittedAt: "2026-03-21",
    status: "reviewing",
    totalScore: 0,
    scores: { structure: 0, logic: 0, expression: 0, apAlignment: 0, originality: 0 },
  },
];

const STATUS_LABEL: Record<EssayHistoryItem["status"], string> = {
  reviewed: "添削完了",
  reviewing: "添削中",
  pending: "待機中",
  error: "エラー",
};

const STATUS_VARIANT: Record<
  EssayHistoryItem["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  reviewed: "default",
  reviewing: "secondary",
  pending: "outline",
  error: "destructive",
};

const SCORE_LINE_COLORS = {
  total: "#6366f1",
  structure: "#f59e0b",
  logic: "#10b981",
  expression: "#3b82f6",
  apAlignment: "#ef4444",
  originality: "#8b5cf6",
};

type LineKey = "structure" | "logic" | "expression" | "apAlignment" | "originality";
const DETAIL_LINES: { key: LineKey; label: string }[] = [
  { key: "structure", label: "構成" },
  { key: "logic", label: "論理性" },
  { key: "expression", label: "表現力" },
  { key: "apAlignment", label: "AP合致度" },
  { key: "originality", label: "独自性" },
];

export default function EssayHistoryPage() {
  const router = useRouter();
  const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set(["total"]));

  const { data: rawData, isLoading: loading } = useAuthSWR<{ essays: EssayHistoryItem[] }>("/api/essay/history");
  const history = rawData?.essays ?? mockHistory;

  function toggleLine(key: string) {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const reviewedHistory = history.filter((h) => h.status === "reviewed");

  const chartData = [...reviewedHistory]
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .map((item) => ({
      date: item.submittedAt,
      total: item.totalScore,
      structure: item.scores.structure,
      logic: item.scores.logic,
      expression: item.scores.expression,
      apAlignment: item.scores.apAlignment,
      originality: item.scores.originality,
    }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
          <TrendingUp className="size-5" />
          添削履歴
        </h1>
        <Button onClick={() => router.push("/student/essay/new")}>
          <Plus className="size-4 mr-2" />
          新規提出
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="まだ添削履歴がありません"
              description="最初の小論文を提出しましょう！"
              action={{ label: "小論文を提出する", href: "/student/essay/new" }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* スコア推移グラフ */}
          {reviewedHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">スコア推移</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => toggleLine("total")}
                    className={[
                      "text-xs px-2 py-1 rounded border transition-colors",
                      visibleLines.has("total")
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-border text-muted-foreground",
                    ].join(" ")}
                  >
                    合計スコア
                  </button>
                  {DETAIL_LINES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleLine(key)}
                      className={[
                        "text-xs px-2 py-1 rounded border transition-colors",
                        visibleLines.has(key)
                          ? "border-current bg-muted"
                          : "border-border text-muted-foreground",
                      ].join(" ")}
                      style={visibleLines.has(key) ? { color: SCORE_LINE_COLORS[key] } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 50]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    {visibleLines.has("total") && (
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="合計"
                        stroke={SCORE_LINE_COLORS.total}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    )}
                    {DETAIL_LINES.filter(({ key }) => visibleLines.has(key)).map(
                      ({ key, label }) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={label}
                          stroke={SCORE_LINE_COLORS[key]}
                          strokeWidth={1.5}
                          dot={{ r: 3 }}
                        />
                      )
                    )}
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 添削カードリスト */}
          <div className="space-y-3">
            {history.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  item.status === "reviewed"
                    ? router.push(`/student/essay/${item.id}`)
                    : undefined
                }
              >
                <CardContent className="p-3 lg:p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{item.universityName}</span>
                      <span className="text-muted-foreground text-sm">{item.facultyName}</span>
                      {item.topic && (
                        <span className="text-xs text-muted-foreground truncate">
                          / {item.topic}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.submittedAt}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {item.status === "reviewed" && (
                      <span className="text-lg font-bold">
                        {item.totalScore}
                        <span className="text-sm text-muted-foreground">/50</span>
                      </span>
                    )}
                    <Badge variant={STATUS_VARIANT[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

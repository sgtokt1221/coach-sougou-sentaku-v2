"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, TrendingUp, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
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
import type { InterviewMode } from "@/lib/types/interview";
import { INTERVIEW_MODE_LABELS } from "@/lib/types/interview";
import { useAuthSWR } from "@/lib/api/swr";

interface InterviewHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  mode: InterviewMode;
  practicedAt: string;
  totalScore: number;
}

const mockHistory: InterviewHistoryItem[] = [
  {
    id: "interview-1",
    universityName: "京都大学",
    facultyName: "文学部",
    mode: "individual",
    practicedAt: "2026-03-21",
    totalScore: 26,
  },
  {
    id: "interview-2",
    universityName: "大阪大学",
    facultyName: "法学部",
    mode: "presentation",
    practicedAt: "2026-03-14",
    totalScore: 22,
  },
  {
    id: "interview-3",
    universityName: "東北大学",
    facultyName: "文学部",
    mode: "oral_exam",
    practicedAt: "2026-03-07",
    totalScore: 18,
  },
];

const MODE_VARIANT: Record<
  InterviewMode,
  "default" | "secondary" | "outline" | "destructive"
> = {
  individual: "default",
  group_discussion: "secondary",
  presentation: "outline",
  oral_exam: "secondary",
};

export default function InterviewHistoryPage() {
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawData, isLoading: loading } = useAuthSWR<{ interviews: any[] }>("/api/interview/history?userId=current");
  const history: InterviewHistoryItem[] = (rawData?.interviews ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => ({
      id: item.id,
      universityName:
        item.universityName ??
        item.universityContext?.universityName ??
        "",
      facultyName:
        item.facultyName ?? item.universityContext?.facultyName ?? "",
      mode: item.mode ?? "individual",
      practicedAt:
        item.practicedAt ??
        (item.startedAt
          ? new Date(item.startedAt).toISOString().slice(0, 10)
          : ""),
      totalScore: item.totalScore ?? item.scores?.total ?? 0,
    })
  );
  const historyToShow = history.length > 0 || rawData !== undefined ? history : (loading ? [] : mockHistory);

  const chartData = [...historyToShow]
    .sort((a, b) => a.practicedAt.localeCompare(b.practicedAt))
    .map((item) => ({
      date: item.practicedAt,
      score: item.totalScore,
    }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
          <TrendingUp className="size-5" />
          面接練習履歴
        </h1>
        <Button onClick={() => router.push("/student/interview/new")}>
          <Plus className="size-4 mr-2" />
          新規練習
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : historyToShow.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Mic}
              title="まだ面接練習がありません"
              description="最初の模擬面接を始めましょう！"
              action={{ label: "面接練習を始める", href: "/student/interview/new" }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* スコア推移グラフ */}
          {historyToShow.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">スコア推移</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="総合スコア"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 履歴カードリスト */}
          <div className="space-y-3">
            {historyToShow.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/student/interview/${item.id}/result`)}
              >
                <CardContent className="p-3 lg:p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{item.universityName}</span>
                      <span className="text-muted-foreground text-sm">{item.facultyName}</span>
                      <Badge variant={MODE_VARIANT[item.mode]} className="text-xs">
                        {INTERVIEW_MODE_LABELS[item.mode]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.practicedAt}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="text-lg font-bold">
                      {item.totalScore}
                      <span className="text-sm text-muted-foreground">/40</span>
                    </span>
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

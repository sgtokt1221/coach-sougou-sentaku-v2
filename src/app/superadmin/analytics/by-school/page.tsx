"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, School } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";

interface SchoolStat {
  school: string;
  studentCount: number;
  avgEssayScore: number;
  avgInterviewScore: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  passRate: number;
  topTargetUniversities: { name: string; count: number }[];
}

export default function AnalyticsBySchoolPage() {
  const { data, isLoading } = useAuthSWR<{ schools: SchoolStat[]; total: number }>(
    "/api/superadmin/analytics/by-school",
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const schools = data?.schools ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">高校別 分析</h1>
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} 校の生徒集計
        </p>
      </div>

      {schools.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            まだデータがありません
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto" data-allow-x-scroll>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">高校</th>
                    <th className="px-4 py-3 text-center font-medium">生徒数</th>
                    <th className="px-4 py-3 text-center font-medium">平均 essay</th>
                    <th className="px-4 py-3 text-center font-medium">平均 interview</th>
                    <th className="px-4 py-3 text-center font-medium">合格 / 不合格 / 未確定</th>
                    <th className="px-4 py-3 text-center font-medium">合格率</th>
                    <th className="px-4 py-3 text-left font-medium">志望校 Top 3</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.school} className="border-b">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <School className="size-4 text-muted-foreground" />
                          <span className="font-medium">{s.school}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {s.studentCount}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {s.avgEssayScore > 0 ? `${s.avgEssayScore}/50` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {s.avgInterviewScore > 0 ? `${s.avgInterviewScore}/50` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className="text-emerald-600">{s.passedCount}</span>
                        {" / "}
                        <span className="text-rose-600">{s.failedCount}</span>
                        {" / "}
                        <span className="text-muted-foreground">{s.pendingCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.passedCount + s.failedCount > 0 ? (
                          <Badge
                            variant={s.passRate >= 50 ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {s.passRate}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.topTargetUniversities.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {s.topTargetUniversities.map((u) => (
                              <Badge
                                key={u.name}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {u.name} ({u.count})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, AlertTriangle, Users, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api/client";

interface UniversityDataRow {
  universityName: string;
  facultyName: string;
  sampleSize: number;
  coveragePercent: number;
  status: "sufficient" | "insufficient";
}

export default function AdminPassedDataPage() {
  const { userProfile } = useAuth();
  const [data, setData] = useState<UniversityDataRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await authFetch("/api/admin/passed-data");
        if (res.ok) {
          const json = await res.json();
          setData(json.rows ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    if (userProfile?.role === "superadmin") {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  if (userProfile?.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <ShieldAlert className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">アクセス権限がありません</h2>
        <p className="text-sm text-muted-foreground">
          このページはスーパー管理者のみアクセスできます。
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sufficient = data.filter((d) => d.status === "sufficient").length;
  const insufficient = data.filter((d) => d.status === "insufficient").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">合格者データ管理</h1>
        <p className="text-sm text-muted-foreground">
          大学別の合格者データ収集状況
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="size-3.5" />
              総データ数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.length}校</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              データ充足
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sufficient}校</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              データ不足
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{insufficient}校</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">大学名</th>
                  <th className="px-4 py-3 text-left font-medium">学部名</th>
                  <th className="px-4 py-3 text-center font-medium">
                    データ件数
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    カバレッジ
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      まだデータがありません
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr
                      key={`${row.universityName}-${row.facultyName}`}
                      className="border-b"
                    >
                      <td className="px-4 py-3 font-medium">
                        {row.universityName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.facultyName}
                      </td>
                      <td className="px-4 py-3 text-center">{row.sampleSize}件</td>
                      <td className="px-4 py-3">
                        <div className="mx-auto flex w-32 items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${
                                row.coveragePercent >= 50
                                  ? "bg-emerald-500"
                                  : "bg-rose-400"
                              }`}
                              style={{
                                width: `${Math.min(row.coveragePercent, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {row.coveragePercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.status === "sufficient" ? (
                          <Badge variant="default">充足</Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="mr-1 size-3" />
                            不足
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

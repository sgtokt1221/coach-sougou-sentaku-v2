"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/api/client";

interface UniversityOpt {
  id: string;
  name: string;
  faculties: { id: string; name: string }[];
}

interface PassedStats {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  sampleSize: number;
  insufficient: boolean;
  message?: string;
  statistics: {
    avgEssaySubmissions: number;
    avgInterviewPractices: number;
    avgEssayScore: number;
    avgFinalEssayScore: number;
    avgInterviewScore: number;
    avgFinalInterviewScore: number;
    topInitialWeaknesses: { area: string; frequency: number }[];
    topResolvedBeforePass: { area: string; avgDaysToResolve: number }[];
  } | null;
}

/**
 * 合格者統計エクスプローラ。
 *
 * 大学 → 学部 を選ぶと、 その学部に "passed" 判定の生徒の
 * 学習データを動的集計して表示する (API: /api/passed-data/[uniId]/[facId])。
 *
 * 集計内容:
 * - サンプル数 (合格者人数)
 * - 平均 essay/interview 提出件数
 * - 平均/最終スコア (essay 50点 + interview 50点)
 * - 初期弱点 Top 5 + 解消にかかった日数 Top 5
 */
export default function PassedDataExplorePage() {
  const [universities, setUniversities] = useState<UniversityOpt[]>([]);
  const [uniId, setUniId] = useState<string>("");
  const [facId, setFacId] = useState<string>("");
  const [data, setData] = useState<PassedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 大学一覧取得
  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch("/api/admin/universities");
        if (!res.ok) return;
        const json = await res.json();
        const list: UniversityOpt[] = (json.universities ?? []).map(
          (u: { id: string; name: string; faculties?: { id: string; name: string }[] }) => ({
            id: u.id,
            name: u.name,
            faculties: u.faculties ?? [],
          }),
        );
        setUniversities(list);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const selectedUni = universities.find((u) => u.id === uniId);

  const runQuery = async () => {
    if (!uniId || !facId) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await authFetch(`/api/passed-data/${uniId}/${facId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">合格者統計エクスプローラ</h1>
        <p className="text-sm text-muted-foreground">
          大学 × 学部 を選んで、 合格者の学習データ平均を確認
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">対象を選択</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={uniId} onValueChange={(v) => { setUniId(v ?? ""); setFacId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="大学を選択" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={facId}
              onValueChange={(v) => setFacId(v ?? "")}
              disabled={!selectedUni}
            >
              <SelectTrigger>
                <SelectValue placeholder="学部を選択" />
              </SelectTrigger>
              <SelectContent>
                {selectedUni?.faculties.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runQuery} disabled={!uniId || !facId || loading}>
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 size-4" />
              )}
              集計
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="p-4 text-sm">エラー: {error}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {data.universityName} {data.facultyName}
                <Badge variant={data.sampleSize >= 3 ? "default" : "secondary"}>
                  合格者 {data.sampleSize} 名
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.sampleSize === 0 ? (
                <div className="rounded bg-muted p-4 text-sm text-muted-foreground">
                  まだ合格者データがありません。 examResults に「passed」 が登録された生徒が
                  集まったら統計が出ます。
                </div>
              ) : data.insufficient ? (
                <div className="rounded bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertCircle className="mr-1 inline size-4" />
                  サンプル数が少ない (3 名未満) ため統計信頼度は低めです
                </div>
              ) : null}
            </CardContent>
          </Card>

          {data.statistics && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="平均 essay 提出数"
                  value={data.statistics.avgEssaySubmissions}
                  unit="件"
                />
                <StatCard
                  label="平均 interview 練習数"
                  value={data.statistics.avgInterviewPractices}
                  unit="件"
                />
                <StatCard
                  label="平均 essay スコア"
                  value={data.statistics.avgEssayScore}
                  unit="/50"
                />
                <StatCard
                  label="最終 essay スコア"
                  value={data.statistics.avgFinalEssayScore}
                  unit="/50"
                />
                <StatCard
                  label="平均 interview スコア"
                  value={data.statistics.avgInterviewScore}
                  unit="/50"
                />
                <StatCard
                  label="最終 interview スコア"
                  value={data.statistics.avgFinalInterviewScore}
                  unit="/50"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      初期弱点 Top 5 (合格者にも最初はあった)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.statistics.topInitialWeaknesses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">データなし</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {data.statistics.topInitialWeaknesses.map((w) => (
                          <li
                            key={w.area}
                            className="flex items-center justify-between rounded border p-2"
                          >
                            <span>{w.area}</span>
                            <Badge variant="outline" className="text-xs">
                              {w.frequency}%
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      <TrendingUp className="mr-1 inline size-4" />
                      解消にかかった平均日数 Top 5
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.statistics.topResolvedBeforePass.length === 0 ? (
                      <p className="text-xs text-muted-foreground">データなし</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {data.statistics.topResolvedBeforePass.map((w) => (
                          <li
                            key={w.area}
                            className="flex items-center justify-between rounded border p-2"
                          >
                            <span>{w.area}</span>
                            <Badge variant="outline" className="text-xs">
                              {w.avgDaysToResolve}日
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {value}
          <span className="ml-0.5 text-sm text-muted-foreground">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}

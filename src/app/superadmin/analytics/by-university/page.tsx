"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Loader2, TrendingUp, GraduationCap } from "lucide-react";
import { authFetch } from "@/lib/api/client";

interface UniversityOpt {
  id: string;
  name: string;
  faculties: { id: string; name: string }[];
}

interface PaceData {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  totalStudents: number;
  totalSubmissions: number;
  monthly: {
    month: string;
    essayCount: number;
    interviewCount: number;
    avgEssayScore: number;
    avgInterviewScore: number;
    activeStudents: number;
  }[];
}

/**
 * 大学 × 学部別 月別ペース推移ダッシュボード (superadmin)。
 *
 * 「〜大学を目指す生徒は、 何月にどれくらいのペースで essay/interview を
 *  やっていたか、 スコアの推移はどうか」 を線グラフで可視化。
 */
export default function AnalyticsByUniversityPage() {
  const [universities, setUniversities] = useState<UniversityOpt[]>([]);
  const [uniId, setUniId] = useState("");
  const [facId, setFacId] = useState("");
  const [data, setData] = useState<PaceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch("/api/admin/universities");
        if (!res.ok) return;
        const json = await res.json();
        const list: UniversityOpt[] = (json.universities ?? []).map(
          (u: {
            id: string;
            name: string;
            faculties?: { id: string; name: string }[];
          }) => ({ id: u.id, name: u.name, faculties: u.faculties ?? [] }),
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
    setData(null);
    try {
      const res = await authFetch(
        `/api/superadmin/analytics/by-university?universityId=${uniId}&facultyId=${facId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">大学別 活動ペース分析</h1>
        <p className="text-sm text-muted-foreground">
          志望大学 × 学部 ごとに、 何月にどれぐらいのペースで取り組まれているかを月次推移で表示
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">対象を選択</CardTitle>
        </CardHeader>
        <CardContent>
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
                <TrendingUp className="mr-2 size-4" />
              )}
              集計
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="志望生徒数"
              value={data.totalStudents}
              unit="名"
              icon={GraduationCap}
            />
            <SummaryCard
              label="累計提出数"
              value={data.totalSubmissions}
              unit="件"
            />
            <SummaryCard
              label="直近 12 ヶ月"
              value={data.monthly.reduce(
                (s, m) => s + m.essayCount + m.interviewCount,
                0,
              )}
              unit="件"
            />
          </div>

          {data.monthly.some((m) => m.essayCount + m.interviewCount > 0) ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    月別提出件数 (直近 12 ヶ月)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="essayCount"
                          name="小論文"
                          stroke="#0d9488"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="interviewCount"
                          name="面接"
                          stroke="#e11d48"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="activeStudents"
                          name="アクティブ生徒数"
                          stroke="#6366f1"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    平均スコア推移
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 50]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgEssayScore"
                          name="小論文 平均"
                          stroke="#0d9488"
                          strokeWidth={2}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="avgInterviewScore"
                          name="面接 平均"
                          stroke="#e11d48"
                          strokeWidth={2}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                この大学/学部を志望する生徒の直近活動データはありません
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  unit: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {Icon && <Icon className="size-3.5" />}
          {label}
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {value}
          <span className="ml-0.5 text-sm text-muted-foreground">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}


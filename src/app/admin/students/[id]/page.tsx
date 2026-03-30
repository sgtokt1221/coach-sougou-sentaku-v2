"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Mail,
  School,
  TrendingUp,
  BarChart3,
  FileText,
  AlertCircle,
  Pencil,
  X,
  Eye,
  ThumbsUp,
  Lightbulb,
  ArrowRightLeft,
} from "lucide-react";
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
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentDetail } from "@/lib/types/admin";
import type { Essay } from "@/lib/types/essay";
import type { WeaknessRecord } from "@/lib/types/growth";
import type { University } from "@/lib/types/university";
import { getWeaknessReminderLevel } from "@/lib/types/growth";
import { ExamResultsSection } from "@/components/admin/ExamResultsSection";
import { DocumentsSection } from "@/components/admin/DocumentsSection";
import { InterviewsSection } from "@/components/admin/InterviewsSection";
import { ActivitiesSection } from "@/components/admin/ActivitiesSection";

const SCORE_LINES = [
  { key: "total", label: "合計", color: "hsl(var(--primary))" },
  { key: "structure", label: "構成", color: "#6366f1" },
  { key: "logic", label: "論理性", color: "#f59e0b" },
  { key: "expression", label: "表現力", color: "#10b981" },
  { key: "apAlignment", label: "AP合致度", color: "#ef4444" },
  { key: "originality", label: "独自性", color: "#8b5cf6" },
] as const;

function weaknessBadge(w: WeaknessRecord) {
  const level = getWeaknessReminderLevel(w);
  switch (level) {
    case "critical":
      return <Badge variant="destructive">要注意</Badge>;
    case "warning":
      return (
        <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-700">
          警告
        </Badge>
      );
    case "improving":
      return (
        <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700">
          改善中
        </Badge>
      );
    case "resolved":
      return (
        <Badge variant="outline" className="border-green-400 bg-green-50 text-green-700">
          解決済み
        </Badge>
      );
    default:
      return <Badge variant="secondary">-</Badge>;
  }
}

function scoreColor(total: number): string {
  if (total >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (total >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllLines, setShowAllLines] = useState(false);

  // Essay detail state
  const [essayDetailOpen, setEssayDetailOpen] = useState(false);
  const [essayDetail, setEssayDetail] = useState<Essay | null>(null);
  const [essayLoading, setEssayLoading] = useState(false);

  async function openEssayDetail(essayId: string) {
    setEssayDetailOpen(true);
    setEssayLoading(true);
    setEssayDetail(null);
    try {
      const res = await authFetch(`/api/admin/students/${id}/essays/${essayId}`);
      if (res.ok) {
        setEssayDetail(await res.json());
      }
    } catch {
      // error
    } finally {
      setEssayLoading(false);
    }
  }

  // Profile edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editGrade, setEditGrade] = useState<string>("");
  const [editUniversities, setEditUniversities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: uniData } = useAuthSWR<{ universities: University[] }>(
    editOpen ? "/api/universities" : null
  );
  const allUniversities = uniData?.universities ?? [];

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await authFetch(`/api/admin/students/${id}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDetail();
  }, [id]);

  function openEditDialog() {
    if (!detail) return;
    setEditName(detail.profile.displayName);
    setEditSchool(detail.profile.school ?? "");
    setEditGrade(detail.profile.grade?.toString() ?? "");
    setEditUniversities([...detail.profile.targetUniversities]);
    setEditOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editName,
          school: editSchool || undefined,
          grade: editGrade ? Number(editGrade) : undefined,
          targetUniversities: editUniversities,
        }),
      });
      if (!res.ok) throw new Error("update failed");

      // Refresh detail data
      const refreshRes = await authFetch(`/api/admin/students/${id}`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setDetail(data);
      }
      setEditOpen(false);
    } catch {
      // エラー時は何もしない
    } finally {
      setSaving(false);
    }
  }

  function toggleUniversity(name: string) {
    setEditUniversities((prev) =>
      prev.includes(name) ? prev.filter((u) => u !== name) : [...prev, name]
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">生徒データの取得に失敗しました</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push("/admin/students")}>
              <ArrowLeft className="mr-1 size-4" />
              生徒一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, weaknesses, essays, scoreTrend } = detail;

  const chartData = scoreTrend.map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));

  const visibleLines = showAllLines ? SCORE_LINES : SCORE_LINES.slice(0, 1);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/students")}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-muted-foreground">生徒詳細</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              プロフィール
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="mr-1 size-3" />
              編集
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
            {profile.school && (
              <div className="flex items-center gap-2 text-sm">
                <School className="size-4 text-muted-foreground" />
                <span>{profile.school}</span>
              </div>
            )}
            {profile.grade && (
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="size-4 text-muted-foreground" />
                <span>{profile.grade}年生</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <TrendingUp className="mt-0.5 size-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {profile.targetUniversities.length > 0 ? (
                  profile.targetUniversities.map((u) => (
                    <Badge key={u} variant="outline" className="text-xs">
                      {u}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">志望校未設定</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>プロフィール編集</DialogTitle>
            <DialogDescription>
              生徒の基本情報を編集します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">氏名</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="氏名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-school">学校名</Label>
              <Input
                id="edit-school"
                value={editSchool}
                onChange={(e) => setEditSchool(e.target.value)}
                placeholder="学校名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-grade">学年</Label>
              <Select value={editGrade} onValueChange={(v: string | null) => setEditGrade(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="学年を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1年生</SelectItem>
                  <SelectItem value="2">2年生</SelectItem>
                  <SelectItem value="3">3年生</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>志望校</Label>
              {editUniversities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {editUniversities.map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleUniversity(name)}
                    >
                      {name}
                      <X className="ml-1 size-3" />
                    </Badge>
                  ))}
                </div>
              )}
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {allUniversities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    大学データを読み込み中...
                  </p>
                ) : (
                  allUniversities.map((uni) => (
                    <label
                      key={uni.id}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editUniversities.includes(uni.name)}
                        onChange={() => toggleUniversity(uni.name)}
                        className="rounded border-muted-foreground"
                      />
                      {uni.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving || !editName.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              スコア推移
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllLines((v) => !v)}
            >
              {showAllLines ? "合計のみ" : "項目別も表示"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              まだデータがありません
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={showAllLines ? [0, 50] : [0, 50]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                {showAllLines && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {visibleLines.map((line) => (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    name={line.label}
                    stroke={line.color}
                    strokeWidth={line.key === "total" ? 2 : 1.5}
                    dot={{ r: line.key === "total" ? 4 : 3 }}
                    activeDot={{ r: line.key === "total" ? 6 : 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Weaknesses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">弱点一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {weaknesses.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              弱点データなし
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">弱点項目</th>
                    <th className="px-4 py-3 text-center font-medium">指摘回数</th>
                    <th className="px-4 py-3 text-center font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {weaknesses.map((w) => (
                    <tr key={w.area} className="border-b">
                      <td className="px-4 py-3">{w.area}</td>
                      <td className="px-4 py-3 text-center">{w.count}回</td>
                      <td className="px-4 py-3 text-center">{weaknessBadge(w)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Essay History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            添削履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          {essays.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              添削履歴なし
            </div>
          ) : (
            <div className="space-y-2">
              {essays.map((essay) => (
                <div key={essay.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent">
                  <div>
                    <p className="font-medium">
                      {essay.targetUniversity} {essay.targetFaculty}
                    </p>
                    {essay.topic && (
                      <p className="text-xs text-muted-foreground">{essay.topic}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(essay.submittedAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {essay.scores ? (
                        <>
                          <p className={`text-lg font-bold ${scoreColor(essay.scores.total)}`}>
                            {essay.scores.total}
                          </p>
                          <p className="text-xs text-muted-foreground">/50</p>
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {essay.status === "uploaded" ? "OCR待ち" : essay.status}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEssayDetail(essay.id)}
                    >
                      <Eye className="mr-1 size-3" />
                      詳細
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Essay Detail Dialog */}
      <Dialog open={essayDetailOpen} onOpenChange={setEssayDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              小論文詳細
            </DialogTitle>
            {essayDetail && (
              <DialogDescription>
                {essayDetail.targetUniversity} {essayDetail.targetFaculty}
                {essayDetail.topic ? ` - ${essayDetail.topic}` : ""}
              </DialogDescription>
            )}
          </DialogHeader>

          {essayLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : essayDetail ? (
            <div className="space-y-6 py-2">
              {/* Score bars */}
              {essayDetail.scores && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">AIスコア</h3>
                  <div className="grid gap-2">
                    {[
                      { key: "structure", label: "構成", color: "bg-indigo-500" },
                      { key: "logic", label: "論理性", color: "bg-amber-500" },
                      { key: "expression", label: "表現力", color: "bg-emerald-500" },
                      { key: "apAlignment", label: "AP合致度", color: "bg-rose-500" },
                      { key: "originality", label: "独自性", color: "bg-violet-500" },
                    ].map((item) => {
                      const val = essayDetail.scores![item.key as keyof typeof essayDetail.scores] as number;
                      return (
                        <div key={item.key} className="flex items-center gap-3">
                          <span className="w-20 text-xs text-muted-foreground">{item.label}</span>
                          <div className="flex-1">
                            <Progress value={val * 10} className="h-2" />
                          </div>
                          <span className="w-8 text-right text-xs font-medium">{val}/10</span>
                        </div>
                      );
                    })}
                    <div className="mt-1 flex items-center gap-3 border-t pt-2">
                      <span className="w-20 text-xs font-semibold">合計</span>
                      <div className="flex-1" />
                      <span className={`text-lg font-bold ${scoreColor(essayDetail.scores.total)}`}>
                        {essayDetail.scores.total}/50
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Original text */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">元テキスト</h3>
                <div className="max-h-60 overflow-y-auto rounded-lg border bg-white p-4 font-mono text-sm leading-7 tracking-wide text-gray-800 dark:bg-gray-950 dark:text-gray-200">
                  {essayDetail.ocrText.split("\n").map((line, i) => (
                    <p key={i} className={line.trim() === "" ? "h-4" : ""}>
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              {essayDetail.feedback && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    {/* Overall */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">総合評価</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {essayDetail.feedback.overall}
                      </p>
                    </div>

                    {/* Good points */}
                    {essayDetail.feedback.goodPoints.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          <ThumbsUp className="size-3.5" />
                          良い点
                        </h4>
                        <ul className="space-y-1 pl-5">
                          {essayDetail.feedback.goodPoints.map((p, i) => (
                            <li key={i} className="list-disc text-sm text-muted-foreground">{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {essayDetail.feedback.improvements.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                          <Lightbulb className="size-3.5" />
                          改善点
                        </h4>
                        <ul className="space-y-1 pl-5">
                          {essayDetail.feedback.improvements.map((p, i) => (
                            <li key={i} className="list-disc text-sm text-muted-foreground">{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Brushed up text */}
                  {essayDetail.feedback.brushedUpText && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <ArrowRightLeft className="size-3.5" />
                          添削後テキスト
                        </h3>
                        <div className="max-h-60 overflow-y-auto rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-mono text-sm leading-7 tracking-wide text-gray-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-gray-200">
                          {essayDetail.feedback.brushedUpText.split("\n").map((line, i) => (
                            <p key={i} className={line.trim() === "" ? "h-4" : ""}>
                              {line || "\u00A0"}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              エッセイデータの取得に失敗しました
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Interviews */}
      <InterviewsSection studentId={id} />

      {/* Documents */}
      <DocumentsSection studentId={id} />

      {/* Activities */}
      <ActivitiesSection studentId={id} />

      {/* Exam Results */}
      <ExamResultsSection studentId={id} />
    </div>
  );
}

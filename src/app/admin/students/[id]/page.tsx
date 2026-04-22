"use client";

import { useEffect, useState, useMemo } from "react";
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
  Star,
  Languages,
  Plus,
  Mic,
  MicOff,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { WeaknessSourceBadge } from "@/components/growth/WeaknessSourceBadge";
import type { StudentDetail } from "@/lib/types/admin";
import type { Essay } from "@/lib/types/essay";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";
import { UniversitySelectStep } from "@/components/onboarding/UniversitySelectStep";
import type { EnglishCert } from "@/lib/types/user";
import { SkillRankPanel } from "@/components/skill-check/SkillRankPanel";
import { CategorySelector } from "@/components/skill-check/CategorySelector";
import type { SkillCheckStatus, AcademicCategory } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";

const CERT_TYPES: { value: EnglishCert["type"]; label: string }[] = [
  { value: "EIKEN", label: "英検" },
  { value: "TOEIC", label: "TOEIC" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "IELTS", label: "IELTS" },
  { value: "TEAP", label: "TEAP" },
  { value: "GTEC", label: "GTEC" },
  { value: "OTHER", label: "その他" },
];
const EIKEN_GRADES = ["1級", "準1級", "2級", "準2級", "3級", "4級", "5級"];
import { ExamResultsSection } from "@/components/admin/ExamResultsSection";
import { EssayCoachHistorySection } from "@/components/admin/EssayCoachHistorySection";
import { DocumentsSection } from "@/components/admin/DocumentsSection";
import { InterviewsSection } from "@/components/admin/InterviewsSection";
import { SummaryDrillsSection } from "@/components/admin/SummaryDrillsSection";
import { ActivitiesSection } from "@/components/admin/ActivitiesSection";
import { DiscoverSection } from "@/components/admin/DiscoverSection";
import { InlineFeedbackButton } from "@/components/admin/InlineFeedbackButton";
import { CoachMemo } from "@/components/admin/CoachMemo";
import { ActivityHeatmap } from "@/components/admin/ActivityHeatmap";
import { WeaknessTopChart } from "@/components/admin/WeaknessTopChart";
import { buildActivityHeatmapData } from "@/lib/utils/activity-heatmap";
import { useAuthSWR } from "@/lib/api/swr";


function weaknessBadge(w: WeaknessRecord) {
  const level = getWeaknessReminderLevel(w);
  switch (level) {
    case "critical":
      return <Badge variant="destructive">要注意</Badge>;
    case "warning":
      return (
        <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700">
          警告
        </Badge>
      );
    case "improving":
      return (
        <Badge variant="outline" className="border-sky-400 bg-sky-50 text-sky-700">
          改善中
        </Badge>
      );
    case "resolved":
      return (
        <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-emerald-700">
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({ weaknesses: false, essays: false });
  const [skillCheck, setSkillCheck] = useState<SkillCheckStatus | null>(null);
  const [interviewSkillCheck, setInterviewSkillCheck] = useState<InterviewSkillCheckStatus | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  // ヒートマップ用データ取得
  const { data: interviewsData } = useAuthSWR<any[]>(`/api/admin/students/${id}/interviews`);
  const { data: summaryDrillsData } = useAuthSWR<any[]>(`/api/admin/students/${id}/summary-drills`);
  const { data: activityLogsData } = useAuthSWR<any[]>(`/api/admin/students/${id}/activity-logs`);

  // 活動ヒートマップ用データ生成
  const activityHeatmapData = useMemo(() => {
    if (!detail) return [];

    return buildActivityHeatmapData({
      essays: detail.essays,
      interviews: interviewsData,
      skillChecks: skillCheck ? [skillCheck.latestResult].filter(Boolean) : [],
      summaryDrills: summaryDrillsData,
      activityLogs: activityLogsData,
    });
  }, [detail, interviewsData, summaryDrillsData, activityLogsData, skillCheck]);

  // 弱点Top5データ
  const topWeaknesses = useMemo(() => {
    if (!detail?.weaknesses) return [];
    return detail.weaknesses.filter(w => !w.resolved);
  }, [detail?.weaknesses]);

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
  const [editGpa, setEditGpa] = useState("");
  const [editEnglishCerts, setEditEnglishCerts] = useState<EnglishCert[]>([]);
  const [editCertType, setEditCertType] = useState<EnglishCert["type"]>("EIKEN");
  const [editCertScore, setEditCertScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [unlockingRealtime, setUnlockingRealtime] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await authFetch(`/api/admin/students/${id}`);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          const msg = `HTTP ${res.status}: ${body || res.statusText}`;
          console.error("[AdminStudentDetail] fetch failed:", msg);
          setFetchError(msg);
          setDetail(null);
          return;
        }
        const data = await res.json();
        setDetail(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "不明なエラー";
        console.error("[AdminStudentDetail] fetch error:", msg);
        setFetchError(msg);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDetail();
  }, [id]);

  useEffect(() => {
    async function fetchSkill() {
      try {
        const [essayRes, interviewRes] = await Promise.all([
          authFetch(`/api/admin/students/${id}/skill-check`),
          authFetch(`/api/admin/students/${id}/interview-skill-check`),
        ]);
        if (essayRes.ok) setSkillCheck(await essayRes.json());
        if (interviewRes.ok) setInterviewSkillCheck(await interviewRes.json());
      } catch {
        // ignore
      }
    }
    if (id) fetchSkill();
  }, [id]);

  async function handleChangeSkillCategory(cat: AcademicCategory) {
    setSavingCategory(true);
    try {
      const res = await authFetch(`/api/admin/students/${id}/skill-check/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
      if (res.ok) {
        toast.success("系統を更新しました");
        // 再取得
        const next = await authFetch(`/api/admin/students/${id}/skill-check`);
        if (next.ok) setSkillCheck(await next.json());
      } else {
        toast.error("更新に失敗しました");
      }
    } catch {
      toast.error("通信エラー");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleToggleRealtime() {
    if (!detail) return;
    const isUnlocked = detail.realtimeUnlocked;
    const msg = isUnlocked
      ? `${detail.profile.displayName} さんの音声面接を 7 日制限に戻しますか？`
      : `${detail.profile.displayName} さんの音声面接を無制限に解除しますか？`;
    if (!confirm(msg)) return;
    setUnlockingRealtime(true);
    try {
      const res = await authFetch(`/api/admin/students/${id}/unlock-realtime`, {
        method: isUnlocked ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      // ローカル状態を更新
      setDetail((prev) => prev ? { ...prev, realtimeUnlocked: !isUnlocked } : prev);
      toast.success(isUnlocked ? "音声面接を 7 日制限に戻しました" : "音声面接を無制限に解除しました");
    } catch (err) {
      console.error("toggle-realtime failed", err);
      toast.error(err instanceof Error ? err.message : "操作に失敗しました");
    } finally {
      setUnlockingRealtime(false);
    }
  }

  function openEditDialog() {
    if (!detail) return;
    setEditName(detail.profile.displayName);
    setEditSchool(detail.profile.school ?? "");
    setEditGrade(detail.profile.grade?.toString() ?? "");
    setEditUniversities([...detail.profile.targetUniversities]);
    setEditGpa(detail.profile.gpa?.toString() ?? "");
    setEditEnglishCerts([...(detail.profile.englishCerts ?? [])]);
    setEditCertType("EIKEN");
    setEditCertScore("");
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
          gpa: editGpa ? Number(editGpa) : null,
          englishCerts: editEnglishCerts,
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
            {fetchError && (
              <p className="mt-1 text-xs text-destructive">{fetchError}</p>
            )}
            <Button className="mt-4" variant="outline" onClick={() => router.push("/admin/students")}>
              <ArrowLeft className="mr-1 size-4" />
              生徒一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, weaknesses, essays, essayScoreTrend, interviewScoreTrend, lastActivityAt } = detail;

  const essayChartData = (essayScoreTrend ?? []).map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));
  const interviewChartData = (interviewScoreTrend ?? []).map((p) => ({
    ...p,
    date: p.date.slice(5, 10).replace("-", "/"),
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/students")}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-sm text-muted-foreground">生徒詳細</p>
          </div>
          {(() => {
            if (!lastActivityAt) return <Badge variant="secondary">活動なし</Badge>;
            const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000);
            if (days <= 7) return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">アクティブ</Badge>;
            if (days <= 14) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">やや停滞</Badge>;
            return <Badge className="bg-rose-100 text-rose-800 border-rose-300">非アクティブ（{days}日）</Badge>;
          })()}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-2xl font-bold">{essays.length}</p>
          <p className="text-xs text-muted-foreground">添削回数</p>
        </Card>
        <Card className="p-3">
          <p className={`text-2xl font-bold ${essays.length > 0 && essays[0].scores ? scoreColor(essays[0].scores.total) : ""}`}>
            {essays.length > 0 && essays[0].scores ? essays[0].scores.total : "-"}
          </p>
          <p className="text-xs text-muted-foreground">最新スコア /50</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{weaknesses.filter((w) => !w.resolved).length}</p>
          <p className="text-xs text-muted-foreground">未解決の弱点</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">最終活動</p>
          <p className="text-sm font-medium">
            {lastActivityAt
              ? new Date(lastActivityAt).toLocaleDateString("ja-JP")
              : "なし"}
          </p>
        </Card>
      </div>

      {/* Skill Ranks: 小論文 + 面接。SC + 直近30日練習の合成ランクを表示 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SkillRankPanel
          label="小論文スキル"
          rank={skillCheck?.latestResult?.rank ?? null}
          score={skillCheck?.latestResult?.scores.total ?? null}
          takenAt={skillCheck?.latestResult?.takenAt ?? null}
          daysSinceLast={skillCheck?.daysSinceLast ?? null}
          category={skillCheck?.currentCategory ?? skillCheck?.latestResult?.category ?? null}
          subLabel={skillCheck?.needsRefresh ? "更新推奨" : undefined}
          aggregate={skillCheck?.aggregate}
        />
        <SkillRankPanel
          label="面接スキル"
          rank={interviewSkillCheck?.latestResult?.rank ?? null}
          score={interviewSkillCheck?.latestResult?.scores.total ?? null}
          maxScore={40}
          takenAt={interviewSkillCheck?.latestResult?.takenAt ?? null}
          daysSinceLast={interviewSkillCheck?.daysSinceLast ?? null}
          subLabel={interviewSkillCheck?.needsRefresh ? "更新推奨" : undefined}
          emptyMessage="未受験"
          aggregate={interviewSkillCheck?.aggregate}
        />
      </div>

      {/* 系統変更（管理者操作） */}
      {skillCheck && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <span className="text-xs font-medium text-muted-foreground">
              スキルチェック系統
            </span>
            <CategorySelector
              value={skillCheck.currentCategory ?? null}
              onChange={handleChangeSkillCategory}
              disabled={savingCategory}
            />
            <p className="text-xs text-muted-foreground">
              次回受験時に出題される系統を変更できます。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Activity Heatmap & Top Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityHeatmap data={activityHeatmapData} />
        </div>
        <div className="lg:col-span-1">
          <WeaknessTopChart weaknesses={topWeaknesses} />
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
            <div className="flex gap-2">
              <Button
                variant={detail?.realtimeUnlocked ? "default" : "outline"}
                size="sm"
                onClick={handleToggleRealtime}
                disabled={unlockingRealtime}
              >
                {detail?.realtimeUnlocked ? (
                  <><Mic className="mr-1 size-3" />{unlockingRealtime ? "処理中..." : "音声無制限 ON"}</>
                ) : (
                  <><MicOff className="mr-1 size-3" />{unlockingRealtime ? "処理中..." : "音声制限を解除"}</>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="mr-1 size-3" />
                編集
              </Button>
            </div>
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
            {profile.gpa != null && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="size-4 text-muted-foreground" />
                <span>評定平均 {profile.gpa.toFixed(1)}</span>
              </div>
            )}
            {profile.englishCerts && profile.englishCerts.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Languages className="mt-0.5 size-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {profile.englishCerts.map((cert, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {cert.type === "EIKEN" ? "英検" : cert.type} {cert.score}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <TrendingUp className="mt-0.5 size-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {(profile.resolvedUniversities ?? []).length > 0 ? (
                  profile.resolvedUniversities!.map((u, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {u.universityName} {u.facultyName}
                    </Badge>
                  ))
                ) : profile.targetUniversities.length > 0 ? (
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
              <Label htmlFor="edit-gpa">評定平均（GPA）</Label>
              <Input
                id="edit-gpa"
                type="number"
                min={0}
                max={5}
                step={0.1}
                placeholder="例: 4.2"
                value={editGpa}
                onChange={(e) => setEditGpa(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>英語資格</Label>
              {editEnglishCerts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {editEnglishCerts.map((cert, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {CERT_TYPES.find((t) => t.value === cert.type)?.label} {cert.score}
                      <button
                        type="button"
                        onClick={() => setEditEnglishCerts((prev) => prev.filter((_, idx) => idx !== i))}
                        className="rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Select
                  value={editCertType}
                  onValueChange={(v) => { setEditCertType(v as EnglishCert["type"]); setEditCertScore(""); }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CERT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editCertType === "EIKEN" ? (
                  <Select
                    value={editCertScore}
                    onValueChange={(v) => {
                      if (!v) return;
                      setEditEnglishCerts((prev) => [...prev, { type: "EIKEN", score: v }]);
                      setEditCertScore("");
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="級を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {EIKEN_GRADES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      placeholder="スコア"
                      value={editCertScore}
                      onChange={(e) => setEditCertScore(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (editCertScore.trim()) {
                          setEditEnglishCerts((prev) => [...prev, { type: editCertType, score: editCertScore.trim() }]);
                          setEditCertScore("");
                        }
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>志望校</Label>
              <UniversitySelectStep
                selected={editUniversities}
                onChange={setEditUniversities}
              />
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
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" />
            スコア推移（小論文・面接）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScoresTrendChart essayData={essayChartData} interviewData={interviewChartData} />
        </CardContent>
      </Card>

      {/* Discover (自己分析 + 志望校マッチング) — プロフィール直後に配置 */}
      <DiscoverSection studentId={id} />

      <Separator />

      {/* Weaknesses Table — Accordion */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setOpenSections((s) => ({ ...s, weaknesses: !s.weaknesses }))}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="size-4" />
              弱点一覧
              <Badge variant="secondary" className="text-xs ml-1">{weaknesses.filter((w) => !w.resolved).length}</Badge>
            </CardTitle>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${openSections.weaknesses ? "rotate-180" : ""}`} />
          </div>
        </CardHeader>
        {openSections.weaknesses && (
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
                      <th className="px-4 py-3 text-center font-medium">出所</th>
                      <th className="px-4 py-3 text-center font-medium">指摘回数</th>
                      <th className="px-4 py-3 text-center font-medium">ステータス</th>
                      <th className="px-4 py-3 text-center font-medium w-12">FB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weaknesses.map((w) => (
                      <tr key={w.area} className="border-b">
                        <td className="px-4 py-3">{w.area}</td>
                        <td className="px-4 py-3 text-center">
                          <WeaknessSourceBadge source={w.source as "essay" | "interview" | "both"} />
                        </td>
                        <td className="px-4 py-3 text-center">{w.count}回</td>
                        <td className="px-4 py-3 text-center">{weaknessBadge(w)}</td>
                        <td className="px-4 py-3 text-center">
                          <InlineFeedbackButton
                            studentId={id}
                            type="weakness"
                            targetId={w.area}
                            targetLabel={w.area}
                            compact
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Essay History — Accordion */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setOpenSections((s) => ({ ...s, essays: !s.essays }))}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              添削履歴
              <Badge variant="secondary" className="text-xs ml-1">{essays.length}</Badge>
            </CardTitle>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${openSections.essays ? "rotate-180" : ""}`} />
          </div>
        </CardHeader>
        {openSections.essays && (
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
        )}
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
              {/* Admin Feedback */}
              <Separator />
              <InlineFeedbackButton
                studentId={id}
                type="essay"
                targetId={essayDetail.id}
                targetLabel={`${essayDetail.targetUniversity} ${essayDetail.topic ?? ""}`}
              />
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
      <SummaryDrillsSection studentId={id} />

      {/* Documents */}
      <DocumentsSection studentId={id} />

      {/* Activities */}
      <ActivitiesSection studentId={id} />

      {/* AIコーチ履歴 */}
      <EssayCoachHistorySection studentId={id} />

      {/* Exam Results */}
      <ExamResultsSection studentId={id} />

      {/* Coach Memo */}
      <CoachMemo studentId={id} />
    </div>
  );
}

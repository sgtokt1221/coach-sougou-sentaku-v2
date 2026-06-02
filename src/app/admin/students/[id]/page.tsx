"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  KeyRound,
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
  Clock,
  Activity,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { resetPassword } from "@/lib/firebase/auth";
import { authFetch } from "@/lib/api/client";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { DetailedScoresTrendChart } from "@/components/growth/DetailedScoresTrendChart";
import { INTERVIEW_SCORE_LINES } from "@/components/charts/theme";
import { WeaknessSourceBadge } from "@/components/growth/WeaknessSourceBadge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/avatar";
import { SegmentControl } from "@/components/shared/SegmentControl";
import { TeacherAssignmentSection } from "@/components/admin/TeacherAssignmentSection";
import { FloatingStudentChat } from "@/components/chat/FloatingStudentChat";
import { HighSchoolSelect } from "@/components/shared/HighSchoolSelect";
import { CommentableEssayText } from "@/components/essay/CommentableEssayText";
import type { StudentDetail } from "@/lib/types/admin";
import { getDisplayGrade } from "@/lib/utils/grade";
import {
  categorizeWeakness,
  ESSAY_CATEGORY_LABELS,
  ESSAY_CATEGORY_ORDER,
  type EssayCategoryKey,
} from "@/lib/growth/weakness-category";
import { ESSAY_STATUS_LABELS, type Essay } from "@/lib/types/essay";
import type { WeaknessRecord } from "@/lib/types/growth";
import { getWeaknessReminderLevel } from "@/lib/types/growth";
import { UniversitySelectStep } from "@/components/onboarding/UniversitySelectStep";
import type { EnglishCert } from "@/lib/types/user";
import { CategorySelector } from "@/components/skill-check/CategorySelector";
import type { SkillCheckStatus, AcademicCategory } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";
import { StudentSkillRadar } from "@/components/admin/StudentSkillRadar";
import { CategoryAverageRadar } from "@/components/admin/CategoryAverageRadar";

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
import { SubscriptionManagementSection } from "@/components/admin/SubscriptionManagementSection";
import { EssayCoachHistorySection } from "@/components/admin/EssayCoachHistorySection";
import { SessionsHistorySection } from "@/components/admin/SessionsHistorySection";
import { GrowthReportsSection } from "@/components/admin/GrowthReportsSection";
import { DocumentsSection } from "@/components/admin/DocumentsSection";
import { InterviewsSection } from "@/components/admin/InterviewsSection";
import { SummaryDrillsSection } from "@/components/admin/SummaryDrillsSection";
import { ActivitiesSection } from "@/components/admin/ActivitiesSection";
import { DiscoverSection } from "@/components/admin/DiscoverSection";
import { InlineFeedbackButton } from "@/components/admin/InlineFeedbackButton";
import { CoachMemo } from "@/components/admin/CoachMemo";
import { ActivityHeatmap } from "@/components/admin/ActivityHeatmap";
import { WeaknessTopChart } from "@/components/admin/WeaknessTopChart";
import { HomeworkStatusSection } from "@/components/admin/HomeworkStatusSection";
import { buildActivityHeatmapData } from "@/lib/utils/activity-heatmap";
import { useAuthSWR } from "@/lib/api/swr";
import { useAuth } from "@/contexts/AuthContext";


/**
 * 弱点一覧をカテゴリ別アコーディオン形式で表示。
 * 細分化問題対策 Phase 2-B: フラットな table を categoryId で grouping。
 * categoryId 未保存のレガシーレコードは categorizeWeakness で fallback 分類。
 */
function WeaknessesByCategoryList({
  weaknesses,
  studentId,
}: {
  weaknesses: WeaknessRecord[];
  studentId: string;
}) {
  const [openCategories, setOpenCategories] = useState<Set<EssayCategoryKey>>(
    () => new Set(["structure", "logic", "expression", "apAlignment", "originality", "other"] as EssayCategoryKey[]),
  );

  // 未解決優先、 categoryId で grouping。 unresolved/resolved 別表示
  const grouped = useMemo(() => {
    const out: Record<EssayCategoryKey, WeaknessRecord[]> = {
      structure: [],
      logic: [],
      expression: [],
      apAlignment: [],
      originality: [],
      other: [],
    };
    for (const w of weaknesses) {
      const cat = w.categoryId ?? categorizeWeakness(w.area);
      out[cat as EssayCategoryKey].push(w);
    }
    // 各カテゴリ内: unresolved を上に、 count 降順
    for (const k of Object.keys(out) as EssayCategoryKey[]) {
      out[k].sort((a, b) => {
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return (b.count ?? 0) - (a.count ?? 0);
      });
    }
    return out;
  }, [weaknesses]);

  const visible = ESSAY_CATEGORY_ORDER.filter((c) => grouped[c].length > 0);

  const toggle = (c: EssayCategoryKey) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  return (
    <div className="divide-y">
      {visible.map((cat) => {
        const items = grouped[cat];
        const unresolvedCount = items.filter((w) => !w.resolved).length;
        const isOpen = openCategories.has(cat);
        return (
          <div key={cat}>
            <button
              type="button"
              onClick={() => toggle(cat)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2 text-sm">
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    isOpen ? "" : "-rotate-90"
                  }`}
                />
                <span className="font-semibold">{ESSAY_CATEGORY_LABELS[cat]}</span>
                <span className="text-xs text-muted-foreground">
                  {unresolvedCount}件 / 全{items.length}件
                </span>
              </div>
            </button>
            {isOpen && (
              <div className="bg-muted/20">
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((w) => (
                      <tr
                        key={w.area}
                        className={`border-t ${w.resolved ? "opacity-60" : ""}`}
                      >
                        <td className="px-4 py-2.5">
                          <p className="break-words leading-snug">{w.area}</p>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <WeaknessSourceBadge
                            source={w.source as "essay" | "interview" | "both"}
                          />
                        </td>
                        <td className="px-2 py-2.5 text-center text-xs tabular-nums">
                          {w.count}回
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {weaknessBadge(w)}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <InlineFeedbackButton
                            studentId={studentId}
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
          </div>
        );
      })}
    </div>
  );
}

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

/**
 * ピン留めサマリ (未解決弱点数 + 最終活動)
 * スキル指標は StudentSkillRadar (スキルカード) に集約済み。
 */
function PinnedSummary({ detail }: { detail: StudentDetail }) {
  const { lastActivity, lastSeenAt } = detail;

  // 相対表記 + 色 (7日以内=緑 / 14日以内=黄 / それ以上=赤)
  const relative = (iso?: string | null) => {
    if (!iso) return { text: "なし", days: null as number | null };
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return { text: days <= 0 ? "今日" : `${days}日前`, days };
  };
  const colorFor = (days: number | null) =>
    days === null
      ? "text-gray-500"
      : days <= 7
        ? "text-green-600"
        : days <= 14
          ? "text-yellow-600"
          : "text-red-600";

  // 最終活動（何を・いつ）
  const ACTIVITY_LABEL: Record<string, string> = {
    essay: "小論文添削",
    interview: "模擬面接",
  };
  const act = relative(lastActivity?.at);
  const activityValue = lastActivity
    ? `${ACTIVITY_LABEL[lastActivity.type] ?? "活動"} ・ ${act.text}`
    : "なし";

  // 最終ログイン
  const seen = relative(lastSeenAt);

  const cells = [
    {
      label: "最終活動",
      value: activityValue,
      color: colorFor(act.days),
      icon: Activity,
      monogram: null,
      pulse: false,
    },
    {
      label: "最終ログイン",
      value: seen.text,
      color: colorFor(seen.days),
      icon: Clock,
      monogram: null,
      pulse: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`rounded-lg border bg-background/50 p-3 ${cell.pulse ? "animate-pulse" : ""}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{cell.label}</p>
              <p className={`text-lg font-semibold ${cell.color}`}>{cell.value}</p>
            </div>
            {cell.monogram && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
                · {cell.monogram}
              </span>
            )}
            {cell.icon && <cell.icon className="size-4 shrink-0 text-muted-foreground" />}
          </div>
        </div>
      ))}
    </div>
  );
}

type TabKey = "overview" | "performance" | "activity" | "reports" | "homework" | "messages";
const VALID_TABS: TabKey[] = ["overview", "performance", "activity", "reports", "homework", "messages"];

function AdminStudentDetailPageInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  // 講師が担当生徒の学習状況を見る目的でこのページを開く場合は、
  // 管理者専用の操作（プロフィール編集・課金管理・担当講師割当）を隠す。
  const { user, userProfile } = useAuth();
  const isTeacherViewer = userProfile?.role === "teacher";

  // タブ状態とURL同期
  const rawTab = searchParams?.get("tab") ?? "overview";
  let tab: TabKey = VALID_TABS.includes(rawTab as TabKey) ? (rawTab as TabKey) : "overview";
  // 講師にはメッセージタブを出さない (直リンク時は概要へ)
  if (isTeacherViewer && tab === "messages") tab = "overview";

  const handleTabChange = (next: string) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set("tab", next);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({ weaknesses: false, essays: false });
  const [perfTab, setPerfTab] = useState<"total" | "essay" | "interview">("total");
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
      skillChecks: skillCheck?.latestResult ? [skillCheck.latestResult] : [],
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

  // インラインコメント追加/削除後に essay を再取得 (フリッカーなし)
  async function refreshEssayDetail(essayId: string) {
    try {
      const res = await authFetch(`/api/admin/students/${id}/essays/${essayId}`);
      if (res.ok) setEssayDetail(await res.json());
    } catch {
      // ignore
    }
  }

  async function addEssayComment(
    essayId: string,
    range: { start: number; end: number; quote: string; comment?: string },
  ) {
    const res = await authFetch(`/api/essay/${essayId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(range),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error ?? "コメントの保存に失敗しました");
    }
    await refreshEssayDetail(essayId);
  }

  async function deleteEssayComment(essayId: string, commentId: string) {
    const res = await authFetch(
      `/api/essay/${essayId}/comments?commentId=${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error ?? "削除に失敗しました");
    }
    await refreshEssayDetail(essayId);
  }

  const [sendingReset, setSendingReset] = useState(false);

  // Profile edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editSchoolId, setEditSchoolId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState<string>("");
  const [editSessionsPerMonth, setEditSessionsPerMonth] = useState<string>("1");
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

  async function handleSendResetEmail() {
    if (!detail?.profile.email) {
      toast.error("メールアドレスが登録されていません");
      return;
    }
    if (!confirm(`${detail.profile.displayName} 宛にパスワードリセットメールを送信しますか？`)) return;
    setSendingReset(true);
    try {
      await resetPassword(detail.profile.email);
      toast.success("パスワードリセットメールを送信しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSendingReset(false);
    }
  }

  function openEditDialog() {
    if (!detail) return;
    setEditName(detail.profile.displayName);
    setEditSchool(detail.profile.school ?? "");
    setEditSchoolId(detail.profile.schoolId ?? null);
    setEditGrade(detail.profile.grade?.toString() ?? "");
    setEditSessionsPerMonth((detail.profile.sessionsPerMonth ?? 1).toString());
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
          schoolId: editSchoolId,
          grade: editGrade ? Number(editGrade) : undefined,
          sessionsPerMonth: Number(editSessionsPerMonth) || 1,
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

  // 日々の取り組みの項目別平均（全提出から算出）
  const avgOf = (nums: number[]) =>
    nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const essayScoresList = essays
    .map((e) => e.scores)
    .filter((s): s is NonNullable<typeof s> => !!s);
  const essayCategoryAvg =
    essayScoresList.length > 0
      ? {
          structure: avgOf(essayScoresList.map((s) => s.structure)),
          logic: avgOf(essayScoresList.map((s) => s.logic)),
          expression: avgOf(essayScoresList.map((s) => s.expression)),
          apAlignment: avgOf(essayScoresList.map((s) => s.apAlignment)),
          originality: avgOf(essayScoresList.map((s) => s.originality)),
        }
      : undefined;
  const ivTrend = interviewScoreTrend ?? [];
  const interviewCategoryAvg =
    ivTrend.length > 0
      ? {
          clarity: avgOf(ivTrend.map((p) => p.clarity)),
          apAlignment: avgOf(ivTrend.map((p) => p.apAlignment)),
          enthusiasm: avgOf(ivTrend.map((p) => p.enthusiasm)),
          specificity: avgOf(ivTrend.map((p) => p.specificity)),
          bodyLanguage: avgOf(ivTrend.map((p) => p.bodyLanguage)),
        }
      : undefined;

  // タブコンテンツ関数
  const renderOverviewTab = () => (
    <div className="space-y-6">
      <StudentSkillRadar
        detail={detail}
        skillCheck={skillCheck}
        interviewSkillCheck={interviewSkillCheck}
      />

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              プロフィール
            </CardTitle>
            {!isTeacherViewer && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openEditDialog}>
                  <Pencil className="mr-1 size-3" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendResetEmail}
                  disabled={sendingReset}
                >
                  <KeyRound className="mr-1 size-3" />
                  パスワード再設定
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
            {profile.createdAt && (
              <div
                className="flex items-center gap-2 text-sm"
                title={new Date(profile.createdAt).toLocaleString("ja-JP")}
              >
                <Calendar className="size-4 text-muted-foreground" />
                <span>
                  加入: {new Date(profile.createdAt).toLocaleDateString("ja-JP")}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({Math.floor(
                      (Date.now() - new Date(profile.createdAt).getTime()) /
                        86400000,
                    )}日前)
                  </span>
                </span>
              </div>
            )}
            {profile.school && (
              <div className="flex items-center gap-2 text-sm">
                <School className="size-4 text-muted-foreground" />
                <span>{profile.school}</span>
              </div>
            )}
            {(profile.grade != null || profile.isRonin) && (
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="size-4 text-muted-foreground" />
                <span>
                  {
                    getDisplayGrade(
                      profile.grade,
                      profile.gradeUpdatedAt,
                      profile.isRonin,
                    ).label
                  }
                </span>
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

      {/* Subscription Management (手動付与 / 剥奪) — 管理者専用 */}
      {!isTeacherViewer && <SubscriptionManagementSection studentId={id} />}

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

      {/* Discover (自己分析 + 志望校マッチング) */}
      <DiscoverSection studentId={id} />
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Score Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              スコア推移
            </CardTitle>
            <SegmentControl
              value={perfTab}
              onChange={(v) => setPerfTab(v as "total" | "essay" | "interview")}
              size="sm"
              defaultAccent="blue"
              options={[
                { id: "total", label: "総合" },
                { id: "essay", label: "項目別（小論文）" },
                { id: "interview", label: "項目別（面接）" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {perfTab === "total" ? (
            <ScoresTrendChart essayData={essayChartData} interviewData={interviewChartData} />
          ) : perfTab === "essay" ? (
            essayChartData.length > 0 ? (
              <DetailedScoresTrendChart data={essayChartData} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                小論文の添削データがありません
              </p>
            )
          ) : interviewChartData.length > 0 ? (
            <DetailedScoresTrendChart data={interviewChartData} lines={INTERVIEW_SCORE_LINES} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              面接の練習データがありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 項目別の平均（日々の取り組み） */}
      {(essayCategoryAvg || interviewCategoryAvg) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              項目別の平均（日々の取り組み）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryAverageRadar
              essayAverages={essayCategoryAvg}
              interviewAverages={interviewCategoryAvg}
              essayCount={essayScoresList.length}
              interviewCount={ivTrend.length}
            />
          </CardContent>
        </Card>
      )}

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
              <WeaknessesByCategoryList
                weaknesses={weaknesses}
                studentId={id}
              />
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
                            {ESSAY_STATUS_LABELS[essay.status] ?? essay.status}
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

      <InterviewsSection studentId={id} />
      <SummaryDrillsSection studentId={id} />
    </div>
  );

  const renderActivityTab = () => (
    <div className="space-y-6">
      <DocumentsSection studentId={id} />
      <ActivitiesSection studentId={id} />
      <SessionsHistorySection studentId={id} />
      <ExamResultsSection studentId={id} />
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <GrowthReportsSection studentId={id} />
      <EssayCoachHistorySection studentId={id} />
      <CoachMemo studentId={id} />
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/students")}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
            <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-sm text-muted-foreground">生徒詳細</p>
          </div>

          {/* 活動ステータス */}
          {(() => {
            if (!lastActivityAt) return <Badge variant="secondary">活動なし</Badge>;
            const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000);
            if (days <= 7) return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">アクティブ</Badge>;
            if (days <= 14) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">やや停滞</Badge>;
            return <Badge className="bg-rose-100 text-rose-800 border-rose-300">非アクティブ（{days}日）</Badge>;
          })()}
        </div>
      </div>

      {/* sticky ブロック: ピン留めサマリ + タブリスト */}
      <Tabs value={tab} onValueChange={handleTabChange} className="flex-col">
        <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <PinnedSummary detail={detail} />
          <TabsList className="mt-3 w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="performance">成績・弱点</TabsTrigger>
            <TabsTrigger value="activity">活動・書類</TabsTrigger>
            <TabsTrigger value="reports">レポート</TabsTrigger>
            <TabsTrigger value="homework">宿題</TabsTrigger>
            {!isTeacherViewer && (
              <TabsTrigger value="messages">メッセージ</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {renderOverviewTab()}
          </motion.div>
        </TabsContent>

        <TabsContent value="performance">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {renderPerformanceTab()}
          </motion.div>
        </TabsContent>

        <TabsContent value="activity">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {renderActivityTab()}
          </motion.div>
        </TabsContent>

        <TabsContent value="reports">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {renderReportsTab()}
          </motion.div>
        </TabsContent>

        <TabsContent value="homework">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <HomeworkStatusSection studentId={id} />
          </motion.div>
        </TabsContent>

        <TabsContent value="messages">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {!isTeacherViewer && (
            <TeacherAssignmentSection
              studentId={id}
              studentName={detail.profile.displayName || "生徒"}
              initialAssignedTeacherIds={detail.profile.assignedTeacherIds}
            />
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Profile Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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
              <HighSchoolSelect
                id="edit-school"
                value={{ schoolId: editSchoolId, schoolName: editSchool }}
                onChange={(v) => {
                  setEditSchool(v.schoolName);
                  setEditSchoolId(v.schoolId);
                }}
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
              <Label htmlFor="edit-sessions">月のセッション回数</Label>
              <Input
                id="edit-sessions"
                type="number"
                min={1}
                max={31}
                step={1}
                value={editSessionsPerMonth}
                onChange={(e) => setEditSessionsPerMonth(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                スケジュールの未配置にこの枚数のカードが出ます（既定1）
              </p>
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

              {/* Original text + インラインコメント */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  元テキスト（ドラッグでコメント可）
                </h3>
                <CommentableEssayText
                  text={essayDetail.ocrText}
                  comments={essayDetail.inlineComments ?? []}
                  mode="edit"
                  onAdd={(range) => addEssayComment(essayDetail.id, range)}
                  onDelete={(cid) => deleteEssayComment(essayDetail.id, cid)}
                  canDelete={(c) =>
                    userProfile?.role !== "teacher" || c.createdBy === user?.uid
                  }
                />
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

      {/* その生徒とのチャット (右下フローティング)。管理者↔生徒 / 講師↔生徒 を role で切替 */}
      {user?.uid &&
        (isTeacherViewer || userProfile?.role === "admin" || userProfile?.role === "superadmin") && (
          <FloatingStudentChat
            studentId={id}
            studentName={profile.displayName || "生徒"}
            studentPhotoURL={profile.photoURL}
            viewerRole={
              isTeacherViewer
                ? "teacher"
                : userProfile?.role === "superadmin"
                  ? "superadmin"
                  : "admin"
            }
            viewerUid={user.uid}
          />
        )}
    </div>
  );
}

export default function AdminStudentDetailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    }>
      <AdminStudentDetailPageInner />
    </Suspense>
  );
}

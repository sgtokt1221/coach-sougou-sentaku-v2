"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  FileText,
  Mic,
  Gauge,
  Lightbulb,
  GraduationCap,
  FolderOpen,
  Award,
  CalendarCheck,
  Bell,
  Settings,
  Crown,
  LogOut,
  ChevronRight,
  Users,
  Database,
  ClipboardList,
  FileBarChart,
  Shield,
  Trophy,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthSWR } from "@/lib/api/swr";
import { signOutUser } from "@/lib/firebase/auth";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import type { SkillCheckStatus } from "@/lib/types/skill-check";
import type { InterviewSkillCheckStatus } from "@/lib/types/interview-skill-check";
import { cn } from "@/lib/utils";

/**
 * スマホ専用のハンバーガー内容。PCサイドバーとは別デザイン。
 *
 * レイアウト:
 *   1. ユーザーヘッダー（アバター大、名前、プラン、ランクバッジ小）
 *   2. 主要アクションの 2×N グリッド（大タップカード）
 *   3. 二次リスト（用途別、小タップ）
 *   4. フッター（通知/設定/プラン/ログアウト）
 */

type PrimaryAction = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

type ListItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const studentPrimary: PrimaryAction[] = [
  {
    label: "ダッシュボード",
    href: "/student/dashboard",
    icon: LayoutDashboard,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "成長",
    href: "/student/growth",
    icon: TrendingUp,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "小論文",
    href: "/student/essay/new",
    icon: FileText,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-300",
  },
  {
    label: "面接",
    href: "/student/interview/new",
    icon: Mic,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-300",
  },
  {
    label: "スキル診断",
    href: "/student/skill-check",
    icon: Gauge,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-700 dark:text-amber-300",
  },
  {
    label: "自己分析",
    href: "/student/self-analysis",
    icon: Lightbulb,
    iconBg: "bg-yellow-100 dark:bg-yellow-950/40",
    iconColor: "text-yellow-700 dark:text-yellow-300",
  },
];

const studentSecondary: ListItem[] = [
  { label: "志望校マッチング", href: "/student/universities", icon: GraduationCap },
  { label: "出願書類", href: "/student/documents", icon: FolderOpen },
  { label: "活動実績", href: "/student/activities", icon: Award },
  { label: "面談記録", href: "/student/sessions", icon: CalendarCheck },
  { label: "フィードバック", href: "/student/feedback", icon: MessageSquare },
];

const adminPrimary: PrimaryAction[] = [
  {
    label: "ダッシュボード",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "生徒管理",
    href: "/admin/students",
    icon: Users,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-300",
  },
  {
    label: "アラート",
    href: "/admin/alerts",
    icon: Bell,
    iconBg: "bg-rose-100 dark:bg-rose-950/40",
    iconColor: "text-rose-700 dark:text-rose-300",
  },
  {
    label: "レポート",
    href: "/admin/reports",
    icon: FileBarChart,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
  },
];

const adminSecondary: ListItem[] = [
  { label: "講師管理", href: "/admin/teachers", icon: GraduationCap },
  { label: "大学データ", href: "/admin/universities", icon: Database },
  { label: "セッション", href: "/admin/sessions", icon: ClipboardList },
];

const superadminPrimary: PrimaryAction[] = [
  {
    label: "ダッシュボード",
    href: "/superadmin/dashboard",
    icon: LayoutDashboard,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "管理者一覧",
    href: "/superadmin/admins",
    icon: Shield,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-300",
  },
  {
    label: "生徒一覧",
    href: "/superadmin/students",
    icon: Users,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-300",
  },
  {
    label: "講師一覧",
    href: "/superadmin/teachers",
    icon: GraduationCap,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
  },
];

const superadminSecondary: ListItem[] = [
  { label: "大学データ", href: "/admin/universities", icon: Database },
  { label: "合格者データ", href: "/admin/passed-data", icon: Trophy },
  { label: "分析", href: "/admin/analytics", icon: BarChart3 },
  { label: "Admin View", href: "/admin/dashboard", icon: ExternalLink },
];

const teacherPrimary: PrimaryAction[] = [
  {
    label: "ダッシュボード",
    href: "/teacher/dashboard",
    icon: LayoutDashboard,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "シフト入力",
    href: "/teacher/schedule",
    icon: CalendarCheck,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-300",
  },
  {
    label: "担当生徒",
    href: "/teacher/students",
    icon: Users,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "セッション履歴",
    href: "/teacher/sessions",
    icon: ClipboardList,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-300",
  },
];

export function MobileMenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();

  const role = userProfile?.role ?? "student";
  const primary =
    role === "admin"
      ? adminPrimary
      : role === "superadmin"
        ? superadminPrimary
        : role === "teacher"
          ? teacherPrimary
          : studentPrimary;
  const secondary =
    role === "admin"
      ? adminSecondary
      : role === "superadmin"
        ? superadminSecondary
        : role === "teacher"
          ? []
          : studentSecondary;

  const isStudent = role === "student";
  const { data: skillCheck } = useAuthSWR<SkillCheckStatus>(
    isStudent ? "/api/skill-check/status" : null,
  );
  const { data: interviewSkillCheck } = useAuthSWR<InterviewSkillCheckStatus>(
    isStudent ? "/api/interview-skill-check/status" : null,
  );

  const essayRank = skillCheck?.aggregate?.compositeRank ?? skillCheck?.latestResult?.rank ?? null;
  const interviewRank =
    interviewSkillCheck?.aggregate?.compositeRank ?? interviewSkillCheck?.latestResult?.rank ?? null;

  const initials =
    userProfile?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  const settingsHref =
    role === "admin" || role === "superadmin"
      ? "/admin/settings"
      : role === "teacher"
        ? "/teacher/settings"
        : "/student/settings";
  const notificationsHref =
    role === "admin" || role === "superadmin"
      ? "/admin/settings/notifications"
      : "/student/settings/notifications";

  const roleLabel =
    role === "superadmin"
      ? "Superadmin"
      : role === "admin"
        ? "管理者"
        : role === "teacher"
          ? "講師"
          : userProfile?.plan === "coach"
            ? "コーチプラン"
            : "AI自習プラン";

  return (
    <div className="flex h-full flex-col">
      {/* ユーザーヘッダー */}
      <div className="shrink-0 border-b border-border/50 bg-gradient-to-br from-primary/10 via-background to-background px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage src={user?.photoURL ?? undefined} alt={userProfile?.displayName ?? "User"} />
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {userProfile?.displayName ?? "ユーザー"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {userProfile?.email}
            </p>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              {roleLabel}
            </Badge>
          </div>
        </div>

        {/* 生徒だけ: スキルランクを2つ並列で表示 */}
        {isStudent && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <RankSummary label="小論文" rank={essayRank} href="/student/skill-check" onNavigate={onNavigate} />
            <RankSummary label="面接" rank={interviewRank} href="/student/interview-skill-check" onNavigate={onNavigate} />
          </div>
        )}
      </div>

      {/* 主要アクション: 2カラムの大タップカード */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
          主要メニュー
        </p>
        <div className="grid grid-cols-2 gap-2">
          {primary.map((a) => {
            const active = pathname.startsWith(a.href);
            return (
              <Link
                key={a.href}
                href={a.href}
                onClick={onNavigate}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-3 transition-all active:scale-[0.98]",
                  active
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-foreground/20",
                )}
              >
                <div className={cn("flex size-9 items-center justify-center rounded-lg", a.iconBg)}>
                  <a.icon className={cn("size-4", a.iconColor)} />
                </div>
                <span className="text-sm font-medium">{a.label}</span>
              </Link>
            );
          })}
        </div>

        {secondary.length > 0 && (
          <>
            <p className="mt-5 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              その他のメニュー
            </p>
            <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
              {secondary.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      active ? "bg-primary/5 text-primary" : "text-foreground hover:bg-accent/40",
                    )}
                  >
                    <item.icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground/60" />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* フッター: 設定系 + ログアウト */}
      <div className="shrink-0 border-t border-border/50 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1">
          <FooterLink label="通知" href={notificationsHref} icon={Bell} onNavigate={onNavigate} />
          <FooterLink label="設定" href={settingsHref} icon={Settings} onNavigate={onNavigate} />
          {isStudent && (
            <FooterLink label="プラン" href="/student/pricing" icon={Crown} onNavigate={onNavigate} />
          )}
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              void signOutUser();
            }}
            className="flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          >
            <LogOut className="size-4" />
            <span className="text-[10px]">ログアウト</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RankSummary({
  label,
  rank,
  href,
  onNavigate,
}: {
  label: string;
  rank: "S" | "A" | "B" | "C" | "D" | null;
  href: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 transition-all hover:border-foreground/20 active:scale-[0.98]"
    >
      {rank ? (
        <SkillRankBadge rank={rank} size="sm" />
      ) : (
        <div className="flex size-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-[10px] text-muted-foreground">
          未
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold">{rank ?? "診断する"}</p>
      </div>
    </Link>
  );
}

function FooterLink({
  label,
  href,
  icon: Icon,
  onNavigate,
}: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
    >
      <Icon className="size-4" />
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}

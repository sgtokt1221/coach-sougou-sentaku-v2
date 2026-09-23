"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  FileText,
  Mic,
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
  ChevronDown,
  Users,
  Database,
  ClipboardList,
  FileBarChart,
  Shield,
  Trophy,
  BarChart3,
  BookMarked,
  BookOpen,
  Scale,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthSWR } from "@/lib/api/swr";
import { signOutUser } from "@/lib/firebase/auth";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import type { StudentRankResponse } from "@/lib/types/rank";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * スマホ専用のハンバーガー内容。PCサイドバーとは別デザイン。
 *
 * レイアウト:
 *   1. ユーザーヘッダー（アバター大、名前、プラン、ランクバッジ小）
 *   2. 主要アクションの 2×N グリッド（大タップカード）
 *   3. 二次リスト（用途別、小タップ）
 *   4. フッター（通知/設定/プラン/ログアウト）
 */

type ChildItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type PrimaryAction = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  children?: ChildItem[];
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
    children: [
      {
        label: "ネタインプット",
        href: "/student/topic-input",
        icon: BookMarked,
      },
      {
        label: "テーマ・過去問",
        href: "/student/essay/themes",
        icon: BookOpen,
      },
      {
        label: "要約ドリル",
        href: "/student/essay/summary-drill",
        icon: ClipboardList,
      },
      { label: "論理ドリル", href: "/student/essay/logic-drill", icon: Scale },
      {
        label: "ちょこ添削",
        href: "/student/essay/choco",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "面接",
    href: "/student/interview/new",
    icon: Mic,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-300",
    children: [
      {
        label: "ちょこ面接",
        href: "/student/interview/drill",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "自己分析",
    href: "/student/self-analysis",
    icon: Lightbulb,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-700 dark:text-amber-300",
  },
];

const studentSecondary: ListItem[] = [
  { label: "ネタインプット", href: "/student/topic-input", icon: BookMarked },
  { label: "テーマ・過去問", href: "/student/essay/themes", icon: BookOpen },
  {
    label: "要約ドリル",
    href: "/student/essay/summary-drill",
    icon: ClipboardList,
  },
  { label: "論理ドリル", href: "/student/essay/logic-drill", icon: Scale },
  { label: "ちょこ添削", href: "/student/essay/choco", icon: ClipboardList },
  {
    label: "ちょこ面接",
    href: "/student/interview/drill",
    icon: ClipboardList,
  },
  {
    label: "志望校マッチング",
    href: "/student/universities",
    icon: GraduationCap,
  },
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
    label: "通知",
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
  // Admin View（管理者ダッシュボード）は廃止。担当の分離を崩さないため
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
    href: "/teacher/roster",
    icon: Users,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "メッセージ",
    href: "/teacher/students",
    icon: MessageSquare,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-300",
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
  const { data: rank } = useAuthSWR<StudentRankResponse>(
    isStudent ? "/api/student/rank" : null
  );

  const essayRank = rank?.essay.compositeRank ?? null;
  const interviewRank = rank?.interview.compositeRank ?? null;

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
      <div className="border-border/50 from-primary/10 via-background to-background shrink-0 border-b bg-gradient-to-br px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage
              src={user?.photoURL ?? undefined}
              alt={userProfile?.displayName ?? "User"}
            />
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {userProfile?.displayName ?? "ユーザー"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
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
            <RankSummary
              label="小論文"
              rank={essayRank}
              href="/student/growth"
              emptyHref="/student/essay/new"
              onNavigate={onNavigate}
            />
            <RankSummary
              label="面接"
              rank={interviewRank}
              href="/student/growth"
              emptyHref="/student/interview/new"
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>

      {/* 主要アクション: 2カラムの大タップカード + 展開式サブメニュー */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-muted-foreground/60 mb-2 px-1 text-[10px] font-semibold tracking-[0.15em] uppercase">
          主要メニュー
        </p>
        <div className="grid grid-cols-2 gap-2">
          {primary.map((a) => (
            <PrimaryActionCard
              key={a.href}
              action={a}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {secondary.length > 0 && (
          <>
            <p className="text-muted-foreground/60 mt-5 mb-2 px-1 text-[10px] font-semibold tracking-[0.15em] uppercase">
              その他のメニュー
            </p>
            <div className="border-border bg-card divide-border/60 divide-y rounded-xl border">
              {secondary.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      active
                        ? "bg-primary/5 text-primary"
                        : "text-foreground hover:bg-accent/40"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <ChevronRight className="text-muted-foreground/60 size-4" />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* フッター: 設定系 + ログアウト */}
      <div className="border-border/50 shrink-0 border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1">
          <FooterLink
            label="通知"
            href={notificationsHref}
            icon={Bell}
            onNavigate={onNavigate}
          />
          <FooterLink
            label="設定"
            href={settingsHref}
            icon={Settings}
            onNavigate={onNavigate}
          />
          {isStudent && (
            <FooterLink
              label="プラン"
              href="/student/pricing"
              icon={Crown}
              onNavigate={onNavigate}
            />
          )}
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              void signOutUser();
            }}
            className="text-muted-foreground hover:bg-accent/40 hover:text-foreground flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2"
          >
            <LogOut className="size-4" />
            <span className="text-[10px]">ログアウト</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PrimaryActionCard({
  action: a,
  pathname,
  onNavigate,
}: {
  action: PrimaryAction;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasChildren = a.children && a.children.length > 0;
  const [expanded, setExpanded] = useState(hasChildren ?? false);
  const active =
    pathname.startsWith(a.href) ||
    a.children?.some((c) => pathname.startsWith(c.href));

  return (
    <div className="col-span-1 flex flex-col">
      {/* 親カード: 子がある場合はタップで展開、長押し/アイコンで遷移 */}
      <div
        className={cn(
          "flex flex-col gap-2 rounded-xl border p-3 transition-all active:scale-[0.98]",
          active
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-card hover:border-foreground/20"
        )}
      >
        <div className="flex items-start justify-between">
          <Link
            href={a.href}
            onClick={onNavigate}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              a.iconBg
            )}
          >
            <a.icon className={cn("size-4", a.iconColor)} />
          </Link>
          {hasChildren && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:bg-accent/60 flex size-6 items-center justify-center rounded-md transition-colors"
              aria-label={
                expanded ? "サブメニューを閉じる" : "サブメニューを開く"
              }
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </button>
          )}
        </div>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-left"
          >
            <span className="text-sm font-medium">{a.label}</span>
          </button>
        ) : (
          <Link href={a.href} onClick={onNavigate}>
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        )}
      </div>

      {/* 子メニュー展開 */}
      {hasChildren && expanded && (
        <div className="border-border/60 bg-card/50 mt-1 ml-2 space-y-0.5 rounded-lg border p-1">
          {/* 親自体へのリンク */}
          <Link
            href={a.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors",
              pathname.startsWith(a.href) &&
                !a.children?.some((c) => pathname.startsWith(c.href))
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-accent/40"
            )}
          >
            <a.icon className="text-muted-foreground size-3.5" />
            {a.label}
          </Link>
          {a.children!.map((child) => {
            const childActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors",
                  childActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent/40"
                )}
              >
                <child.icon className="text-muted-foreground size-3.5" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RankSummary({
  label,
  rank,
  href,
  emptyHref,
  onNavigate,
}: {
  label: string;
  rank: "S" | "A" | "B" | "C" | "D" | null;
  href: string;
  /** まだ提出が無いときの行き先（小論文なら添削、面接なら模擬面接） */
  emptyHref: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={rank ? href : emptyHref}
      onClick={onNavigate}
      className="border-border bg-background/60 hover:border-foreground/20 flex items-center gap-2 rounded-lg border px-3 py-2 transition-all active:scale-[0.98]"
    >
      {rank ? (
        <SkillRankBadge rank={rank} size="sm" />
      ) : (
        <div className="border-muted-foreground/30 text-muted-foreground flex size-8 items-center justify-center rounded-full border-2 border-dashed text-[10px]">
          未
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
          {label}
        </p>
        <p className="text-xs font-semibold">{rank ?? "提出する"}</p>
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
      className="text-muted-foreground hover:bg-accent/40 hover:text-foreground flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2"
    >
      <Icon className="size-4" />
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}

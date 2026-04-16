"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Mic,
  Menu,
  Plus,
  Gauge,
  FolderOpen,
  Award,
  BookMarked,
  BookOpen,
  ClipboardList,
  Users,
  Bell,
  FileBarChart,
  CalendarCheck,
  Shield,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MobileMenuContent } from "./MobileMenuContent";

/**
 * ボトムナブ（モバイル専用）
 * ロール別にタブを切り替え:
 * - student:    ホーム / 小論文(展開) / Action!(FAB) / 面接(展開) / メニュー
 * - admin:      ホーム / 生徒管理 / アラート / レポート / メニュー
 * - teacher:    ホーム / シフト / 担当生徒 / セッション / メニュー
 * - superadmin: ホーム / 管理者 / 生徒 / 講師 / メニュー
 */

/* ─── 生徒用サブメニュー定義 ─── */

interface SubMenuItem {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const essaySubMenu: SubMenuItem[] = [
  {
    label: "小論文を提出",
    description: "過去問を選んで添削を依頼",
    href: "/student/essay/new",
    icon: FileText,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-300",
  },
  {
    label: "ネタインプット",
    description: "小論文のネタを整理・蓄積",
    href: "/student/topic-input",
    icon: BookMarked,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-700 dark:text-amber-300",
  },
  {
    label: "テーマ・過去問",
    description: "大学別テーマと過去問を確認",
    href: "/student/essay/themes",
    icon: BookOpen,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "要約ドリル",
    description: "要約力を鍛える練習問題",
    href: "/student/essay/summary-drill",
    icon: ClipboardList,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-300",
  },
];

const interviewSubMenu: SubMenuItem[] = [
  {
    label: "面接を始める",
    description: "AIと個人面接の練習",
    href: "/student/interview/new",
    icon: Mic,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-300",
  },
  {
    label: "テーマ別ドリル演習",
    description: "テーマごとに面接を練習",
    href: "/student/interview/drill",
    icon: ClipboardList,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-300",
  },
];

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const quickActions: QuickAction[] = [
  {
    label: "スキル診断",
    description: "小論文・面接のランクを測定",
    href: "/student/skill-check",
    icon: Gauge,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "書類・活動",
    description: "出願書類と活動実績を編集",
    href: "/student/documents",
    icon: FolderOpen,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-700 dark:text-amber-300",
  },
];

/* ─── ロール別タブ定義 ─── */

type TabDef = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminTabs: TabDef[] = [
  { label: "ホーム", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "生徒", href: "/admin/students", icon: Users },
  { label: "アラート", href: "/admin/alerts", icon: Bell },
  { label: "レポート", href: "/admin/reports", icon: FileBarChart },
];

const teacherTabs: TabDef[] = [
  { label: "ホーム", href: "/teacher/dashboard", icon: LayoutDashboard },
  { label: "シフト", href: "/teacher/schedule", icon: CalendarCheck },
  { label: "生徒", href: "/teacher/students", icon: Users },
  { label: "セッション", href: "/teacher/sessions", icon: ClipboardList },
];

const superadminTabs: TabDef[] = [
  { label: "ホーム", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { label: "管理者", href: "/superadmin/admins", icon: Shield },
  { label: "生徒", href: "/superadmin/students", icon: Users },
  { label: "講師", href: "/superadmin/teachers", icon: GraduationCap },
];

export function BottomNav() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const role = userProfile?.role ?? "student";

  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  /* ─── admin / teacher / superadmin: シンプルタブ + メニュー ─── */
  if (role === "admin" || role === "teacher" || role === "superadmin") {
    const tabs =
      role === "admin"
        ? adminTabs
        : role === "teacher"
          ? teacherTabs
          : superadminTabs;

    return (
      <>
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex h-[60px] items-center justify-around px-2">
            {tabs.map(({ label, href, icon: Icon }) => (
              <TabLink
                key={href}
                label={label}
                href={href}
                Icon={Icon}
                active={pathname.startsWith(href)}
              />
            ))}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200",
                menuOpen ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Menu className={cn("size-5 transition-transform duration-200", menuOpen && "scale-105")} />
              <span className="text-[10px] font-medium leading-none">メニュー</span>
            </button>
          </div>
        </nav>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" showCloseButton className="w-[85vw] sm:w-[360px] p-0">
            <MobileMenuContent onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  /* ─── student: 直接リンク + FAB + メニュー ─── */
  const essayActive = pathname.startsWith("/student/essay") || pathname.startsWith("/student/topic-input");
  const interviewActive = pathname.startsWith("/student/interview");

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-[60px] items-center justify-around px-2">
          <TabLink label="ホーム" href="/student/dashboard" Icon={LayoutDashboard} active={pathname.startsWith("/student/dashboard")} />
          <TabLink label="小論文" href="/student/essay/new" Icon={FileText} active={essayActive} />

          {/* 中央 "Action!" ボタン */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label="Action"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200",
              "text-primary",
            )}
          >
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-full",
                "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
                "shadow-[0_4px_14px_rgba(0,0,0,0.15)] ring-2 ring-background",
                "transition-transform duration-200 active:scale-95",
                createOpen && "scale-105",
              )}
            >
              <Plus className="size-5" />
            </span>
            <span className="text-[10px] font-semibold leading-none tracking-wide">Action!</span>
          </button>

          <TabLink label="面接" href="/student/interview/new" Icon={Mic} active={interviewActive} />

          {/* メニュー */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200",
              menuOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className={cn("size-5 transition-transform duration-200", menuOpen && "scale-105")} />
            <span className="text-[10px] font-medium leading-none">メニュー</span>
          </button>
        </div>
      </nav>

      {/* ハンバーガー */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" showCloseButton className="w-[85vw] sm:w-[360px] p-0">
          <MobileMenuContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Action! = クイックアクション bottom sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col p-0"
        >
          <SheetHeader className="shrink-0">
            <SheetTitle>Action!</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {/* 小論文セクション */}
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              小論文
            </p>
            <div className="grid grid-cols-2 gap-3">
              {essaySubMenu.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setCreateOpen(false)}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm active:scale-[0.98]"
                >
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", a.iconBg)}>
                    <a.icon className={cn("size-5", a.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{a.description}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* 面接セクション */}
            <p className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              面接
            </p>
            <div className="grid grid-cols-2 gap-3">
              {interviewSubMenu.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setCreateOpen(false)}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm active:scale-[0.98]"
                >
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", a.iconBg)}>
                    <a.icon className={cn("size-5", a.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{a.description}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* その他セクション */}
            <p className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              その他
            </p>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setCreateOpen(false)}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm active:scale-[0.98]"
                >
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", a.iconBg)}>
                    <a.icon className={cn("size-5", a.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{a.description}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              href="/student/activities"
              onClick={() => setCreateOpen(false)}
              className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-foreground/20 active:scale-[0.99]"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/40">
                <Award className="size-4 text-rose-700 dark:text-rose-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">活動実績を登録</p>
                <p className="text-[11px] text-muted-foreground">部活・コンクール・資格など</p>
              </div>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TabLink({
  label,
  href,
  Icon,
  active,
}: {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-5 transition-transform duration-200", active && "scale-105")} />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

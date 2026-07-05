"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Mic,
  Menu,
  Plus,
  PenLine,
  ChevronRight,
  FolderOpen,
  Award,
  BookMarked,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Users,
  Bell,
  FileBarChart,
  CalendarCheck,
  Shield,
  GraduationCap,
  Lightbulb,
  Compass,
  Sparkles,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthSWR } from "@/lib/api/swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MobileMenuContent } from "./MobileMenuContent";

/**
 * ボトムナブ（モバイル専用）
 * ロール別にタブを切り替え:
 * - student:    ホーム / 成長 / Action!(FAB) / チャット / 宿題
 * - admin:      ホーム / 生徒管理 / アラート / レポート / メニュー
 * - teacher:    ホーム / シフト / 担当生徒 / セッション / メニュー
 * - superadmin: ホーム / 管理者 / 生徒 / 講師 / メニュー
 */

/* ─── 生徒用サブメニュー定義 ─── */

/** Action! 上部の3大アクション（クイックスタート） */
interface PrimaryAction {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** bg-gradient-to-br に続けるグラデclass */
  gradient: string;
}

const primaryActions: PrimaryAction[] = [
  {
    label: "小論文を提出",
    description: "撮影またはテキストでAI添削",
    href: "/student/essay/new",
    icon: FileText,
    gradient: "from-teal-500 to-teal-600",
  },
  {
    label: "面接を始める",
    description: "大学別AI面接官と本番形式",
    href: "/student/interview/new",
    icon: Mic,
    gradient: "from-indigo-500 to-indigo-600",
  },
  // 3つ目は自己分析の完了状態で出し分け（コンポーネント内で組み立て）
];

/** Action! 下部のカテゴリ別項目（PC版サイドバー studentNavGroups に準拠） */
interface SheetItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  coachOnly?: boolean;
  researchOnly?: boolean;
}

interface SheetSection {
  title: string;
  subtitle: string;
  items: SheetItem[];
}

const sheetSections: SheetSection[] = [
  {
    title: "Practice",
    subtitle: "練習",
    items: [
      // 小論文講座は WIP のため非公開（公開時にこの行を戻す）
      // { label: "小論文講座", href: "/student/essay/lectures", icon: GraduationCap, iconBg: "bg-indigo-100 dark:bg-indigo-950/40", iconColor: "text-indigo-700 dark:text-indigo-300" },
      { label: "ネタインプット", href: "/student/topic-input", icon: BookMarked, iconBg: "bg-amber-100 dark:bg-amber-950/40", iconColor: "text-amber-700 dark:text-amber-300" },
      { label: "テーマ・過去問", href: "/student/essay/themes", icon: BookOpen, iconBg: "bg-emerald-100 dark:bg-emerald-950/40", iconColor: "text-emerald-700 dark:text-emerald-300" },
      { label: "要約ドリル", href: "/student/essay/summary-drill", icon: ClipboardList, iconBg: "bg-teal-100 dark:bg-teal-950/40", iconColor: "text-teal-700 dark:text-teal-300" },
      { label: "ちょこ添削", href: "/student/essay/choco", icon: ClipboardList, iconBg: "bg-teal-100 dark:bg-teal-950/40", iconColor: "text-teal-700 dark:text-teal-300" },
      { label: "ちょこ面接", href: "/student/interview/drill", icon: ClipboardList, iconBg: "bg-sky-100 dark:bg-sky-950/40", iconColor: "text-sky-700 dark:text-sky-300" },
      { label: "宿題", href: "/student/homework", icon: ClipboardList, iconBg: "bg-rose-100 dark:bg-rose-950/40", iconColor: "text-rose-700 dark:text-rose-300" },
    ],
  },
  {
    title: "Discover",
    subtitle: "探究",
    items: [
      { label: "自己分析", href: "/student/self-analysis", icon: Lightbulb, iconBg: "bg-teal-100 dark:bg-teal-950/40", iconColor: "text-teal-700 dark:text-teal-300" },
      { label: "志望校探索", href: "/student/universities/explore", icon: Compass, iconBg: "bg-sky-100 dark:bg-sky-950/40", iconColor: "text-sky-700 dark:text-sky-300" },
      { label: "活動実績", href: "/student/activities", icon: Award, iconBg: "bg-rose-100 dark:bg-rose-950/40", iconColor: "text-rose-700 dark:text-rose-300" },
      { label: "自己探究", href: "/student/research", icon: Sparkles, iconBg: "bg-indigo-100 dark:bg-indigo-950/40", iconColor: "text-indigo-700 dark:text-indigo-300", researchOnly: true },
    ],
  },
  {
    title: "Prepare",
    subtitle: "出願準備",
    items: [
      { label: "出願書類", href: "/student/documents", icon: FolderOpen, iconBg: "bg-amber-100 dark:bg-amber-950/40", iconColor: "text-amber-700 dark:text-amber-300" },
      { label: "面談記録", href: "/student/sessions", icon: CalendarCheck, iconBg: "bg-emerald-100 dark:bg-emerald-950/40", iconColor: "text-emerald-700 dark:text-emerald-300", coachOnly: true },
    ],
  },
];

const settingsItem: SheetItem = {
  label: "設定",
  href: "/student/settings",
  icon: Settings,
  iconBg: "bg-slate-100 dark:bg-slate-800/60",
  iconColor: "text-slate-700 dark:text-slate-300",
};

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
  { label: "担当生徒", href: "/teacher/roster", icon: Users },
  { label: "メッセージ", href: "/teacher/students", icon: MessageSquare },
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

  // 自己分析の完了状態 (生徒のみ取得)。Action! の3つ目の出し分けに使う。
  const { data: selfAnalysisDoc } = useAuthSWR<{ isComplete?: boolean } | null>(
    role === "student" ? "/api/self-analysis?userId=me" : null,
  );
  const selfAnalysisDone = selfAnalysisDoc?.isComplete === true;

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
          data-app-chrome="bottom-nav"
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

  /* ─── student: ホーム / Action!(FAB) / チャット の3タブ ─── */
  const chatActive = pathname.startsWith("/student/feedback");
  const growthActive = pathname.startsWith("/student/growth");
  const homeworkActive = pathname.startsWith("/student/homework");
  const isCoach = userProfile?.plan === "coach";
  const researchEnrolled =
    (userProfile as { researchEnrolled?: boolean })?.researchEnrolled === true;

  // Action! の3つ目: 自己分析が未完了なら「自己分析」、完了後は「志望理由書を書く」
  const thirdAction: PrimaryAction = selfAnalysisDone
    ? {
        label: "志望理由書を書く",
        description: "AIと一緒に出願書類を作成",
        href: "/student/documents",
        icon: PenLine,
        gradient: "from-amber-500 to-amber-600",
      }
    : {
        label: "自己分析",
        description: "価値観・強みを言語化（まず最初に）",
        href: "/student/self-analysis",
        icon: Lightbulb,
        gradient: "from-amber-500 to-amber-600",
      };
  const actions = [...primaryActions, thirdAction];

  return (
    <>
      <nav
        data-app-chrome="bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-[60px] items-center justify-around px-2">
          <TabLink label="ホーム" href="/student/dashboard" Icon={LayoutDashboard} active={pathname.startsWith("/student/dashboard")} />
          <TabLink label="成長" href="/student/growth" Icon={TrendingUp} active={growthActive} />

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

          <TabLink label="チャット" href="/student/feedback" Icon={MessageSquare} active={chatActive} />
          <TabLink label="宿題" href="/student/homework" Icon={ClipboardList} active={homeworkActive} />
        </div>
      </nav>

      {/* Action! = クイックアクション bottom sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col p-0"
        >
          <SheetHeader className="shrink-0">
            <SheetTitle>何をする？</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {/* 3大アクション（クイックスタート） */}
            <div className="space-y-2.5">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setCreateOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl bg-gradient-to-br p-3.5 text-white transition-transform active:scale-[0.98]",
                    a.gradient,
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white/20">
                    <a.icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold leading-tight">{a.label}</span>
                    <span className="block text-[11px] text-white/85">{a.description}</span>
                  </span>
                  <ChevronRight className="ml-auto size-5 text-white/90" />
                </Link>
              ))}
            </div>

            {/* カテゴリ別（PC版サイドバー準拠） */}
            {sheetSections.map((section) => {
              const items = section.items.filter(
                (it) => (!it.coachOnly || isCoach) && (!it.researchOnly || researchEnrolled),
              );
              if (items.length === 0) return null;
              return (
                <div key={section.title}>
                  <p className="mt-5 mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
                    {section.title}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] tracking-normal text-muted-foreground">
                      {section.subtitle}
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {items.map((it) => (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={() => setCreateOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 transition-all hover:border-foreground/20 active:scale-[0.98]"
                      >
                        <span className={cn("flex size-9 items-center justify-center rounded-lg", it.iconBg)}>
                          <it.icon className={cn("size-[18px]", it.iconColor)} />
                        </span>
                        <span className="text-[12.5px] font-semibold leading-tight">{it.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 設定 */}
            <Link
              href={settingsItem.href}
              onClick={() => setCreateOpen(false)}
              className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-foreground/20 active:scale-[0.99]"
            >
              <span className={cn("flex size-9 items-center justify-center rounded-lg", settingsItem.iconBg)}>
                <settingsItem.icon className={cn("size-[18px]", settingsItem.iconColor)} />
              </span>
              <span className="text-[13px] font-medium">{settingsItem.label}</span>
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
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 rounded-lg transition-all duration-200",
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-muted-foreground",
      )}
    >
      <Icon className={cn(
        "size-5 transition-transform duration-200",
        active ? "text-indigo-600 scale-105" : "",
      )} />
      <span className={cn(
        "max-w-full truncate text-[10px] leading-none",
        active ? "font-semibold" : "font-medium",
      )}>{label}</span>
    </Link>
  );
}

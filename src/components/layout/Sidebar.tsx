"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Mic,
  GraduationCap,
  Settings,
  Users,
  Database,
  Bell,
  BarChart3,
  TrendingUp,
  CalendarCheck,
  ClipboardList,
  FolderOpen,
  Award,
  Trophy,
  Shield,
  ExternalLink,
  Lightbulb,
  BookOpen,
  CalendarDays,
  MessageSquare,
  FileBarChart,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackBadge } from "@/components/student/FeedbackBadge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  coachOnly?: boolean;
  badge?: React.ComponentType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const studentNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "ダッシュボード", href: "/student/dashboard", icon: LayoutDashboard },
      { label: "成長", href: "/student/growth", icon: TrendingUp },
      { label: "フィードバック", href: "/student/feedback", icon: MessageSquare, badge: FeedbackBadge },
    ],
  },
  {
    title: "Practice",
    items: [
      { label: "小論文添削", href: "/student/essay/new", icon: FileText },
      { label: "模擬面接", href: "/student/interview/new", icon: Mic },
      { label: "テーマ・過去問", href: "/student/essay/themes", icon: BookOpen },
    ],
  },
  {
    title: "Discover",
    items: [
      { label: "自己分析", href: "/student/self-analysis", icon: Lightbulb },
      { label: "志望校マッチング", href: "/student/universities", icon: GraduationCap },
    ],
  },
  {
    title: "Prepare",
    items: [
      { label: "出願書類", href: "/student/documents", icon: FolderOpen },
      { label: "活動実績", href: "/student/activities", icon: Award },
      { label: "面談記録", href: "/student/sessions", icon: CalendarCheck, coachOnly: true },
    ],
  },
  {
    title: "",
    items: [
      { label: "プラン", href: "/student/pricing", icon: Crown },
      { label: "通知設定", href: "/student/settings/notifications", icon: Bell },
      { label: "設定", href: "/student/settings", icon: Settings },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "ダッシュボード", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "アラート", href: "/admin/alerts", icon: Bell },
      { label: "レポート", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "生徒管理", href: "/admin/students", icon: Users },
      { label: "講師管理", href: "/admin/teachers", icon: GraduationCap },
      { label: "大学データ", href: "/admin/universities", icon: Database },
      { label: "セッション", href: "/admin/sessions", icon: ClipboardList },
      { label: "スケジュール", href: "/admin/schedule", icon: CalendarDays },
    ],
  },
  {
    title: "",
    items: [
      { label: "通知管理", href: "/admin/settings/notifications", icon: Bell },
      { label: "設定", href: "/admin/settings", icon: Settings },
    ],
  },
];

const superadminNavGroups: NavGroup[] = [
  {
    title: "System",
    items: [
      { label: "ダッシュボード", href: "/superadmin/dashboard", icon: LayoutDashboard },
      { label: "管理者一覧", href: "/superadmin/admins", icon: Shield },
      { label: "講師一覧", href: "/superadmin/teachers", icon: GraduationCap },
      { label: "生徒一覧", href: "/superadmin/students", icon: Users },
    ],
  },
  {
    title: "Data",
    items: [
      { label: "大学データ", href: "/admin/universities", icon: Database },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "合格者データ", href: "/admin/passed-data", icon: Trophy },
      { label: "分析", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "",
    items: [
      { label: "Admin View", href: "/admin/dashboard", icon: ExternalLink },
    ],
  },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname.startsWith(item.href);
  const Badge = item.badge;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 cubic-bezier(0.4, 0, 0.2, 1)",
        isActive
          ? "nav-active-indicator bg-gradient-to-r from-sidebar-accent to-sidebar-accent/80 text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5"
      )}
    >
      <item.icon
        className={cn(
          "size-[18px] transition-all duration-150",
          isActive
            ? "text-sidebar-primary drop-shadow-sm"
            : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 group-hover:translate-x-0.5"
        )}
      />
      {item.label}
      {Badge && <Badge />}
    </Link>
  );
}

// superadminナビからリンクされている/admin/*パス
// これらにいる時はsuperadminナビを維持する
const superadminLinkedAdminPaths = superadminNavGroups
  .flatMap((g) => g.items)
  .filter((item) => item.href.startsWith("/admin"))
  .map((item) => item.href);

function getSuperadminNavGroups(pathname: string) {
  // superadminナビにリンクされている/admin/*パスではsuperadminナビを維持
  const isSuperadminLinkedPath = superadminLinkedAdminPaths.some((p) =>
    pathname.startsWith(p)
  );
  if (isSuperadminLinkedPath || !pathname.startsWith("/admin")) {
    return superadminNavGroups;
  }
  // /admin/dashboard等の純粋なAdmin Viewではadminナビを表示
  return adminNavGroups;
}

function filterNavByPlan(groups: NavGroup[], plan: string | undefined): NavGroup[] {
  const isCoach = plan === "coach";
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.coachOnly || isCoach),
    }))
    .filter((g) => g.items.length > 0);
}

export function Sidebar() {
  const pathname = usePathname();
  const { userProfile } = useAuth();

  const navGroups = (() => {
    if (userProfile?.role === "superadmin") {
      return getSuperadminNavGroups(pathname);
    }
    if (userProfile?.role === "admin" || userProfile?.role === "teacher") return adminNavGroups;
    return filterNavByPlan(studentNavGroups, userProfile?.plan);
  })();

  return (
    <aside className="hidden h-full w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-5 hover:bg-sidebar-accent/10 transition-all duration-200 group">
        <Link href="/" className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.svg" alt="coach for 総合型選抜" className="h-10 group-hover:drop-shadow-sm transition-all duration-200" />
          <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sidebar-primary/20 to-transparent opacity-60"></div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && group.title && (
                <div className="mb-4 h-px bg-gradient-to-r from-sidebar-border/20 via-sidebar-border/50 to-sidebar-border/20"></div>
              )}
              {group.title && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/35 letter-spacing-wide">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="relative border-t border-sidebar-border">
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-sidebar/50 pointer-events-none"></div>
        <div className="px-4 py-3 space-y-2">
          {userProfile && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-primary text-[10px] font-medium text-sidebar-primary-foreground">
                {userProfile.displayName?.charAt(0)?.toUpperCase() || userProfile.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-sidebar-foreground/70 truncate">
                  {userProfile.displayName || userProfile.email}
                </p>
                {userProfile.role && (
                  <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-sidebar-accent/50 text-sidebar-foreground/60 rounded">
                    {userProfile.role}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-sidebar-foreground/20 tracking-wide">
                v1.0
              </p>
            </div>
          )}
          {!userProfile && (
            <p className="text-[10px] text-sidebar-foreground/25 text-center tracking-wide">
              coach for 総合型選抜 v1.0
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

export function SidebarContent() {
  const pathname = usePathname();
  const { userProfile } = useAuth();

  const navGroups = (() => {
    if (userProfile?.role === "superadmin") {
      return getSuperadminNavGroups(pathname);
    }
    if (userProfile?.role === "admin" || userProfile?.role === "teacher") return adminNavGroups;
    return filterNavByPlan(studentNavGroups, userProfile?.plan);
  })();

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-4 shrink-0">
        <div className="mb-5 px-3 hover:bg-accent/10 transition-all duration-200 group rounded-lg">
          <Link href="/" className="relative block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-dark.svg" alt="coach for 総合型選抜" className="h-10 group-hover:drop-shadow-sm transition-all duration-200 hidden dark:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="coach for 総合型選抜" className="h-10 group-hover:drop-shadow-sm transition-all duration-200 dark:hidden" />
            <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-60"></div>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-6">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && group.title && (
                <div className="mb-4 h-px bg-gradient-to-r from-border/20 via-border/50 to-border/20"></div>
              )}
              {group.title && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/35 letter-spacing-wide">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Badge = item.badge;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 cubic-bezier(0.4, 0, 0.2, 1)",
                        isActive
                          ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground hover:translate-x-0.5"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-[18px] transition-all duration-150",
                          isActive
                            ? "drop-shadow-sm"
                            : "group-hover:translate-x-0.5"
                        )}
                      />
                      {item.label}
                      {Badge && <Badge />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative border-t mt-auto">
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-background/50 pointer-events-none"></div>
        <div className="px-4 py-3 space-y-2">
          {userProfile && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {userProfile.displayName?.charAt(0)?.toUpperCase() || userProfile.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground/70 truncate">
                  {userProfile.displayName || userProfile.email}
                </p>
                {userProfile.role && (
                  <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-accent/50 text-muted-foreground rounded">
                    {userProfile.role}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground/40 tracking-wide">
                v1.0
              </p>
            </div>
          )}
          {!userProfile && (
            <p className="text-[10px] text-muted-foreground/40 text-center tracking-wide">
              coach for 総合型選抜 v1.0
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

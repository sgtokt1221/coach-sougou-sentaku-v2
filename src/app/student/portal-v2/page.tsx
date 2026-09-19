"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TargetUniversityCards } from "@/components/dashboard/TargetUniversityCards";
import type { StudentProfile } from "@/lib/types/user";
import { useAuthSWR } from "@/lib/api/swr";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { WeaknessReminderBanner } from "@/components/growth/WeaknessReminderBanner";
import { ScoresTrendChart } from "@/components/growth/ScoresTrendChart";
import { CountUp } from "@/components/shared/CountUp";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Mic,
  FolderOpen,
  ArrowUpRight,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizedEssayTotal } from "@/lib/types/essay";

interface EssayHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  submittedAt: string;
  scores: { total: number };
  /** 合計の満点。口頭試問型は60。旧データは無し（=50） */
  scoreMaximum?: number;
}

interface TrendDataPoint {
  date: string;
  total: number;
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  responsiveness: number;
}

const quickActions = [
  {
    label: "NEW ESSAY_ ",
    href: "/student/essay/new",
    icon: FileText,
    accent: "bg-rose-500",
    textAccent: "group-hover:text-rose-500",
  },
  {
    label: "MOCK INTERVIEW_ ",
    href: "/student/interview/new",
    icon: Mic,
    accent: "bg-lime-500",
    textAccent: "group-hover:text-lime-500",
  },
  {
    label: "DOCUMENTS_ ",
    href: "/student/documents",
    icon: FolderOpen,
    accent: "bg-sky-500",
    textAccent: "group-hover:text-sky-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export default function StudentPortalV2() {
  const { userProfile } = useAuth();
  const studentProfile = userProfile as StudentProfile | null;
  const targetUniversities = studentProfile?.targetUniversities ?? [];

  const hour = new Date().getHours();
  // We use English mostly to fit the typographic brutalism, mixed with sharp Japanese.
  const timePeriod =
    hour < 12 ? "MORNING" : hour < 18 ? "AFTERNOON" : "EVENING";
  const userName = studentProfile?.displayName || "STUDENT";

  const { data: essayData, isLoading: loadingHistory } = useAuthSWR<{
    essays: EssayHistoryItem[];
  }>("/api/essay/history?userId=current");
  const loadingTrend = loadingHistory;

  const history = (essayData?.essays ?? []).slice(0, 3);
  const rawTrend = (essayData?.essays ?? [])
    .filter((e) => e.scores)
    .map((e) => ({
      date: e.submittedAt.slice(5).replace("-", "/"),
      // 満点の違う答案を同じ線に混ぜない（口頭試問型は60点満点）
      total: normalizedEssayTotal(e.scores.total, e.scoreMaximum),
      structure: 0,
      logic: 0,
      expression: 0,
      apAlignment: 0,
      responsiveness: 0,
    }));

  const trendData = rawTrend;
  const latestScore =
    trendData.length > 0 ? trendData[trendData.length - 1].total : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] font-sans text-white selection:bg-rose-500 selection:text-white">
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-white/10 bg-[#050505]/70 p-6 backdrop-blur-md md:px-12"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-none bg-rose-500" />
          <span className="text-sm font-bold tracking-tighter uppercase">
            Coach System V.2
          </span>
        </div>
        <div className="font-mono text-xs text-white/50">
          {timePeriod} PROTOCOL ACTVATED
        </div>
      </motion.nav>

      {/* Extreme Typographic Hero */}
      <section className="relative flex flex-col items-start border-b border-white/10 px-6 pt-20 pb-16 md:px-12 md:pt-32 md:pb-24">
        <div className="pointer-events-none absolute top-0 right-0 h-[600px] w-[600px] translate-x-1/4 -translate-y-1/2 rounded-full bg-rose-500/10 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="mb-4 bg-gradient-to-br from-white via-white/80 to-white/20 bg-clip-text text-[12vw] leading-[0.85] font-black tracking-tighter text-transparent uppercase">
            HELLO_
            <br />
            <span className="text-white drop-shadow-lg">{userName}</span>
          </h1>
          <p className="mt-8 max-w-xl border-l-2 border-rose-500 pl-4 text-lg font-light text-white/60 md:text-xl">
            最新の学習状況が同期されました。志望校合格へ向けた次なるアクションを選択してください。
          </p>
        </motion.div>
      </section>

      <motion.div
        className="px-6 py-8 md:px-12"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <NotificationPermissionBanner />
      </motion.div>

      {/* Action Triggers - Broken Grid */}
      <section className="relative grid grid-cols-1 gap-8 border-b border-white/10 px-6 py-12 md:grid-cols-12 md:gap-16 md:px-12 md:py-24">
        <div className="flex flex-col justify-between md:col-span-4">
          <div>
            <h2 className="mb-2 font-mono text-sm tracking-widest text-white/40 uppercase">
              01 // OPERATIONS
            </h2>
            <p className="text-2xl leading-tight font-light">
              YOUR <br />
              NEXT <br />
              <span className="mt-2 flex items-center gap-2 font-bold text-white italic">
                MOVES <Zap className="h-5 w-5 text-rose-500" />
              </span>
            </p>
          </div>

          <div className="mt-8 hidden md:block">
            <div
              className="rotate-180 font-mono text-xs text-white/20"
              style={{ writingMode: "vertical-rl" }}
            >
              SELECT_OPERATION_TO_PROCEED
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-8 md:gap-6 lg:grid-cols-3">
          <AnimatePresence>
            {quickActions.map((action, i) => (
              <motion.div key={action.href} variants={itemVariants}>
                <Link href={action.href}>
                  <div className="group relative flex h-40 flex-col justify-between overflow-hidden border border-white/10 bg-white/5 p-6 transition-all duration-500 hover:border-white/40 hover:bg-white/10 md:h-56">
                    <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl transition-colors group-hover:bg-white/10" />

                    <div className="relative z-10 flex items-start justify-between">
                      <div
                        className={`h-2 w-2 ${action.accent} transition-transform duration-300 group-hover:scale-150`}
                      />
                      <ArrowUpRight className="h-5 w-5 text-white/30 transition-colors group-hover:text-white" />
                    </div>

                    <div className="relative z-10">
                      <action.icon className="mb-4 h-6 w-6 origin-bottom-left text-white/50 transition-transform group-hover:scale-110" />
                      <span
                        className={`flex items-center gap-2 text-xl font-bold tracking-tight ${action.textAccent} transition-colors`}
                      >
                        {action.label}
                      </span>
                    </div>

                    {/* Brutalist underline effect */}
                    <div className="absolute bottom-0 left-0 h-1 w-0 bg-white transition-all duration-500 ease-out group-hover:w-full" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Target Universities & Weakness */}
      <section className="relative grid grid-cols-1 gap-12 border-b border-white/10 px-6 py-12 md:px-12 md:py-24 lg:grid-cols-2">
        {/* Decorative Grid Lines */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="relative z-10 space-y-6"
        >
          <h2 className="font-mono text-sm tracking-widest text-white/40 uppercase">
            02 // TARGETS
          </h2>

          <div className="relative rounded-none border border-white/10 bg-black/50 p-1 shadow-2xl backdrop-blur-md">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-transparent opacity-20 blur" />
            <div className="relative h-full bg-black">
              {/* We utilize existing component but within our brutalist wrapper. Forced light mode simulation internally or handled via pure CSS overrides if necessary */}
              <div className="flex min-h-[200px] items-center p-4 opacity-90">
                <TargetUniversityCards
                  targetUniversities={targetUniversities}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="relative z-10 space-y-6"
        >
          <h2 className="font-mono text-sm tracking-widest text-white/40 uppercase">
            03 // ALERTS
          </h2>

          <div className="relative w-full">
            <div className="absolute inset-0 bg-rose-500/10 mix-blend-screen blur-xl" />
            <div className="relative flex min-h-[200px] items-center justify-center border border-white/20 bg-black p-2 shadow-2xl">
              {/* Wraps weakness banner inside a high contrast box */}
              <WeaknessReminderBanner />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Analytics Grid */}
      <section className="relative border-b border-white/10 px-6 py-12 md:px-12 md:py-24">
        <h2 className="mb-12 font-mono text-sm tracking-widest text-white/40 uppercase">
          04 // ANALYTICS_
        </h2>

        <div className="grid grid-cols-1 gap-8 md:gap-16 lg:grid-cols-12">
          {/* Trend Chart Area: Col span 8 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex flex-col overflow-hidden border border-white/10 bg-white/5 p-6 md:p-8 lg:col-span-8"
          >
            <div className="absolute top-0 right-0 border-b border-l border-white/10 bg-white/10 px-4 py-1 font-mono text-xs">
              SCORE_TRAJECTORY
            </div>

            <div className="mb-8 flex items-end gap-4 pt-4">
              <h3 className="text-2xl font-light tracking-tight uppercase lg:text-4xl">
                Performance
                <br />
                Trend
              </h3>
              {latestScore && (
                <div className="mb-2 flex items-center gap-2 bg-white px-3 py-1 font-mono text-sm font-bold text-black">
                  LATEST: {latestScore} <ArrowUpRight className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="h-[300px] w-full border border-white/5 bg-black/20 p-4 opacity-90 mix-blend-screen lg:h-[400px]">
              {loadingTrend ? (
                <Skeleton className="h-full w-full bg-white/10" />
              ) : (
                <ScoresTrendChart data={trendData} />
              )}
            </div>
          </motion.div>

          {/* Recent Essays */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col lg:col-span-4"
          >
            <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-2xl font-light tracking-tight uppercase">
                Recent
                <br />
                Feedback
              </h3>
              <Link
                href="/student/essay/history"
                className="flex h-12 w-12 items-center justify-center rounded-none border border-white/20 transition-all hover:bg-white hover:text-black"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="flex-1 space-y-4">
              {loadingHistory ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      className="h-20 w-full rounded-none bg-white/10"
                    />
                  ))}
                </div>
              ) : (
                history.map((item, index) => (
                  <Link key={item.id} href={`/student/essay/${item.id}`}>
                    <motion.div
                      whileHover={{
                        x: 10,
                        backgroundColor: "rgba(255,255,255,0.1)",
                      }}
                      className="group flex flex-col justify-between gap-4 border border-white/10 bg-black p-5 transition-all duration-300 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="bg-white px-1 font-mono text-xs tracking-wider text-black">
                            #{index + 1}
                          </span>
                          <span className="text-xs text-white/50">
                            {item.submittedAt}
                          </span>
                        </div>
                        <p className="truncate text-base font-medium tracking-tight text-white uppercase">
                          {item.universityName}{" "}
                          <span className="ml-2 opacity-50">
                            {item.facultyName}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="bg-gradient-to-br from-white to-white/50 bg-clip-text text-4xl font-black tracking-tighter text-transparent tabular-nums">
                          <CountUp value={item.scores.total} duration={0.6} />
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>

            {history.length === 0 && !loadingHistory && (
              <div className="flex flex-1 items-center justify-center border border-dashed border-white/20 p-8 text-center text-sm font-light text-white/40 italic">
                No recent feedback available.
                <br />
                Submit your first essay to begin analysis.
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 py-12 font-mono text-xs text-white/30 md:px-12">
        <div>COACH SYSTEM BY SOUGOU SENTAKU</div>
        <div className="flex items-center gap-2">
          <span>V2.0.0 // INTERNAL.CONFIDENTIAL</span>
        </div>
      </footer>
    </div>
  );
}

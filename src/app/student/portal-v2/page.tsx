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
import { FileText, Mic, FolderOpen, ArrowUpRight, ArrowRight, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EssayHistoryItem {
  id: string;
  universityName: string;
  facultyName: string;
  submittedAt: string;
  scores: { total: number };
}

interface TrendDataPoint {
  date: string;
  total: number;
  structure: number;
  logic: number;
  expression: number;
  apAlignment: number;
  originality: number;
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
  const timePeriod = hour < 12 ? "MORNING" : hour < 18 ? "AFTERNOON" : "EVENING";
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
      total: e.scores.total,
      structure: 0,
      logic: 0,
      expression: 0,
      apAlignment: 0,
      originality: 0,
    }));
  
  const trendData = rawTrend;
  const latestScore = trendData.length > 0 ? trendData[trendData.length - 1].total : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500 selection:text-white font-sans overflow-x-hidden">
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex items-center justify-between p-6 md:px-12 border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-[#050505]/70"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-rose-500 rounded-none animate-pulse" />
          <span className="font-bold tracking-tighter text-sm uppercase">Coach System V.2</span>
        </div>
        <div className="text-xs font-mono text-white/50">{timePeriod} PROTOCOL ACTVATED</div>
      </motion.nav>

      {/* Extreme Typographic Hero */}
      <section className="relative px-6 md:px-12 pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-start border-b border-white/10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />
        
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[12vw] leading-[0.85] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/20 uppercase mb-4">
            HELLO_
            <br />
            <span className="text-white drop-shadow-lg">{userName}</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 font-light max-w-xl border-l-2 border-rose-500 pl-4 mt-8">
            最新の学習状況が同期されました。志望校合格へ向けた次なるアクションを選択してください。
          </p>
        </motion.div>
      </section>

      <motion.div 
        className="px-6 md:px-12 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <NotificationPermissionBanner />
      </motion.div>

      {/* Action Triggers - Broken Grid */}
      <section className="px-6 md:px-12 py-12 md:py-24 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 border-b border-white/10 relative">
        <div className="md:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm tracking-widest uppercase text-white/40 mb-2 font-mono">01 // OPERATIONS</h2>
            <p className="text-2xl font-light leading-tight">
              YOUR <br />
              NEXT <br />
              <span className="font-bold italic text-white flex items-center gap-2 mt-2">
                MOVES <Zap className="w-5 h-5 text-rose-500" />
              </span>
            </p>
          </div>
          
          <div className="hidden md:block mt-8">
            <div className="text-xs text-white/20 font-mono rotate-180" style={{ writingMode: 'vertical-rl' }}>
              SELECT_OPERATION_TO_PROCEED
            </div>
          </div>
        </div>

        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AnimatePresence>
            {quickActions.map((action, i) => (
              <motion.div key={action.href} variants={itemVariants}>
                <Link href={action.href}>
                  <div className="group relative h-40 md:h-56 border border-white/10 bg-white/5 p-6 flex flex-col justify-between overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors" />
                    
                    <div className="relative z-10 flex justify-between items-start">
                      <div className={`w-2 h-2 ${action.accent} transition-transform duration-300 group-hover:scale-150`} />
                      <ArrowUpRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
                    </div>
                    
                    <div className="relative z-10">
                      <action.icon className="w-6 h-6 text-white/50 mb-4 group-hover:scale-110 transition-transform origin-bottom-left" />
                      <span className={`text-xl font-bold tracking-tight flex items-center gap-2 ${action.textAccent} transition-colors`}>
                        {action.label}
                      </span>
                    </div>
                    
                    {/* Brutalist underline effect */}
                    <div className="absolute bottom-0 left-0 h-1 w-0 bg-white group-hover:w-full transition-all duration-500 ease-out" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Target Universities & Weakness */}
      <section className="px-6 md:px-12 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 border-b border-white/10 relative">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="space-y-6 relative z-10">
          <h2 className="text-sm tracking-widest uppercase text-white/40 font-mono">02 // TARGETS</h2>
          
          <div className="p-1 border border-white/10 bg-black/50 backdrop-blur-md rounded-none shadow-2xl relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-transparent blur opacity-20" />
            <div className="relative bg-black h-full">
              {/* We utilize existing component but within our brutalist wrapper. Forced light mode simulation internally or handled via pure CSS overrides if necessary */}
               <div className="opacity-90 min-h-[200px] flex items-center p-4">
                 <TargetUniversityCards targetUniversities={targetUniversities} />
               </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="space-y-6 relative z-10">
          <h2 className="text-sm tracking-widest uppercase text-white/40 font-mono">03 // ALERTS</h2>
          
          <div className="w-full relative">
            <div className="absolute inset-0 bg-rose-500/10 blur-xl mix-blend-screen" />
            <div className="relative border border-white/20 bg-black shadow-2xl min-h-[200px] p-2 flex items-center justify-center">
              {/* Wraps weakness banner inside a high contrast box */}
               <WeaknessReminderBanner />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Analytics Grid */}
      <section className="px-6 md:px-12 py-12 md:py-24 border-b border-white/10 relative">
        <h2 className="text-sm tracking-widest uppercase text-white/40 font-mono mb-12">04 // ANALYTICS_</h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16">
          {/* Trend Chart Area: Col span 8 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-8 border border-white/10 bg-white/5 p-6 md:p-8 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-4 py-1 bg-white/10 text-xs font-mono border-b border-l border-white/10">
              SCORE_TRAJECTORY
            </div>
            
            <div className="flex items-end gap-4 mb-8 pt-4">
              <h3 className="text-2xl lg:text-4xl font-light uppercase tracking-tight">Performance<br/>Trend</h3>
              {latestScore && (
                <div className="mb-2 bg-white text-black px-3 py-1 font-mono text-sm font-bold flex items-center gap-2">
                  LATEST: {latestScore} <ArrowUpRight className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div className="h-[300px] lg:h-[400px] w-full mix-blend-screen opacity-90 p-4 bg-black/20 border border-white/5">
              {loadingTrend ? (
                <Skeleton className="w-full h-full bg-white/10" />
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
            className="lg:col-span-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
              <h3 className="text-2xl font-light uppercase tracking-tight">Recent<br/>Feedback</h3>
              <Link href="/student/essay/history" className="w-12 h-12 flex items-center justify-center border border-white/20 rounded-none hover:bg-white hover:text-black transition-all">
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="space-y-4 flex-1">
              {loadingHistory ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-white/10 rounded-none" />)}
                </div>
              ) : (
                history.map((item, index) => (
                  <Link key={item.id} href={`/student/essay/${item.id}`}>
                    <motion.div 
                      whileHover={{ x: 10, backgroundColor: "rgba(255,255,255,0.1)" }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-white/10 bg-black transition-all duration-300 gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-white text-black px-1 font-mono tracking-wider">#{index + 1}</span>
                          <span className="text-xs text-white/50">{item.submittedAt}</span>
                        </div>
                        <p className="text-base font-medium truncate text-white uppercase tracking-tight">
                          {item.universityName} <span className="opacity-50 ml-2">{item.facultyName}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-4xl font-black tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
                          <CountUp value={item.scores.total} duration={0.6} />
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
            
            {(history.length === 0 && !loadingHistory) && (
              <div className="flex-1 flex items-center justify-center border border-dashed border-white/20 p-8 text-center text-white/40 text-sm italic font-light">
                No recent feedback available.<br/>Submit your first essay to begin analysis.
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-12 flex items-center justify-between text-xs text-white/30 font-mono">
        <div>COACH SYSTEM BY SOUGOU SENTAKU</div>
        <div className="flex items-center gap-2">
          <span>V2.0.0 // INTERNAL.CONFIDENTIAL</span>
        </div>
      </footer>
    </div>
  );
}

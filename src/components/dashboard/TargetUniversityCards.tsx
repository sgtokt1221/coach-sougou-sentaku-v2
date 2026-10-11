"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  CalendarClock,
  ArrowRight,
  Settings,
  Trophy,
  FileEdit,
  ScrollText,
  ChevronDown,
} from "lucide-react";

interface ResolvedUniversity {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  admissionPolicy?: string;
  schedule?: {
    applicationStart: string;
    applicationEnd: string;
    examDate: string;
    resultDate: string;
  };
  /** 前年度の入試日程（今年度が未発表のときの参考表示用） */
  scheduleLastYear?: {
    applicationStart: string;
    applicationEnd: string;
    examDate: string;
    resultDate: string;
  };
}

/** ISO 日付(YYYY-MM-DD)を和暦無しの日本語表記に。無ければ「—」。 */
function formatScheduleDate(d?: string): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 「昨年: 2025/10/19」用の短縮日付（カード幅に収めるため数字表記）。 */
function formatLastYearDate(d?: string): string {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 入試日程1項目の表示文字列を決める。
 * - 今年度の値あり → その日付
 * - 今年度が空 & 前年度あり → 「未発表（昨年: X）」
 * - どちらも空 → 「未発表」
 */
function resolveScheduleCell(current?: string, lastYear?: string): string {
  if (current) return formatScheduleDate(current);
  if (lastYear) return `未発表（昨年: ${formatLastYearDate(lastYear)}）`;
  return "未発表";
}

/** 展開部の入試日程4項目（出願開始/締切/試験日/合格発表）。 */
function scheduleRows(
  schedule?: ResolvedUniversity["schedule"],
  scheduleLastYear?: ResolvedUniversity["scheduleLastYear"]
) {
  return [
    {
      label: "出願開始",
      date: resolveScheduleCell(
        schedule?.applicationStart,
        scheduleLastYear?.applicationStart
      ),
      icon: FileEdit,
    },
    {
      label: "出願締切",
      date: resolveScheduleCell(
        schedule?.applicationEnd,
        scheduleLastYear?.applicationEnd
      ),
      icon: ScrollText,
    },
    {
      label: "試験日",
      date: resolveScheduleCell(schedule?.examDate, scheduleLastYear?.examDate),
      icon: CalendarClock,
    },
    {
      label: "合格発表",
      date: resolveScheduleCell(
        schedule?.resultDate,
        scheduleLastYear?.resultDate
      ),
      icon: Trophy,
    },
  ];
}

interface EventInfo {
  type: string;
  date: string;
  daysLeft: number;
  icon: React.ComponentType<{ className?: string }>;
}

function getNextEvent(
  schedule: ResolvedUniversity["schedule"]
): EventInfo | null {
  if (!schedule) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events: {
    type: string;
    date: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { type: "出願開始", date: schedule.applicationStart, icon: FileEdit },
    { type: "出願締切", date: schedule.applicationEnd, icon: ScrollText },
    { type: "試験日", date: schedule.examDate, icon: CalendarClock },
    { type: "合格発表", date: schedule.resultDate, icon: Trophy },
  ].filter((ev) => ev.date);

  for (const ev of events) {
    const target = new Date(ev.date + "T00:00:00");
    const daysLeft = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft >= 0) {
      return { ...ev, daysLeft };
    }
  }
  return null;
}

/**
 * カウントダウンの見た目を日数によって切り替える。
 * 7日以内: 赤、30日以内: 橙、それ以上: 青緑 (teal)
 */
function countdownStyle(daysLeft: number): {
  bg: string;
  text: string;
  ring: string;
  label?: string;
} {
  if (daysLeft === 0) {
    return {
      bg: "from-rose-500 to-rose-600",
      text: "text-white",
      ring: "ring-rose-300/60",
      label: "本日",
    };
  }
  if (daysLeft <= 7) {
    return {
      bg: "from-rose-500 to-rose-600",
      text: "text-white",
      ring: "ring-rose-300/60",
      label: "締切間近",
    };
  }
  if (daysLeft <= 30) {
    return {
      bg: "from-amber-400 to-amber-500",
      text: "text-white",
      ring: "ring-amber-300/60",
    };
  }
  return {
    bg: "from-teal-500 to-emerald-600",
    text: "text-white",
    ring: "ring-teal-300/60",
  };
}

interface Props {
  targetUniversities: string[];
  /** compact 版: 横スクロール chip 形式で密度を上げる */
  compact?: boolean;
}

export function TargetUniversityCards({
  targetUniversities,
  compact = false,
}: Props) {
  const [resolved, setResolved] = useState<ResolvedUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  /** 展開中のカード（compound id）。null は全て折りたたみ。 */
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    if (targetUniversities.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchResolved() {
      try {
        const res = await fetch(
          `/api/universities/resolve?ids=${targetUniversities.join(",")}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResolved(data.resolved ?? []);
      } catch {
        setResolved([]);
      } finally {
        setLoading(false);
      }
    }
    fetchResolved();
  }, [targetUniversities]);

  if (loading) {
    if (compact) {
      return (
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-[70px] w-[180px] shrink-0 rounded-xl"
            />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-5">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-3xl lg:h-56" />
        ))}
      </div>
    );
  }

  if (targetUniversities.length === 0) {
    if (compact) {
      return (
        <Link href="/student/settings" className="block">
          <div className="border-border text-muted-foreground hover:border-primary/50 flex items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm transition-colors">
            <GraduationCap className="size-4" />
            志望校を設定
            <Settings className="ml-auto size-3.5" />
          </div>
        </Link>
      );
    }
    return (
      <Link href="/student/settings">
        <Card className="hover:border-primary/50 cursor-pointer border-dashed transition-colors">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <GraduationCap className="text-muted-foreground size-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">志望校を設定しましょう</p>
              <p className="text-muted-foreground text-sm">
                志望校を設定すると、カウントダウンやスケジュールが表示されます
              </p>
            </div>
            <Settings className="text-muted-foreground size-5" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  if (compact) {
    return (
      <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {resolved.map((item) => {
          const nextEvent = getNextEvent(item.schedule);
          const cd = nextEvent ? countdownStyle(nextEvent.daysLeft) : null;
          return (
            <Link
              key={`${item.universityId}:${item.facultyId}`}
              href={`/student/universities/${item.universityId}/${item.facultyId}`}
              className="group shrink-0 snap-start"
            >
              <div className="border-border/60 bg-card hover:border-primary/40 flex min-w-[180px] items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors">
                <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <GraduationCap className="text-primary size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-tight font-semibold">
                    {item.universityName}
                  </p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {item.facultyName}
                  </p>
                </div>
                {nextEvent && cd ? (
                  <div
                    className={`flex flex-col items-center rounded-lg bg-gradient-to-br ${cd.bg} ${cd.text} min-w-[48px] shrink-0 px-2 py-1`}
                  >
                    <span className="text-[9px] leading-none font-bold uppercase opacity-90">
                      {nextEvent.type.slice(0, 2)}
                    </span>
                    <span className="text-base leading-tight font-black tabular-nums">
                      {nextEvent.daysLeft === 0
                        ? "本日"
                        : `${nextEvent.daysLeft}日`}
                    </span>
                  </div>
                ) : (
                  <Trophy className="text-muted-foreground size-4 shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  /**
   * 1校なら横いっぱいに出す。複数校はスマホでは横にスワイプ（縦に積むと
   * 1枚が画面の半分近くあり、スキルや弱点がずっと下に押し出される）。
   * PC は縦に積む（ダッシュボードでは横幅の2/3の列に入るので、2列にすると
   * 大学名が1文字ずつ折り返す）。
   */
  const multiple = resolved.length > 1;
  return (
    <div
      className={
        multiple
          ? "-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 lg:mx-0 lg:grid lg:grid-cols-1 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0"
          : "grid grid-cols-1"
      }
    >
      {resolved.map((item) => {
        const key = `${item.universityId}:${item.facultyId}`;
        const nextEvent = getNextEvent(item.schedule);
        const cd = nextEvent ? countdownStyle(nextEvent.daysLeft) : null;
        const NextIcon = nextEvent?.icon ?? CalendarClock;
        const isOpen = expandedKey === key;
        const detailHref = `/student/universities/${item.universityId}/${item.facultyId}`;

        return (
          <Card
            key={key}
            className={`border-border/60 relative overflow-hidden rounded-3xl transition-all duration-300 ${multiple ? "w-[85%] shrink-0 snap-start lg:w-auto" : ""}`}
          >
            {/* 背景の装飾グラデーション */}
            <div className="from-primary/[0.03] to-primary/[0.06] pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
            <div className="from-primary/[0.1] pointer-events-none absolute top-0 right-0 size-64 rounded-full bg-gradient-to-bl to-transparent blur-3xl" />
            <div className="from-primary/[0.06] pointer-events-none absolute -bottom-20 -left-20 size-52 rounded-full bg-gradient-to-tr to-transparent blur-3xl" />

            {/* ヘッダー（タップで AP・日程を展開） */}
            <button
              type="button"
              onClick={() => setExpandedKey(isOpen ? null : key)}
              aria-expanded={isOpen}
              className="relative w-full cursor-pointer text-left"
            >
              <CardContent className="relative p-6 lg:p-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
                  {/* 左: 大学名 */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <GraduationCap className="text-primary size-5 shrink-0" />
                      <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
                        志望校
                      </p>
                    </div>
                    <h3 className="text-foreground text-3xl leading-[1.1] font-black tracking-tight lg:text-5xl">
                      {item.universityName}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-base font-medium lg:text-xl">
                      {item.facultyName}
                    </p>
                  </div>

                  {/* 右: カウントダウン */}
                  {nextEvent && cd ? (
                    <div className="flex shrink-0 items-center gap-5 lg:flex-col lg:items-end lg:text-right">
                      <div
                        className={`flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${cd.bg} ${cd.text} px-6 py-4 shadow-xl ring-4 lg:px-8 lg:py-5 ${cd.ring} min-w-[140px] lg:min-w-[180px]`}
                      >
                        <span className="text-[11px] font-bold tracking-[0.15em] uppercase opacity-90 lg:text-xs">
                          残り
                        </span>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="text-5xl leading-none font-black tabular-nums lg:text-7xl">
                            {nextEvent.daysLeft}
                          </span>
                          <span className="text-lg font-bold opacity-90 lg:text-2xl">
                            日
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 lg:flex-initial">
                        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs lg:justify-end">
                          <NextIcon className="size-3.5" />
                          <span>次のイベント</span>
                        </div>
                        <p className="text-foreground text-lg leading-tight font-bold lg:text-2xl">
                          {nextEvent.type}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-sm tabular-nums">
                          {new Date(
                            nextEvent.date + "T00:00:00"
                          ).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </p>
                        {cd.label && (
                          <span
                            className={`mt-2 inline-block rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-bold tracking-[0.15em] uppercase ${cd.bg} ${cd.text} shadow-sm`}
                          >
                            {cd.label}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-sm">
                      <Trophy className="size-5" />
                      全日程終了
                    </div>
                  )}
                </div>

                <span className="text-muted-foreground/70 absolute right-5 bottom-4 flex items-center gap-1 text-xs">
                  {isOpen ? "閉じる" : "AP・日程"}
                  <ChevronDown
                    className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </CardContent>
            </button>

            {/* 展開部: AP要旨 + 入試日程 + 詳細リンク */}
            {isOpen && (
              <div className="border-border/60 relative space-y-4 border-t px-6 py-5 lg:px-10">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                    アドミッションポリシー
                  </p>
                  {item.admissionPolicy ? (
                    <p className="line-clamp-4 text-sm leading-relaxed">
                      {item.admissionPolicy}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">未登録</p>
                  )}
                </div>

                <div>
                  <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                    入試日程
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {scheduleRows(item.schedule, item.scheduleLastYear).map(
                      (r) => {
                        const unannounced = r.date.startsWith("未発表");
                        return (
                          <div
                            key={r.label}
                            className="border-border/50 flex items-center gap-2 rounded-lg border px-3 py-2"
                          >
                            <r.icon className="text-muted-foreground size-3.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-muted-foreground mb-0.5 text-[11px] leading-none">
                                {r.label}
                              </p>
                              <p
                                className={`text-sm leading-tight font-medium ${
                                  unannounced
                                    ? "text-muted-foreground"
                                    : "truncate tabular-nums"
                                }`}
                              >
                                {r.date}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <Link
                  href={detailHref}
                  className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  詳細を見る
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

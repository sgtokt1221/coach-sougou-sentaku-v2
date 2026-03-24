"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Mic,
  FolderOpen,
  ClipboardList,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import type { DailyTasksResponse, DailyTask } from "@/lib/ai/prompts/daily-tasks";

const STORAGE_KEY = "daily-tasks-completed";

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCompletedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (parsed.date !== getTodayKey()) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.ids ?? [];
  } catch {
    return [];
  }
}

function saveCompletedIds(ids: string[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: getTodayKey(), ids })
  );
}

const taskIcons: Record<DailyTask["type"], typeof FileText> = {
  essay: FileText,
  interview: Mic,
  document: FolderOpen,
  activity: ClipboardList,
  university: GraduationCap,
};

const taskColors: Record<DailyTask["type"], { bg: string; icon: string; border: string }> = {
  essay: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    icon: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
  },
  interview: {
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    icon: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  document: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  activity: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  university: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    icon: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800",
  },
};

const priorityBadge: Record<string, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function DailyTasksPanel() {
  const { data, isLoading } = useAuthSWR<DailyTasksResponse>(
    "/api/student/daily-tasks"
  );
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    setCompletedIds(getCompletedIds());
  }, []);

  const toggleComplete = (taskTitle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = completedIds.includes(taskTitle)
      ? completedIds.filter((id) => id !== taskTitle)
      : [...completedIds, taskTitle];
    setCompletedIds(next);
    saveCompletedIds(next);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const tasks = data?.tasks ?? [];
  if (tasks.length === 0) return null;

  const completedCount = tasks.filter((t) =>
    completedIds.includes(t.title)
  ).length;

  return (
    <Card className="overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            今日やること
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{tasks.length} 完了
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => {
          const Icon = taskIcons[task.type];
          const colors = taskColors[task.type];
          const isCompleted = completedIds.includes(task.title);

          return (
            <Link key={task.title} href={task.link}>
              <div
                className={`group relative flex items-start gap-3 rounded-xl border p-3 transition-all duration-200 hover:shadow-md ${
                  isCompleted
                    ? "opacity-60 bg-muted/30 border-border"
                    : `${colors.bg} ${colors.border} hover:scale-[1.01]`
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => toggleComplete(task.title, e)}
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-primary"
                  }`}
                >
                  {isCompleted && <CheckCircle2 className="size-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-sm font-medium ${
                        isCompleted
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>
                    <span
                      className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${priorityBadge[task.priority]}`}
                    >
                      {task.priority === "high"
                        ? "優先"
                        : task.priority === "medium"
                          ? "推奨"
                          : "任意"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-center">
                  <Icon className={`size-4 ${colors.icon}`} />
                  <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

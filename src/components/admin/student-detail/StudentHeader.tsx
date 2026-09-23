"use client";

import Link from "next/link";
import { ClipboardList, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateHomeworkDialog } from "@/components/admin/CreateHomeworkDialog";
import { getActivityStatus, type ActivityStatusTone } from "@/lib/admin/activity-status";
import { LAST_ACTIVITY_LABELS } from "@/lib/api/last-activity";
import type { StudentDetail } from "@/lib/types/admin";
import { formatLastSeen } from "@/lib/ui/format-last-seen";
import { getDisplayGrade } from "@/lib/utils/grade";

const STATUS_CLASS: Record<ActivityStatusTone, string> = {
  none: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  stalling: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  inactive: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

/** 押せる高さ 44px を PC でも保つ（Button は lg で h-8 に縮むため上書きする） */
const ACTION_CLASS = "h-11 min-h-11 px-4 text-sm lg:min-h-11";

function relativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "今日" : `${days}日前`;
}

/**
 * 生徒詳細のヘッダー。名前・学年・第一志望・担当・活動状態を1行に、
 * 右に「メッセージ」「宿題を出す」「設定」。スマホではボタンを名前の下へ折り返す。
 */
export function StudentHeader({
  detail,
  onOpenSettings,
  onHomeworkCreated,
}: {
  detail: StudentDetail;
  onOpenSettings: () => void;
  /** 宿題を配布したあと（時系列の読み直しなど） */
  onHomeworkCreated?: () => void;
}) {
  const { profile, summary, lastActivity, lastActivityAt, lastSeenAt } = detail;
  const grade =
    profile.grade != null || profile.isRonin
      ? getDisplayGrade(profile.grade, profile.gradeUpdatedAt, profile.isRonin).label
      : null;
  const first = profile.resolvedUniversities?.[0];
  const firstChoice = first
    ? [first.universityName, first.facultyName].filter(Boolean).join(" ")
    : null;
  const teachers = summary?.teacherNames ?? [];
  const status = getActivityStatus(lastActivityAt ?? lastActivity?.at);

  const facts: { label: string; value: string }[] = [];
  if (grade) facts.push({ label: "学年", value: grade });
  if (firstChoice) facts.push({ label: "第一志望", value: firstChoice });
  if (teachers.length > 0) facts.push({ label: "担当", value: teachers.join("・") });
  facts.push({
    label: "最終活動",
    value: lastActivity
      ? `${LAST_ACTIVITY_LABELS[lastActivity.type] ?? "活動"} ${relativeDays(lastActivity.at)}`
      : "なし",
  });
  facts.push({ label: "最終ログイン", value: formatLastSeen(lastSeenAt) });

  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl leading-tight font-bold break-words">
          {profile.displayName || "生徒"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${STATUS_CLASS[status.tone]}`}
          >
            {status.label}
          </span>
          {facts.map((f) => (
            <span key={f.label} className="min-w-0 break-words">
              <span className="text-muted-foreground">{f.label} </span>
              <span className="font-medium">{f.value}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:flex-nowrap">
        <Button asChild variant="outline" className={ACTION_CLASS}>
          <Link href={`/admin/messages/${profile.uid}`}>
            <MessageSquare className="size-4" />
            メッセージ
          </Link>
        </Button>
        <CreateHomeworkDialog
          studentId={profile.uid}
          onCreated={onHomeworkCreated}
          trigger={
            <Button variant="outline" className={ACTION_CLASS}>
              <ClipboardList className="size-4" />
              宿題を出す
            </Button>
          }
        />
        <Button variant="outline" className={ACTION_CLASS} onClick={onOpenSettings}>
          <Settings className="size-4" />
          設定
        </Button>
      </div>
    </header>
  );
}

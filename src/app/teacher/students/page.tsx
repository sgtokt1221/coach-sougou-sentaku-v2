"use client";

import Link from "next/link";
import { Users, ChevronRight, MessageSquare } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/shared/PageTransition";
import { getInitials } from "@/lib/utils/avatar";

interface TeacherStudentItem {
  studentId: string;
  studentName: string;
  studentPhotoURL?: string | null;
  lastMessageText: string;
  lastMessageAt: string | null;
  unreadByTeacher: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 講師の「担当生徒」インボックス。assignedTeacherId が自分の生徒一覧を、
 * 講師スレッドの最終メッセージ・未読つきで表示する。
 */
export default function TeacherStudentsPage() {
  const { data, isLoading } = useAuthSWR<TeacherStudentItem[]>(
    "/api/teacher/students"
  );
  const items = data ?? [];

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold">担当生徒</h1>
            <p className="text-xs text-muted-foreground">
              担当する生徒とのメッセージ
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-3 size-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                担当生徒がまだ割り当てられていません。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <Link
                key={s.studentId}
                href={`/teacher/students/${s.studentId}?name=${encodeURIComponent(s.studentName)}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
              >
                <Avatar size="default" className="shrink-0">
                  <AvatarImage
                    src={s.studentPhotoURL ?? undefined}
                    alt={s.studentName}
                  />
                  <AvatarFallback>{getInitials(s.studentName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{s.studentName}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(s.lastMessageAt)}
                    </span>
                  </div>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MessageSquare className="size-3 shrink-0" />
                    {s.lastMessageText || "メッセージはまだありません"}
                  </p>
                </div>
                {s.unreadByTeacher > 0 && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {s.unreadByTeacher}
                  </span>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

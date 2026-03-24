"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, Video } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { Session, SessionStatus, SessionType } from "@/lib/types/session";
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from "@/lib/types/session";

const STATUS_VARIANT: Record<
  SessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function AdminSessionsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const sessionParams = new URLSearchParams();
  if (statusFilter !== "all") sessionParams.set("status", statusFilter);
  const { data: rawSessions, isLoading: loading } = useAuthSWR<Session[]>(
    `/api/sessions?${sessionParams.toString()}`
  );
  const sessions = rawSessions ?? [];

  const filtered =
    typeFilter === "all"
      ? sessions
      : sessions.filter((s) => s.type === typeFilter);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">セッション管理</h1>
          <p className="text-sm text-muted-foreground">
            面談・コーチングセッションを管理します
          </p>
        </div>
        <Button onClick={() => router.push("/admin/sessions/new")}>
          <Plus className="size-4 mr-2" />
          新規作成
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-48">
          <Select
            value={statusFilter}
            onValueChange={(v: string | null) => setStatusFilter(v ?? "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全てのステータス</SelectItem>
              {(
                Object.entries(SESSION_STATUS_LABELS) as [
                  SessionStatus,
                  string,
                ][]
              ).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={typeFilter}
            onValueChange={(v: string | null) => setTypeFilter(v ?? "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="タイプ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全てのタイプ</SelectItem>
              {(
                Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]
              ).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Calendar className="size-8" />
              <p className="text-sm">セッションが見つかりません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">日時</th>
                    <th className="px-4 py-3 text-left font-medium">生徒名</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                      講師名
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      タイプ
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">
                      Meet
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-b transition-colors hover:bg-accent"
                      onClick={() => router.push(`/admin/sessions/${s.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {new Date(s.scheduledAt).toLocaleDateString("ja-JP")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.scheduledAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {s.duration ? ` (${s.duration}分)` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">{s.studentName}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {s.teacherName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {SESSION_TYPE_LABELS[s.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={STATUS_VARIANT[s.status]}
                          className="text-xs"
                        >
                          {SESSION_STATUS_LABELS[s.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {s.meetLink ? (
                          <Video className="size-4 text-emerald-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/sessions/${s.id}`);
                          }}
                        >
                          詳細
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

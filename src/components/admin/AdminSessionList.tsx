"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SESSION_TYPE_LABELS,
  SESSION_STATUS_LABELS,
  type Session,
  type SessionStatus,
} from "@/lib/types/session";

interface Props {
  sessions: Session[];
  /** 渡されたときだけ一覧上部に「予定を追加」ボタンを表示する（モバイル用）。 */
  onAddClick?: () => void;
}

const STATUS_VARIANT: Record<SessionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  scheduled: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
  ended: "secondary",
};

/** Date を "YYYY-MM-DD"（ローカル）へ整形する。 */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 日付グループの集約結果。 */
interface DateGroup {
  key: string;
  label: string;
  sessions: Session[];
}

/**
 * 管理者向けセッション一覧（日時降順・ステータス絞り込み・名前検索）。
 * 日付ごとにグループ化し「今日/明日/M月D日(曜)」の見出しを付けて表示する。
 * 行クリックで詳細 `/admin/sessions/{id}` へ遷移。
 */
export default function AdminSessionList({ sessions, onAddClick }: Props) {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim();
    return sessions
      .filter((s) => (status === "all" ? true : s.status === status))
      .filter((s) =>
        q === ""
          ? true
          : (s.studentName ?? "").includes(q) || (s.teacherName ?? "").includes(q),
      )
      .slice()
      .sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );
  }, [sessions, status, search]);

  // 日付キーでグループ化。filtered は降順ソート済みなので挿入順で日付降順を保つ。
  const groups = useMemo<DateGroup[]>(() => {
    const todayKey = dateKey(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = dateKey(tomorrow);

    const map = new Map<string, DateGroup>();
    for (const s of filtered) {
      const dt = new Date(s.scheduledAt);
      const valid = !Number.isNaN(dt.getTime());
      const key = valid ? dateKey(dt) : "unknown";
      let group = map.get(key);
      if (!group) {
        let label: string;
        if (!valid) label = "日付不明";
        else if (key === todayKey) label = "今日";
        else if (key === tomorrowKey) label = "明日";
        else
          label = dt.toLocaleDateString("ja-JP", {
            month: "numeric",
            day: "numeric",
            weekday: "short",
          });
        group = { key, label, sessions: [] };
        map.set(key, group);
      }
      group.sessions.push(s);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="space-y-4">
      {onAddClick && (
        <Button onClick={onAddClick} className="w-full sm:w-auto">
          予定を追加
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="生徒名・講師名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60"
        />
        <Select value={status} onValueChange={(v) => setStatus(v || "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのステータス</SelectItem>
            <SelectItem value="scheduled">{SESSION_STATUS_LABELS.scheduled}</SelectItem>
            <SelectItem value="in_progress">{SESSION_STATUS_LABELS.in_progress}</SelectItem>
            <SelectItem value="completed">{SESSION_STATUS_LABELS.completed}</SelectItem>
            <SelectItem value="cancelled">{SESSION_STATUS_LABELS.cancelled}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length}件</span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          セッションがありません
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">{group.label}</h3>
              {group.sessions.map((s) => {
                const dt = new Date(s.scheduledAt);
                const timeStr = Number.isNaN(dt.getTime())
                  ? s.scheduledAt
                  : dt.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                return (
                  <Card
                    key={s.id}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      window.location.href = `/admin/sessions/${s.id}`;
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium tabular-nums w-14 flex-shrink-0">
                          {timeStr}
                        </span>
                        <span className="text-sm truncate">
                          {s.type === "group_review" ? (s.theme || "グループ添削") : s.studentName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {s.teacherId ? s.teacherName : <span className="text-rose-500">講師未割当</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {SESSION_TYPE_LABELS[s.type] ?? s.type}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[s.status]} className="text-xs">
                          {SESSION_STATUS_LABELS[s.status] ?? s.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

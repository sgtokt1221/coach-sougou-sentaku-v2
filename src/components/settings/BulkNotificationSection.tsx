"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Send,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  CalendarClock,
  Megaphone,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";

interface SendResult {
  success: boolean;
  message?: string;
  error?: string;
  sentCount?: number;
  alertCount?: number;
}

/**
 * 管理者設定タブ用 一括送信セクション。
 * 旧 /admin/settings/notifications/page.tsx のロジックを統合。
 *
 * - アラートダイジェストの手動送信 (/api/notifications/alert-digest)
 * - 書類期限リマインダーの手動送信 (/api/notifications/deadline-reminder)
 * - 自動送信スケジュール表示 (実際の cron は外部設定)
 */
export function BulkNotificationSection() {
  const [sendingDigest, setSendingDigest] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [digestResult, setDigestResult] = useState<SendResult | null>(null);
  const [reminderResult, setReminderResult] = useState<SendResult | null>(null);
  const [lastDigestSent, setLastDigestSent] = useState<string | null>(null);
  const [lastReminderSent, setLastReminderSent] = useState<string | null>(null);

  // 自動送信トグル (表示のみ、 実際の cron は外部設定)
  const [autoDigest, setAutoDigest] = useState(false);
  const [autoReminder, setAutoReminder] = useState(false);

  const handleSendDigest = async () => {
    setSendingDigest(true);
    setDigestResult(null);
    try {
      const res = await authFetch("/api/notifications/alert-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setDigestResult({
          success: true,
          message: `${data.alertCount}件のアラートダイジェストを送信しました`,
          alertCount: data.alertCount,
        });
        setLastDigestSent(new Date().toISOString());
      } else {
        setDigestResult({
          success: false,
          error: data.error || "送信に失敗しました",
        });
      }
    } catch {
      setDigestResult({ success: false, error: "送信に失敗しました" });
    } finally {
      setSendingDigest(false);
    }
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    setReminderResult(null);
    try {
      const res = await authFetch("/api/notifications/deadline-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setReminderResult({
          success: true,
          message: `${data.sentCount}人の生徒にリマインダーを送信しました`,
          sentCount: data.sentCount,
        });
        setLastReminderSent(new Date().toISOString());
      } else {
        setReminderResult({
          success: false,
          error: data.error || "送信に失敗しました",
        });
      }
    } catch {
      setReminderResult({ success: false, error: "送信に失敗しました" });
    } finally {
      setSendingReminder(false);
    }
  };

  const formatTimestamp = (iso: string | null): string => {
    if (!iso) return "未送信";
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="size-4 text-primary" />
          一括送信 (生徒向け)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 手動送信 */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <AlertTriangle className="size-4 text-amber-500" />
              アラートダイジェスト
            </div>
            <p className="text-xs text-muted-foreground">
              要注意生徒のアラートを管理者にメール送信
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              最終送信: {formatTimestamp(lastDigestSent)}
            </div>
            <Button
              onClick={handleSendDigest}
              disabled={sendingDigest}
              size="sm"
              className="mt-3 w-full"
            >
              {sendingDigest ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Send className="mr-1 size-4" />
              )}
              送信
            </Button>
            {digestResult && (
              <div
                className={`mt-2 rounded px-2 py-1 text-[11px] ${
                  digestResult.success
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {digestResult.success ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    {digestResult.message}
                  </span>
                ) : (
                  digestResult.error
                )}
              </div>
            )}
          </div>

          <div className="rounded-md border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="size-4 text-amber-500" />
              期限リマインダー
            </div>
            <p className="text-xs text-muted-foreground">
              期限 7 日以内の書類がある生徒に送信
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              最終送信: {formatTimestamp(lastReminderSent)}
            </div>
            <Button
              onClick={handleSendReminder}
              disabled={sendingReminder}
              size="sm"
              className="mt-3 w-full"
            >
              {sendingReminder ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Send className="mr-1 size-4" />
              )}
              送信
            </Button>
            {reminderResult && (
              <div
                className={`mt-2 rounded px-2 py-1 text-[11px] ${
                  reminderResult.success
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {reminderResult.success ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    {reminderResult.message}
                  </span>
                ) : (
                  reminderResult.error
                )}
              </div>
            )}
          </div>
        </div>

        {/* 自動送信スケジュール (表示のみ) */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <CalendarClock className="size-4 text-primary" />
            自動送信スケジュール
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 size-4 text-amber-500" />
                <div>
                  <Label htmlFor="auto-digest" className="text-xs font-medium">
                    アラートダイジェスト
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    毎週月曜日 9:00
                  </p>
                </div>
              </div>
              <Switch
                id="auto-digest"
                checked={autoDigest}
                onCheckedChange={setAutoDigest}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 size-4 text-amber-500" />
                <div>
                  <Label htmlFor="auto-reminder" className="text-xs font-medium">
                    期限リマインダー
                  </Label>
                  <p className="text-[10px] text-muted-foreground">毎日 8:00</p>
                </div>
              </div>
              <Switch
                id="auto-reminder"
                checked={autoReminder}
                onCheckedChange={setAutoReminder}
              />
            </div>
          </div>
          <p className="mt-2 text-[10px] italic text-muted-foreground">
            ※ 自動送信は外部スケジューラ (Cloud Scheduler 等) の設定が必要です。
            ここの切替は表示のみで、実 cron は別途運用してください。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

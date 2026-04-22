"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import { authFetch } from "@/lib/api/client";

interface SendResult {
  success: boolean;
  message?: string;
  error?: string;
  sentCount?: number;
  alertCount?: number;
}

export default function AdminNotificationManagementPage() {
  const [sendingDigest, setSendingDigest] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [digestResult, setDigestResult] = useState<SendResult | null>(null);
  const [reminderResult, setReminderResult] = useState<SendResult | null>(null);
  const [lastDigestSent, setLastDigestSent] = useState<string | null>(null);
  const [lastReminderSent, setLastReminderSent] = useState<string | null>(null);

  // 自動送信トグル（表示のみ、実際のcronは外部）
  const [autoDigest, setAutoDigest] = useState(false);
  const [autoReminder, setAutoReminder] = useState(false);

  async function handleSendDigest() {
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
  }

  async function handleSendReminder() {
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
  }

  function formatTimestamp(iso: string | null): string {
    if (!iso) return "未送信";
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">通知管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          アラートダイジェストや書類期限リマインダーの送信を管理します。
        </p>
      </div>

      {/* 手動送信カード */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* アラートダイジェスト */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-5 text-amber-500" />
              アラートダイジェスト
            </CardTitle>
            <CardDescription>
              要注意生徒のアラートを管理者にメール送信します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              最終送信: {formatTimestamp(lastDigestSent)}
            </div>

            <Button
              onClick={handleSendDigest}
              disabled={sendingDigest}
              className="w-full"
            >
              {sendingDigest ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  ダイジェストを送信
                </>
              )}
            </Button>

            {digestResult && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  digestResult.success
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {digestResult.success ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-4" />
                    {digestResult.message}
                  </span>
                ) : (
                  digestResult.error
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 期限リマインダー */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5 text-amber-500" />
              書類期限リマインダー
            </CardTitle>
            <CardDescription>
              期限が7日以内の書類がある生徒にリマインダーを送信します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              最終送信: {formatTimestamp(lastReminderSent)}
            </div>

            <Button
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="w-full"
            >
              {sendingReminder ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  リマインダーを送信
                </>
              )}
            </Button>

            {reminderResult && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  reminderResult.success
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {reminderResult.success ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-4" />
                    {reminderResult.message}
                  </span>
                ) : (
                  reminderResult.error
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 自動送信スケジュール */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="size-5" />
            自動送信スケジュール
          </CardTitle>
          <CardDescription>
            定期的な自動送信の設定です。実際の送信は外部のcronジョブで実行されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 size-5 text-amber-500" />
              <div>
                <Label htmlFor="auto-digest" className="text-sm font-medium">
                  アラートダイジェスト自動送信
                </Label>
                <p className="text-xs text-muted-foreground">
                  毎週月曜日 9:00 にアラートダイジェストを自動送信します。
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
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 text-amber-500" />
              <div>
                <Label htmlFor="auto-reminder" className="text-sm font-medium">
                  期限リマインダー自動送信
                </Label>
                <p className="text-xs text-muted-foreground">
                  毎日 8:00 に期限が近い書類のリマインダーを自動送信します。
                </p>
              </div>
            </div>
            <Switch
              id="auto-reminder"
              checked={autoReminder}
              onCheckedChange={setAutoReminder}
            />
          </div>

          <p className="text-xs text-muted-foreground italic">
            ※ 自動送信機能は外部のスケジューラー（Cloud Scheduler等）の設定が必要です。
            ここでの切り替えは設定の表示のみとなります。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, FileText, TrendingUp, Save, CheckCircle2, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/api/client";

interface NotificationPrefs {
  alertDigest: boolean;
  deadlineReminder: boolean;
  weeklyProgress: boolean;
  email: string;
}

export default function StudentNotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    alertDigest: true,
    deadlineReminder: true,
    weeklyProgress: true,
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await authFetch("/api/notifications/settings");
        if (res.ok) {
          const data = await res.json();
          setPrefs(data);
        }
      } catch {
        console.error("通知設定の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await authFetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "保存に失敗しました");
      }
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">通知設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          メール通知の受信設定を管理します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="size-5" />
            通知タイプ
          </CardTitle>
          <CardDescription>
            受け取りたい通知の種類を選択してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 書類期限リマインダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 text-amber-500" />
              <div>
                <Label htmlFor="deadline" className="text-sm font-medium">
                  書類期限リマインダー
                </Label>
                <p className="text-xs text-muted-foreground">
                  提出期限が7日以内の書類についてお知らせします。
                </p>
              </div>
            </div>
            <Switch
              id="deadline"
              checked={prefs.deadlineReminder}
              onCheckedChange={(checked) =>
                setPrefs((prev) => ({ ...prev, deadlineReminder: checked }))
              }
            />
          </div>

          {/* 週次進捗レポート */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 size-5 text-sky-500" />
              <div>
                <Label htmlFor="weekly" className="text-sm font-medium">
                  週次進捗レポート
                </Label>
                <p className="text-xs text-muted-foreground">
                  毎週の学習進捗サマリーをメールでお届けします。
                </p>
              </div>
            </div>
            <Switch
              id="weekly"
              checked={prefs.weeklyProgress}
              onCheckedChange={(checked) =>
                setPrefs((prev) => ({ ...prev, weeklyProgress: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="size-5" />
            メールアドレス
          </CardTitle>
          <CardDescription>
            通知の送信先メールアドレスを指定できます。空欄の場合はアカウントのメールアドレスに送信されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="email">通知用メールアドレス（任意）</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={prefs.email}
              onChange={(e) =>
                setPrefs((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" />
            保存しました
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              保存
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

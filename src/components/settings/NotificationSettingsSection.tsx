"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  FileText,
  TrendingUp,
  Save,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import {
  requestNotificationPermission,
  saveFcmToken,
} from "@/lib/firebase/messaging";
import { auth } from "@/lib/firebase/config";
import { toast } from "sonner";
import type { NotificationKind } from "@/lib/notifications/catalog";

interface SettingsResponse {
  prefs: Record<string, boolean>;
  email: string;
  kinds: NotificationKind[];
  role: string;
}

/**
 * needs_install: iPhone/iPadで、ホーム画面に追加したアプリからではなく
 * ブラウザのタブで開いている状態。iOS はインストール済みPWAの中でしか
 * Web Push を扱えず、Notification API 自体が存在しない。
 * 「非対応ブラウザ」と出すと諦めさせてしまうので、手順を出すために分ける。
 */
type PushState =
  | "granted"
  | "default"
  | "denied"
  | "unsupported"
  | "needs_install";

/**
 * 設定: 通知 セクション。
 * - Web Push の許可状態と「許可する」ボタン
 * - 書類期限リマインダー / 週次進捗レポート / 通知用メール
 */
export function NotificationSettingsSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [kinds, setKinds] = useState<NotificationKind[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushState, setPushState] = useState<PushState>("default");
  const [requestingPush, setRequestingPush] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    // iPadOS は Mac を名乗るので、タッチ対応も見て判定する
    const isIos =
      /iPhone|iPad|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (!("Notification" in window)) {
      setPushState(isIos && !standalone ? "needs_install" : "unsupported");
      return;
    }
    // iOS はタブで開いている限り許可を取れない（取れても届かない）
    if (isIos && !standalone && Notification.permission !== "granted") {
      setPushState("needs_install");
      return;
    }
    setPushState(Notification.permission as PushState);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authFetch("/api/notifications/settings");
        if (res.ok) {
          const data = (await res.json()) as SettingsResponse;
          if (alive) {
            setPrefs(data.prefs ?? {});
            setEmail(data.email ?? "");
            setKinds(data.kinds ?? []);
          }
        }
      } catch {
        /* noop */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleEnablePush = async () => {
    setRequestingPush(true);
    try {
      const token = await requestNotificationPermission();
      if (token && auth?.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        await saveFcmToken(idToken, token);
        setPushState("granted");
        toast.success("ブラウザ通知を有効にしました");
      } else {
        const current = (typeof Notification !== "undefined"
          ? Notification.permission
          : "denied") as PushState;
        setPushState(current);
        if (current === "denied") {
          toast.error(
            "ブラウザの通知設定がブロックされています。 ブラウザ設定から許可してください",
          );
        }
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "通知の有効化に失敗しました",
      );
    } finally {
      setRequestingPush(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await authFetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs, email }),
      });
      if (res.ok) {
        const data = (await res.json()) as SettingsResponse;
        setPrefs(data.prefs ?? {});
        setEmail(data.email ?? "");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error("保存に失敗しました");
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-primary" />
          通知
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Web Push 状態 */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">ブラウザ通知</p>
              <div className="mt-1 flex items-center gap-2">
                {pushState === "granted" && (
                  <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                    許可済み
                  </Badge>
                )}
                {pushState === "default" && (
                  <Badge variant="outline" className="text-[10px]">
                    未許可
                  </Badge>
                )}
                {pushState === "denied" && (
                  <Badge variant="destructive" className="text-[10px]">
                    ブロック中
                  </Badge>
                )}
                {pushState === "unsupported" && (
                  <Badge variant="outline" className="text-[10px]">
                    非対応ブラウザ
                  </Badge>
                )}
                {pushState === "needs_install" && (
                  <Badge variant="outline" className="text-[10px]">
                    ホーム画面への追加が必要
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground">
                  PC / スマホへリアルタイムでお知らせ
                </span>
              </div>
              {pushState === "denied" && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  ブラウザの通知設定がブロックされています。 ブラウザ側で許可に変更してください
                </p>
              )}
              {pushState === "needs_install" && (
                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  <p>
                    iPhone・iPad では、ホーム画面に追加したアプリから開いたときだけ
                    通知を受け取れます（Safariのタブでは受け取れません）。
                  </p>
                  <ol className="ml-4 list-decimal space-y-0.5">
                    <li>Safari下部の共有ボタン（□に↑）を押す</li>
                    <li>「ホーム画面に追加」を選ぶ</li>
                    <li>ホーム画面のアイコンから開き直す</li>
                    <li>この画面をもう一度開いて「許可する」を押す</li>
                  </ol>
                </div>
              )}
            </div>
            {(pushState === "default" || pushState === "denied") && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnablePush}
                disabled={requestingPush || pushState === "denied"}
              >
                {requestingPush ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : null}
                許可する
              </Button>
            )}
          </div>
        </div>

        {/* 受け取る通知。立場ごとに項目が変わるのでサーバーから来た
            kinds をそのまま描く。ここに項目を足すときは catalog.ts を直す。 */}
        {kinds.length > 0 && (
          <div className="space-y-4">
            {(["push", "email"] as const).map((channel) => {
              const items = kinds.filter((k) => k.channel === channel);
              if (items.length === 0) return null;
              return (
                <div key={channel} className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {channel === "push" ? "プッシュ通知" : "メール"}
                  </p>
                  {items.map((k) => (
                    <div key={k.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {channel === "push" ? (
                          <Bell className="mt-0.5 size-5 text-primary" />
                        ) : (
                          <FileText className="mt-0.5 size-5 text-amber-500" />
                        )}
                        <div>
                          <Label htmlFor={`notif-${k.id}`} className="text-sm font-medium">
                            {k.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {k.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`notif-${k.id}`}
                        checked={prefs[k.id] ?? true}
                        disabled={loading}
                        onCheckedChange={(checked) =>
                          setPrefs((prev) => ({ ...prev, [k.id]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* メールアドレス */}
        <div className="space-y-2">
          <Label htmlFor="notif-email">通知用メールアドレス (任意)</Label>
          <Input
            id="notif-email"
            type="email"
            placeholder="例: example@email.com"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">
            空欄ならアカウントのメールアドレスに送信されます
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" />
              保存しました
            </span>
          )}
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Save className="mr-1 size-4" />
            )}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

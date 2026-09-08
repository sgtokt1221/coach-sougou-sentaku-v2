"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Send,
  RefreshCw,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import {
  getDeviceId,
  getServiceWorkerVersion,
  requestNotificationPermission,
  saveFcmToken,
} from "@/lib/firebase/messaging";
import { auth } from "@/lib/firebase/config";
import { toast } from "sonner";
import type { NotificationKind } from "@/lib/notifications/catalog";

/** サーバーが見た「本当に届く状態か」。permission とは別物 */
interface PushStatus {
  tokens: number;
  lastSuccessAt: string | null;
  lastError: string | null;
  thisDevice: boolean;
  pushDisabled: boolean;
}

interface SettingsResponse {
  prefs: Record<string, boolean>;
  email: string;
  kinds: NotificationKind[];
  role: string;
  push?: PushStatus;
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
  /** サーバー側の登録状況。permission が granted でもここが 0 なら届かない */
  const [push, setPush] = useState<PushStatus | null>(null);
  const [swVersion, setSwVersion] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  /** 登録状況を取り直す。許可した直後・テスト送信の後に呼ぶ */
  const reloadPush = async () => {
    try {
      const q = new URLSearchParams({ deviceId: getDeviceId() }).toString();
      const res = await authFetch(`/api/notifications/settings?${q}`);
      if (!res.ok) return;
      const data = (await res.json()) as SettingsResponse;
      setPush(data.push ?? null);
    } catch {
      /* 表示だけなので落とさない */
    }
  };

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
        const q = new URLSearchParams({ deviceId: getDeviceId() }).toString();
        const res = await authFetch(`/api/notifications/settings?${q}`);
        if (res.ok) {
          const data = (await res.json()) as SettingsResponse;
          if (alive) {
            setPrefs(data.prefs ?? {});
            setEmail(data.email ?? "");
            setKinds(data.kinds ?? []);
            setPush(data.push ?? null);
          }
        }
        // 「直したのに届かない」の切り分け用。古い SW のままなら null か古い版が返る
        const v = await getServiceWorkerVersion();
        if (alive) setSwVersion(v);
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
        await reloadPush();
      } else {
        const current = (
          typeof Notification !== "undefined"
            ? Notification.permission
            : "denied"
        ) as PushState;
        setPushState(current);
        if (current === "denied") {
          toast.error(
            "ブラウザの通知設定がブロックされています。 ブラウザ設定から許可してください"
          );
        }
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "通知の有効化に失敗しました"
      );
    } finally {
      setRequestingPush(false);
    }
  };

  /**
   * 自分宛にテスト通知を1通送る。
   * 「届かない気がする」を、設定・登録・表示のどこで止まっているかに分ける入口。
   */
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await authFetch("/api/notifications/test", {
        method: "POST",
      });
      const r = (await res.json()) as {
        attempted?: number;
        sent?: number;
        failed?: number;
        pruned?: number;
        skipped?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(r.error ?? "テスト送信に失敗しました");
      } else if (r.skipped === "no-tokens" || (r.attempted ?? 0) === 0) {
        toast.error(
          "登録された端末がありません。「登録し直す」を押してください"
        );
      } else if ((r.sent ?? 0) === 0) {
        toast.error(
          `${r.attempted}台に送りましたが、すべて失敗しました（失効 ${r.pruned ?? 0}台）`
        );
      } else {
        toast.success(
          `${r.sent}台に送りました。数秒待っても出なければ、この画面を閉じてもう一度お試しください`
        );
      }
      await reloadPush();
    } catch {
      toast.error("テスト送信に失敗しました");
    } finally {
      setTesting(false);
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
          <Bell className="text-primary size-4" />
          通知
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Web Push 状態 */}
        <div className="bg-muted/30 rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">ブラウザ通知</p>
              <div className="mt-1 flex items-center gap-2">
                {pushState === "granted" &&
                  (push && push.tokens === 0 ? (
                    <Badge className="bg-amber-500 text-[10px] text-white hover:bg-amber-500">
                      許可済み・端末が未登録
                    </Badge>
                  ) : push && !push.thisDevice ? (
                    <Badge className="bg-amber-500 text-[10px] text-white hover:bg-amber-500">
                      この端末は未登録
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                      有効
                    </Badge>
                  ))}
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
                <span className="text-muted-foreground text-[11px]">
                  PC / スマホへリアルタイムでお知らせ
                </span>
              </div>
              {pushState === "granted" && push && (
                <div className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
                  <p>
                    登録端末 {push.tokens}台
                    {push.lastSuccessAt
                      ? ` / 最終配信 ${new Date(push.lastSuccessAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : " / まだ一度も届いていません"}
                    {swVersion ? ` / SW ${swVersion}` : " / SW 未更新"}
                  </p>
                  {push.lastError && (
                    <p className="text-red-600">
                      直近の送信に失敗しています（{push.lastError}
                      ）。「登録し直す」をお試しください
                    </p>
                  )}
                  {push.pushDisabled && (
                    <p className="text-amber-600">
                      下の設定でプッシュ通知をすべて切っています。届かないのは設定どおりです
                    </p>
                  )}
                </div>
              )}
              {pushState === "denied" && (
                <div className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
                  <p>
                    ブラウザの通知設定がブロックされています。ブラウザ側で許可に変更してください。
                  </p>
                  <p>
                    Chrome: アドレスバー左の錠前 → 通知 → 許可。Safari: 設定 →
                    Webサイト → 通知。 変更後にこの画面を開き直してください。
                  </p>
                </div>
              )}
              {pushState === "needs_install" && (
                <div className="text-muted-foreground mt-2 space-y-1 text-[11px]">
                  <p>
                    iPhone・iPad
                    では、ホーム画面に追加したアプリから開いたときだけ
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
            <div className="flex shrink-0 flex-col gap-1.5">
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
              {pushState === "granted" && (
                <>
                  {/* 許可済みでも登録が無い・この端末が無い・失敗中なら取り直せる */}
                  {push &&
                    (push.tokens === 0 ||
                      !push.thisDevice ||
                      push.lastError) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEnablePush}
                        disabled={requestingPush}
                      >
                        {requestingPush ? (
                          <Loader2 className="mr-1 size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 size-4" />
                        )}
                        登録し直す
                      </Button>
                    )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing}
                  >
                    {testing ? (
                      <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 size-4" />
                    )}
                    テスト通知を送る
                  </Button>
                </>
              )}
            </div>
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
                  <p className="text-muted-foreground text-xs font-semibold">
                    {channel === "push" ? "プッシュ通知" : "メール"}
                  </p>
                  {items.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        {channel === "push" ? (
                          <Bell className="text-primary mt-0.5 size-5" />
                        ) : (
                          <FileText className="mt-0.5 size-5 text-amber-500" />
                        )}
                        <div>
                          <Label
                            htmlFor={`notif-${k.id}`}
                            className="text-sm font-medium"
                          >
                            {k.label}
                          </Label>
                          <p className="text-muted-foreground text-xs">
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
          <p className="text-muted-foreground text-[10px]">
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

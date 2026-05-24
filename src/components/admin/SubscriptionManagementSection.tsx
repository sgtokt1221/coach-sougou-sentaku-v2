"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CreditCard, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type {
  FeatureFlags,
  StandardSubscription,
  DocumentPackage,
} from "@/lib/types/subscription";

interface SubscriptionStatus {
  subscriptionPlan: "free" | "standard" | "document_package";
  standardActive: boolean;
  standardSubscription: StandardSubscription | null;
  documentPackagePurchased: boolean;
  documentPackage: DocumentPackage;
  features: FeatureFlags | null;
  realtimeUnlocked: boolean;
  hasStripeSubscription: boolean;
  stripeSubscriptionId: string | null;
}

interface Props {
  studentId: string;
}

/** UI で表示するトグル一覧。 realtimeUnlocked は別フィールド (rate-limit 用) なので
 *  「key」 と「source」 で features と独立フィールドを区別して扱う。 */
type SwitchSource = "feature" | "realtimeUnlocked";

const TOGGLES: Array<{
  key: keyof FeatureFlags | "realtimeUnlocked";
  label: string;
  source: SwitchSource;
}> = [
  { key: "essayReview", label: "小論文添削", source: "feature" },
  { key: "interviewPractice", label: "模擬面接", source: "feature" },
  { key: "growthTracking", label: "成長トラッキング", source: "feature" },
  { key: "passedData", label: "合格者データ", source: "feature" },
  { key: "voiceAnalysis", label: "音声分析", source: "feature" },
  { key: "documentEditor", label: "出願書類エディタ", source: "feature" },
  { key: "activityManager", label: "活動実績管理", source: "feature" },
  { key: "apOptimization", label: "AP最適化", source: "feature" },
  { key: "realtimeUnlocked", label: "音声面接の無制限利用", source: "realtimeUnlocked" },
];

/**
 * 管理者用「機能スイッチ」 セクション。
 * 生徒ごとに機能を個別に ON/OFF する。 プラン (Standard / DocPackage) 操作は
 * Stripe webhook が自動更新するため admin の UI からは見えない。
 *
 * `realtimeUnlocked` は features ではなく `users/{uid}.realtimeUnlocked` の独立
 * フィールド (rate-limit ロジック側で参照) で、 API ハンドラ内で別キーで書き分け。
 */
export function SubscriptionManagementSection({ studentId }: Props) {
  const { data, mutate, isLoading } = useAuthSWR<SubscriptionStatus>(
    `/api/admin/students/${studentId}/subscription`,
  );
  const [pending, setPending] = useState<string | null>(null);

  const getCurrentValue = (
    key: keyof FeatureFlags | "realtimeUnlocked",
    source: SwitchSource,
  ): boolean => {
    if (!data) return false;
    if (source === "realtimeUnlocked") return data.realtimeUnlocked === true;
    return data.features?.[key as keyof FeatureFlags] === true;
  };

  const toggle = async (
    key: keyof FeatureFlags | "realtimeUnlocked",
    source: SwitchSource,
    nextValue: boolean,
  ) => {
    setPending(key);
    try {
      const body =
        source === "realtimeUnlocked"
          ? { realtimeUnlocked: nextValue }
          : { features: { [key]: nextValue } };
      const res = await authFetch(
        `/api/admin/students/${studentId}/subscription`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error ?? `更新に失敗しました (${res.status})`);
      }
      await mutate();
    } catch (e) {
      console.error("Toggle failed:", e);
      alert(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setPending(null);
    }
  };

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            機能スイッチ
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
          読み込み中...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4" />
          機能スイッチ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TOGGLES.map(({ key, label, source }) => {
            const on = getCurrentValue(key, source);
            return (
              <label
                key={key}
                className="flex items-center justify-between gap-2 rounded border bg-card px-2.5 py-1.5 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  {on ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="size-3.5 text-muted-foreground/40" />
                  )}
                  <span
                    className={
                      on ? "text-foreground" : "text-muted-foreground/60"
                    }
                  >
                    {label}
                  </span>
                </span>
                <Switch
                  checked={on}
                  disabled={pending !== null}
                  onCheckedChange={(next) => toggle(key, source, next)}
                />
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
  hasStripeSubscription: boolean;
  stripeSubscriptionId: string | null;
}

interface Props {
  studentId: string;
  /** 生徒の表示名 (確認ダイアログで使用) */
  studentName?: string;
}

const FEATURE_LABELS: Array<{ key: keyof FeatureFlags; label: string }> = [
  { key: "essayReview", label: "小論文添削" },
  { key: "interviewPractice", label: "模擬面接" },
  { key: "growthTracking", label: "成長トラッキング" },
  { key: "passedData", label: "合格者データ" },
  { key: "voiceAnalysis", label: "音声分析" },
  { key: "documentEditor", label: "出願書類エディタ" },
  { key: "activityManager", label: "活動実績管理" },
  { key: "apOptimization", label: "AP最適化" },
];

/**
 * 管理者用: 生徒のサブスクリプション (standard / document_package) を
 * 手動で付与・剥奪する UI。
 *
 * 既存の Coach プラン (self/coach) とは別軸の操作で、Phase 5E の
 * 有料機能ゲート (requireFeature) を解放する。
 */
export function SubscriptionManagementSection({ studentId, studentName }: Props) {
  const { data, mutate, isLoading } = useAuthSWR<SubscriptionStatus>(
    `/api/admin/students/${studentId}/subscription`
  );

  const [pending, setPending] = useState<
    null | "standard" | "documentPackage" | keyof FeatureFlags
  >(null);
  const [dialog, setDialog] = useState<{
    open: boolean;
    target: "standard" | "documentPackage";
    nextValue: boolean;
  } | null>(null);

  const submit = async (
    target: "standard" | "documentPackage",
    nextValue: boolean
  ) => {
    setPending(target);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/subscription`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [target]: nextValue }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error ?? `更新に失敗しました (${res.status})`);
      }
      await mutate();
    } catch (e) {
      console.error("Subscription update failed:", e);
      alert(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setPending(null);
      setDialog(null);
    }
  };

  const toggleFeature = async (key: keyof FeatureFlags, nextValue: boolean) => {
    setPending(key);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/subscription`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ features: { [key]: nextValue } }),
        },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error ?? `更新に失敗しました (${res.status})`);
      }
      await mutate();
    } catch (e) {
      console.error("Feature toggle failed:", e);
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
            サブスクリプション
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
          読み込み中...
        </CardContent>
      </Card>
    );
  }

  const planLabel = data.subscriptionPlan === "standard"
    ? "スタンダード"
    : data.subscriptionPlan === "document_package"
      ? "ドキュメントパッケージ"
      : "フリー";
  const planVariant: "default" | "secondary" | "outline" =
    data.subscriptionPlan === "standard"
      ? "default"
      : data.subscriptionPlan === "document_package"
        ? "secondary"
        : "outline";

  const manualGranted =
    data.standardSubscription?.manual === true ||
    data.documentPackage?.manual === true;

  const confirmName = studentName ? `${studentName} さん` : "この生徒";
  const dialogText = dialog
    ? (() => {
        const featLabel =
          dialog.target === "standard"
            ? "スタンダードプラン"
            : "ドキュメントパッケージ";
        return dialog.nextValue
          ? `${confirmName}に${featLabel}を付与しますか？`
          : `${confirmName}の${featLabel}を剥奪しますか？`;
      })()
    : "";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4" />
              サブスクリプション
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={planVariant}>{planLabel}</Badge>
              {manualGranted && (
                <Badge variant="outline" className="text-xs">
                  管理者付与
                </Badge>
              )}
              {data.hasStripeSubscription && (
                <Badge variant="outline" className="text-xs">
                  Stripe 連携
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.hasStripeSubscription && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Stripe でも契約があります (subscriptionId: {data.stripeSubscriptionId ?? "-"})。
                手動変更は Stripe 側の課金状態と整合しない可能性があります。
              </span>
            </div>
          )}

          {/* スタンダードプラン トグル */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="sub-standard" className="text-sm font-medium">
                スタンダードプラン
              </Label>
              <p className="text-xs text-muted-foreground">
                小論文添削・模擬面接・成長トラッキング・合格者データ・音声分析を解放
              </p>
            </div>
            <Switch
              id="sub-standard"
              checked={data.standardActive}
              disabled={pending !== null}
              onCheckedChange={(next) =>
                setDialog({ open: true, target: "standard", nextValue: next })
              }
            />
          </div>

          {/* ドキュメントパッケージ トグル */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="sub-docs" className="text-sm font-medium">
                ドキュメントパッケージ
              </Label>
              <p className="text-xs text-muted-foreground">
                出願書類エディタ・活動実績管理・AP最適化を解放
              </p>
            </div>
            <Switch
              id="sub-docs"
              checked={data.documentPackagePurchased}
              disabled={pending !== null}
              onCheckedChange={(next) =>
                setDialog({
                  open: true,
                  target: "documentPackage",
                  nextValue: next,
                })
              }
            />
          </div>

          {/* 機能ごとに個別 ON/OFF (プラン一括変更とは独立) */}
          {data.features && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>機能ごとに個別設定</span>
                <span className="text-[10px]">プラン一括 ON/OFF とは独立に変更可</span>
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FEATURE_LABELS.map(({ key, label }) => {
                  const on = data.features![key];
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
                        onCheckedChange={(next) => toggleFeature(key, next)}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                プラン (スタンダード / ドキュメントパッケージ) を変更すると、 こちらの個別設定はプラン既定値で上書きされます。
              </p>
            </div>
          )}

          {data.standardSubscription?.grantedAt && (
            <p className="text-xs text-muted-foreground">
              スタンダード付与日: {formatGrantedAt(data.standardSubscription.grantedAt)}
            </p>
          )}
          {data.documentPackage?.grantedAt && (
            <p className="text-xs text-muted-foreground">
              ドキュメントパッケージ付与日:{" "}
              {formatGrantedAt(data.documentPackage.grantedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialog?.open === true}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認</DialogTitle>
            <DialogDescription>{dialogText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={pending !== null}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (dialog) submit(dialog.target, dialog.nextValue);
              }}
              disabled={pending !== null}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                  処理中...
                </>
              ) : (
                "実行"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatGrantedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return iso;
  }
}

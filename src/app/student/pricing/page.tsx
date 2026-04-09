"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/api/client";
import { PRICING_PLANS } from "@/lib/stripe/plans";
import type { UserSubscription } from "@/lib/types/subscription";
import {
  Check,
  Crown,
  Loader2,
  ExternalLink,
  Sparkles,
  CreditCard,
  FileText,
} from "lucide-react";

export default function PricingPage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await authFetch("/api/subscription/status");
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const plan = searchParams.get("plan");
    if (checkout === "success") {
      const planName =
        plan === "standard" ? "スタンダードプラン" : "出願書類パッケージ";
      setSuccessMessage(`${planName}の購入が完了しました。`);
      // Refresh subscription status
      fetchSubscription();
    }
  }, [searchParams, fetchSubscription]);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const res = await authFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();

      if (data.devMode) {
        setSuccessMessage(
          "開発モード: Stripe未設定のため実際の決済は行われません。"
        );
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await authFetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.devMode) {
        setSuccessMessage(
          "開発モード: Stripe未設定のためポータルは利用できません。"
        );
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  const isStandard = subscription?.plan === "standard";
  const hasDocPackage = subscription?.documentPackage?.purchased === true;
  const hasStripeCustomer = !!subscription?.stripeCustomerId;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          <Crown className="mr-2 inline-block h-6 w-6 text-amber-500" />
          プラン
        </h1>
        <p className="mt-2 text-muted-foreground">
          総合型選抜対策に必要な機能を、あなたに合ったプランで
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {/* Current Plan Status */}
      {subscription && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  現在のプラン:{" "}
                  <Badge variant={isStandard ? "default" : "secondary"}>
                    {isStandard ? "スタンダード" : "無料"}
                  </Badge>
                  {hasDocPackage && (
                    <Badge variant="outline" className="ml-2">
                      出願書類パッケージ
                    </Badge>
                  )}
                </p>
                {subscription.standardSubscription?.cancelAtPeriodEnd && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    期間終了後に解約予定（
                    {new Date(
                      subscription.standardSubscription.currentPeriodEnd
                    ).toLocaleDateString("ja-JP")}
                    まで利用可能）
                  </p>
                )}
              </div>
            </div>
            {hasStripeCustomer && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                サブスクリプション管理
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Standard Plan */}
        {PRICING_PLANS.filter((p) => p.id === "standard").map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden ${
              plan.popular
                ? "border-primary shadow-lg ring-1 ring-primary/20"
                : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute right-0 top-0">
                <div className="rounded-bl-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <Sparkles className="mr-1 inline-block h-3 w-3" />
                  おすすめ
                </div>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">{plan.nameJa}</CardTitle>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold">
                  {plan.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  円/{plan.interval === "month" ? "月" : "年"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                総合型選抜の対策に必要な全機能を月額で
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isStandard ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled
                >
                  <Check className="mr-2 h-4 w-4" />
                  契約中
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleCheckout("standard")}
                  disabled={checkoutLoading === "standard"}
                >
                  {checkoutLoading === "standard" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  スタンダードに登録
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Document Package */}
        {PRICING_PLANS.filter((p) => p.id === "document_package").map(
          (plan) => (
            <Card key={plan.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">{plan.nameJa}</CardTitle>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">
                    {plan.price.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">円（一括）</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  出願書類の作成を徹底的にAIサポート
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {hasDocPackage ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled
                  >
                    <Check className="mr-2 h-4 w-4" />
                    購入済み
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleCheckout("document_package")}
                    disabled={checkoutLoading === "document_package"}
                  >
                    {checkoutLoading === "document_package" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    購入する
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">機能比較</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">機能</th>
                  <th className="py-2 text-center font-medium">無料</th>
                  <th className="py-2 text-center font-medium">
                    スタンダード
                  </th>
                  <th className="py-2 text-center font-medium">
                    +出願書類パッケージ
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "小論文AI添削",
                    free: false,
                    standard: true,
                    docPkg: true,
                  },
                  {
                    name: "AI模擬面接（4モード）",
                    free: false,
                    standard: true,
                    docPkg: true,
                  },
                  {
                    name: "成長トラッキング",
                    free: false,
                    standard: true,
                    docPkg: true,
                  },
                  {
                    name: "合格者データ閲覧",
                    free: false,
                    standard: true,
                    docPkg: true,
                  },
                  {
                    name: "音声面接分析",
                    free: false,
                    standard: true,
                    docPkg: true,
                  },
                  {
                    name: "志望校マッチング",
                    free: false,
                    standard: true,
                    docPkg: true,
                  },
                  {
                    name: "出願書類AIエディタ",
                    free: false,
                    standard: false,
                    docPkg: true,
                  },
                  {
                    name: "活動実績AIヒアリング",
                    free: false,
                    standard: false,
                    docPkg: true,
                  },
                  {
                    name: "AP別最適化表現生成",
                    free: false,
                    standard: false,
                    docPkg: true,
                  },
                ].map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 text-center">
                      {row.free ? (
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {row.standard ? (
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {row.docPkg ? (
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ / Notes */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-xs text-muted-foreground">
            * スタンダードプランは月額サブスクリプションです。いつでもキャンセル可能です。
          </p>
          <p className="text-xs text-muted-foreground">
            * 出願書類パッケージは一括購入で、永続的にご利用いただけます。
          </p>
          <p className="text-xs text-muted-foreground">
            * お支払いはStripeを通じた安全なクレジットカード決済です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionBannerProps {
  feature: string;
  description?: string;
}

export function SubscriptionBanner({
  feature,
  description,
}: SubscriptionBannerProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {feature}はプレミアム機能です
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {description ??
              "この機能を利用するにはプランのアップグレードが必要です。"}
          </p>
          <div className="mt-3">
            <Link href="/student/pricing">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50">
                プランを確認する
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * /tour/complete
 * チュートリアルの最後のページ。本物の student ルートには対応物がないので
 * チュートリアル専用で作る。「終了」ボタンでフラグを落として /login に戻す。
 */
export default function TourCompletePage() {
  const router = useRouter();

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("tutorialActive");
      window.localStorage.setItem("tutorialCompleted", "true");
    }
    router.push("/login");
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-12 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-10" />
      </div>
      <h1 className="mb-3 text-2xl font-bold tracking-tight lg:text-3xl">
        ツアーお疲れさまでした
      </h1>
      <p className="mb-6 text-sm text-muted-foreground lg:text-base">
        Coach for 総合型選抜 の主要機能を一通りご覧いただきました。
        <br />
        ご自身のアカウントを作成すると、すべての機能を本物のデータで使えます。
      </p>

      <Card className="mb-8 w-full text-left">
        <CardContent className="space-y-2 p-5 text-sm">
          {[
            "ダッシュボードで成長度を一目で把握",
            "AIとの対話で進める 7 ステップの自己分析",
            "志望校アドミッションポリシーとのマッチング",
            "月 1 回のスキルチェックで実力を定量化",
            "AI による小論文添削と志望理由書の起草",
            "音声 AI による本格的な模擬面接",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <span className="text-foreground/90">{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={handleFinish} size="lg">
          ログイン画面へ
        </Button>
      </div>
    </div>
  );
}

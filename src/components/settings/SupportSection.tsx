"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";

/**
 * 設定: サポート セクション。
 * チュートリアル再表示などサポート系の入口。
 */
export function SupportSection() {
  const router = useRouter();
  const { start: startTutorial } = useTutorial();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="size-4 text-primary" />
          サポート
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          アプリの主要機能をひととおり確認できます
        </p>
        <Button
          variant="outline"
          onClick={() => {
            startTutorial();
            router.push("/tour/dashboard");
          }}
        >
          チュートリアルを再表示
        </Button>
      </CardContent>
    </Card>
  );
}

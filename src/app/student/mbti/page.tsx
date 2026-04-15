"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MbtiSelector } from "@/components/mbti/MbtiSelector";
import { MbtiResultView } from "@/components/mbti/MbtiResultView";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import type { StudentProfile } from "@/lib/types/user";
import {
  Brain,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MbtiApiResponse {
  mbtiType: string | null;
  updatedAt: string | null;
}

export default function MbtiPage() {
  const { userProfile } = useAuth();
  const profile = userProfile as StudentProfile | null;
  const userId = profile?.uid;

  const { data, isLoading, mutate } = useAuthSWR<MbtiApiResponse>(
    userId ? `/api/mbti?userId=${userId}` : null
  );

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentType = selectedType ?? data?.mbtiType ?? null;

  const handleSelect = useCallback((type: string) => {
    setSelectedType(type);
    setSaveSuccess(false);
  }, []);

  const handleSave = async () => {
    if (!selectedType || !userId) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await authFetch("/api/mbti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mbtiType: selectedType }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        mutate({ mbtiType: selectedType, updatedAt: new Date().toISOString() });
      }
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedType && selectedType !== data?.mbtiType;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">MBTI性格タイプ診断</h1>
          <p className="text-muted-foreground mt-1">
            あなたの性格タイプから最適な学部を分析します
          </p>
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          MBTI性格タイプ診断
        </h1>
        <p className="text-muted-foreground mt-1">
          あなたの性格タイプから最適な学部を分析します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">まずは診断を受けてみよう</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            まだMBTIタイプがわからない場合は、16Personalitiesの無料診断を受けてみましょう。
            診断結果の4文字のタイプ（例: INTJ, ENFP）を下で選択してください。
          </p>
          <a
            href="https://www.16personalities.com/ja"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              16Personalities で診断する
            </Button>
          </a>
        </CardContent>
      </Card>

      <MbtiSelector
        initialType={data?.mbtiType ?? undefined}
        onSelect={handleSelect}
      />

      {currentType && <MbtiResultView mbtiType={currentType} />}

      {currentType && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "保存中..." : saveSuccess ? "保存しました" : "保存する"}
          </Button>
          {saveSuccess && (
            <span className="text-sm text-muted-foreground">
              タイプが保存されました
            </span>
          )}
        </div>
      )}
    </div>
  );
}

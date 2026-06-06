"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Compass, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";

type ConsentStatus = "none" | "pending" | "granted" | "revoked";
type ResearchPlan = "weekly" | "monthly";

interface Enrollment {
  researchEnrolled: boolean;
  researchPlan: ResearchPlan | null;
  researchConsentStatus: ConsentStatus;
  researchEnrolledAt: string | null;
}

const CONSENT_LABEL: Record<ConsentStatus, { label: string; className: string }> = {
  none: { label: "未登録", className: "border-gray-300 bg-gray-50 text-gray-600" },
  pending: {
    label: "保護者同意待ち",
    className: "border-amber-400 bg-amber-50 text-amber-700",
  },
  granted: {
    label: "同意済み",
    className: "border-emerald-400 bg-emerald-50 text-emerald-700",
  },
  revoked: { label: "同意撤回", className: "border-rose-400 bg-rose-50 text-rose-700" },
};

interface ResearchEnrollmentSectionProps {
  studentId: string;
}

/**
 * 生徒詳細に埋め込む「自己探究授業 受講」ブロック。
 * 受講の付与/解除・受講ペース変更・保護者同意状態の表示と手動更新を行う。
 * 録音・AI評価は researchConsentStatus === "granted" のときだけ解放される（同意ゲート）。
 */
export function ResearchEnrollmentSection({
  studentId,
}: ResearchEnrollmentSectionProps) {
  const [data, setData] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/research-enrollment`
      );
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("探究受講状態の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = useCallback(
    async (body: Partial<Enrollment>) => {
      setSaving(true);
      try {
        const res = await authFetch(
          `/api/admin/students/${studentId}/research-enrollment`,
          { method: "PATCH", body: JSON.stringify(body) }
        );
        if (!res.ok) throw new Error();
        setData(await res.json());
        toast.success("更新しました");
      } catch {
        toast.error("更新に失敗しました");
      } finally {
        setSaving(false);
      }
    },
    [studentId]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="size-4" />
          自己探究授業
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            読み込み中...
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">取得できませんでした</p>
        ) : !data.researchEnrolled ? (
          <p className="text-sm text-muted-foreground">
            上の「機能スイッチ」で探究授業をONにすると、ここに保護者同意の状況と受講ペースが表示されます。
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-teal-400 bg-teal-50 text-teal-700">
                受講中
              </Badge>
              <Badge className={CONSENT_LABEL[data.researchConsentStatus].className}>
                {CONSENT_LABEL[data.researchConsentStatus].label}
              </Badge>
              {data.researchConsentStatus !== "granted" && (
                <span className="text-xs text-muted-foreground">
                  ※録音・AI評価は保護者同意（granted）後に解放されます
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">受講ペース</span>
              <Select
                value={data.researchPlan ?? "monthly"}
                onValueChange={(v) =>
                  patch({ researchPlan: v as ResearchPlan })
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月1</SelectItem>
                  <SelectItem value="weekly">週1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-3">
              {data.researchConsentStatus !== "granted" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => patch({ researchConsentStatus: "granted" })}
                >
                  同意を手動で「同意済み」にする
                </Button>
              )}
              {data.researchConsentStatus === "granted" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => patch({ researchConsentStatus: "revoked" })}
                >
                  同意を撤回扱いにする
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              受講ON/OFFは上の「機能スイッチ」で。スイッチONは保護者同意取得済みとして扱います（同意の取得・記録は教室側で管理してください）。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

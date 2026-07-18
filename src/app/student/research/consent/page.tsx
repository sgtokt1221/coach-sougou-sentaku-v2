"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import { DraftSaveIndicator } from "@/components/shared/DraftSaveIndicator";

/** 同意項目（すべて必須チェック）。文面は法務レビュー前のドラフト。 */
const CONSENT_ITEMS = [
  { id: "rec", text: "授業中に、生徒の発表（教える時間）を録音することに同意します。" },
  {
    id: "ai",
    text: "録音および提出するスライド・資料・出典を、AIが処理（文字起こし・講評）することに同意します。",
  },
  {
    id: "retain",
    text: "記録は教室が定める期間・範囲で保管され、第三者に提供されないことを理解しました。",
  },
  { id: "view", text: "閲覧できるのは本人と担当講師のみであることを理解しました。" },
  { id: "revoke", text: "同意はいつでも撤回でき、撤回後は録音・AI処理を停止できることを理解しました。" },
];

interface ConsentState {
  researchEnrolled: boolean;
  researchConsentStatus: "none" | "pending" | "granted" | "revoked";
}

/**
 * 自己探究授業の録音・AI処理に関する保護者同意ページ（Web完結・Phase0）。
 * 生徒端末で保護者が同意する想定。文面は法務確認前のドラフト。
 */
export default function ResearchConsentPage() {
  const [state, setState] = useState<ConsentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const { status, restored, lastSavedAt, saveNow, clearDraft } = usePersistentDraft({
    key: "research-consent",
    value: { parentName, checked },
    onRestore: (draft) => {
      setParentName(draft.parentName);
      setChecked(draft.checked);
    },
    hasContent: (draft) =>
      Boolean(draft.parentName.trim() || Object.values(draft.checked).some(Boolean)),
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/research/consent");
        if (res.ok) setState(await res.json());
      } catch {
        // 取得失敗時は下のフォールバック表示
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allChecked = CONSENT_ITEMS.every((i) => checked[i.id]);
  const canSubmit = parentName.trim().length > 0 && allChecked && !submitting;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await authFetch("/api/research/consent", {
        method: "POST",
        body: JSON.stringify({
          parentName: parentName.trim(),
          agreedItems: CONSENT_ITEMS.map((i) => i.id),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "");
      }
      await clearDraft();
      setState((s) => (s ? { ...s, researchConsentStatus: "granted" } : s));
      toast.success("同意を受け付けました");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 lg:py-8">
      <h1 className="text-lg font-bold lg:text-xl">
        自己探究授業 録音・AI利用に関する同意
      </h1>

      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        この文面は確認用のドラフトです（正式運用前に内容を確定します）。
      </div>

      {state?.researchConsentStatus === "granted" ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <CheckCircle2 className="size-6 text-emerald-600" />
            <div>
              <p className="font-semibold">同意済みです。</p>
              <p className="text-sm text-muted-foreground">
                ご協力ありがとうございます。録音・AI講評の機能が利用できます。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : state && !state.researchEnrolled ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            探究授業の受講登録がありません。受講をご希望の場合は教室にお問い合わせください。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <DraftSaveIndicator
            status={status}
            restored={restored}
            lastSavedAt={lastSavedAt}
            onSaveNow={() => void saveNow()}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">同意内容のご確認（保護者の方へ）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <ul className="space-y-3">
              {CONSENT_ITEMS.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`c-${item.id}`}
                    className="mt-1 size-4"
                    checked={!!checked[item.id]}
                    onChange={(e) =>
                      setChecked((c) => ({ ...c, [item.id]: e.target.checked }))
                    }
                  />
                  <label htmlFor={`c-${item.id}`} className="text-sm leading-relaxed">
                    {item.text}
                  </label>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <Label htmlFor="parentName">保護者氏名</Label>
              <Input
                id="parentName"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="例: 山田 花子"
              />
            </div>

            <Button disabled={!canSubmit} onClick={submit}>
              {submitting && <Loader2 className="mr-1 size-3 animate-spin" />}
              上記すべてに同意する
            </Button>
            <p className="text-xs text-muted-foreground">
              すべての項目にチェックし、保護者氏名を入力すると送信できます。
            </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

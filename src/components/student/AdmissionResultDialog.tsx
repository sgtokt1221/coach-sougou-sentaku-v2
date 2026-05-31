"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { UniversityPicker, type PickerUniversity } from "@/components/essay/UniversityPicker";
import type { University } from "@/lib/types/university";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 送信先。退会時は /api/student/withdraw、登録時は /api/student/exam-results */
  endpoint: string;
  /** 退会モード（確認チェック必須・文言変更） */
  withdraw?: boolean;
  onDone?: () => void;
}

function toPick(u: PickerUniversity) {
  return {
    universityId: u.universityId,
    universityName: u.universityName,
    facultyId: u.facultyId,
    facultyName: u.facultyName,
  };
}

/**
 * 進路（進学先＋合格校 or 進学しない理由）を登録するダイアログ。
 * 退会フローと、卒業生の合格大学登録の両方で使う（endpoint で切替）。
 */
export function AdmissionResultDialog({
  open,
  onOpenChange,
  endpoint,
  withdraw,
  onDone,
}: Props) {
  const [items, setItems] = useState<PickerUniversity[]>([]);
  const [enrolledCid, setEnrolledCid] = useState<string | null>(null);
  const [noUniversity, setNoUniversity] = useState(false);
  const [reason, setReason] = useState("");
  const [passed, setPassed] = useState<PickerUniversity[]>([]);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || items.length) return;
    fetch("/api/universities")
      .then((r) => r.json())
      .then((d) => {
        const us: University[] = d.universities ?? [];
        const flat: PickerUniversity[] = [];
        for (const u of us)
          for (const f of u.faculties ?? [])
            flat.push({
              universityId: u.id,
              facultyId: f.id,
              universityName: u.name,
              facultyName: f.name,
              group: u.group,
              prefecture: u.prefecture,
            });
        setItems(flat);
      })
      .catch(() => {});
  }, [open, items.length]);

  const byCid = useMemo(
    () => new Map(items.map((i) => [`${i.universityId}:${i.facultyId}`, i])),
    [items],
  );
  const enrolled = enrolledCid ? byCid.get(enrolledCid) : undefined;

  function addPassed(cid: string) {
    const it = byCid.get(cid);
    if (!it) return;
    setPassed((prev) =>
      prev.some((p) => p.universityId === it.universityId && p.facultyId === it.facultyId)
        ? prev
        : [...prev, it],
    );
  }

  async function submit() {
    if (!noUniversity && !enrolled) {
      toast.error("進学先を選択してください（無い場合は「進学しない」を選択）");
      return;
    }
    if (noUniversity && !reason.trim()) {
      toast.error("進学しない理由を入力してください");
      return;
    }
    if (withdraw && !agree) {
      toast.error("退会の確認にチェックしてください");
      return;
    }
    const payload = noUniversity
      ? { nonUniversity: { reason: reason.trim() }, passed: passed.map(toPick) }
      : { enrolled: enrolled ? toPick(enrolled) : undefined, passed: passed.map(toPick) };

    setSubmitting(true);
    try {
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "送信に失敗しました");
      }
      toast.success(withdraw ? "退会しました" : "進学先を登録しました");
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{withdraw ? "退会（進学先の登録が必要です）" : "進学先の登録"}</DialogTitle>
          <DialogDescription>
            進学先（実際に進学する大学）を選んでください。合格した他の大学も任意で登録できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 進学先 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">進学先（必須）</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={noUniversity}
                  onChange={(e) => setNoUniversity(e.target.checked)}
                />
                進学しない（浪人・就職・未定）
              </label>
            </div>
            {noUniversity ? (
              <Input
                placeholder="理由（例: 浪人 / 就職 / 未定）"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            ) : (
              <>
                {enrolled && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    選択中: {enrolled.universityName} {enrolled.facultyName}
                  </p>
                )}
                <div className="max-h-[36vh] overflow-y-auto rounded-md border p-2">
                  <UniversityPicker
                    items={items}
                    selectedCompoundId={enrolledCid}
                    onSelect={setEnrolledCid}
                  />
                </div>
              </>
            )}
          </div>

          {/* 合格校（任意・複数） */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">他に合格した大学（任意・複数）</Label>
            {passed.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {passed.map((p) => (
                  <span
                    key={`${p.universityId}:${p.facultyId}`}
                    className="inline-flex items-center gap-1 rounded-full border bg-accent px-2.5 py-1 text-xs"
                  >
                    {p.universityName} {p.facultyName}
                    <button
                      type="button"
                      onClick={() =>
                        setPassed((prev) =>
                          prev.filter(
                            (x) =>
                              !(x.universityId === p.universityId && x.facultyId === p.facultyId),
                          ),
                        )
                      }
                      aria-label="削除"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="max-h-[30vh] overflow-y-auto rounded-md border p-2">
              <UniversityPicker items={items} selectedCompoundId={null} onSelect={addPassed} />
            </div>
          </div>

          {withdraw && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              退会するとアカウントが利用できなくなることを理解しました
            </label>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            キャンセル
          </Button>
          <Button
            variant={withdraw ? "destructive" : "default"}
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? "送信中..." : withdraw ? "退会する" : "登録する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isGraduated } from "@/lib/utils/grade";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, X } from "lucide-react";
import { AdmissionResultDialog } from "@/components/student/AdmissionResultDialog";
import type { StudentProfile } from "@/lib/types/user";

/**
 * 卒業済み×進学先未登録の生徒に、進学先（合格大学）の登録を催促する。
 * - 起動時に1回 /api/student/graduation-reminder を叩きプッシュ通知を送る（サーバ側 throttle）。
 * - 画面上部に常設バナーを出す（その場で再表示できるよう dismiss はセッション内のみ）。
 * アプリ操作は塞がない（プッシュ主体方針）。
 */
export function GraduationReminder() {
  const { userProfile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pushedRef = useRef(false);

  const profile = userProfile as StudentProfile | null;
  const applicable =
    !!profile &&
    profile.role === "student" &&
    profile.graduationOutcomeRecorded !== true &&
    isGraduated(profile.grade, profile.gradeUpdatedAt, profile.isRonin);

  useEffect(() => {
    if (!applicable || pushedRef.current) return;
    pushedRef.current = true;
    authFetch("/api/student/graduation-reminder", { method: "POST" }).catch(() => {});
  }, [applicable]);

  if (!applicable || dismissed) return null;

  return (
    <>
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
        <GraduationCap className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          ご卒業おめでとうございます。<strong>進学先（合格した大学）</strong>を登録してください。
        </span>
        <Button size="sm" onClick={() => setOpen(true)}>
          登録する
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="閉じる"
          className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <X className="size-4" />
        </button>
      </div>

      <AdmissionResultDialog
        open={open}
        onOpenChange={setOpen}
        endpoint="/api/student/exam-results"
        onDone={() => refreshProfile()}
      />
    </>
  );
}

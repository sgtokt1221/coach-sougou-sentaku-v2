"use client";

import { useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onJoin: () => Promise<void>;
  onSkip: () => void;
  teacherName?: string;
}

export function StudentRecordingJoinModal({
  open,
  onJoin,
  onSkip,
  teacherName,
}: Props) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await onJoin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "参加に失敗しました");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !joining && onSkip()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="size-5 text-teal-600" />
            {teacherName ? `${teacherName} ` : ""}先生が授業を開始しました
          </DialogTitle>
          <DialogDescription>
            録音に参加すると、授業の振り返りがより正確になります。マイクアクセスを許可して参加してください。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>・ マイクの音声のみ録音されます (カメラ映像は記録されません)</p>
          <p>・ 授業終了時に自動で停止・アップロードされます</p>
          <p>・ 録音は先生と管理者のみ閲覧可能です</p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={joining}
            className="cursor-pointer"
          >
            今回はスキップ
          </Button>
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="cursor-pointer bg-teal-500 hover:bg-teal-600 text-white"
          >
            {joining ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Mic className="mr-1 size-4" />
            )}
            参加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

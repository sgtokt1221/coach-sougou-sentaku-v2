"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { reauthenticateUser } from "@/lib/firebase/account";
import { toast } from "sonner";

/**
 * メール変更 / パスワード変更時に `requires-recent-login` が発生したときの
 * 再認証ダイアログ。 現在のパスワードを入力させて成功したら onSuccess を呼び、
 * 呼出元が元の操作をリトライする。
 *
 * Email + Password プロバイダ専用 (OAuth ユーザーは呼ばない想定)。
 */
export function ReauthDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!password) {
      toast.error("パスワードを入力してください");
      return;
    }
    setSubmitting(true);
    try {
      await reauthenticateUser(password);
      setPassword("");
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "再認証に失敗しました",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>本人確認</DialogTitle>
          <DialogDescription>
            セキュリティのため、現在のパスワードを再入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reauth-password">現在のパスワード</Label>
          <Input
            id="reauth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : null}
            確認
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, LogOut, Camera, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOutUser } from "@/lib/firebase/auth";
import {
  changeUserPassword,
  hasPasswordProvider,
  updateDisplayNameFor,
  updateUserEmailWithVerify,
  uploadAvatar,
} from "@/lib/firebase/account";
import { auth } from "@/lib/firebase/config";
import { ReauthDialog } from "./ReauthDialog";
import { toast } from "sonner";

/**
 * 設定: アカウント セクション。
 * - 表示名 / メールアドレス / プロフィール画像 / パスワード変更 / ログアウト
 *
 * パスワード変更は Email+Password プロバイダのユーザーのみ表示。
 * メール変更とパスワード変更で requires-recent-login が出たら
 * ReauthDialog で再認証 → 成功時に元の操作を再実行。
 */
export function AccountSection() {
  const { user, userProfile } = useAuth();
  const currentUser = user ?? auth?.currentUser ?? null;
  const isPasswordUser = hasPasswordProvider(currentUser);

  const [displayName, setDisplayName] = useState(
    currentUser?.displayName ?? userProfile?.displayName ?? "",
  );
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [photoURL, setPhotoURL] = useState(
    currentUser?.photoURL ?? userProfile?.photoURL ?? "",
  );

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [reauthOpen, setReauthOpen] = useState(false);
  const reauthRetryRef = useRef<(() => Promise<void>) | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isRecentLoginError = (e: unknown): boolean => {
    if (typeof e !== "object" || e === null) return false;
    const code = (e as { code?: string }).code;
    return code === "auth/requires-recent-login";
  };

  const triggerReauth = (retry: () => Promise<void>) => {
    reauthRetryRef.current = retry;
    setReauthOpen(true);
  };

  const handleSaveDisplayName = async () => {
    setSavingName(true);
    try {
      await updateDisplayNameFor(displayName);
      toast.success("表示名を更新しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSavingName(false);
    }
  };

  const doSaveEmail = async () => {
    await updateUserEmailWithVerify(email);
    toast.success("確認メールを送信しました。 メール内のリンクから変更を完了してください");
  };

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    try {
      await doSaveEmail();
    } catch (e) {
      if (isRecentLoginError(e)) {
        triggerReauth(doSaveEmail);
      } else {
        toast.error(e instanceof Error ? e.message : "更新に失敗しました");
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePickAvatar = () => fileInputRef.current?.click();

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      setPhotoURL(url);
      toast.success("プロフィール画像を更新しました");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "アップロードに失敗しました",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const doSavePassword = async () => {
    await changeUserPassword(currentPassword, newPassword);
    setCurrentPassword("");
    setNewPassword("");
    toast.success("パスワードを変更しました");
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("現在のパスワードと新しいパスワードを入力してください");
      return;
    }
    setSavingPassword(true);
    try {
      await doSavePassword();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleReauthSuccess = async () => {
    const retry = reauthRetryRef.current;
    reauthRetryRef.current = null;
    if (!retry) return;
    try {
      await retry();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作に失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4 text-primary" />
          アカウント
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* プロフィール画像 */}
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={photoURL || undefined} alt="avatar" />
            <AvatarFallback>
              {displayName.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePickAvatar}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Camera className="mr-1 size-4" />
              )}
              画像を変更
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              2MB 以下 / jpg, png, webp
            </p>
          </div>
        </div>

        {/* 表示名 */}
        <div className="space-y-2">
          <Label htmlFor="display-name">表示名</Label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 田中 太郎"
            />
            <Button onClick={handleSaveDisplayName} disabled={savingName}>
              {savingName ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>

        {/* メールアドレス */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1.5">
            <Mail className="size-3.5" />
            メールアドレス
          </Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={handleSaveEmail} disabled={savingEmail}>
              {savingEmail ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "変更"
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            変更後、 新しいアドレスに届く確認メール内のリンクから手続きを完了してください
          </p>
        </div>

        {/* パスワード変更 (Email プロバイダのみ) */}
        {isPasswordUser ? (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Lock className="size-3.5" />
              パスワード変更
            </Label>
            <Input
              type="password"
              placeholder="現在のパスワード"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="新しいパスワード (8 文字以上)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex justify-end">
              <Button onClick={handleSavePassword} disabled={savingPassword}>
                {savingPassword ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : null}
                変更
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            Google などの外部ログインを使用しているため、 このアプリからパスワード変更はできません。 ログインプロバイダ側で変更してください。
          </p>
        )}

        {/* ログアウト */}
        <div className="border-t pt-4">
          <Button variant="outline" onClick={() => void signOutUser()}>
            <LogOut className="mr-1 size-4" />
            ログアウト
          </Button>
        </div>
      </CardContent>

      <ReauthDialog
        open={reauthOpen}
        onOpenChange={setReauthOpen}
        onSuccess={handleReauthSuccess}
      />
    </Card>
  );
}

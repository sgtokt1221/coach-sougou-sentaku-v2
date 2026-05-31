"use client";

import { AccountSection } from "@/components/settings/AccountSection";
import { NotificationSettingsSection } from "@/components/settings/NotificationSettingsSection";
import { SupportSection } from "@/components/settings/SupportSection";

/**
 * 講師ポータル「設定」ページ。
 * 生徒/管理者と共通のセクションを流用する。
 *
 * セクション:
 * 1. アカウント (表示名 / メール / 画像 / パスワード / ログアウト)
 * 2. 通知 (Web Push + トグル / 通知メール)
 * 3. サポート (チュートリアル再表示)
 */
export default function TeacherSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:space-y-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight lg:text-2xl">
          設定
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          アカウント / 通知 / サポート
        </p>
      </div>
      <AccountSection />
      <NotificationSettingsSection />
      <SupportSection />
    </div>
  );
}

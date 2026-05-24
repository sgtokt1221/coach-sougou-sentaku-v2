"use client";

import { AccountSection } from "@/components/settings/AccountSection";
import { NotificationSettingsSection } from "@/components/settings/NotificationSettingsSection";
import { GoogleCalendarSection } from "@/components/settings/GoogleCalendarSection";
import { BulkNotificationSection } from "@/components/settings/BulkNotificationSection";
import { SupportSection } from "@/components/settings/SupportSection";

/**
 * 管理者ポータル「設定」 ページ。
 * 旧 /admin/settings (Google Calendar 連携のみ) と
 * 旧 /admin/settings/notifications (一括送信) を 5 セクションに統合。
 *
 * セクション:
 * 1. アカウント (表示名 / メール / 画像 / パスワード / ログアウト)
 * 2. 自分の通知 (Web Push + 書類期限 / 週次進捗 / 通知メール)
 * 3. Google Calendar 連携
 * 4. 一括送信 (生徒向けアラートダイジェスト / 期限リマインダー)
 * 5. サポート (チュートリアル再表示)
 */
export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:space-y-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight lg:text-2xl">
          設定
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          アカウント / 自分の通知 / 連携 / 一括送信 / サポート
        </p>
      </div>
      <AccountSection />
      <NotificationSettingsSection />
      <GoogleCalendarSection />
      <BulkNotificationSection />
      <SupportSection />
    </div>
  );
}

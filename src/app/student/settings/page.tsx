"use client";

import { AccountSection } from "@/components/settings/AccountSection";
import { LearningProfileSection } from "@/components/settings/LearningProfileSection";
import { NotificationSettingsSection } from "@/components/settings/NotificationSettingsSection";
import { SupportSection } from "@/components/settings/SupportSection";
import { WithdrawSection } from "@/components/settings/WithdrawSection";

/**
 * 生徒ポータル「設定」ページ。
 * 旧 /student/settings (志望校 + 基礎情報 + チュートリアル) と
 * 旧 /student/settings/notifications (通知設定) を 4 セクションに統合。
 *
 * セクション:
 * 1. アカウント (表示名 / メール / 画像 / パスワード / ログアウト)
 * 2. 学習プロフィール (志望校 + 基礎情報)
 * 3. 通知 (Web Push + 書類期限 / 週次進捗 / 通知メール)
 * 4. サポート (チュートリアル再表示)
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:space-y-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight lg:text-2xl">
          設定
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          アカウント / 学習プロフィール / 通知 / サポート
        </p>
      </div>
      <AccountSection />
      <LearningProfileSection />
      <NotificationSettingsSection />
      <SupportSection />
      <WithdrawSection />
    </div>
  );
}

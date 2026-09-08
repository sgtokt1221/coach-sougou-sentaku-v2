"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

/**
 * 通話は生徒・講師・管理者が同じ URL を開くため、ポータル配下ではなく
 * ルート直下に置いている。RoleGuard はかけず、通話ごとの参加者判定は
 * サーバ側（participantUids）に任せる。
 *
 * AppLayout も通さない。通話は画面いっぱいに使う没入画面で、サイドバーや
 * 下部ナビは邪魔になるため。着信モーダルも出さない（既に通話中なので）。
 */
export default function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ErrorBoundary fallbackUrl="/">{children}</ErrorBoundary>
    </AuthGuard>
  );
}

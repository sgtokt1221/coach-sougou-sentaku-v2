"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { GoogleCalendarIntegration } from "@/components/admin/GoogleCalendarIntegration";

/**
 * 管理者設定タブ用 Google Calendar 連携セクション。
 * 既存 GoogleCalendarIntegration をカード枠でラップして他セクションと見た目を揃える。
 */
export function GoogleCalendarSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="size-4 text-primary" />
          Google Calendar 連携
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GoogleCalendarIntegration />
      </CardContent>
    </Card>
  );
}

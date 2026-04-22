import { Settings } from "lucide-react";
import { GoogleCalendarIntegration } from "@/components/admin/GoogleCalendarIntegration";

export const metadata = {
  title: "設定 - Coach",
};

export default function AdminSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">設定</h1>
          <p className="text-sm text-muted-foreground">
            管理者向けの連携と通知の設定
          </p>
        </div>
      </div>

      <GoogleCalendarIntegration />
    </div>
  );
}

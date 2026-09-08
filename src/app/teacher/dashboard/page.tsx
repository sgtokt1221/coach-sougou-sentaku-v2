"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";

interface TodaySession {
  id: string;
  studentName: string;
  type: string;
  scheduledAt: string;
  preferredTime: string;
  duration: number;
  status: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodaySessions();
  }, []);

  const loadTodaySessions = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await authFetch(`/api/sessions?date=${today}`);

      if (response.ok) {
        const data = await response.json();
        // 講師自身のセッションのみフィルタ（APIで実装される予定）
        setTodaySessions(data);
      }
    } catch (error) {
      console.error("今日のセッション取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // "14:00:00" → "14:00"
  };

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">講師ダッシュボード</h1>
        <p className="text-muted-foreground">
          おかえりなさい、{user?.displayName || "講師"}さん
        </p>
      </div>

      {/* 通知の許可はこれまで生徒にしか案内しておらず、講師は未登録だった */}
      <NotificationPermissionBanner />

      {/* クイックアクション */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card
          className="hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={() => router.push("/teacher/schedule")}
        >
          <CardContent className="flex items-center p-6">
            <Calendar className="text-primary mr-4 h-8 w-8" />
            <div>
              <div className="font-semibold">シフト入力</div>
              <div className="text-muted-foreground text-sm">
                翌月の勤務予定を登録
              </div>
            </div>
            <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
          </CardContent>
        </Card>

        <Card
          className="hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={() => router.push("/teacher/roster")}
        >
          <CardContent className="flex items-center p-6">
            <Users className="text-primary mr-4 h-8 w-8" />
            <div>
              <div className="font-semibold">担当生徒</div>
              <div className="text-muted-foreground text-sm">
                生徒一覧と進捗確認
              </div>
            </div>
            <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
          </CardContent>
        </Card>

        <Card
          className="hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={() => router.push("/teacher/sessions")}
        >
          <CardContent className="flex items-center p-6">
            <Clock className="text-primary mr-4 h-8 w-8" />
            <div>
              <div className="font-semibold">セッション履歴</div>
              <div className="text-muted-foreground text-sm">
                過去の指導記録
              </div>
            </div>
            <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
          </CardContent>
        </Card>
      </div>

      {/* 今日のセッション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            今日のセッション
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">読み込み中...</div>
          ) : todaySessions.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              本日のセッションはありません
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="hover:bg-accent/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium">{session.studentName}</div>
                      <div className="text-muted-foreground text-sm">
                        {session.type === "coaching" && "コーチング"}
                        {session.type === "mock_interview" && "模擬面接"}
                        {session.type === "essay_review" && "小論文添削"}
                        {session.type === "general" && "一般指導"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatTime(session.preferredTime)}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {session.duration}分
                      </div>
                    </div>
                    <Badge
                      variant={
                        session.status === "scheduled"
                          ? "default"
                          : session.status === "completed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {session.status === "scheduled" && "予定"}
                      {session.status === "completed" && "完了"}
                      {session.status === "cancelled" && "キャンセル"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* お知らせ・Tips */}
      <Card>
        <CardHeader>
          <CardTitle>お知らせ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded border-l-4 border-sky-400 bg-sky-50 p-3">
            <div className="text-sm font-medium text-sky-800">
              シフト提出期限のお知らせ
            </div>
            <div className="mt-1 text-sm text-sky-700">
              毎月25日までに翌月のシフトを提出してください。
            </div>
          </div>
          <div className="rounded border-l-4 border-emerald-400 bg-emerald-50 p-3">
            <div className="text-sm font-medium text-emerald-800">
              システム更新
            </div>
            <div className="mt-1 text-sm text-emerald-700">
              新機能: セッション記録の音声転写機能が利用可能になりました。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

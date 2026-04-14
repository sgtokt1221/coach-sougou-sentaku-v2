"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";

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
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">講師ダッシュボード</h1>
        <p className="text-muted-foreground">
          おかえりなさい、{user?.displayName || "講師"}さん
        </p>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => router.push("/teacher/schedule")}>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-primary mr-4" />
            <div>
              <div className="font-semibold">シフト入力</div>
              <div className="text-sm text-muted-foreground">
                翌月の勤務予定を登録
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => router.push("/teacher/students")}>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-primary mr-4" />
            <div>
              <div className="font-semibold">担当生徒</div>
              <div className="text-sm text-muted-foreground">
                生徒一覧と進捗確認
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => router.push("/teacher/sessions")}>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-primary mr-4" />
            <div>
              <div className="font-semibold">セッション履歴</div>
              <div className="text-sm text-muted-foreground">
                過去の指導記録
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* 今日のセッション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            今日のセッション
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : todaySessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              本日のセッションはありません
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium">{session.studentName}</div>
                      <div className="text-sm text-muted-foreground">
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
                      <div className="text-sm text-muted-foreground">
                        {session.duration}分
                      </div>
                    </div>
                    <Badge
                      variant={
                        session.status === "scheduled" ? "default" :
                        session.status === "completed" ? "secondary" : "outline"
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
          <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <div className="text-sm font-medium text-blue-800">
              シフト提出期限のお知らせ
            </div>
            <div className="text-sm text-blue-700 mt-1">
              毎月25日までに翌月のシフトを提出してください。
            </div>
          </div>
          <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="text-sm font-medium text-green-800">
              システム更新
            </div>
            <div className="text-sm text-green-700 mt-1">
              新機能: セッション記録の音声転写機能が利用可能になりました。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
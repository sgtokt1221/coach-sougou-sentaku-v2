import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/client";
import { alertDigestTemplate } from "@/lib/email/templates";
import type { AlertItem } from "@/lib/types/admin";

/**
 * POST /api/notifications/alert-digest
 * 管理者向けアラートダイジェストメールを送信
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    // アラートを取得（内部APIを呼ぶのではなく直接Firestoreから取得）
    let alerts: AlertItem[] = [];

    if (!adminDb) {
      // mock fallback
      alerts = [
        {
          id: "alert_001",
          studentUid: "mock_student_001",
          studentName: "田中 太郎",
          type: "inactive",
          severity: "warning",
          message: "最終活動から10日経過しています",
          detectedAt: new Date().toISOString(),
          acknowledged: false,
        },
        {
          id: "alert_002",
          studentUid: "mock_student_002",
          studentName: "佐藤 花子",
          type: "declining",
          severity: "critical",
          message: "直近3回のスコアが連続で下降しています（38→34→28）",
          detectedAt: new Date().toISOString(),
          acknowledged: false,
        },
        {
          id: "alert_003",
          studentUid: "mock_student_003",
          studentName: "山田 美咲",
          type: "document_deadline",
          severity: "high",
          message: "「志望理由書」（京都大学）の期限が2日後です",
          detectedAt: new Date().toISOString(),
          acknowledged: false,
        },
      ];
    } else {
      // Firestoreからアラートデータを取得する（/api/admin/alertsと同等のロジック）
      const alertsResponse = await fetch(
        new URL("/api/admin/alerts", request.url).toString(),
        {
          headers: {
            Authorization: request.headers.get("Authorization") || "",
            "X-Dev-Role": request.headers.get("X-Dev-Role") || "",
          },
        }
      );
      if (alertsResponse.ok) {
        alerts = await alertsResponse.json();
      }
    }

    // 管理者のメールアドレスを取得
    let adminEmail = "";
    if (adminDb) {
      const adminDoc = await adminDb.collection("users").doc(uid).get();
      const adminData = adminDoc.data();
      const prefs = adminData?.notificationPrefs;
      adminEmail = prefs?.email || adminData?.email || "";
    } else {
      adminEmail = "admin@example.com";
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: "管理者のメールアドレスが設定されていません" },
        { status: 400 }
      );
    }

    // ダイジェストメール送信
    const html = alertDigestTemplate(alerts);
    const result = await sendEmail({
      to: adminEmail,
      subject: `【CoachFor】アラートダイジェスト（${alerts.length}件）`,
      html,
    });

    // 送信記録をFirestoreに保存
    if (adminDb) {
      await adminDb.collection("notificationLogs").add({
        type: "alert_digest",
        sentBy: uid,
        sentTo: adminEmail,
        alertCount: alerts.length,
        success: result.success,
        sentAt: new Date(),
      });
    }

    return NextResponse.json({
      success: result.success,
      alertCount: alerts.length,
      sentTo: adminEmail,
      emailId: result.id,
      error: result.error,
    });
  } catch (error) {
    console.error("Alert digest error:", error);
    return NextResponse.json(
      { error: "アラートダイジェストの送信に失敗しました" },
      { status: 500 }
    );
  }
}

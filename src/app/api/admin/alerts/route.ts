import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { AlertItem } from "@/lib/types/admin";

interface StudentAlertData {
  uid: string;
  displayName: string;
  lastActivityAt: string | null;
  scoreHistory: number[];
  weaknesses: { area: string; count: number }[];
  documents: DocumentAlertData[];
}

interface DocumentAlertData {
  title: string;
  universityName: string;
  status: string;
  deadline: string | null;
}

/**
 * 書類期限から severity を判定
 * 0日以下: critical, 1-3日: high, 4-7日: warning, 7日超: null
 */
function getDeadlineSeverity(daysUntil: number): "critical" | "high" | "warning" | null {
  if (daysUntil <= 0) return "critical";
  if (daysUntil <= 3) return "high";
  if (daysUntil <= 7) return "warning";
  return null;
}

function detectAlerts(students: StudentAlertData[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  let alertId = 1;

  for (const student of students) {
    // inactive: 7日以上未活動 or 活動なし
    if (!student.lastActivityAt) {
      alerts.push({
        id: `alert_${String(alertId++).padStart(3, "0")}`,
        studentUid: student.uid,
        studentName: student.displayName,
        type: "inactive",
        severity: "critical",
        message: "登録後一度も添削を提出していません",
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        acknowledged: false,
      });
    } else {
      const daysSince =
        (Date.now() - new Date(student.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 7) {
        alerts.push({
          id: `alert_${String(alertId++).padStart(3, "0")}`,
          studentUid: student.uid,
          studentName: student.displayName,
          type: "inactive",
          severity: daysSince >= 14 ? "critical" : "warning",
          message: `最終活動から${Math.floor(daysSince)}日経過しています`,
          detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          acknowledged: false,
        });
      }
    }

    // declining: 直近3回スコア連続下降
    const scores = student.scoreHistory;
    if (scores.length >= 3) {
      const recent = scores.slice(-3);
      if (recent[0] > recent[1] && recent[1] > recent[2]) {
        const drop = recent[0] - recent[2];
        alerts.push({
          id: `alert_${String(alertId++).padStart(3, "0")}`,
          studentUid: student.uid,
          studentName: student.displayName,
          type: "declining",
          severity: drop >= 10 ? "critical" : "warning",
          message: `直近3回のスコアが連続で下降しています（${recent[0]}→${recent[1]}→${recent[2]}）`,
          detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          acknowledged: false,
        });
      }
    }

    // repeated_weakness: 同じ弱点5回以上
    for (const w of student.weaknesses) {
      if (w.count >= 5) {
        alerts.push({
          id: `alert_${String(alertId++).padStart(3, "0")}`,
          studentUid: student.uid,
          studentName: student.displayName,
          type: "repeated_weakness",
          severity: w.count >= 7 ? "critical" : "warning",
          message: `「${w.area}」が${w.count}回以上繰り返し指摘されています`,
          detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          acknowledged: false,
        });
      }
    }

    // document_deadline: 期限が迫っている未完成書類
    for (const doc of student.documents) {
      if (!doc.deadline || doc.status === "final") continue;

      const deadlineDate = new Date(doc.deadline + "T00:00:00");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const severity = getDeadlineSeverity(daysUntil);
      if (!severity) continue;

      let message: string;
      if (daysUntil < 0) {
        message = `${student.displayName}の「${doc.title}」（${doc.universityName}）の期限を${Math.abs(daysUntil)}日超過しています`;
      } else if (daysUntil === 0) {
        message = `${student.displayName}の「${doc.title}」（${doc.universityName}）の期限が本日です`;
      } else {
        message = `${student.displayName}の「${doc.title}」（${doc.universityName}）の期限が${daysUntil}日後です`;
      }

      alerts.push({
        id: `alert_${String(alertId++).padStart(3, "0")}`,
        studentUid: student.uid,
        studentName: student.displayName,
        type: "document_deadline",
        severity,
        message,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
      });
    }
  }

  // severity優先度でソート (critical > high > warning)、同一なら新しい順
  const severityOrder: Record<string, number> = { critical: 0, high: 1, warning: 2 };
  alerts.sort((a, b) => {
    const sA = severityOrder[a.severity] ?? 9;
    const sB = severityOrder[b.severity] ?? 9;
    if (sA !== sB) return sA - sB;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  return alerts;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get("viewAs");
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;
    const effectiveRole = (role === "superadmin" && viewAs) ? "admin" : role;

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // Firestore接続時: 全生徒を走査してアラート生成
    const studentsQuery = effectiveRole === "superadmin"
      ? adminDb.collection("users").where("role", "==", "student")
      : adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "==", effectiveUid);
    const snapshot = await studentsQuery.get();

    const studentDataList: StudentAlertData[] = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const studentUid = docSnap.id;

        const essaysSnap = await adminDb!
          .collection("users")
          .doc(studentUid)
          .collection("essays")
          .orderBy("submittedAt", "desc")
          .get();
        const latestEssay = essaysSnap.docs[0]?.data();
        const lastActivityAt: string | null = latestEssay?.submittedAt
          ? latestEssay.submittedAt.toDate().toISOString()
          : null;

        const scoreHistory = essaysSnap.docs
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number")
          .reverse();

        const weaknessesSnap = await adminDb!
          .collection("users")
          .doc(studentUid)
          .collection("weaknesses")
          .get();
        const weaknesses = weaknessesSnap.docs.map((d) => {
          const wData = d.data();
          return { area: wData.area ?? "", count: wData.count ?? 0 };
        });

        // 書類データ取得
        const documentsSnap = await adminDb!
          .collection("users")
          .doc(studentUid)
          .collection("documents")
          .get();
        const documents: DocumentAlertData[] = documentsSnap.docs.map((d) => {
          const dData = d.data();
          return {
            title: dData.title ?? dData.type ?? "書類",
            universityName: dData.universityName ?? "",
            status: dData.status ?? "draft",
            deadline: dData.deadline ?? null,
          };
        });

        return {
          uid: studentUid,
          displayName: data.displayName ?? "",
          lastActivityAt,
          scoreHistory,
          weaknesses,
          documents,
        };
      })
    );

    const alerts = detectAlerts(studentDataList);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Admin alerts error:", error);
    return NextResponse.json({ error: "データの取得中にエラーが発生しました" }, { status: 500 });
  }
}

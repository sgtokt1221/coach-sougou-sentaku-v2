import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { AlertItem } from "@/lib/types/admin";

interface MockStudentData {
  uid: string;
  displayName: string;
  lastActivityAt: string | null;
  scoreHistory: number[];
  weaknesses: { area: string; count: number }[];
  documents: MockDocumentData[];
}

interface MockDocumentData {
  title: string;
  universityName: string;
  status: string;
  deadline: string | null;
}

const MOCK_STUDENT_DATA: MockStudentData[] = [
  {
    uid: "mock_student_001",
    displayName: "田中 太郎",
    lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    scoreHistory: [30, 33, 35, 38],
    weaknesses: [
      { area: "論拠の具体性", count: 3 },
      { area: "AP連動表現", count: 2 },
    ],
    documents: [
      {
        title: "志望理由書",
        universityName: "東京大学",
        status: "draft",
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        title: "学業活動報告書",
        universityName: "京都大学",
        status: "final",
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
  },
  {
    uid: "mock_student_002",
    displayName: "佐藤 花子",
    lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    scoreHistory: [28, 30, 32],
    weaknesses: [
      { area: "構成力", count: 4 },
    ],
    documents: [
      {
        title: "志望理由書",
        universityName: "早稲田大学",
        status: "in_review",
        deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
  },
  {
    uid: "mock_student_003",
    displayName: "鈴木 一郎",
    lastActivityAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
    scoreHistory: [35, 37, 39, 41],
    weaknesses: [
      { area: "表現の多様性", count: 2 },
    ],
    documents: [],
  },
  {
    uid: "mock_student_004",
    displayName: "山田 美咲",
    lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    scoreHistory: [32, 35, 30, 25],
    weaknesses: [
      { area: "論理展開の一貫性", count: 7 },
      { area: "結論の明確さ", count: 5 },
    ],
    documents: [
      {
        title: "研究計画書",
        universityName: "同志社大学",
        status: "draft",
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
  },
  {
    uid: "mock_student_005",
    displayName: "高橋 健太",
    lastActivityAt: null,
    scoreHistory: [],
    weaknesses: [],
    documents: [],
  },
  {
    uid: "mock_student_006",
    displayName: "中村 翔太",
    lastActivityAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    scoreHistory: [38, 42, 40, 37, 34],
    weaknesses: [
      { area: "独自性の表現", count: 3 },
    ],
    documents: [
      {
        title: "自己推薦書",
        universityName: "大阪大学",
        status: "reviewed",
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
  },
];

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

function detectAlerts(students: MockStudentData[]): AlertItem[] {
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
      const alerts = detectAlerts(MOCK_STUDENT_DATA);
      return NextResponse.json(alerts);
    }

    // Firestore接続時: 全生徒を走査してアラート生成
    const studentsQuery = effectiveRole === "superadmin"
      ? adminDb.collection("users").where("role", "==", "student")
      : adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "==", effectiveUid);
    const snapshot = await studentsQuery.get();

    const studentDataList: MockStudentData[] = await Promise.all(
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
        const documents: MockDocumentData[] = documentsSnap.docs.map((d) => {
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
    // フォールバック: モックデータからアラート生成
    const alerts = detectAlerts(MOCK_STUDENT_DATA);
    return NextResponse.json(alerts);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { AlertItem } from "@/lib/types/admin";

interface MockStudentData {
  uid: string;
  displayName: string;
  lastActivityAt: string | null;
  scoreHistory: number[];
  weaknesses: { area: string; count: number }[];
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
  },
  {
    uid: "mock_student_002",
    displayName: "佐藤 花子",
    lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    scoreHistory: [28, 30, 32],
    weaknesses: [
      { area: "構成力", count: 4 },
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
  },
  {
    uid: "mock_student_005",
    displayName: "高橋 健太",
    lastActivityAt: null,
    scoreHistory: [],
    weaknesses: [],
  },
  {
    uid: "mock_student_006",
    displayName: "中村 翔太",
    lastActivityAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    scoreHistory: [38, 42, 40, 37, 34],
    weaknesses: [
      { area: "独自性の表現", count: 3 },
    ],
  },
];

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
  }

  // detectedAtで新しい順にソート
  alerts.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

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

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      const alerts = detectAlerts(MOCK_STUDENT_DATA);
      return NextResponse.json(alerts);
    }

    // Firestore接続時: 全生徒を走査してアラート生成
    const { collection, getDocs, query, where, orderBy } = await import("firebase/firestore");

    const studentsQuery = effectiveRole === "superadmin"
      ? query(
          collection(db, "users"),
          where("role", "==", "student")
        )
      : query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("managedBy", "==", effectiveUid)
        );
    const snapshot = await getDocs(studentsQuery);

    const studentDataList: MockStudentData[] = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;

        const essaysSnap = await getDocs(
          query(
            collection(db, "users", uid, "essays"),
            orderBy("submittedAt", "desc")
          )
        );
        const latestEssay = essaysSnap.docs[0]?.data();
        const lastActivityAt: string | null = latestEssay?.submittedAt
          ? latestEssay.submittedAt.toDate().toISOString()
          : null;

        const scoreHistory = essaysSnap.docs
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number")
          .reverse();

        const weaknessesSnap = await getDocs(
          collection(db, "users", uid, "weaknesses")
        );
        const weaknesses = weaknessesSnap.docs.map((d) => {
          const wData = d.data();
          return { area: wData.area ?? "", count: wData.count ?? 0 };
        });

        return {
          uid,
          displayName: data.displayName ?? "",
          lastActivityAt,
          scoreHistory,
          weaknesses,
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

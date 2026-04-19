import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { AlertItem } from "@/lib/types/admin";

interface StudentAlertData {
  uid: string;
  displayName: string;
  lastActivityAt: string | null;
  scoreHistory: number[];
  apAlignmentScores: number[];
  weaknesses: { area: string; count: number; improving: boolean }[];
  documents: DocumentAlertData[];
}

interface DocumentAlertData {
  title: string;
  universityName: string;
  status: string;
  deadline: string | null;
}

/**
 * Severity based on days until deadline.
 * <=0: critical, 1-3: high, 4-7: warning, >7: null
 */
function getDeadlineSeverity(daysUntil: number): "critical" | "high" | "warning" | null {
  if (daysUntil <= 0) return "critical";
  if (daysUntil <= 3) return "high";
  if (daysUntil <= 7) return "warning";
  return null;
}

/**
 * Check if the variance of scores is below a threshold (plateau detection).
 */
function hasLowVariance(scores: number[], threshold: number): boolean {
  if (scores.length < 4) return false;
  const recent = scores.slice(-4);
  const mean = recent.reduce((s, v) => s + v, 0) / recent.length;
  const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
  return variance < threshold;
}

function detectAlerts(students: StudentAlertData[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  let alertId = 1;

  for (const student of students) {
    // === EXISTING ALERTS ===

    // inactive: 7+ days without activity or no activity at all
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
        recommendedAction: "生徒に連絡を取り、学習開始を促しましょう。",
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
          recommendedAction: "フォローアップの連絡を入れ、モチベーション向上を図りましょう。",
        });
      }
    }

    // declining: last 3 scores consecutively dropping
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
          recommendedAction: "添削結果を一緒に振り返り、基礎的な課題を特定しましょう。",
        });
      }
    }

    // repeated_weakness: same weakness 5+ times
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
          recommendedAction: `「${w.area}」に特化した個別指導やサンプル小論文の提供を検討しましょう。`,
        });
      }
    }

    // document_deadline: approaching deadline for incomplete documents
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
        recommendedAction: "書類の完成状況を確認し、期限内の提出を支援しましょう。",
      });
    }

    // === NEW PREDICTIVE ALERTS (Phase 3E) ===

    // ap_struggle: AP alignment scores consistently below 50% (5/10) in last 5 submissions
    if (student.apAlignmentScores.length >= 5) {
      const recent5 = student.apAlignmentScores.slice(-5);
      const allBelow = recent5.every((s) => s < 5);
      if (allBelow) {
        const avg = Math.round((recent5.reduce((s, v) => s + v, 0) / recent5.length) * 10) / 10;
        alerts.push({
          id: `alert_${String(alertId++).padStart(3, "0")}`,
          studentUid: student.uid,
          studentName: student.displayName,
          type: "ap_struggle",
          severity: avg < 3 ? "critical" : "warning",
          message: `直近5回のAP合致度スコアが全て50%未満です（平均${avg}/10）。志望校のAPへの理解が不足している可能性があります`,
          detectedAt: new Date().toISOString(),
          acknowledged: false,
          recommendedAction: "志望校のアドミッション・ポリシーを一緒に読み直し、出題意図への理解を深めましょう。",
        });
      }
    }

    // weakness_stuck: same weakness with 3+ attempts and no improvement
    for (const w of student.weaknesses) {
      if (w.count >= 3 && !w.improving) {
        // Only generate this if not already covered by repeated_weakness
        if (w.count < 5) {
          alerts.push({
            id: `alert_${String(alertId++).padStart(3, "0")}`,
            studentUid: student.uid,
            studentName: student.displayName,
            type: "weakness_stuck",
            severity: w.count >= 4 ? "high" : "warning",
            message: `「${w.area}」が${w.count}回指摘されていますが改善が見られません`,
            detectedAt: new Date().toISOString(),
            acknowledged: false,
            recommendedAction: `「${w.area}」について別のアプローチ（例文提示、個別解説）を試みましょう。`,
          });
        }
      }
    }

    // deadline_risk: 50%+ documents incomplete within 14 days of any deadline
    const upcomingDocs = student.documents.filter((doc) => {
      if (!doc.deadline || doc.status === "final") return false;
      const deadlineDate = new Date(doc.deadline + "T00:00:00");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil > 0 && daysUntil <= 14;
    });

    if (upcomingDocs.length > 0) {
      const totalWithDeadline = student.documents.filter((d) => d.deadline).length;
      const incompleteCount = upcomingDocs.length;
      const incompleteRate = totalWithDeadline > 0 ? incompleteCount / totalWithDeadline : 0;

      if (incompleteRate >= 0.5 && incompleteCount >= 2) {
        alerts.push({
          id: `alert_${String(alertId++).padStart(3, "0")}`,
          studentUid: student.uid,
          studentName: student.displayName,
          type: "deadline_risk",
          severity: "high",
          message: `14日以内に期限を迎える未完成書類が${incompleteCount}件あります（全書類の${Math.round(incompleteRate * 100)}%が未完成）`,
          detectedAt: new Date().toISOString(),
          acknowledged: false,
          recommendedAction: "書類作成の優先順位を生徒と一緒に整理し、集中的に取り組むスケジュールを立てましょう。",
        });
      }
    }

    // score_plateau: last 4 essay/interview scores have variance < 3 points
    if (hasLowVariance(scores, 3)) {
      const recent4 = scores.slice(-4);
      const avg = Math.round((recent4.reduce((s, v) => s + v, 0) / recent4.length) * 10) / 10;
      alerts.push({
        id: `alert_${String(alertId++).padStart(3, "0")}`,
        studentUid: student.uid,
        studentName: student.displayName,
        type: "score_plateau",
        severity: avg < 30 ? "high" : "warning",
        message: `直近4回のスコアが横ばいです（平均${avg}点）。成長が停滞している可能性があります`,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
        recommendedAction: "現在の学習方法を見直し、新しいテーマや形式の小論文に挑戦させましょう。",
      });
    }
  }

  // Sort by severity priority (critical > high > warning), then by most recent
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

    // Firestore: scan all students for alert generation
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

        // Essays: top-level collection with userId field (not subcollection)
        const essaysSnap = await adminDb!
          .collection("essays")
          .where("userId", "==", studentUid)
          .orderBy("submittedAt", "desc")
          .get()
          .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));

        // 全活動タイプの最新日時を集計して lastActivityAt を算出
        const activityDates: number[] = [];
        const latestEssay = essaysSnap.docs[0]?.data();
        if (latestEssay?.submittedAt?.toDate) {
          activityDates.push(latestEssay.submittedAt.toDate().getTime());
        }

        // 面接・スキルチェック・要約ドリル・活動登録 (いずれも user サブコレクション)
        const otherCollections: Array<{ name: string; field: string }> = [
          { name: "interviews", field: "startedAt" },
          { name: "skillChecks", field: "takenAt" },
          { name: "interviewSkillChecks", field: "takenAt" },
          { name: "summaryDrills", field: "completedAt" },
          { name: "activities", field: "createdAt" },
        ];
        for (const { name, field } of otherCollections) {
          try {
            const snap = await adminDb!
              .collection(`users/${studentUid}/${name}`)
              .orderBy(field, "desc")
              .limit(1)
              .get();
            const latest = snap.docs[0]?.data();
            const ts = latest?.[field]?.toDate?.();
            if (ts) activityDates.push(ts.getTime());
          } catch {
            // フィールド不存在・インデックス未作成時はスキップ
          }
        }

        const lastActivityAt: string | null = activityDates.length > 0
          ? new Date(Math.max(...activityDates)).toISOString()
          : null;

        const scoreHistory = essaysSnap.docs
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number")
          .reverse();

        // Extract AP alignment scores separately for ap_struggle detection
        const apAlignmentScores = essaysSnap.docs
          .map((d) => d.data()?.scores?.apAlignment)
          .filter((s): s is number => typeof s === "number")
          .reverse();

        const weaknessesSnap = await adminDb!
          .collection("users")
          .doc(studentUid)
          .collection("weaknesses")
          .get();
        const weaknesses = weaknessesSnap.docs.map((d) => {
          const wData = d.data();
          return {
            area: wData.area ?? "",
            count: wData.count ?? 0,
            improving: wData.improving ?? false,
          };
        });

        // Document data
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
          apAlignmentScores,
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

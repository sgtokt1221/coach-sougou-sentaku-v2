import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getOrgMemberAdminUids, chunk } from "@/lib/api/organization-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { AlertItem } from "@/lib/types/admin";

/** 活動系 info 通知の「直近」とみなす日数。 */
const NEW_WINDOW_DAYS = 3;

interface StudentAlertData {
  uid: string;
  displayName: string;
  lastActivityAt: string | null;
  scoreHistory: number[];
  apAlignmentScores: number[];
  weaknesses: { area: string; count: number; improving: boolean }[];
  documents: DocumentAlertData[];
  /** users/{uid}/alertAcks に保存済みの確認済みキー集合 */
  acknowledgedKeys: Set<string>;
  /** 直近(3日以内)の活動。info 通知の元。 */
  recentActivities: {
    type: "essay_reviewed" | "self_analysis_done" | "document_submitted" | "interview_done" | "skill_check_done";
    itemId: string;
    at: string;
    message: string;
    link: string;
  }[];
}

/**
 * アラートの決定的キー (= 確認状態の保存 doc id / 安定 id)。
 * 種別＋discriminator。Firestore doc id 安全化のため `/` を `_` に置換。
 */
function alertKey(type: string, discriminator?: string): string {
  const base = discriminator ? `${type}__${discriminator}` : type;
  return base.replace(/\//g, "_").slice(0, 300);
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

  /** 安定キーで AlertItem を組み立てて push (acknowledged は保存状態から復元) */
  const add = (
    student: StudentAlertData,
    discriminator: string | undefined,
    base: Pick<AlertItem, "type" | "severity" | "message" | "detectedAt" | "recommendedAction" | "link">,
  ) => {
    const id = alertKey(base.type, discriminator);
    alerts.push({
      id,
      studentUid: student.uid,
      studentName: student.displayName,
      acknowledged: student.acknowledgedKeys.has(id),
      ...base,
      // 既存警告系も生徒詳細へクリック遷移可能に (link 未指定時のフォールバック)
      link: base.link ?? `/admin/students/${student.uid}`,
    });
  };

  for (const student of students) {
    // === EXISTING ALERTS ===

    // inactive: 7+ days without activity or no activity at all
    if (!student.lastActivityAt) {
      add(student, undefined, {
        type: "inactive",
        severity: "critical",
        message: "登録後一度も添削を提出していません",
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        recommendedAction: "生徒に連絡を取り、学習開始を促しましょう。",
      });
    } else {
      const daysSince =
        (Date.now() - new Date(student.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 7) {
        add(student, undefined, {
          type: "inactive",
          severity: daysSince >= 14 ? "critical" : "warning",
          message: `最終活動から${Math.floor(daysSince)}日経過しています`,
          detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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
        add(student, undefined, {
          type: "declining",
          severity: drop >= 10 ? "critical" : "warning",
          message: `直近3回のスコアが連続で下降しています（${recent[0]}→${recent[1]}→${recent[2]}）`,
          detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          recommendedAction: "添削結果を一緒に振り返り、基礎的な課題を特定しましょう。",
        });
      }
    }

    // repeated_weakness: same weakness 5+ times
    for (const w of student.weaknesses) {
      if (w.count >= 5) {
        add(student, w.area, {
          type: "repeated_weakness",
          severity: w.count >= 7 ? "critical" : "warning",
          message: `「${w.area}」が${w.count}回以上繰り返し指摘されています`,
          detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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

      add(student, `${doc.universityName}_${doc.title}`, {
        type: "document_deadline",
        severity,
        message,
        detectedAt: new Date().toISOString(),
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
        add(student, undefined, {
          type: "ap_struggle",
          severity: avg < 3 ? "critical" : "warning",
          message: `直近5回のAP合致度スコアが全て50%未満です（平均${avg}/10）。志望校のAPへの理解が不足している可能性があります`,
          detectedAt: new Date().toISOString(),
          recommendedAction: "志望校のアドミッション・ポリシーを一緒に読み直し、出題意図への理解を深めましょう。",
        });
      }
    }

    // weakness_stuck: same weakness with 3+ attempts and no improvement
    for (const w of student.weaknesses) {
      if (w.count >= 3 && !w.improving) {
        // Only generate this if not already covered by repeated_weakness
        if (w.count < 5) {
          add(student, w.area, {
            type: "weakness_stuck",
            severity: w.count >= 4 ? "high" : "warning",
            message: `「${w.area}」が${w.count}回指摘されていますが改善が見られません`,
            detectedAt: new Date().toISOString(),
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
        add(student, undefined, {
          type: "deadline_risk",
          severity: "high",
          message: `14日以内に期限を迎える未完成書類が${incompleteCount}件あります（全書類の${Math.round(incompleteRate * 100)}%が未完成）`,
          detectedAt: new Date().toISOString(),
          recommendedAction: "書類作成の優先順位を生徒と一緒に整理し、集中的に取り組むスケジュールを立てましょう。",
        });
      }
    }

    // score_plateau: last 4 essay/interview scores have variance < 3 points
    if (hasLowVariance(scores, 3)) {
      const recent4 = scores.slice(-4);
      const avg = Math.round((recent4.reduce((s, v) => s + v, 0) / recent4.length) * 10) / 10;
      add(student, undefined, {
        type: "score_plateau",
        severity: avg < 30 ? "high" : "warning",
        message: `直近4回のスコアが横ばいです（平均${avg}点）。成長が停滞している可能性があります`,
        detectedAt: new Date().toISOString(),
        recommendedAction: "現在の学習方法を見直し、新しいテーマや形式の小論文に挑戦させましょう。",
      });
    }

    // === ACTIVITY NOTIFICATIONS (info) ===
    for (const act of student.recentActivities) {
      add(student, act.itemId, {
        type: act.type,
        severity: "info",
        message: act.message,
        detectedAt: act.at,
        link: act.link,
      });
    }
  }

  // Sort by severity priority (critical > high > warning), then by most recent
  const severityOrder: Record<string, number> = { critical: 0, high: 1, warning: 2, info: 3 };
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

    // Firestore: scan students for alert generation
    // admin は自分の塾(組織)メンバーが managedBy の生徒を共有。teacher は従来どおり自分の managedBy。
    let studentDocs: FirebaseFirestore.QueryDocumentSnapshot[];
    if (effectiveRole === "superadmin") {
      studentDocs = (
        await adminDb.collection("users").where("role", "==", "student").get()
      ).docs;
    } else if (effectiveRole === "admin") {
      const memberUids = await getOrgMemberAdminUids(adminDb, effectiveUid);
      const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      for (const part of chunk(memberUids, 30)) {
        const s = await adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "in", part)
          .get();
        s.docs.forEach((d) => byId.set(d.id, d));
      }
      studentDocs = Array.from(byId.values());
    } else {
      studentDocs = (
        await adminDb
          .collection("users")
          .where("role", "==", "student")
          .where("managedBy", "==", effectiveUid)
          .get()
      ).docs;
    }

    const studentDataList: StudentAlertData[] = await Promise.all(
      studentDocs.map(async (docSnap) => {
        const data = docSnap.data();
        const studentUid = docSnap.id;

        // Essays: top-level collection with userId field (not subcollection)
        // 失敗時は console.warn で痕跡を残しつつ、その生徒だけ「essays なし」扱いに
        // (1 生徒の query 失敗で全 alerts 検出が落ちないようにする)
        const essaysSnap = await adminDb!
          .collection("essays")
          .where("userId", "==", studentUid)
          .orderBy("submittedAt", "desc")
          .get()
          .catch((e) => {
            console.warn(`[admin/alerts] essays query failed for ${studentUid}:`, e);
            return { docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] };
          });

        // 全活動タイプの最新日時を集計して lastActivityAt を算出
        const activityDates: number[] = [];
        const latestEssay = essaysSnap.docs[0]?.data();
        if (latestEssay?.submittedAt?.toDate) {
          activityDates.push(latestEssay.submittedAt.toDate().getTime());
        }

        // 面接・スキルチェック・要約ドリル・活動ログ (ネタインプット/面接ドリル)
        const otherCollections: Array<{ name: string; field: string }> = [
          { name: "interviews", field: "startedAt" },
          { name: "skillChecks", field: "takenAt" },
          { name: "interviewSkillChecks", field: "takenAt" },
          { name: "summaryDrills", field: "completedAt" },
          { name: "activityLogs", field: "createdAt" },
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

        // users.lastSeenAt (ハートビートで更新される「最後にアプリを開いた時刻」)
        const lastSeenAt = data.lastSeenAt?.toDate?.();
        if (lastSeenAt) activityDates.push(lastSeenAt.getTime());

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
        const weaknesses = weaknessesSnap.docs
          .filter((d) => !d.data().archivedAt) // Phase 4: archive 済みはアラート対象外
          .map((d) => {
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

        // 確認済みアラートのキー集合 (doc id = alertKey)。未作成なら空集合。
        const acksSnap = await adminDb!
          .collection("users")
          .doc(studentUid)
          .collection("alertAcks")
          .get()
          .catch((e) => {
            console.warn(`[admin/alerts] alertAcks query failed for ${studentUid}:`, e);
            return { docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] };
          });
        const acknowledgedKeys = new Set(acksSnap.docs.map((d) => d.id));

        // 直近(NEW_WINDOW_DAYS 以内)の活動を集めて info 通知の元にする
        const nowMs = Date.now();
        const isRecent = (ms: number) => (nowMs - ms) / (1000 * 60 * 60 * 24) <= NEW_WINDOW_DAYS;
        const sName = data.displayName ?? "";
        const recentActivities: StudentAlertData["recentActivities"] = [];

        // 添削 (top-level essays, submittedAt desc の先頭)
        const eDoc0 = essaysSnap.docs[0];
        const eAt = eDoc0?.data()?.submittedAt?.toDate?.();
        if (eDoc0 && eAt && isRecent(eAt.getTime())) {
          recentActivities.push({
            type: "essay_reviewed",
            itemId: eDoc0.id,
            at: eAt.toISOString(),
            message: `${sName}さんが添削を提出しました`,
            link: `/admin/students/${studentUid}?tab=activity`,
          });
        }

        // 自己分析 (top-level selfAnalysis/{uid}, updatedAt)
        try {
          const saSnap = await adminDb!.doc(`selfAnalysis/${studentUid}`).get();
          const saAt = saSnap.data()?.updatedAt?.toDate?.();
          if (saSnap.exists && saAt && isRecent(saAt.getTime())) {
            recentActivities.push({
              type: "self_analysis_done",
              itemId: saAt.toISOString().slice(0, 10),
              at: saAt.toISOString(),
              message: `${sName}さんが自己分析を更新しました`,
              link: `/admin/students/${studentUid}?tab=activity`,
            });
          }
        } catch {
          /* skip */
        }

        // 模擬面接 (users/{uid}/interviews, startedAt desc の先頭)
        try {
          const iSnap = await adminDb!
            .collection(`users/${studentUid}/interviews`)
            .orderBy("startedAt", "desc")
            .limit(1)
            .get();
          const iDoc = iSnap.docs[0];
          const iAt = iDoc?.data()?.startedAt?.toDate?.();
          if (iDoc && iAt && isRecent(iAt.getTime())) {
            recentActivities.push({
              type: "interview_done",
              itemId: iDoc.id,
              at: iAt.toISOString(),
              message: `${sName}さんが模擬面接を実施しました`,
              link: `/admin/students/${studentUid}?tab=activity`,
            });
          }
        } catch {
          /* skip */
        }

        // スキルチェック (users/{uid}/skillChecks, takenAt desc の先頭)
        try {
          const scSnap = await adminDb!
            .collection(`users/${studentUid}/skillChecks`)
            .orderBy("takenAt", "desc")
            .limit(1)
            .get();
          const scDoc = scSnap.docs[0];
          const scAt = scDoc?.data()?.takenAt?.toDate?.();
          if (scDoc && scAt && isRecent(scAt.getTime())) {
            recentActivities.push({
              type: "skill_check_done",
              itemId: scDoc.id,
              at: scAt.toISOString(),
              message: `${sName}さんがスキルチェックを完了しました`,
              link: `/admin/students/${studentUid}?tab=performance`,
            });
          }
        } catch {
          /* skip */
        }

        // 書類 (提出・再提出) — 既存の documentsSnap を再利用し直近1件を捕捉
        for (const dSnap of documentsSnap.docs) {
          const dd = dSnap.data();
          const uAt = dd.updatedAt?.toDate?.();
          const resubmitted = dd.review?.state === "resubmitted";
          const submitted = dd.status && dd.status !== "draft";
          if (uAt && isRecent(uAt.getTime()) && (resubmitted || submitted)) {
            recentActivities.push({
              type: "document_submitted",
              itemId: dSnap.id,
              at: uAt.toISOString(),
              message: `${sName}さんが「${dd.title ?? dd.type ?? "書類"}」を${resubmitted ? "再提出" : "提出"}しました`,
              link: `/admin/students/${studentUid}?tab=reports`,
            });
            break;
          }
        }

        return {
          uid: studentUid,
          displayName: data.displayName ?? "",
          lastActivityAt,
          scoreHistory,
          apAlignmentScores,
          weaknesses,
          documents,
          acknowledgedKeys,
          recentActivities,
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

/**
 * アラートの「確認済み」状態を永続化する。
 * doc id = alertKey（GET が復元に使う users/{studentUid}/alertAcks/{alertKey}）。
 * acknowledged=true でドキュメント作成、false で削除。
 * 権限は GET と同じ組織/managedBy スコープ（対象生徒にアクセスできる管理者のみ）。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  let body: { studentUid?: string; alertKey?: string; acknowledged?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const studentUid = body.studentUid?.trim();
  const rawKey = body.alertKey?.trim();
  if (!studentUid || !rawKey) {
    return NextResponse.json({ error: "studentUid と alertKey は必須です" }, { status: 400 });
  }
  // GET の alertKey() と同じ正規化（doc id 安全化）。フロントは正規化済み id を送るため通常は no-op。
  const ackKey = rawKey.replace(/\//g, "_").slice(0, 300);
  const acknowledged = body.acknowledged === true;

  // 対象生徒へのアクセス権（GET と同じ組織/managedBy スコープ）
  const studentSnap = await adminDb.doc(`users/${studentUid}`).get();
  if (!studentSnap.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const sdata = studentSnap.data() ?? {};
  const denied = await scopeByOrganization({
    requesterUid: uid,
    requesterRole: role,
    studentUid,
    studentData: {
      managedBy: sdata.managedBy as string | undefined,
      organizationId: sdata.organizationId as string | undefined,
    },
  });
  if (denied) return denied;

  const ackRef = adminDb.doc(`users/${studentUid}/alertAcks/${ackKey}`);
  if (acknowledged) {
    const { FieldValue } = await import("firebase-admin/firestore");
    let byName = "";
    try {
      const me = await adminDb.doc(`users/${uid}`).get();
      byName = (me.data()?.displayName as string | undefined)?.trim() || "";
    } catch {
      /* noop */
    }
    await ackRef.set({ ackedBy: uid, ackedByName: byName, ackedAt: FieldValue.serverTimestamp() });
  } else {
    await ackRef.delete();
  }

  return NextResponse.json({ studentUid, alertKey: ackKey, acknowledged });
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { StudentListItem } from "@/lib/types/admin";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
} from "@/lib/skill-check/aggregate";

function isDeclining(scores: number[]): boolean {
  if (scores.length < 3) return false;
  const recent = scores.slice(-3);
  return recent[0] > recent[1] && recent[1] > recent[2];
}

function computeScoreTrend(scores: number[]): "up" | "down" | "flat" | null {
  if (scores.length < 3) return null;
  const recent = scores.slice(-3);
  const diff = recent[2] - recent[0];
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "flat";
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid } = authResult;

  const body = await request.json();
  const { email, displayName, password, school, grade, gpa, englishCerts, targetUniversities } = body as {
    email: string;
    displayName: string;
    password: string;
    school?: string;
    grade?: number;
    gpa?: number;
    englishCerts?: { type: string; score?: string }[];
    targetUniversities?: string[];
  };

  if (!email || !displayName || !password) {
    return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上必要です" }, { status: 400 });
  }

  const { adminAuth, adminDb } = await import("@/lib/firebase/admin");

  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    await adminDb.doc(`users/${userRecord.uid}`).set({
      email,
      displayName,
      role: "student",
      plan: "coach",
      school: school ?? "",
      grade: grade ?? null,
      gpa: gpa ?? null,
      englishCerts: englishCerts ?? [],
      managedBy: callerUid,
      targetUniversities: targetUniversities ?? [],
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email,
      displayName,
      school: school ?? "",
      grade: grade ?? null,
      gpa: gpa ?? null,
      englishCerts: englishCerts ?? [],
      managedBy: callerUid,
      targetUniversities: targetUniversities ?? [],
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "作成に失敗しました";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "lastActivity";
    const order = searchParams.get("order") || "desc";
    const viewAs = searchParams.get("viewAs");
    const universityFilter = searchParams.get("university");
    const rankFilter = searchParams.get("rank");

    // superadminがviewAsを指定している場合、そのadminの視点でフィルタ
    const effectiveUid = (role === "superadmin" && viewAs) ? viewAs : uid;
    const effectiveRole = (role === "superadmin" && viewAs) ? "admin" : role;

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    let studentsRef = adminDb.collection("users").where("role", "==", "student");
    if (effectiveRole !== "superadmin") {
      studentsRef = studentsRef.where("managedBy", "==", effectiveUid);
    }
    const snapshot = await studentsRef.get();

    const students: StudentListItem[] = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;

        const [essaysSnap, weaknessesSnap, documentsSnap, sessionsSnap] = await Promise.all([
          adminDb!.collection("essays").where("userId", "==", uid).orderBy("submittedAt", "desc").get().catch(() => ({ size: 0, docs: [] })),
          adminDb!.collection(`users/${uid}/weaknesses`).get().catch(() => ({ size: 0, docs: [] })),
          adminDb!.collection(`users/${uid}/documents`).get().catch(() => ({ size: 0, docs: [] })),
          adminDb!.collection("sessions").where("studentUid", "==", uid).orderBy("scheduledAt", "desc").limit(1).get().catch(() => ({ size: 0, docs: [] })),
        ]) as [FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot, FirebaseFirestore.QuerySnapshot];

        const essayCount = essaysSnap.size;
        const latestEssay = essaysSnap.docs[0]?.data();
        const latestScore: number | null =
          latestEssay?.scores?.total ?? null;

        // lastActivityAt は essay 以外 (面接・スキルチェック・要約ドリル・活動登録) も含める
        const activityTimestamps: number[] = [];
        if (latestEssay?.submittedAt?.toDate) {
          activityTimestamps.push(latestEssay.submittedAt.toDate().getTime());
        }
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
              .collection(`users/${uid}/${name}`)
              .orderBy(field, "desc")
              .limit(1)
              .get();
            const ts = snap.docs[0]?.data()?.[field]?.toDate?.();
            if (ts) activityTimestamps.push(ts.getTime());
          } catch {
            // スキップ
          }
        }
        const lastActivityAt: string | null = activityTimestamps.length > 0
          ? new Date(Math.max(...activityTimestamps)).toISOString()
          : null;

        const alertFlags: StudentListItem["alertFlags"] = [];

        if (lastActivityAt) {
          const daysSince =
            (Date.now() - new Date(lastActivityAt).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSince >= 3) alertFlags.push("inactive");
        } else {
          alertFlags.push("inactive");
        }

        const repeatedCount = weaknessesSnap.docs.filter(
          (d) => (d.data().count ?? 0) >= 5
        ).length;
        if (repeatedCount > 0) alertFlags.push("repeated_weakness");

        // declining detection: 直近3回のスコアが連続下降
        const recentScores = essaysSnap.docs
          .slice(0, 3)
          .map((d) => d.data()?.scores?.total)
          .filter((s): s is number => typeof s === "number");
        if (recentScores.length >= 3 && isDeclining(recentScores.reverse())) {
          alertFlags.push("declining");
        }

        // スコア推移（直近3回）
        const scoreTrend = computeScoreTrend(recentScores);

        // アクティブ弱点数（dismissedでないもの）
        const activeWeaknessCount = weaknessesSnap.docs.filter(
          (d) => !d.data().dismissed
        ).length;

        // 書類完了度
        const totalDocs = documentsSnap.size;
        const completedDocs = documentsSnap.docs.filter(
          (d) => d.data().status === "final" || d.data().status === "reviewed"
        ).length;

        // 最終セッション日
        const lastSessionDoc = sessionsSnap.docs[0]?.data();
        const lastSessionAt: string | null = lastSessionDoc?.scheduledAt
          ? (lastSessionDoc.scheduledAt.toDate?.()?.toISOString() ?? lastSessionDoc.scheduledAt)
          : null;

        const lastSkillCheckedAt: string | null = data.lastSkillCheckedAt?.toDate?.()?.toISOString() ?? null;
        const lastInterviewCheckedAt: string | null = data.lastInterviewCheckedAt?.toDate?.()?.toISOString() ?? null;

        // 練習集計を反映した aggregate ランクを算出
        // currentSkillRank/currentInterviewRank は「SC + 直近30日練習の合成」値
        const [essayAgg, interviewAgg] = await Promise.all([
          computeEssayAggregate(uid, typeof data.currentSkillScore === "number" ? data.currentSkillScore : null),
          computeInterviewAggregate(uid, typeof data.currentInterviewScore === "number" ? data.currentInterviewScore : null),
        ]);

        return {
          uid,
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          targetUniversities: data.targetUniversities ?? [],
          latestScore,
          essayCount,
          lastActivityAt,
          alertFlags,
          scoreTrend,
          activeWeaknessCount,
          documentProgress: { completed: completedDocs, total: totalDocs },
          lastSessionAt,
          currentSkillRank: essayAgg.compositeRank,
          currentSkillScore: essayAgg.compositeScore,
          lastSkillCheckedAt,
          academicCategory: data.academicCategory ?? null,
          currentInterviewRank: interviewAgg.compositeRank,
          currentInterviewScore: interviewAgg.compositeScore,
          lastInterviewCheckedAt,
        };
      })
    );

    let filtered = students;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (universityFilter) {
      filtered = filtered.filter((s) =>
        s.targetUniversities.includes(universityFilter)
      );
    }
    if (rankFilter) {
      filtered = filtered.filter((s) => s.currentSkillRank === rankFilter);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sort === "score") {
        cmp = (a.latestScore ?? -1) - (b.latestScore ?? -1);
      } else if (sort === "name") {
        cmp = a.displayName.localeCompare(b.displayName, "ja");
      } else if (sort === "rank" || sort === "interviewRank") {
        const rankOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
        const field = sort === "interviewRank" ? "currentInterviewRank" : "currentSkillRank";
        const aRank = a[field] ? rankOrder[a[field] as string] : 99;
        const bRank = b[field] ? rankOrder[b[field] as string] : 99;
        cmp = aRank - bRank;
      } else {
        const aTime = a.lastActivityAt
          ? new Date(a.lastActivityAt).getTime()
          : 0;
        const bTime = b.lastActivityAt
          ? new Date(b.lastActivityAt).getTime()
          : 0;
        cmp = aTime - bTime;
      }
      return order === "asc" ? cmp : -cmp;
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Admin students list error:", error);
    return NextResponse.json(
      { error: "生徒一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

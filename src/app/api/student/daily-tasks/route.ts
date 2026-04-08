import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import type {
  DailyTask,
  DailyTasksResponse,
} from "@/lib/ai/prompts/daily-tasks";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "おつかれさまです";
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  const uid = auth?.uid;

  if (!adminDb || !uid) {
    // No Firestore or no auth — return empty tasks
    const response: DailyTasksResponse = {
      tasks: [],
      greeting: getGreeting(),
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  }

  try {
    const [weaknessSnap, documentsSnap, essaysSnap, activitiesSnap, userDoc] =
      await Promise.all([
        adminDb
          .collection(`users/${uid}/weaknesses`)
          .where("resolved", "==", false)
          .get(),
        adminDb.collection(`users/${uid}/documents`).get(),
        adminDb
          .collection("essays")
          .where("userId", "==", uid)
          .orderBy("submittedAt", "desc")
          .limit(5)
          .get(),
        adminDb.collection(`users/${uid}/activities`).get(),
        adminDb.doc(`users/${uid}`).get(),
      ]);

    const tasks: DailyTask[] = [];
    const now = new Date();

    // Unresolved weaknesses → essay practice
    if (!weaknessSnap.empty) {
      tasks.push({
        type: "essay",
        title: "小論文の練習を1本提出しよう",
        description:
          "弱点として検出された項目を意識して、新しいテーマで書いてみましょう。",
        link: "/student/essay/new",
        priority: "high",
      });
    }

    // Document deadline within 7 days
    const hasUpcomingDeadline = documentsSnap.docs.some((doc) => {
      const data = doc.data();
      if (!data.deadline || data.status === "final") return false;
      const deadline = new Date(data.deadline);
      const daysUntil =
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil >= 0 && daysUntil <= 7;
    });
    if (hasUpcomingDeadline) {
      tasks.push({
        type: "document",
        title: "出願書類の確認・更新",
        description:
          "提出期限が近い書類があります。内容を見直して完成度を高めましょう。",
        link: "/student/documents",
        priority: "high",
      });
    }

    // No recent essays (>7 days)
    if (!essaysSnap.empty) {
      const latestEssay = essaysSnap.docs[0].data();
      const submittedAt = latestEssay.submittedAt
        ? new Date(latestEssay.submittedAt)
        : null;
      if (
        !submittedAt ||
        (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24) > 7
      ) {
        tasks.push({
          type: "essay",
          title: "小論文の練習",
          description:
            "前回の提出から時間が経っています。定期的な練習でスコアを伸ばしましょう。",
          link: "/student/essay/new",
          priority: "medium",
        });
      }
    } else if (essaysSnap.empty && !weaknessSnap.empty) {
      // No essays at all but has weakness data — suggest practice
      tasks.push({
        type: "essay",
        title: "小論文の練習",
        description: "小論文を提出して添削を受けましょう。",
        link: "/student/essay/new",
        priority: "medium",
      });
    }

    // Few activities
    if (activitiesSnap.size < 3) {
      tasks.push({
        type: "activity",
        title: "課外活動の記録を更新",
        description:
          "活動実績をAIヒアリングで構造化し、出願書類に活用できるようにしましょう。",
        link: "/student/activities/new",
        priority: "medium",
      });
    }

    // Target universities check
    const userData = userDoc.data();
    if (
      userData?.targetUniversities &&
      userData.targetUniversities.length > 0
    ) {
      tasks.push({
        type: "university",
        title: "志望校の最新情報をチェック",
        description:
          "出願要件や選考日程に変更がないか確認しておきましょう。",
        link: "/student/universities",
        priority: "low",
      });
    }

    const response: DailyTasksResponse = {
      tasks,
      greeting: getGreeting(),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Daily tasks error:", error);
    const response: DailyTasksResponse = {
      tasks: [],
      greeting: getGreeting(),
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  }
}

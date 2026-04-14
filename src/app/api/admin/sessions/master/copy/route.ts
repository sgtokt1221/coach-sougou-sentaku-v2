import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { SessionMaster } from "@/lib/types/teacher-shift";

interface CopyRequest {
  sourceMonth: string;
  targetMonth: string;
  action: "copy" | "generate";
}

/**
 * POST /api/admin/sessions/master/copy
 * セッションマスターの月間コピー または 実際のセッション生成
 */
export async function POST(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json({ error: "データベース接続エラー" }, { status: 500 });
  }

  try {
    const body: CopyRequest = await request.json();
    const { sourceMonth, targetMonth, action } = body;

    if (!sourceMonth || !targetMonth) {
      return NextResponse.json(
        { error: "sourceMonth と targetMonth が必要です" },
        { status: 400 }
      );
    }

    if (!["copy", "generate"].includes(action)) {
      return NextResponse.json(
        { error: "action は 'copy' または 'generate' を指定してください" },
        { status: 400 }
      );
    }

    // ソースの月のマスター取得
    const sourceSnapshot = await adminDb
      .collection("sessionMasters")
      .where("month", "==", sourceMonth)
      .get();

    if (sourceSnapshot.empty) {
      return NextResponse.json(
        { error: `${sourceMonth} にマスターが見つかりません` },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const results: any[] = [];

    if (action === "copy") {
      // マスターをコピー
      for (const doc of sourceSnapshot.docs) {
        const sourceData = doc.data() as Omit<SessionMaster, "id">;

        const newMaster = {
          ...sourceData,
          month: targetMonth,
          createdAt: now,
          updatedAt: now,
        };

        const newDocRef = await adminDb.collection("sessionMasters").add(newMaster);
        const newDoc = await newDocRef.get();
        results.push({ id: newDoc.id, ...newDoc.data() });
      }

      return NextResponse.json({
        success: true,
        action: "copy",
        count: results.length,
        masters: results,
      });
    } else if (action === "generate") {
      // 実際のセッション生成
      const targetYear = parseInt(targetMonth.split("-")[0]);
      const targetMonthNum = parseInt(targetMonth.split("-")[1]);

      for (const doc of sourceSnapshot.docs) {
        const master = doc.data() as Omit<SessionMaster, "id">;

        // frequencyに基づいてセッション日程を生成
        const sessions = generateSessionsFromMaster(master, targetYear, targetMonthNum);

        for (const session of sessions) {
          const sessionRef = await adminDb.collection("sessions").add({
            ...session,
            createdAt: now,
            updatedAt: now,
          });

          const sessionDoc = await sessionRef.get();
          results.push({ id: sessionDoc.id, ...sessionDoc.data() });
        }
      }

      return NextResponse.json({
        success: true,
        action: "generate",
        count: results.length,
        sessions: results,
      });
    }

    return NextResponse.json({ error: "不正なアクション" }, { status: 400 });
  } catch (error) {
    console.error("セッションマスターコピー/生成エラー:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}

/**
 * マスターから実際のセッションを生成
 */
function generateSessionsFromMaster(
  master: Omit<SessionMaster, "id">,
  year: number,
  month: number
) {
  const sessions = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  // frequency回数分のセッションを月内で分散配置
  for (let i = 0; i < master.frequency; i++) {
    let targetDate: Date;

    if (master.preferredDay !== undefined) {
      // 指定曜日の第(i+1)回目を取得
      targetDate = getNthWeekdayOfMonth(year, month - 1, master.preferredDay, i + 1);
    } else {
      // 月を均等分割
      const interval = Math.floor(daysInMonth / master.frequency);
      const day = Math.min(1 + (i * interval) + Math.floor(interval / 2), daysInMonth);
      targetDate = new Date(year, month - 1, day);
    }

    const session = {
      studentId: master.studentId,
      studentName: master.studentName,
      teacherId: master.teacherId || "",
      teacherName: master.teacherName || "",
      type: master.type,
      duration: master.duration || 60,
      scheduledAt: targetDate.toISOString(),
      preferredTime: master.preferredTime || "14:00",
      status: "scheduled" as const,
      notes: master.notes || "",
      masterId: master.id || "",
    };

    sessions.push(session);
  }

  return sessions;
}

/**
 * 指定した月の第n回目の指定曜日を取得
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number
): Date {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();

  // 最初の指定曜日の日付を計算
  let firstOccurrence = 1;
  if (firstWeekday <= weekday) {
    firstOccurrence = 1 + (weekday - firstWeekday);
  } else {
    firstOccurrence = 1 + (7 - firstWeekday + weekday);
  }

  // 第nth回目の日付
  const targetDay = firstOccurrence + (nth - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 月を超える場合は最後の該当曜日にフォールバック
  if (targetDay > daysInMonth) {
    const lastOccurrence = firstOccurrence + (Math.floor((daysInMonth - firstOccurrence) / 7)) * 7;
    return new Date(year, month, lastOccurrence);
  }

  return new Date(year, month, targetDay);
}
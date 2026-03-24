import { NextRequest, NextResponse } from "next/server";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

interface ScheduleEvent {
  universityName: string;
  facultyName: string;
  type: "出願開始" | "出願締切" | "試験日" | "合格発表";
  date: string;
  daysLeft: number;
}

function calcDaysLeft(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function buildEvents(universities: University[]): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];

  for (const uni of universities) {
    for (const faculty of uni.faculties) {
      const { applicationStart, applicationEnd, examDate, resultDate } = faculty.schedule;
      const pairs: [string, ScheduleEvent["type"]][] = [
        [applicationStart, "出願開始"],
        [applicationEnd, "出願締切"],
        [examDate, "試験日"],
        [resultDate, "合格発表"],
      ];
      for (const [date, type] of pairs) {
        events.push({
          universityName: uni.name,
          facultyName: faculty.name,
          type,
          date,
          daysLeft: calcDaysLeft(date),
        });
      }
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  let universities: University[] = MOCK_UNIVERSITIES;

  const { db } = await import("@/lib/firebase/config");
  if (db && userId) {
    try {
      const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const targetIds: string[] = userData.targetUniversities ?? [];
        if (targetIds.length > 0) {
          const fetched: University[] = [];
          for (const tid of targetIds) {
            const uid = tid.split(":")[0];
            const uSnap = await getDoc(doc(collection(db, "universities"), uid));
            if (uSnap.exists()) {
              fetched.push({ id: uSnap.id, ...uSnap.data() } as University);
            }
          }
          if (fetched.length > 0) universities = fetched;
        }
      }
    } catch {
      // fall through to mock data
    }
  }

  const events = buildEvents(universities);
  return NextResponse.json({ events });
}

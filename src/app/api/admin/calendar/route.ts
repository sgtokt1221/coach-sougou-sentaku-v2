import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";
import type {
  CalendarEvent,
  CalendarEventType,
} from "@/lib/types/admin-calendar";

const JST_OFFSET = "+09:00";
const PAST_CUTOFF_DAYS = 30;

let universityMapCache: Map<string, University> | null = null;
function getUniversityMap(): Map<string, University> {
  if (universityMapCache) return universityMapCache;
  const map = new Map<string, University>();
  for (const u of MOCK_UNIVERSITIES) {
    map.set(u.id, u);
  }
  universityMapCache = map;
  return map;
}

function toAllDayIso(dateStr: string): { startAt: string; endAt: string } {
  return {
    startAt: `${dateStr}T00:00:00${JST_OFFSET}`,
    endAt: `${dateStr}T23:59:59${JST_OFFSET}`,
  };
}

function yearFromDate(dateStr: string): number | null {
  const y = parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function admissionYearLabel(examDateStr: string | undefined): string {
  // 入試実施年度: 9月以降の exam date は翌年度入試扱い
  // ただし用途的には「試験日の年 + 年度入試」で表示
  if (!examDateStr) return "";
  const y = yearFromDate(examDateStr);
  return y ? `${y}年度入試` : "";
}

interface UniSchedulePair {
  field: keyof University["faculties"][number]["schedule"];
  type: CalendarEventType;
  labelPrefix: string;
}

const UNI_SCHEDULE_PAIRS: UniSchedulePair[] = [
  { field: "applicationStart", type: "app_start", labelPrefix: "出願開始" },
  { field: "applicationEnd", type: "app_end", labelPrefix: "出願締切" },
  { field: "examDate", type: "exam", labelPrefix: "試験日" },
  { field: "resultDate", type: "result", labelPrefix: "合格発表" },
];

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, role } = authResult;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to"); // YYYY-MM-DD
  const viewAs = searchParams.get("viewAs");

  const effectiveUid =
    role === "superadmin" && viewAs ? viewAs : uid;
  const effectiveRole =
    role === "superadmin" && viewAs ? "admin" : role;

  const fromDate = from ? new Date(`${from}T00:00:00${JST_OFFSET}`) : null;
  const toDate = to ? new Date(`${to}T23:59:59${JST_OFFSET}`) : null;
  const pastCutoff = new Date(
    Date.now() - PAST_CUTOFF_DAYS * 24 * 60 * 60 * 1000
  );

  const inRange = (d: Date): boolean => {
    if (d < pastCutoff) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    // 1. 担当生徒取得
    let studentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (effectiveRole === "superadmin") {
      const snap = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .get();
      studentDocs = snap.docs;
    } else {
      const snap = await adminDb
        .collection("users")
        .where("managedBy", "==", effectiveUid)
        .get();
      studentDocs = snap.docs;
    }

    const studentNameMap = new Map<string, string>();
    const targetUniversityPairs: Array<{
      studentId: string;
      studentName: string;
      univId: string;
      facId: string;
    }> = [];

    for (const d of studentDocs) {
      const data = d.data();
      const studentName = (data.displayName as string) ?? "(名称未設定)";
      studentNameMap.set(d.id, studentName);
      const targets: string[] = Array.isArray(data.targetUniversities)
        ? data.targetUniversities
        : [];
      for (const t of targets) {
        if (typeof t !== "string" || !t.includes(":")) continue;
        const [univId, facId] = t.split(":");
        if (!univId || !facId) continue;
        targetUniversityPairs.push({
          studentId: d.id,
          studentName,
          univId,
          facId,
        });
      }
    }

    const events: CalendarEvent[] = [];

    // 2. セッションイベント
    try {
      let sessionQuery: FirebaseFirestore.Query =
        adminDb.collection("sessions");
      if (effectiveRole !== "superadmin") {
        sessionQuery = sessionQuery.where(
          "createdByAdminId",
          "==",
          effectiveUid
        );
      }
      const sessionSnap = await sessionQuery.get();
      for (const doc of sessionSnap.docs) {
        const s = doc.data();
        if (s.status === "cancelled") continue;
        const scheduledAt = s.scheduledAt as string | undefined;
        if (!scheduledAt) continue;
        const start = new Date(scheduledAt);
        if (isNaN(start.getTime())) continue;
        if (!inRange(start)) continue;
        const durationMin = typeof s.duration === "number" ? s.duration : 60;
        const end = new Date(start.getTime() + durationMin * 60 * 1000);
        const studentName = s.studentName || "";
        const typeLabel =
          s.type === "mock_interview"
            ? "模擬面接"
            : s.type === "coaching"
            ? "コーチング"
            : s.type === "essay_review"
            ? "小論文レビュー"
            : s.type === "group_review"
            ? "グループ添削"
            : "面談";
        const label = studentName
          ? `${typeLabel}: ${studentName}`
          : typeLabel;
        events.push({
          uid: `coach-session-${doc.id}@coach.app`,
          id: `coach-session-${doc.id}@coach.app`,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          allDay: false,
          date: start.toISOString().slice(0, 10),
          type: "session",
          label,
          description: s.notes || undefined,
          location: s.meetLink || undefined,
          studentNames: studentName ? [studentName] : [],
          href: `/admin/sessions/${doc.id}`,
          sessionType: s.type,
        });
      }
    } catch (err) {
      console.warn("[calendar] sessions fetch failed:", err);
    }

    // 3. 入試日程イベント (同一 univ/fac/type/date で集約)
    const uniMap = getUniversityMap();
    type UniEventKey = string; // univId:facId:type:date
    const uniEventMap = new Map<
      UniEventKey,
      {
        univId: string;
        facId: string;
        univName: string;
        facName: string;
        type: CalendarEventType;
        labelPrefix: string;
        date: string;
        examDate: string; // 年度判定用
        studentNames: Set<string>;
      }
    >();

    for (const { univId, facId, studentName } of targetUniversityPairs) {
      const uni = uniMap.get(univId);
      if (!uni) continue;
      const faculty = uni.faculties.find((f) => f.id === facId);
      if (!faculty || !faculty.schedule) continue;
      const sched = faculty.schedule;
      for (const pair of UNI_SCHEDULE_PAIRS) {
        const date = sched[pair.field];
        if (!date || typeof date !== "string") continue;
        const d = new Date(`${date}T00:00:00${JST_OFFSET}`);
        if (isNaN(d.getTime())) continue;
        if (!inRange(d)) continue;
        const key = `${univId}:${facId}:${pair.type}:${date}`;
        const existing = uniEventMap.get(key);
        if (existing) {
          existing.studentNames.add(studentName);
        } else {
          uniEventMap.set(key, {
            univId,
            facId,
            univName: uni.name,
            facName: faculty.name,
            type: pair.type,
            labelPrefix: pair.labelPrefix,
            date,
            examDate: sched.examDate || date,
            studentNames: new Set([studentName]),
          });
        }
      }
    }

    for (const ev of uniEventMap.values()) {
      const iso = toAllDayIso(ev.date);
      const examYear = yearFromDate(ev.examDate);
      const yearSuffix = examYear ? `-${examYear}` : "";
      const yearLabel = admissionYearLabel(ev.examDate);
      const names = Array.from(ev.studentNames);
      events.push({
        uid: `coach-uni-${ev.univId}-${ev.facId}-${ev.type}${yearSuffix}@coach.app`,
        id: `coach-uni-${ev.univId}-${ev.facId}-${ev.type}${yearSuffix}@coach.app`,
        startAt: iso.startAt,
        endAt: iso.endAt,
        allDay: true,
        date: ev.date,
        type: ev.type,
        label: `${uni_shortTitle(ev.univName)} ${ev.facName} ${ev.labelPrefix}${
          yearLabel ? ` (${yearLabel})` : ""
        }`,
        description:
          names.length > 0 ? `志望: ${names.join("、")}` : undefined,
        studentNames: names,
        href: `/admin/universities/${ev.univId}`,
      });
    }

    // 4. ソート
    events.sort((a, b) => {
      if (a.startAt < b.startAt) return -1;
      if (a.startAt > b.startAt) return 1;
      return 0;
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "カレンダー取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 大学名が長い場合の短縮 (例: "早稲田大学" → "早稲田大")
function uni_shortTitle(name: string): string {
  if (name.endsWith("大学")) return name.slice(0, -1);
  return name;
}

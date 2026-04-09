import { WeaknessRecord, getWeaknessReminderLevel } from "@/lib/types/growth";
import { GrowthEvent } from "@/lib/types/essay";

export function analyzeGrowth(
  currentWeaknessTags: string[],
  existingWeaknesses: WeaknessRecord[]
): GrowthEvent[] {
  const events: GrowthEvent[] = [];
  const currentSet = new Set(currentWeaknessTags);

  for (const weakness of existingWeaknesses) {
    if (weakness.resolved) continue;

    const isInCurrent = currentSet.has(weakness.area);

    if (!isInCurrent && weakness.count >= 2) {
      events.push({
        type: "praise",
        area: weakness.area,
        message: `「${weakness.area}」の課題が改善されています。継続して良い傾向です！`,
      });
      continue;
    }

    if (isInCurrent) {
      const level = getWeaknessReminderLevel({ ...weakness, count: weakness.count + 1 });
      if (level === "critical") {
        events.push({
          type: "warning",
          area: weakness.area,
          message: `「${weakness.area}」が${weakness.count + 1}回指摘されています。重点的に改善が必要です。`,
        });
      } else if (level === "warning") {
        events.push({
          type: "warning",
          area: weakness.area,
          message: `「${weakness.area}」が繰り返し指摘されています（${weakness.count + 1}回目）。`,
        });
      }
    }
  }

  for (const tag of currentWeaknessTags) {
    const exists = existingWeaknesses.some((w) => w.area === tag);
    if (!exists) {
      events.push({
        type: "new_weakness",
        area: tag,
        message: `「${tag}」が新しい課題として検出されました。`,
      });
    }
  }

  return events;
}

export function updateWeaknessRecords(
  existingWeaknesses: WeaknessRecord[],
  currentWeaknessTags: string[],
  newSource: "essay" | "interview" = "essay"
): WeaknessRecord[] {
  const currentSet = new Set(currentWeaknessTags);
  const now = new Date();

  const updated = existingWeaknesses.map((w): WeaknessRecord => {
    if (currentSet.has(w.area)) {
      // 既存の弱点が今回も指摘された → sourceを適切に更新
      const mergedSource: "essay" | "interview" | "both" =
        w.source === newSource ? w.source :
        w.source === "both" ? "both" : "both";
      return {
        ...w,
        count: w.count + 1,
        lastOccurred: now,
        improving: false,
        resolved: false,
        source: mergedSource,
      };
    } else {
      return {
        ...w,
        improving: true,
      };
    }
  });

  const existingAreas = new Set(existingWeaknesses.map((w) => w.area));
  for (const tag of currentWeaknessTags) {
    if (!existingAreas.has(tag)) {
      updated.push({
        area: tag,
        count: 1,
        firstOccurred: now,
        lastOccurred: now,
        improving: false,
        resolved: false,
        source: newSource,
        reminderDismissedAt: null,
      });
    }
  }

  return updated;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  improving: 2,
  resolved: 3,
};

export function getRemindableWeaknesses(
  weaknesses: WeaknessRecord[],
  context: "dashboard" | "essay_new" | "essay_result"
): WeaknessRecord[] {
  let filtered = weaknesses.filter((w) => getWeaknessReminderLevel(w) !== null);

  if (context === "essay_new") {
    filtered = filtered.filter((w) => w.source === "essay" || w.source === "both");
  }

  return filtered.sort((a, b) => {
    const levelA = getWeaknessReminderLevel(a) ?? "resolved";
    const levelB = getWeaknessReminderLevel(b) ?? "resolved";
    return (SEVERITY_ORDER[levelA] ?? 99) - (SEVERITY_ORDER[levelB] ?? 99);
  });
}

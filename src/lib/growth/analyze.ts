import { WeaknessRecord, getWeaknessReminderLevel } from "@/lib/types/growth";
import { GrowthEvent } from "@/lib/types/essay";
import { categorizeWeakness } from "@/lib/growth/weakness-category";
import { findSimilarArea } from "@/lib/growth/weakness-similarity";

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
  newSource: "essay" | "interview" | "skill_check" | "interview_skill_check" = "essay",
  /** AI が直接出力した area → categoryId のヒント。 未指定なら
   *  categorizeWeakness() で fallback 分類 */
  categoryHints?: Map<string, WeaknessRecord["categoryId"]>,
): WeaknessRecord[] {
  const currentSet = new Set(currentWeaknessTags);
  const now = new Date();
  const resolveCategory = (area: string): WeaknessRecord["categoryId"] =>
    categoryHints?.get(area) ?? categorizeWeakness(area);

  const updated = existingWeaknesses.map((w): WeaknessRecord => {
    if (currentSet.has(w.area)) {
      // 既存の弱点が今回も指摘された → sourceを適切に更新
      // 異なるsource同士の合流は "both" に統合（essay/interview/skill_check を跨ぐ場合）
      const mergedSource: WeaknessRecord["source"] =
        w.source === newSource ? w.source : "both";
      return {
        ...w,
        count: w.count + 1,
        lastOccurred: now,
        improving: false,
        resolved: false,
        source: mergedSource,
        // 既存レコードに categoryId が無ければ自動付与 (= 漸進的 backfill)
        categoryId: w.categoryId ?? resolveCategory(w.area),
      };
    } else {
      return {
        ...w,
        improving: true,
        categoryId: w.categoryId ?? resolveCategory(w.area),
      };
    }
  });

  const existingAreas = new Set(existingWeaknesses.map((w) => w.area));
  for (const tag of currentWeaknessTags) {
    if (existingAreas.has(tag)) continue;

    // Phase 3: 同義語マージ
    // 完全一致しないなら、 同じ categoryId 内で類似度を見て既存にマージ
    const newCategory = resolveCategory(tag);
    const sameCatExistingAreas = updated
      .filter((w) => (w.categoryId ?? categorizeWeakness(w.area)) === newCategory)
      .map((w) => w.area);
    const match = findSimilarArea(tag, sameCatExistingAreas);
    if (match) {
      const idx = updated.findIndex((w) => w.area === match.area);
      if (idx !== -1) {
        const w = updated[idx];
        const mergedSource: WeaknessRecord["source"] =
          w.source === newSource ? w.source : "both";
        updated[idx] = {
          ...w,
          count: w.count + 1,
          lastOccurred: now,
          improving: false,
          resolved: false,
          source: mergedSource,
          categoryId: w.categoryId ?? newCategory,
        };
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[weakness merge] "${tag}" → "${w.area}" (similarity=${match.score.toFixed(2)}, category=${newCategory})`,
          );
        }
        continue;
      }
    }

    // マージ先なし → 新規作成
    updated.push({
      area: tag,
      count: 1,
      firstOccurred: now,
      lastOccurred: now,
      improving: false,
      resolved: false,
      source: newSource,
      reminderDismissedAt: null,
      categoryId: newCategory,
    });
    existingAreas.add(tag);
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

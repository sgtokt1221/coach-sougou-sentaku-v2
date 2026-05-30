import { WeaknessRecord, getWeaknessReminderLevel } from "@/lib/types/growth";
import { GrowthEvent } from "@/lib/types/essay";
import { categorizeWeakness } from "@/lib/growth/weakness-category";
import { findSimilarArea } from "@/lib/growth/weakness-similarity";
import { resolveCanonical, canonicalLabel } from "@/lib/growth/weakness-taxonomy";

/**
 * 弱点の統合キーを求める。正規タクソノミーに解決できればその ID、
 * できなければ素の area 文字列を返す (= 従来挙動の後方互換)。
 */
function weaknessKey(
  text: string,
  opts?: { categoryHint?: WeaknessRecord["categoryId"]; canonicalId?: string | null },
): string {
  if (opts?.canonicalId) return opts.canonicalId;
  const entry = resolveCanonical(text, {
    categoryHint: opts?.categoryHint,
    aiCanonicalId: opts?.canonicalId ?? null,
  });
  return entry ? entry.id : text;
}

export function analyzeGrowth(
  currentWeaknessTags: string[],
  existingWeaknesses: WeaknessRecord[]
): GrowthEvent[] {
  const events: GrowthEvent[] = [];
  // 今回の弱点を正規キーへ畳んで比較する (表記ゆれを吸収)
  const currentKeys = new Set(currentWeaknessTags.map((t) => weaknessKey(t)));

  for (const weakness of existingWeaknesses) {
    if (weakness.resolved) continue;

    const key = weaknessKey(weakness.area, {
      categoryHint: weakness.categoryId,
      canonicalId: weakness.canonicalId,
    });
    const isInCurrent = currentKeys.has(key);

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

  const existingKeys = new Set(
    existingWeaknesses.map((w) =>
      weaknessKey(w.area, { categoryHint: w.categoryId, canonicalId: w.canonicalId }),
    ),
  );
  const seenNew = new Set<string>();
  for (const tag of currentWeaknessTags) {
    const key = weaknessKey(tag);
    if (existingKeys.has(key) || seenNew.has(key)) continue;
    seenNew.add(key);
    events.push({
      type: "new_weakness",
      area: tag,
      message: `「${tag}」が新しい課題として検出されました。`,
    });
  }

  return events;
}

/** lastOccurred を比較可能な ms に正規化する小ヘルパー */
function lastMs(w: WeaknessRecord): number {
  if (!w.lastOccurred) return 0;
  return w.lastOccurred instanceof Date
    ? w.lastOccurred.getTime()
    : new Date(w.lastOccurred).getTime();
}

function firstMs(w: WeaknessRecord): number {
  if (!w.firstOccurred) return lastMs(w);
  return w.firstOccurred instanceof Date
    ? w.firstOccurred.getTime()
    : new Date(w.firstOccurred).getTime();
}

/**
 * 同一 canonicalId を持つ既存レコード群を 1 本に畳む。
 * count は合算、firstOccurred=最古、lastOccurred=最新、improving/resolved は
 * 最新 lastOccurred 側の状態を採用、source は異なれば "both"。
 * 全レコードが archive 済みのときのみ archive を維持する。
 */
function mergeGroup(group: WeaknessRecord[], canonicalId: string, label: string): WeaknessRecord {
  const latest = group.reduce((a, b) => (lastMs(b) >= lastMs(a) ? b : a));
  const totalCount = group.reduce((sum, w) => sum + (w.count || 0), 0);
  const sources = new Set(group.map((w) => w.source));
  const mergedSource: WeaknessRecord["source"] =
    sources.size === 1 ? [...sources][0] : "both";
  const allArchived = group.every((w) => !!w.archivedAt);
  const dismissed = group
    .map((w) => w.reminderDismissedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    ...latest,
    area: label,
    canonicalId,
    categoryId: latest.categoryId,
    count: totalCount,
    firstOccurred: new Date(Math.min(...group.map(firstMs))),
    lastOccurred: new Date(Math.max(...group.map(lastMs))),
    improving: latest.improving,
    resolved: latest.resolved,
    source: mergedSource,
    reminderDismissedAt: dismissed,
    archivedAt: allArchived ? latest.archivedAt : undefined,
  };
}

/**
 * 既存レコードに canonicalId を backfill し、同一 canonicalId を統合する。
 * 正規化できない (resolveCanonical=null) レコードはそのまま残す。
 */
function consolidateExisting(
  existing: WeaknessRecord[],
  categoryHints?: Map<string, WeaknessRecord["categoryId"]>,
): WeaknessRecord[] {
  const groups = new Map<string, WeaknessRecord[]>();
  const passthrough: WeaknessRecord[] = [];

  for (const w of existing) {
    const entry = resolveCanonical(w.area, {
      categoryHint: categoryHints?.get(w.area) ?? w.categoryId,
      aiCanonicalId: w.canonicalId ?? null,
    });
    if (!entry) {
      passthrough.push(w);
      continue;
    }
    const list = groups.get(entry.id) ?? [];
    list.push({ ...w, categoryId: w.categoryId ?? entry.category });
    groups.set(entry.id, list);
  }

  const merged: WeaknessRecord[] = [];
  for (const [id, group] of groups) {
    const label = canonicalLabel(id);
    if (group.length === 1) {
      merged.push({ ...group[0], canonicalId: id, area: label });
    } else {
      merged.push(mergeGroup(group, id, label));
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[weakness consolidate] ${group.length}件 → "${label}" (canonicalId=${id})`,
        );
      }
    }
  }
  return [...merged, ...passthrough];
}

export function updateWeaknessRecords(
  existingWeaknesses: WeaknessRecord[],
  currentWeaknessTags: string[],
  newSource: "essay" | "interview" | "skill_check" | "interview_skill_check" = "essay",
  /** AI が直接出力した area → categoryId のヒント。 未指定なら
   *  categorizeWeakness() で fallback 分類 */
  categoryHints?: Map<string, WeaknessRecord["categoryId"]>,
  /** AI が直接出力した area → 正規 canonicalId のヒント (最優先で採用) */
  canonicalHints?: Map<string, string>,
): WeaknessRecord[] {
  const now = new Date();
  const resolveCategory = (area: string): WeaknessRecord["categoryId"] =>
    categoryHints?.get(area) ?? categorizeWeakness(area);

  // (a) 既存レコードを canonicalId で backfill + 統合 (散らばった弱点を集約)
  const updated = consolidateExisting(existingWeaknesses, categoryHints);

  // 正規 ID / area で既存を引けるよう索引化
  const byCanonical = new Map<string, number>();
  const byArea = new Map<string, number>();
  updated.forEach((w, i) => {
    if (w.canonicalId) byCanonical.set(w.canonicalId, i);
    byArea.set(w.area, i);
  });

  const touched = new Set<number>(); // 今回 count++ したレコード index
  const seenCanonical = new Set<string>(); // 提出内デデュープ (canonical)
  const seenArea = new Set<string>(); // 提出内デデュープ (fallback)

  /** 既存レコードを今回分でインクリメント */
  const bump = (idx: number, fallbackCategory: WeaknessRecord["categoryId"]) => {
    const w = updated[idx];
    const mergedSource: WeaknessRecord["source"] =
      w.source === newSource ? w.source : "both";
    updated[idx] = {
      ...w,
      count: w.count + 1,
      lastOccurred: now,
      improving: false,
      resolved: false,
      archivedAt: undefined, // 再指摘されたので復活
      source: mergedSource,
      categoryId: w.categoryId ?? fallbackCategory,
    };
    touched.add(idx);
  };

  for (const tag of currentWeaknessTags) {
    const entry = resolveCanonical(tag, {
      categoryHint: resolveCategory(tag),
      aiCanonicalId: canonicalHints?.get(tag) ?? null,
    });

    if (entry) {
      // --- 正規化できた弱点: canonicalId で完全一致統合 ---
      if (seenCanonical.has(entry.id)) continue; // 同一提出内は 1 回だけ
      seenCanonical.add(entry.id);

      const idx = byCanonical.get(entry.id);
      if (idx !== undefined) {
        bump(idx, entry.category);
        continue;
      }
      // 新規 (正規ラベルで作成)
      const rec: WeaknessRecord = {
        area: entry.label,
        canonicalId: entry.id,
        count: 1,
        firstOccurred: now,
        lastOccurred: now,
        improving: false,
        resolved: false,
        source: newSource,
        reminderDismissedAt: null,
        categoryId: entry.category,
      };
      updated.push(rec);
      const newIdx = updated.length - 1;
      byCanonical.set(entry.id, newIdx);
      byArea.set(entry.label, newIdx);
      touched.add(newIdx);
      continue;
    }

    // --- 正規化不能: 従来の area 一致 + 類似度フォールバック ---
    if (seenArea.has(tag)) continue;
    seenArea.add(tag);

    const exactIdx = byArea.get(tag);
    if (exactIdx !== undefined) {
      bump(exactIdx, resolveCategory(tag));
      continue;
    }

    const newCategory = resolveCategory(tag);
    const sameCatExistingAreas = updated
      .filter((w) => !w.canonicalId && (w.categoryId ?? categorizeWeakness(w.area)) === newCategory)
      .map((w) => w.area);
    const match = findSimilarArea(tag, sameCatExistingAreas);
    if (match) {
      const idx = updated.findIndex((w) => w.area === match.area);
      if (idx !== -1) {
        bump(idx, newCategory);
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[weakness merge] "${tag}" → "${updated[idx].area}" (similarity=${match.score.toFixed(2)}, category=${newCategory})`,
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
    const newIdx = updated.length - 1;
    byArea.set(tag, newIdx);
    touched.add(newIdx);
  }

  // 今回触れられなかった未解決レコードは improving 扱い (従来挙動)
  const result = updated.map((w, i) => {
    if (touched.has(i)) return w;
    if (w.resolved) return w;
    return { ...w, improving: true };
  });

  return archiveOldWeaknesses(result, now);
}

/** Phase 4: 自動アーカイブ閾値 (日) */
export const ARCHIVE_DAYS_IMPROVING = 60;
export const ARCHIVE_DAYS_RESOLVED = 30;

/**
 * 古い弱点を archive 扱いにする。
 * - resolved=true で lastOccurred から 30日経過 → archive
 * - improving=true で lastOccurred から 60日経過 → archive
 * - 既に archivedAt が立っているものは無視
 */
export function archiveOldWeaknesses(
  weaknesses: WeaknessRecord[],
  now: Date = new Date(),
): WeaknessRecord[] {
  const ms = now.getTime();
  return weaknesses.map((w) => {
    if (w.archivedAt) return w;
    if (!w.lastOccurred) return w;
    const lastMs =
      w.lastOccurred instanceof Date ? w.lastOccurred.getTime() : new Date(w.lastOccurred).getTime();
    const elapsedDays = (ms - lastMs) / (1000 * 60 * 60 * 24);
    if (w.resolved && elapsedDays >= ARCHIVE_DAYS_RESOLVED) {
      return { ...w, archivedAt: now };
    }
    if (w.improving && elapsedDays >= ARCHIVE_DAYS_IMPROVING) {
      return { ...w, archivedAt: now };
    }
    return w;
  });
}

/** アクティブな弱点 (= archive されていないもの) だけを返す */
export function getActiveWeaknesses(weaknesses: WeaknessRecord[]): WeaknessRecord[] {
  return weaknesses.filter((w) => !w.archivedAt);
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
  let filtered = weaknesses.filter((w) => !w.archivedAt && getWeaknessReminderLevel(w) !== null);

  if (context === "essay_new") {
    filtered = filtered.filter((w) => w.source === "essay" || w.source === "both");
  }

  return filtered.sort((a, b) => {
    const levelA = getWeaknessReminderLevel(a) ?? "resolved";
    const levelB = getWeaknessReminderLevel(b) ?? "resolved";
    return (SEVERITY_ORDER[levelA] ?? 99) - (SEVERITY_ORDER[levelB] ?? 99);
  });
}

import {
  WeaknessRecord,
  getWeaknessReminderLevel,
  WEAKNESS_RECENT_WINDOW,
  WEAKNESS_RESOLVE_STREAK,
} from "@/lib/types/growth";
import { GrowthEvent } from "@/lib/types/essay";
import { categorizeWeakness } from "@/lib/growth/weakness-category";
import { findSimilarArea } from "@/lib/growth/weakness-similarity";
import {
  resolveCanonical,
  canonicalLabel,
  entryForCanonicalId,
  getTaxonomyEntry,
  isWeaknessLabel,
  isLocationOnlyLabel,
} from "@/lib/growth/weakness-taxonomy";

/**
 * 弱点の統合キーを求める。正規タクソノミーに解決できればその ID、
 * できなければ素の area 文字列を返す (= 従来挙動の後方互換)。
 * 作り直し（rebuild-weaknesses）の「もう見ない」の引き継ぎも同じキーで照合する。
 */
export function weaknessKey(
  text: string,
  opts?: {
    categoryHint?: WeaknessRecord["categoryId"];
    canonicalId?: string | null;
    domain?: ResolveDomain;
  }
): string {
  // 別名の旧 ID（originality.no_experience 等）は正本 ID へ寄せる。
  // 寄せないと同じ弱点が旧 ID と新 ID で別物になり、改善と新規が同時に出る
  // 小論文の弱点に面接の iv.* が付いていたら採らず、キーワードで決め直す
  // （consolidateExisting と同じ規則。ずれると改善と合算が同時に起きる）
  if (opts?.canonicalId) {
    const byId = entryForCanonicalId(opts.canonicalId, opts.domain);
    if (byId) return byId.id;
    // タクソノミーに無い ID はそのままキーにする（従来どおり）
    if (!getTaxonomyEntry(opts.canonicalId)) return opts.canonicalId;
  }
  const entry = resolveCanonical(text, {
    categoryHint: opts?.categoryHint,
    domain: opts?.domain,
  });
  return entry ? entry.id : text;
}

/** 弱点を積む提出の種類 */
export type WeaknessSource =
  | "essay"
  | "interview"
  | "skill_check"
  | "interview_skill_check";

/**
 * 提出の分野。「今回指摘されなかった」は同じ分野の提出でしか言えない。
 *
 * 以前は分野を見ずに、提出で触れなかった弱点を一律で「改善中」にしていた。
 * 面接を1回受けると小論文の弱点が全部「改善中」になり、面接の結果に
 * 「（小論文の弱点）が改善されています」と出ていた。
 */
function domainOf(source: WeaknessRecord["source"]): string {
  if (source === "essay" || source === "skill_check") return "essay";
  if (source === "interview" || source === "interview_skill_check")
    return "interview";
  return source; // "lesson"（講師が入れた弱点）は提出では動かさない
}

type ResolveDomain = "essay" | "interview";

/**
 * 正規タクソノミーへ寄せるときの候補の範囲。面接の提出・両方で指摘された弱点・
 * 講師が面談で入れた弱点（lesson。小論文と面接の両方がある）は面接の iv.* も候補にし、
 * それ以外（小論文の提出）は小論文の弱点だけ。
 * 小論文の「具体的なエピソードの欠如」が面接の iv.no_episode に寄らないようにする。
 */
export function resolveDomainOf(
  source: WeaknessRecord["source"]
): ResolveDomain {
  return source === "both" ||
    source === "lesson" ||
    domainOf(source) === "interview"
    ? "interview"
    : "essay";
}

/** この弱点が、この分野の提出で「指摘されたか／されなかったか」を数える対象か */
function inDomain(w: WeaknessRecord, source: WeaknessSource): boolean {
  return w.source === "both" || domainOf(w.source) === domainOf(source);
}

/** 前回の同じ分野の提出で指摘されていたか（直近の記録が無い旧データは improving の否定で代用） */
function pointedLastTime(w: WeaknessRecord): boolean {
  if (w.recentHits && w.recentHits.length > 0) {
    return w.recentHits[w.recentHits.length - 1] === 1;
  }
  return !w.improving;
}

function pushRecent(hits: number[] | undefined, hit: 0 | 1): number[] {
  return [...(hits ?? []), hit].slice(-WEAKNESS_RECENT_WINDOW);
}

export function analyzeGrowth(
  currentWeaknessTags: string[],
  existingWeaknesses: WeaknessRecord[],
  source: WeaknessSource = "essay"
): GrowthEvent[] {
  const events: GrowthEvent[] = [];
  // 今回の弱点を正規キーへ畳んで比較する (表記ゆれを吸収)
  const domain = resolveDomainOf(source);
  const currentKeys = new Set(
    currentWeaknessTags.map((t) => weaknessKey(t, { domain }))
  );

  for (const weakness of existingWeaknesses) {
    if (weakness.resolved) continue;
    // 別の分野の弱点は、この提出で指摘されなかったからといって改善とは言えない
    if (!inDomain(weakness, source)) continue;

    const key = weaknessKey(weakness.area, {
      categoryHint: weakness.categoryId,
      canonicalId: weakness.canonicalId,
      domain: resolveDomainOf(weakness.source),
    });
    const isInCurrent = currentKeys.has(key);

    // 前回指摘されていて、今回は無くなったときだけ褒める。
    // 以前は「今回挙がらなかった2回以上の弱点」を毎回すべて褒めていたが、AI が
    // 1回に挙げる弱点は最大3件なので、テーマが違うだけで「改善」が並んでいた
    if (!isInCurrent && weakness.count >= 2 && pointedLastTime(weakness)) {
      events.push({
        type: "praise",
        area: weakness.area,
        message: `「${weakness.area}」の課題が改善されています。継続して良い傾向です！`,
      });
      continue;
    }

    if (isInCurrent) {
      const level = getWeaknessReminderLevel({
        ...weakness,
        count: weakness.count + 1,
      });
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
      weaknessKey(w.area, {
        categoryHint: w.categoryId,
        canonicalId: w.canonicalId,
        domain: resolveDomainOf(w.source),
      })
    )
  );
  const seenNew = new Set<string>();
  for (const tag of currentWeaknessTags) {
    const key = weaknessKey(tag, { domain });
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
function mergeGroup(
  group: WeaknessRecord[],
  canonicalId: string,
  label: string
): WeaknessRecord {
  const latest = group.reduce((a, b) => (lastMs(b) >= lastMs(a) ? b : a));
  const totalCount = group.reduce((sum, w) => sum + (w.count || 0), 0);
  const sources = new Set(group.map((w) => w.source));
  const mergedSource: WeaknessRecord["source"] =
    sources.size === 1 ? [...sources][0] : "both";
  const allArchived = group.every((w) => !!w.archivedAt);
  const dismissed =
    group
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
  categoryHints?: Map<string, WeaknessRecord["categoryId"]>
): WeaknessRecord[] {
  const groups = new Map<string, WeaknessRecord[]>();
  const passthrough: WeaknessRecord[] = [];

  for (const w of existing) {
    const entry = resolveCanonical(w.area, {
      categoryHint: categoryHints?.get(w.area) ?? w.categoryId,
      aiCanonicalId: w.canonicalId ?? null,
      domain: resolveDomainOf(w.source),
    });
    if (!entry) {
      passthrough.push(w);
      continue;
    }
    const list = groups.get(entry.id) ?? [];
    // 正規ラベルに載った弱点はタクソノミーのカテゴリを正本にする（カテゴリを移した
    // エントリが、作成時の古い軸のまま残らないように）
    list.push({ ...w, categoryId: entry.category });
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
          `[weakness consolidate] ${group.length}件 → "${label}" (canonicalId=${id})`
        );
      }
    }
  }
  return [...merged, ...passthrough];
}

export interface UpdateWeaknessOptions {
  /** 今回の提出の種類 */
  source: WeaknessSource;
  /** AI が直接出力した area → categoryId のヒント。 未指定なら
   *  categorizeWeakness() で fallback 分類 */
  categoryHints?: Map<string, WeaknessRecord["categoryId"]>;
  /** AI が直接出力した area → 正規 canonicalId のヒント (最優先で採用) */
  canonicalHints?: Map<string, string>;
  /**
   * area → 具体例（AI が書いた「答案のここがこう弱い」）。
   * 正規ラベルだけでは誰の弱点も同じ文言になるため、直近の例を記録に残す。
   * ラベルが見出し語で決まらないときの正規化の手がかりにも使う。
   */
  detailHints?: Map<string, string>;
  /** 提出の時刻。作り直し（過去の提出の再生）で当時の時刻を入れる */
  now?: Date;
  /**
   * 今回挙がらなかった弱点を「指摘されなかった回」として数えるか（既定 true）。
   * ちょこ添削のような部分練習は答案全体を見ていないので false にする。
   * 数えると、結論を書いていない練習で「結論の弱点」が解決済みになる。
   */
  countMisses?: boolean;
}

/**
 * 添削の repeatedIssues から、updateWeaknessRecords に渡す弱点名とヒントを作る。
 * 提出の経路（添削・講座・宿題・作り直し）で同じ材料を渡す（ずれると同じ答案でも
 * 経路によって振り分け先が変わる）。
 */
export function hintsFromIssues(
  issues: readonly {
    area?: string;
    category?: WeaknessRecord["categoryId"];
    message?: string;
  }[]
): {
  tags: string[];
  categoryHints: Map<string, WeaknessRecord["categoryId"]>;
  detailHints: Map<string, string>;
} {
  const tags: string[] = [];
  const categoryHints = new Map<string, WeaknessRecord["categoryId"]>();
  const detailHints = new Map<string, string>();
  for (const issue of issues) {
    if (!issue.area) continue;
    tags.push(issue.area);
    if (issue.category) categoryHints.set(issue.area, issue.category);
    const message = issue.message?.trim();
    if (message) detailHints.set(issue.area, message);
  }
  return { tags, categoryHints, detailHints };
}

export function updateWeaknessRecords(
  existingWeaknesses: WeaknessRecord[],
  currentWeaknessTags: string[],
  options: UpdateWeaknessOptions
): WeaknessRecord[] {
  const {
    source: newSource,
    categoryHints,
    canonicalHints,
    detailHints,
  } = options;
  const now = options.now ?? new Date();
  /**
   * 弱点として積めるものだけに絞る。
   *
   * 助言の自由文（「〜しましょう」）や長い説明文が混ざると、正規化の部分一致で
   * 汎用ラベルに落ち、誰にでも同じ弱点が積み上がる。呼び出し側で混ぜない
   * ようにしたうえで、書き込みの直前でももう一度弾く。
   */
  const tags = currentWeaknessTags.filter(isWeaknessLabel);
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
  const bump = (
    idx: number,
    fallbackCategory: WeaknessRecord["categoryId"],
    example?: string
  ) => {
    const w = updated[idx];
    const mergedSource: WeaknessRecord["source"] =
      w.source === newSource ? w.source : "both";
    updated[idx] = {
      ...w,
      count: w.count + 1,
      lastOccurred: now,
      // 直近の例を上書きする（同じラベルでも今回の答案の話に差し替わる）
      ...(example ? { lastExample: example } : {}),
      improving: false,
      resolved: false,
      archivedAt: undefined, // 再指摘されたので復活
      source: mergedSource,
      categoryId: w.categoryId ?? fallbackCategory,
      recentHits: pushRecent(w.recentHits, 1),
      missStreak: 0,
    };
    touched.add(idx);
  };

  for (const tag of tags) {
    const detail = detailHints?.get(tag);
    const entry = resolveCanonical(tag, {
      categoryHint: resolveCategory(tag),
      aiCanonicalId: canonicalHints?.get(tag) ?? null,
      supportText: detail,
      domain: resolveDomainOf(newSource),
    });

    if (entry) {
      // --- 正規化できた弱点: canonicalId で完全一致統合 ---
      if (seenCanonical.has(entry.id)) continue; // 同一提出内は 1 回だけ
      seenCanonical.add(entry.id);

      const idx = byCanonical.get(entry.id);
      if (idx !== undefined) {
        bump(idx, entry.category, detail);
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
        ...(detail ? { lastExample: detail } : {}),
        recentHits: [1],
        missStreak: 0,
      };
      updated.push(rec);
      const newIdx = updated.length - 1;
      byCanonical.set(entry.id, newIdx);
      byArea.set(entry.label, newIdx);
      touched.add(newIdx);
      continue;
    }

    /**
     * 正規化できず、しかも場所・見出しを指しているだけのラベルは積まない。
     * 「冒頭の文」「改善策の根拠」が弱点リストに並んでも、生徒は何を直せばよいか
     * 分からない。落としたことはログに残す（黙って減らさない）。
     */
    if (isLocationOnlyLabel(tag)) {
      console.warn(
        `[weakness] 場所だけのラベルなので積みませんでした: ${JSON.stringify(tag)}`
      );
      continue;
    }

    // --- 正規化不能: 従来の area 一致 + 類似度フォールバック ---
    if (seenArea.has(tag)) continue;
    seenArea.add(tag);

    const exactIdx = byArea.get(tag);
    if (exactIdx !== undefined) {
      bump(exactIdx, resolveCategory(tag), detail);
      continue;
    }

    const newCategory = resolveCategory(tag);
    const sameCatExistingAreas = updated
      .filter(
        (w) =>
          !w.canonicalId &&
          (w.categoryId ?? categorizeWeakness(w.area)) === newCategory
      )
      .map((w) => w.area);
    const match = findSimilarArea(tag, sameCatExistingAreas);
    if (match) {
      const idx = updated.findIndex((w) => w.area === match.area);
      if (idx !== -1) {
        bump(idx, newCategory, detail);
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[weakness merge] "${tag}" → "${updated[idx].area}" (similarity=${match.score.toFixed(2)}, category=${newCategory})`
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
      ...(detail ? { lastExample: detail } : {}),
      recentHits: [1],
      missStreak: 0,
    });
    const newIdx = updated.length - 1;
    byArea.set(tag, newIdx);
    touched.add(newIdx);
  }

  /**
   * 今回指摘されなかった弱点。**同じ分野の提出のときだけ**動かす。
   * 直近の記録に「指摘なし」を積み、続けて WEAKNESS_RESOLVE_STREAK 回
   * 指摘されなければ解決済みにする（再び指摘されたら bump で戻る）。
   */
  const result = updated.map((w, i) => {
    if (touched.has(i)) return w;
    if (w.resolved || w.archivedAt) return w;
    if (options.countMisses === false) return w;
    if (!inDomain(w, newSource)) return w;
    const missStreak = (w.missStreak ?? 0) + 1;
    const resolved = missStreak >= WEAKNESS_RESOLVE_STREAK;
    return {
      ...w,
      improving: !resolved,
      resolved,
      missStreak,
      recentHits: pushRecent(w.recentHits, 0),
    };
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
  now: Date = new Date()
): WeaknessRecord[] {
  const ms = now.getTime();
  return weaknesses.map((w) => {
    if (w.archivedAt) return w;
    if (!w.lastOccurred) return w;
    const lastMs =
      w.lastOccurred instanceof Date
        ? w.lastOccurred.getTime()
        : new Date(w.lastOccurred).getTime();
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
export function getActiveWeaknesses(
  weaknesses: WeaknessRecord[]
): WeaknessRecord[] {
  return weaknesses.filter((w) => !w.archivedAt);
}

function dateMs(d: Date | string | null | undefined): number {
  if (!d) return 0;
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
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
  let filtered = weaknesses.filter((w) => {
    if (w.archivedAt) return false;
    const level = getWeaknessReminderLevel(w);
    // 解決済みは「次に気をつけること」ではないので出さない
    if (level === null || level === "resolved") return false;
    // 「もう見ない」を押したあと、再び指摘されるまでは出さない
    if (
      w.reminderDismissedAt &&
      dateMs(w.reminderDismissedAt) >= dateMs(w.lastOccurred)
    ) {
      return false;
    }
    return true;
  });

  if (context === "essay_new") {
    filtered = filtered.filter(
      (w) => w.source === "essay" || w.source === "both"
    );
  }

  return filtered.sort((a, b) => {
    const levelA = getWeaknessReminderLevel(a) ?? "resolved";
    const levelB = getWeaknessReminderLevel(b) ?? "resolved";
    return (SEVERITY_ORDER[levelA] ?? 99) - (SEVERITY_ORDER[levelB] ?? 99);
  });
}

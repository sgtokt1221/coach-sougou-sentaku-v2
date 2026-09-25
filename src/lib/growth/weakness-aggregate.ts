import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  resolveCanonical,
  canonicalLabel,
  isWeaknessLabel,
  isLocationOnlyLabel,
} from "@/lib/growth/weakness-taxonomy";
import {
  categorizeWeakness,
  type EssayCategoryKey,
} from "@/lib/growth/weakness-category";
import { withSentenceCheckIssues } from "@/lib/essay/review-core";
import type { SentenceCheckResult } from "@/lib/essay/sentence-check-judge";

/**
 * 生の weaknessTag を「集計キー」へ正規化する。
 *
 * 統合後の WeaknessRecord.area は正規タクソノミーのラベルになっているため、
 * 期間別カウントも同じ正規ラベルでキー付けしないと改善/悪化判定が一致しない。
 * 正規化できない (resolveCanonical=null) タグは生文字列のままキーにする
 * (= 従来の自由文弱点と整合)。
 */
function aggregationKey(tag: string): string {
  const entry = resolveCanonical(tag);
  return entry ? canonicalLabel(entry.id) : tag;
}

/**
 * 面接の動画解析・身だしなみの弱点。repeatedIssues には入らず weaknessTags にだけ
 * 残る（src/app/api/interview/end/route.ts が足している）。
 */
export const VIDEO_WEAKNESS_TAG =
  /^(視線が散漫|表情が硬い|姿勢が不安定|首が傾きがち|うなずきが少ない|身だしなみ:)/;

type IssueLike = { area?: string; category?: string; message?: string };

/**
 * 1提出（答案・面接）から、弱点DBに積まれる弱点の正規ラベルを返す。
 *
 * 書き込み経路（updateWeaknessRecords）と同じ材料・同じ規則で数える:
 *   - 材料は AI の repeatedIssues と、1文ずつの点検（sentenceCheck）だけ。
 *     保存された weaknessTags は v21 より前は助言の文まで混ざっている
 *   - カテゴリと説明文を手がかりに正規ラベルへ寄せる（場所だけのラベル対策）
 * ずれると、成長レポートの「今期間の指摘回数」が弱点DBの弱点と一致せず、
 * 11回指摘されている弱点が「改善」と表示される。
 */
export function weaknessKeysOf(data: Record<string, unknown>): string[] {
  const feedback = data.feedback as { repeatedIssues?: IssueLike[] } | undefined;
  const issues = withSentenceCheckIssues(
    (feedback?.repeatedIssues ?? []) as Parameters<
      typeof withSentenceCheckIssues
    >[0],
    (data.sentenceCheck as SentenceCheckResult | undefined) ?? null
  ) as IssueLike[];
  const keys = new Set<string>();
  for (const issue of issues) {
    const area = issue.area?.trim();
    if (!area || !isWeaknessLabel(area)) continue;
    const entry = resolveCanonical(area, {
      categoryHint:
        (issue.category as EssayCategoryKey | undefined) ??
        categorizeWeakness(area),
      supportText: issue.message,
    });
    if (entry) keys.add(canonicalLabel(entry.id));
    else if (!isLocationOnlyLabel(area)) keys.add(area);
  }
  const saved = data.weaknessTags;
  if (Array.isArray(saved)) {
    for (const t of saved) {
      if (typeof t === "string" && VIDEO_WEAKNESS_TAG.test(t))
        keys.add(aggregationKey(t));
    }
  }
  return [...keys];
}

/**
 * essays / interviews ドキュメント群から「弱点ごとの指摘回数」を
 * `Record<正規ラベル, count>` で返す（1提出で同じ弱点は1回）。
 *
 * 用途: 成長レポート生成時に「今期間 vs 前期間」の指摘頻度を比較するため。
 */
export function collectWeaknessTags(
  docs: QueryDocumentSnapshot[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of docs) {
    for (const key of weaknessKeysOf(d.data())) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * 複数の `Record<string, number>` を **加算マージ** する。
 * 同じキーがある場合は値を足し合わせる (spread は上書きになるので不適切)。
 */
export function mergeCountMaps(
  ...maps: Record<string, number>[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of maps) {
    for (const [k, v] of Object.entries(m)) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

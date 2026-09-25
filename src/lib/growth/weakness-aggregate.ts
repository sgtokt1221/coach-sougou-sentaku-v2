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
import {
  deriveWeaknessIssues,
  isPartialEssay,
  type DerivableFeedback,
} from "@/lib/essay/derive-weakness-issues";
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

/**
 * 提出の種類。文書の項目から推測しない（宿題の提出など、面接以外でも
 * mode / completedAt を書く経路がある）ので、読み出した側が渡す。
 * - essay: 小論文の答案。判定欄から弱点を足す（deriveWeaknessIssues）
 * - interview: 面接。AI の repeatedIssues と動画の弱点タグ
 * - skill_check: 廃止したスキルチェックの答案。書き込み時も作り直し
 *   （rebuild-weaknesses.ts）も AI の repeatedIssues だけなので、判定欄は足さない
 */
export type WeaknessSubmissionKind = "essay" | "interview" | "skill_check";

/**
 * 1提出（答案・面接）から、弱点DBに積まれる弱点の正規ラベルを返す。
 *
 * 書き込み経路（updateWeaknessRecords）と同じ材料・同じ規則で数える:
 *   - 答案は AI の repeatedIssues に、判定欄（文の点検・設問の充足・読み違い・
 *     知識・字数）から足した弱点を加える（書き込みと同じ deriveWeaknessIssues）。
 *     保存された weaknessTags は v21 より前は助言の文まで混ざっている
 *   - カテゴリと説明文を手がかりに正規ラベルへ寄せる（場所だけのラベル対策）
 * ずれると、成長レポートの「今期間の指摘回数」が弱点DBの弱点と一致せず、
 * 11回指摘されている弱点が「改善」と表示される。
 */
export function weaknessKeysOf(
  data: Record<string, unknown>,
  kind: WeaknessSubmissionKind
): string[] {
  const isInterview = kind === "interview";
  const feedback = (data.feedback ?? {}) as DerivableFeedback;
  const issues =
    kind === "essay"
      ? deriveWeaknessIssues(
          feedback,
          (data.sentenceCheck as SentenceCheckResult | undefined) ?? null,
          { partial: isPartialEssay(data) }
        )
      : (feedback.repeatedIssues ?? []);
  const keys = new Set<string>();
  for (const issue of issues) {
    const area = issue.area?.trim();
    if (!area || !isWeaknessLabel(area)) continue;
    const entry = resolveCanonical(area, {
      categoryHint:
        (issue.category as EssayCategoryKey | undefined) ??
        categorizeWeakness(area),
      supportText: issue.message,
      domain: isInterview ? "interview" : "essay",
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
  docs: QueryDocumentSnapshot[],
  kind: WeaknessSubmissionKind
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of docs) {
    for (const key of weaknessKeysOf(d.data(), kind)) {
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

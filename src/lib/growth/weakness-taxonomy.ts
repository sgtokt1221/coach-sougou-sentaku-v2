/**
 * 弱点の「正規タクソノミー」(Phase 5 統合強化)。
 *
 * 背景:
 *   従来の弱点統合は AI が自由作文した弱点テキスト(area)をキーにし、
 *   文字 bi-gram の類似度でマージしていたため、日本語の表記ゆれ
 *   (「論理が飛躍」「論証に無理がある」等) を別物として扱い、count が
 *   貯まらず弱点が増殖していた。
 *
 * 対策:
 *   カテゴリごとに「固定の弱点ラベル集合」を定義し、検出された弱点テキストを
 *   必ずこのいずれかへ resolve(解決) してから、正規 ID の完全一致で統合する。
 *   解決は keyword マッチで決定論的に行えるため、AI プロンプト未改修の経路でも
 *   恩恵を受けられる。AI が canonicalId を直接出力できる経路ではそれを最優先する。
 *
 * categoryId は既存の essay 5 軸 + other を再利用(列挙は拡張しない)。面接の
 * 非言語(視線・表情・姿勢等)は other に寄せつつ、canonicalId で識別する。
 */

import type { EssayCategoryKey } from "@/lib/growth/weakness-category";

/** 正規タクソノミーの 1 エントリ */
export interface TaxonomyEntry {
  /** 安定スラッグ。統合の一意キー (例: "logic.leap") */
  id: string;
  /** 系統カテゴリ (essay 5 軸 + other を再利用) */
  category: EssayCategoryKey;
  /** 表示用の安定日本語ラベル。統合後はこれを WeaknessRecord.area に採用 */
  label: string;
  /** 決定論マッピング用の語彙 (text に部分一致したらヒット) */
  keywords: string[];
}

/**
 * 固定タクソノミー。小論文 5 軸 + 面接(明確さ/具体性/動機/熱意/非言語)を網羅。
 * 並び順は resolve のタイブレーク (同点時は先頭優先) に影響するため、
 * より具体的・頻出のものを上に置く。
 */
export const WEAKNESS_TAXONOMY: readonly TaxonomyEntry[] = [
  // ---- 構成 (structure) ----
  {
    id: "structure.no_conclusion",
    category: "structure",
    label: "結論が不明確・欠落している",
    keywords: ["結論", "締め", "結び", "まとめ方", "落としどころ"],
  },
  {
    id: "structure.weak_flow",
    category: "structure",
    label: "段落のつながり・論述の流れが弱い",
    keywords: ["流れ", "つながり", "繋がり", "接続", "展開", "段落", "構成の流れ"],
  },
  {
    id: "structure.unbalanced",
    category: "structure",
    label: "序論・本論・結論の構成バランスが悪い",
    keywords: ["序論", "本論", "バランス", "配分", "比率", "構成のバランス"],
  },
  {
    id: "structure.off_topic",
    category: "structure",
    label: "設問・テーマから論点がずれている",
    keywords: ["設問", "テーマからずれ", "論点がずれ", "逸脱", "外れ", "趣旨"],
  },

  // ---- 論証 (logic) ----
  {
    id: "logic.leap",
    category: "logic",
    label: "主張と理由が飛躍している",
    keywords: ["飛躍", "短絡", "唐突", "主張と理由", "論理が飛", "つながらない"],
  },
  {
    id: "logic.weak_evidence",
    category: "logic",
    label: "根拠・データが不足している",
    keywords: ["根拠", "裏付け", "データ", "証拠", "説得力", "エビデンス", "理由が薄"],
  },
  {
    id: "logic.causal_error",
    category: "logic",
    label: "因果関係を取り違えている",
    keywords: ["因果", "原因と結果", "原因", "結果の関係"],
  },
  {
    id: "logic.contradiction",
    category: "logic",
    label: "主張に矛盾・一貫性の欠如がある",
    keywords: ["矛盾", "一貫", "整合", "ぶれ", "筋が通"],
  },
  {
    id: "logic.one_sided",
    category: "logic",
    label: "反対意見・多面的な視点への配慮が不足している",
    keywords: ["反対意見", "反論", "一面的", "多面", "視野", "偏り", "片側"],
  },

  // ---- 表現力 (expression) ----
  {
    id: "expression.verbose",
    category: "expression",
    label: "冗長・回りくどく簡潔さに欠ける",
    keywords: ["冗長", "回りくど", "くどい", "簡潔", "話が長い", "長すぎ", "重複"],
  },
  {
    id: "expression.ambiguous",
    category: "expression",
    label: "曖昧で意味が伝わりにくい",
    keywords: ["曖昧", "あいまい", "不明確", "わかりにくい", "読みにくい", "伝わらな"],
  },
  {
    id: "expression.grammar",
    category: "expression",
    label: "誤字脱字・文法ミスがある",
    keywords: ["誤字", "脱字", "文法", "表記", "主述", "ねじれ", "てにをは"],
  },
  {
    id: "expression.tone",
    category: "expression",
    label: "文体・語彙が不適切",
    keywords: ["文体", "語彙", "言い回し", "口語", "敬体", "常体", "稚拙"],
  },

  // ---- AP 合致 (apAlignment) ----
  {
    id: "ap.weak_motivation",
    category: "apAlignment",
    label: "志望理由・動機が浅い",
    keywords: ["志望理由", "志望動機", "動機が浅", "動機が弱", "なぜこの大学", "なぜこの学部"],
  },
  {
    id: "ap.no_link",
    category: "apAlignment",
    label: "アドミッションポリシーとの結びつきが弱い",
    keywords: ["アドミ", "ポリシー", "AP", "合致", "結びつき", "大学の求める", "学部の特色"],
  },
  {
    id: "ap.generic",
    category: "apAlignment",
    label: "どの大学にも言える一般論にとどまる",
    keywords: ["一般論", "ありきたりな志望", "どこでも", "抽象的な志望", "汎用的"],
  },

  // ---- 独自性 (originality) ----
  {
    id: "originality.no_experience",
    category: "originality",
    label: "自分の経験・具体例が薄い",
    keywords: ["経験", "体験", "エピソード", "具体例", "事例", "実体験", "具体性がな"],
  },
  {
    id: "originality.cliche",
    category: "originality",
    label: "視点がありきたりで独自性に欠ける",
    keywords: ["ありきたり", "平凡", "月並み", "借り物", "独自性", "個性", "ありがち"],
  },
  {
    id: "originality.abstract",
    category: "originality",
    label: "抽象的で具体性に欠ける",
    keywords: ["抽象", "漠然", "ぼんやり", "観念的"],
  },

  // ---- 面接: 明確さ・話し方 (structure/expression に寄せる) ----
  {
    id: "iv.clarity.unstructured",
    category: "structure",
    label: "結論ファーストでなく要点が不明瞭",
    keywords: ["結論ファースト", "要点", "結論から", "構造化", "PREP", "話の組み立て"],
  },

  // ---- 面接: 熱意 (other) ----
  {
    id: "iv.enthusiasm.low",
    category: "other",
    label: "熱意・主体性が伝わらない",
    keywords: ["熱意", "意欲", "主体性", "積極性", "やる気", "志望度", "受け身"],
  },

  // ---- 面接: 非言語 (other) ----
  {
    id: "iv.body.eye_contact",
    category: "other",
    label: "視線が散漫・アイコンタクトが弱い",
    keywords: ["視線", "アイコンタクト", "目線", "目を合わせ"],
  },
  {
    id: "iv.body.expression",
    category: "other",
    label: "表情が硬い",
    keywords: ["表情", "笑顔", "硬い表情", "無表情"],
  },
  {
    id: "iv.body.posture",
    category: "other",
    label: "姿勢・身だしなみに改善余地",
    keywords: ["姿勢", "身だしなみ", "服装", "首が傾", "猫背"],
  },
  {
    id: "iv.body.delivery",
    category: "other",
    label: "話し方(フィラー・話速・声)に課題",
    keywords: ["フィラー", "話速", "早口", "うなずき", "声が小さ", "滑舌", "間の取り方"],
  },
] as const;

/** id → エントリの索引 (生成時 1 回) */
const BY_ID = new Map<string, TaxonomyEntry>(WEAKNESS_TAXONOMY.map((e) => [e.id, e]));

/** 与えられた文字列が既知の正規 ID かどうか */
export function isKnownCanonicalId(id: string | undefined | null): id is string {
  return typeof id === "string" && BY_ID.has(id);
}

/** 正規 ID からエントリを引く (未知なら undefined) */
export function getTaxonomyEntry(id: string): TaxonomyEntry | undefined {
  return BY_ID.get(id);
}

/** 正規 ID から表示ラベルを引く (未知なら id をそのまま返す) */
export function canonicalLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

export interface ResolveOptions {
  /** AI / 既存レコードが持つカテゴリ。同カテゴリ候補を優先するタイブレークに使う */
  categoryHint?: EssayCategoryKey;
  /** AI が直接指定した正規 ID。既知 ID なら最優先で採用 */
  aiCanonicalId?: string | null;
}

/**
 * 弱点テキストを正規タクソノミーのエントリへ解決する。
 *
 * 優先順:
 *   1. 有効な aiCanonicalId → 即採用
 *   2. keyword スコアリングで最良エントリ (categoryHint 一致は微加点)
 *   3. どれにも当たらなければ null (= 正規化不能 → 呼び出し側で従来挙動)
 */
export function resolveCanonical(
  text: string,
  opts: ResolveOptions = {},
): TaxonomyEntry | null {
  if (isKnownCanonicalId(opts.aiCanonicalId)) {
    return BY_ID.get(opts.aiCanonicalId) ?? null;
  }
  if (!text || text.trim().length === 0) return null;

  let best: { entry: TaxonomyEntry; score: number } | null = null;
  for (const entry of WEAKNESS_TAXONOMY) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (text.includes(kw)) score += 1;
    }
    if (score === 0) continue;
    // カテゴリヒント一致は僅かに優遇 (同点時の振り分け用)
    if (opts.categoryHint && entry.category === opts.categoryHint) score += 0.5;
    if (!best || score > best.score) best = { entry, score };
  }
  return best ? best.entry : null;
}

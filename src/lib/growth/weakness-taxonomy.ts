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
    keywords: [
      "流れ",
      "つながり",
      "繋がり",
      "接続",
      "展開",
      "段落",
      "構成の流れ",
    ],
  },
  {
    id: "structure.unbalanced",
    category: "structure",
    label: "序論・本論・結論の構成バランスが悪い",
    keywords: ["序論", "本論", "バランス", "配分", "比率", "構成のバランス"],
  },
  {
    // id は本番の弱点レコードに canonicalId として保存済みなので変えない。
    // v23 で採点軸を回答力にしたため、カテゴリだけ responsiveness へ移した。
    id: "structure.off_topic",
    category: "responsiveness",
    label: "設問・テーマから論点がずれている",
    keywords: [
      "設問",
      "テーマからずれ",
      "論点がずれ",
      "逸脱",
      "外れ",
      "趣旨",
      // 実データで「テーマのすり替え」が別レコードになっていた
      "すり替え",
      "主題がずれ",
      "主題のずれ",
    ],
  },

  // ---- 論証 (logic) ----
  {
    id: "logic.leap",
    category: "logic",
    label: "主張と理由が飛躍している",
    keywords: [
      "飛躍",
      "短絡",
      "唐突",
      "主張と理由",
      "論理が飛",
      "つながらない",
    ],
  },
  {
    id: "logic.weak_evidence",
    category: "logic",
    label: "根拠・データが不足している",
    keywords: [
      "根拠",
      "裏付け",
      "データ",
      "証拠",
      "説得力",
      "エビデンス",
      "理由が薄",
      // 実データで「理由づけの薄さ」が別レコードになっていた
      "理由づけ",
      "理由付け",
      "裏づけ",
    ],
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
    keywords: [
      "冗長",
      "回りくど",
      "くどい",
      "簡潔",
      "話が長い",
      "長すぎ",
      "重複",
    ],
  },
  {
    id: "expression.ambiguous",
    category: "expression",
    label: "曖昧で意味が伝わりにくい",
    keywords: [
      "曖昧",
      "あいまい",
      "不明確",
      "わかりにくい",
      "読みにくい",
      "伝わらな",
    ],
  },
  {
    // 実データで「一文の長さ」「一文の長さと読点の多用」「長文の読みやすさ」が
    // 別々のレコードになっていた。同じ指摘なので1本に束ねる。
    id: "expression.long_sentence",
    category: "expression",
    label: "一文が長く読みにくい",
    keywords: [
      "一文が長",
      "一文の長さ",
      "長文",
      "読点",
      "80字",
      "文が長",
      "長い文",
    ],
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
    keywords: [
      "文体",
      "語彙",
      "言い回し",
      "口語",
      "敬体",
      "常体",
      "稚拙",
      // 実データで「言葉遣い・表現の適切さ」「言語表現の正確性」が別レコードだった
      "言葉遣い",
      "言語表現",
      "表現の適切",
      "表現の正確",
    ],
  },

  // ---- AP 合致 (apAlignment) ----
  {
    id: "ap.weak_motivation",
    category: "apAlignment",
    label: "志望理由・動機が浅い",
    keywords: [
      "志望理由",
      "志望動機",
      "動機が浅",
      "動機が弱",
      "なぜこの大学",
      "なぜこの学部",
    ],
  },
  {
    id: "ap.no_link",
    category: "apAlignment",
    label: "アドミッションポリシーとの結びつきが弱い",
    keywords: [
      "アドミ",
      "ポリシー",
      "AP",
      "合致",
      "結びつき",
      "大学の求める",
      "学部の特色",
    ],
  },
  {
    id: "ap.generic",
    category: "apAlignment",
    label: "どの大学にも言える一般論にとどまる",
    keywords: [
      "一般論",
      "ありきたりな志望",
      "どこでも",
      "抽象的な志望",
      "汎用的",
    ],
  },

  // ---- 回答力 (responsiveness) ----
  {
    id: "responsiveness.missing_requirement",
    category: "responsiveness",
    label: "設問が求めた要素に答えていない",
    keywords: [
      "設問が求め",
      "求められている",
      "問われている",
      "問いに答え",
      "答えていな",
      "比較していな",
      "触れていない",
      "条件を満た",
      "指定された",
    ],
  },

  // ---- 旧・独自性 (v23 で廃止。id は保存済みなので変えない) ----
  {
    // v22 まで「自分の経験・具体例が薄い」。経験の有無は評価しないと決めたので
    // （2026-09-17 のユーザー指摘）、根拠の具体性の話として logic に寄せ、
    // 経験・体験・実体験のキーワードは外した。
    id: "originality.no_experience",
    category: "logic",
    label: "根拠が一般論で具体に乏しい",
    keywords: ["具体例", "事例", "具体性がな", "一般論"],
  },
  {
    // v23 で独自性の採点をやめたので、新しくは付かない。旧レコードの表示用。
    id: "originality.cliche",
    category: "originality",
    label: "視点がありきたりで独自性に欠ける",
    keywords: [
      "ありきたり",
      "平凡",
      "月並み",
      "借り物",
      "独自性",
      "個性",
      "ありがち",
    ],
  },
  {
    // 具体策・制度設計の欠如は独自性ではなく論の中身の話なので logic へ移した
    id: "originality.abstract",
    category: "logic",
    label: "抽象的で具体性に欠ける",
    keywords: [
      "抽象",
      "漠然",
      "ぼんやり",
      "観念的",
      // 実データで「具体性の欠如」「具体的な制度設計の欠如」が別レコードだった
      "具体性の欠如",
      "具体性が不足",
      "具体性に欠け",
      "具体策",
      "具体的な制度",
    ],
  },

  // ---- 面接: 明確さ・話し方 (structure/expression に寄せる) ----
  {
    id: "iv.clarity.unstructured",
    category: "structure",
    label: "結論ファーストでなく要点が不明瞭",
    keywords: [
      "結論ファースト",
      "要点",
      "結論から",
      "構造化",
      "PREP",
      "話の組み立て",
    ],
  },

  {
    // 実データで「回答の不在」「回答の不在・面接不成立」「回答の不成立」が
    // 別レコードになっていた（面接が成立しなかった回の記録）。
    id: "iv.no_answer",
    category: "other",
    label: "面接が成立していない（回答がない）",
    keywords: [
      "回答の不在",
      "回答がな",
      "面接不成立",
      "回答の不成立",
      "無回答",
    ],
  },
  {
    // 「質問への応答」「回答の深掘り耐性・具体性の不足」を1本に。
    id: "iv.answer_depth",
    category: "logic",
    label: "質問に正面から答えられていない",
    keywords: [
      "質問への応答",
      "深掘り耐性",
      "質問に答え",
      "応答がずれ",
      "質問とずれ",
    ],
  },

  // ---- 面接: 熱意 (other) ----
  {
    id: "iv.enthusiasm.low",
    category: "other",
    label: "熱意・主体性が伝わらない",
    keywords: [
      "熱意",
      "意欲",
      "主体性",
      "積極性",
      "やる気",
      "志望度",
      "受け身",
    ],
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
    keywords: [
      "フィラー",
      "話速",
      "早口",
      "うなずき",
      "声が小さ",
      "滑舌",
      "間の取り方",
    ],
  },
] as const;

/** id → エントリの索引 (生成時 1 回) */
const BY_ID = new Map<string, TaxonomyEntry>(
  WEAKNESS_TAXONOMY.map((e) => [e.id, e])
);

/** 与えられた文字列が既知の正規 ID かどうか */
export function isKnownCanonicalId(
  id: string | undefined | null
): id is string {
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
  /**
   * 補助テキスト（AI が書いた弱点の説明文）。
   *
   * ラベル（area）は「解決策の具体性」のような見出し語や、ときには "logic" の
   * ような語が返ってきて、それだけでは弱点が決まらない。説明文には何がどう
   * 弱いかが書かれているので、ラベルで決まらないときだけこちらを見る。
   * ただし長文は無関係な語を巻き込むので、**2語以上**当たった候補しか採らない。
   */
  supportText?: string;
}

/**
 * 弱点テキストを正規タクソノミーのエントリへ解決する。
 *
 * 優先順:
 *   1. 有効な aiCanonicalId → 即採用
 *   2. keyword スコアリングで最良エントリ (categoryHint 一致は微加点)
 *   3. どれにも当たらなければ null (= 正規化不能 → 呼び出し側で従来挙動)
 */
/**
 * キーワードで正規化してよいテキストの長さの上限。
 *
 * キーワードは部分一致で当たるため、長い文ほど無関係な語を巻き込む。
 * 「結論を一文で言い切ると伝わります」という助言が「結論」1語で
 * 「結論が不明確・欠落している」に落ちていた。弱点名は短い名詞句なので、
 * 文の長さで助言と切り分ける。長い文は正規化せず、そのまま別レコードにする
 * （誤ったラベルに合流させるより、合流しない方が害が小さい）。
 */
const MAX_KEYWORD_RESOLVE_LENGTH = 40;

/**
 * 助言の言い回し。「〜しましょう」「〜してください」は次にやることであって
 * 弱点名ではない。弱点は名詞句（「結論が一文で言い切れていない」）で来るので、
 * 文末の形だけで切り分けられる。意味は判定しない。
 */
const ADVICE_ENDING =
  /(ましょう|ください|してみて|すると良く|するとよく|すると伝わ|と良いです|とよいです|しよう)/;

/**
 * 弱点の名前として意味をなさない語。
 *
 * 実データに「全体」だけのレコードや、構造化出力の欄名をそのまま返した
 * "logic" / "structure" が入っていた。これらが弱点リストに並んでも、
 * 生徒は何を直せばよいか分からない。
 */
const STOP_LABELS = new Set([
  "全体",
  "総合",
  "その他",
  "なし",
  "特になし",
  "structure",
  "logic",
  "expression",
  "apalignment",
  "responsiveness",
  "originality",
  "reasoningmaturity",
  "other",
]);

/**
 * 「答案のどこか」を指しているだけで、何が弱いのかを言っていないラベル。
 *
 * プロンプトでは「述語まで書いた言い切りの文」を求めているが、実データでは
 * 「第1段落・第3段落」「冒頭の文」「第二段落の意義まとめ」「改善策の根拠」
 * 「結論の役割」が返っていた（2026-09-18、再採点5件で確認）。これが弱点リストに
 * 積まれると、生徒には何を直せばよいか分からないレコードだけが増える。
 *
 * 正規タクソノミーに解決できたものは正規ラベルに置き換わるので問題ない。
 * **解決できなかったときだけ**この判定で落とす（取りこぼしより誤削除の方が害が大きいので、
 * 明らかに場所・見出しを指す形だけを対象にする）。
 */
/** 場所を指す語そのもの（これだけ、またはこれを並べただけのラベルを落とす） */
const PLACE_WORD =
  "(?:第?\\s*[0-9０-９一二三四五六七八九十]+\\s*段落|冒頭|書き出し|末尾|序論|本論|結論部|導入部)";

/** 「第1段落・第3段落」のように、場所の語だけで出来ているラベル */
const PLACE_ONLY = new RegExp(
  `^${PLACE_WORD}(?:[・、,／/]\\s*${PLACE_WORD})*$`
);

/**
 * 「冒頭の文」「改善策の根拠」のように、名詞で終わって何が弱いか言っていないラベル。
 * 「序論・本論・結論の構成バランスが悪い」のように述語まであるものは落とさない。
 */
const POINTER_SUFFIX =
  /(の文|の段落|の箇所|の部分|の役割|の根拠|の具体性|の独立性|まとめ)$/;

/** 場所・見出しを指しているだけで、弱点を述べていないラベルか */
export function isLocationOnlyLabel(text: string): boolean {
  const t = text.trim();
  return PLACE_ONLY.test(t) || POINTER_SUFFIX.test(t);
}

/** 弱点リストに積んでよいテキストか（助言・長文・中身のない語を弾く） */
export function isWeaknessLabel(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return false;
  if (t.length > MAX_KEYWORD_RESOLVE_LENGTH) return false;
  if (STOP_LABELS.has(t.toLowerCase())) return false;
  return !ADVICE_ENDING.test(t);
}

export function resolveCanonical(
  text: string,
  opts: ResolveOptions = {}
): TaxonomyEntry | null {
  if (isKnownCanonicalId(opts.aiCanonicalId)) {
    return BY_ID.get(opts.aiCanonicalId) ?? null;
  }
  if (!text || text.trim().length === 0) return null;
  if (text.trim().length > MAX_KEYWORD_RESOLVE_LENGTH) return null;

  const byLabel = matchByKeywords(text, opts.categoryHint, 1);
  if (byLabel) return byLabel;
  // ラベルで決まらないときだけ説明文を見る（2語以上一致が条件）
  if (opts.supportText) {
    return matchByKeywords(opts.supportText, opts.categoryHint, 2);
  }
  return null;
}

/** キーワード一致で最有力の候補を返す。minScore 未満は採らない */
function matchByKeywords(
  text: string,
  categoryHint: EssayCategoryKey | undefined,
  minScore: number
): TaxonomyEntry | null {
  let best: { entry: TaxonomyEntry; score: number } | null = null;
  for (const entry of WEAKNESS_TAXONOMY) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (text.includes(kw)) score += 1;
    }
    if (score < minScore) continue;
    // カテゴリヒント一致は僅かに優遇 (同点時の振り分け用)
    if (categoryHint && entry.category === categoryHint) score += 0.5;
    if (!best || score > best.score) best = { entry, score };
  }
  return best ? best.entry : null;
}

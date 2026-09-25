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

import {
  categorizeWeakness,
  type EssayCategoryKey,
} from "@/lib/growth/weakness-category";

/** 正規タクソノミーの 1 エントリ */
export interface TaxonomyEntry {
  /** 安定スラッグ。統合の一意キー (例: "logic.leap") */
  id: string;
  /** 層 = 採点の軸（面接の iv.* は群を interview にする。weaknessGroupOf） */
  category: EssayCategoryKey;
  /** 表示用の安定日本語ラベル。統合後はこれを WeaknessRecord.area に採用 */
  label: string;
  /** 生徒・講師のカードに出す1行の説明 */
  description: string;
  /** 決定論マッピング用の語彙 (text に部分一致したらヒット) */
  keywords: string[];
  /** v2 でこのエントリにまとめた旧 ID（保存済みの canonicalId を寄せる） */
  aliases?: string[];
  /** 旧ラベル（保存済みの area を寄せる） */
  oldLabels?: string[];
}

/**
 * 固定タクソノミー v2（2026-09-26）。小論文は層（文／構成／論証／成熟度／設問対応／AP）、
 * 面接は iv.* で分ける。設計: docs/superpowers/specs/2026-09-26-weakness-taxonomy-v2-design.md
 * 並び順は resolve のタイブレーク（同点時は先頭優先）に影響する。
 */
export const WEAKNESS_TAXONOMY: readonly TaxonomyEntry[] = [
  // ---- 構成 (structure) ----
  {
    id: "structure.no_conclusion",
    category: "structure",
    label: "結論で立場を言い切れていない",
    description: "結論が無い、または「大切だ」で終わっている",
    keywords: ["結論", "締め", "結びの", "結びが", "まとめ方", "落としどころ"],
    oldLabels: ["結論が不明確・欠落している"],
  },
  {
    // 「結論」と「繰り返し」の両方が当たる（2点）ときにこちらへ来る。
    // 「結論」1語だけなら同点で上の no_conclusion が先に取る
    id: "structure.conclusion_restates",
    category: "structure",
    label: "結論が本論・序論の繰り返しにとどまる",
    description: "結論で新しい到達点を示していない",
    keywords: [
      "結論",
      "繰り返し",
      "言い換え",
      "言い直し",
      "焼き直し",
      "同じ内容",
      "重複",
    ],
  },
  {
    id: "structure.mixed_paragraph",
    category: "structure",
    label: "1つの段落に複数の話題が混ざっている",
    description: "段落の区切りと話題の切れ目が合っていない",
    keywords: [
      "話題が混在",
      "複数の話題",
      "話題が混ざ",
      "段落構成",
      "段落分け",
      "段落の区切り",
      "一段落",
    ],
  },
  {
    // v2 で「段落」単独を外した（構成の指摘がすべて集まっていた）
    id: "structure.weak_flow",
    category: "structure",
    label: "段落どうしのつながりが示されていない",
    description: "前の段落から次の段落へ移る理由が書かれていない",
    keywords: [
      "流れ",
      "つながり",
      "繋がり",
      "接続",
      "展開",
      "橋渡し",
      "つなぎ",
    ],
    oldLabels: ["段落のつながり・論述の流れが弱い"],
  },
  {
    id: "structure.unbalanced",
    category: "structure",
    label: "序論・本論・結論の配分が偏っている",
    description: "序論や具体例に字数を取られ、論じる部分が薄い",
    keywords: ["序論", "本論", "バランス", "配分", "比率", "構成のバランス"],
    oldLabels: ["序論・本論・結論の構成バランスが悪い"],
  },

  // ---- 設問対応 (responsiveness) ----
  {
    // id は保存済みなので変えない（v23 でカテゴリだけ responsiveness へ移した）
    id: "structure.off_topic",
    category: "responsiveness",
    label: "設問の主題からずれている",
    description: "問われたことと別の話題が中心になっている",
    keywords: [
      "設問",
      "テーマからずれ",
      "論点がずれ",
      "逸脱",
      "外れ",
      "趣旨",
      "すり替え",
      "主題がずれ",
      "主題のずれ",
    ],
    oldLabels: ["設問・テーマから論点がずれている"],
  },
  {
    id: "responsiveness.missing_requirement",
    category: "responsiveness",
    label: "設問が求めた要素が欠けている",
    description: "「比較せよ」「二つ挙げよ」などの要求に答えていない",
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
    oldLabels: ["設問が求めた要素に答えていない"],
  },
  {
    id: "responsiveness.misread",
    category: "responsiveness",
    label: "課題文・資料を読み違えている",
    description: "筆者の主張や資料の数値を取り違えている",
    keywords: ["読み違", "誤読", "読み誤", "資料の数値"],
  },
  {
    id: "responsiveness.knowledge_error",
    category: "responsiveness",
    label: "専門用語・知識を取り違えている",
    description: "基礎の定義や仕組みが誤っている（口頭試問型）",
    keywords: ["知識の誤り", "用語の誤り", "定義が誤", "事実誤認", "専門用語"],
  },
  {
    id: "responsiveness.too_short",
    category: "responsiveness",
    label: "字数が大きく足りない",
    description: "指定字数の7割に届いていない",
    keywords: ["字数不足", "字数が足り", "分量が足り"],
  },

  // ---- 論証 (logic) ----
  {
    id: "logic.weak_evidence",
    category: "logic",
    label: "根拠が一般論で具体性がない",
    description: "誰でも書ける理由にとどまり、事実・例・仕組みがない",
    keywords: [
      "根拠",
      "裏付け",
      "裏づけ",
      "データ",
      "証拠",
      "説得力",
      "エビデンス",
      "理由が薄",
      "理由づけ",
      "理由付け",
      "具体例",
      "事例",
      "具体性がな",
      "一般論",
      "抽象",
      "漠然",
      "ぼんやり",
      "観念的",
      "具体性の欠如",
      "具体性が不足",
      "具体性に欠け",
      "具体策",
      "具体的な制度",
      // 小論文で「具体的なエピソードの欠如」と来たとき（面接の iv.* は essay では候補外）
      "具体的なエピソード",
    ],
    aliases: ["originality.no_experience", "originality.abstract"],
    oldLabels: [
      "根拠・データが不足している",
      "根拠が一般論で具体に乏しい",
      "抽象的で具体性に欠ける",
    ],
  },
  {
    id: "logic.leap",
    category: "logic",
    label: "理由から主張への筋道が飛んでいる",
    description: "間の説明が抜けている、または因果を取り違えている",
    keywords: [
      "飛躍",
      "短絡",
      "唐突",
      "主張と理由",
      "論理が飛",
      "つながらない",
      "因果",
      "原因と結果",
      "結果の関係",
    ],
    aliases: ["logic.causal_error"],
    oldLabels: ["主張と理由が飛躍している", "因果関係を取り違えている"],
  },
  {
    id: "logic.overgeneralize",
    category: "logic",
    label: "一部の例から全体を言い切っている",
    description: "違うものを一括りにして論じている",
    keywords: ["一括り", "ひとくくり", "一般化", "決めつけ"],
  },
  {
    id: "logic.contradiction",
    category: "logic",
    label: "主張どうしが食い違っている",
    description: "前と後ろで逆の立場を取っている",
    keywords: ["矛盾", "一貫", "整合", "ぶれ", "筋が通", "食い違"],
    oldLabels: ["主張に矛盾・一貫性の欠如がある"],
  },

  // ---- 議論の成熟度 (reasoningMaturity) ----
  {
    // id は保存済みなので変えない（カテゴリだけ成熟度へ移した）
    id: "logic.one_sided",
    category: "reasoningMaturity",
    label: "反対意見・別の立場を扱っていない",
    description: "自分と違う見方に触れていない",
    keywords: ["反対意見", "反論", "一面的", "多面", "視野", "偏り", "片側"],
    oldLabels: ["反対意見・多面的な視点への配慮が不足している"],
  },
  {
    id: "reasoning.weak_rebuttal",
    category: "reasoningMaturity",
    label: "反論への応答が弱い",
    description: "反論を挙げたが、なぜ退けられるかを示していない",
    keywords: [
      "再反論",
      "反駁",
      "反論への",
      "反論に答え",
      "反論を退け",
      "反論の処理",
    ],
    oldLabels: ["反論への再反論が弱い"],
  },
  {
    id: "reasoning.oversimplified",
    category: "reasoningMaturity",
    label: "問題を単一の原因で単純化している",
    description: "原因や立場を1つに絞って片付けている",
    keywords: ["単純化", "単一の原因", "単一原因", "一つの原因", "二項対立"],
    oldLabels: ["問題を単一の原因・視点で単純化している"],
  },
  {
    id: "reasoning.no_constraints",
    category: "reasoningMaturity",
    label: "解決策の実行面を考えていない",
    description: "誰がやるか、制約、副作用に触れていない",
    keywords: [
      "実行主体",
      "実現可能",
      "実行可能",
      "副作用",
      "制約",
      "財源",
      "誰が実行",
      "トレードオフ",
    ],
    oldLabels: ["実行主体・制約・副作用を検討していない"],
  },

  // ---- 文 (expression) ----
  {
    id: "expression.twist",
    category: "expression",
    label: "主語と述語が噛み合わない文がある",
    description: "文頭の「〜は」と文末が対応していない",
    keywords: ["主述", "ねじれ", "主語と述語", "述語"],
  },
  {
    id: "expression.grammar",
    category: "expression",
    label: "助詞や語の使い方が誤っている",
    description: "助詞の選び違い、語の組み合わせ、語の抜けで意味が取りにくい",
    keywords: [
      "文法",
      "てにをは",
      "助詞",
      "語の使い方",
      "言葉の使い方",
      "語の組み合わせ",
      "意味が取れ",
      "読めない",
      "曖昧",
      "あいまい",
      "わかりにくい",
      "伝わらな",
    ],
    aliases: ["expression.ambiguous"],
    oldLabels: ["誤字脱字・文法ミスがある", "曖昧で意味が伝わりにくい"],
  },
  {
    id: "expression.typo",
    category: "expression",
    label: "誤字・脱字が多い",
    description: "漢字や送り仮名の誤り、字の重なりがある",
    keywords: ["誤字", "脱字", "誤変換", "送り仮名", "表記"],
  },
  {
    id: "expression.long_sentence",
    category: "expression",
    label: "一文が長く読みにくい",
    description: "読点で節をつなぎ続け、80字を超える文がある",
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
    id: "expression.verbose",
    category: "expression",
    label: "同じ言葉や言い回しが重なっている",
    description: "同じ語・同じ結論を繰り返している、回りくどい",
    keywords: [
      "冗長",
      "回りくど",
      "くどい",
      "簡潔",
      "話が長い",
      "長すぎ",
      "重複",
      "同じフレーズ",
      "同じ表現",
      "同じ言葉",
    ],
    oldLabels: ["冗長・回りくどく簡潔さに欠ける"],
  },
  {
    id: "expression.tone",
    category: "expression",
    label: "文体・文末が整っていない",
    description: "常体と敬体の混在、「〜と考える」の連発、話し言葉",
    keywords: [
      "文体",
      "文末",
      "語彙",
      "言い回し",
      "口語",
      "話し言葉",
      "敬体",
      "常体",
      "稚拙",
      "言葉遣い",
      "言語表現",
      "表現の適切",
      "表現の正確",
    ],
    oldLabels: ["文体・語彙が不適切"],
  },

  // ---- AP (apAlignment) ----
  {
    id: "ap.weak_motivation",
    category: "apAlignment",
    label: "志望理由・動機が浅い",
    description: "なぜこの大学・学部かが言えていない",
    keywords: [
      "志望理由",
      "志望動機",
      "動機が浅",
      "動機が弱",
      "なぜこの大学",
      "なぜこの学部",
      "でなければならない",
      "この大学を選",
    ],
  },
  {
    id: "ap.no_link",
    category: "apAlignment",
    label: "アドミッションポリシーとの結びつきが弱い",
    description: "AP が求める力と答案の論点が対応していない",
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
    description: "志望先の特色に触れていない",
    keywords: ["ありきたりな志望", "どこでも", "抽象的な志望", "汎用的"],
  },

  // ---- 旧・独自性 (v23 で廃止。旧データの表示用。新しくは付かない) ----
  {
    id: "originality.cliche",
    category: "originality",
    label: "視点がありきたりで独自性に欠ける",
    description: "（旧軸）視点が一般的で独自性に欠ける",
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

  // ---- 面接 (iv.*。群は interview) ----
  {
    id: "iv.clarity.unstructured",
    category: "structure",
    label: "結論から話せていない",
    description: "答えの要点が最初に来ない",
    keywords: [
      "結論ファースト",
      "要点",
      "結論から",
      "構造化",
      "PREP",
      "話の組み立て",
      "自己紹介",
    ],
    oldLabels: ["結論ファーストでなく要点が不明瞭"],
  },
  {
    id: "iv.answer_depth",
    category: "logic",
    label: "質問に正面から答えていない",
    description: "聞かれたことと別のことを話している",
    keywords: [
      "質問への応答",
      "深掘り耐性",
      "質問に答え",
      "応答がずれ",
      "質問とずれ",
      "自己の見解",
      "自分の考えを示さ",
    ],
    oldLabels: ["質問に正面から答えられていない"],
  },
  {
    id: "iv.no_episode",
    category: "other",
    label: "具体的なエピソードが出てこない",
    description: "いつ・どこで・何をしたかが語られない",
    // 「具体的なエピソード」は logic.weak_evidence にもあるので、面接ではこちらが2点で勝つ
    keywords: [
      "エピソード",
      "具体的なエピソード",
      "具体的な経験",
      "いつ・どこで",
    ],
  },
  {
    id: "iv.enthusiasm.low",
    category: "other",
    label: "熱意・主体性が伝わらない",
    description: "志望の強さや自分から動いた話が出ない",
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
  {
    id: "iv.manner",
    category: "other",
    label: "面接中の言動・マナーに問題がある",
    description: "開始前後の発言や呼び間違いなど",
    keywords: ["マナー", "態度", "言動", "呼び間違", "名前の誤認"],
  },
  {
    id: "iv.no_answer",
    category: "other",
    label: "面接が成立していない",
    description: "回答がほとんど記録されていない",
    keywords: [
      "回答の不在",
      "回答がな",
      "面接不成立",
      "回答の不成立",
      "無回答",
    ],
    oldLabels: ["面接が成立していない（回答がない）"],
  },
  {
    id: "iv.body.eye_contact",
    category: "other",
    label: "視線が散漫・アイコンタクトが弱い",
    description: "面接官を見て話せていない（動画解析）",
    keywords: ["視線", "アイコンタクト", "目線", "目を合わせ"],
  },
  {
    id: "iv.body.expression",
    category: "other",
    label: "表情が硬い",
    description: "表情の変化が少ない（動画解析）",
    keywords: ["表情", "笑顔", "硬い表情", "無表情"],
  },
  {
    id: "iv.body.posture",
    category: "other",
    label: "姿勢・身だしなみに改善余地",
    description: "姿勢や身だしなみに気になる点がある（動画解析）",
    keywords: ["姿勢", "身だしなみ", "服装", "首が傾", "猫背"],
  },
  {
    id: "iv.body.delivery",
    category: "other",
    label: "話し方(フィラー・話速・声)に課題",
    description: "「えー」の多さ、話す速さ、声の大きさに課題がある",
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

/** id（別名を含む）→ エントリの索引 */
const BY_ID = new Map<string, TaxonomyEntry>(
  WEAKNESS_TAXONOMY.flatMap((e) =>
    [e.id, ...(e.aliases ?? [])].map((id) => [id, e] as const)
  )
);

/** 与えられた文字列が既知の正規 ID かどうか */
export function isKnownCanonicalId(
  id: string | undefined | null
): id is string {
  return typeof id === "string" && BY_ID.has(id);
}

/**
 * 表示ラベル → エントリの索引。
 *
 * 書き込みでは area に正規ラベルを入れ、次の提出でそのラベルを読み直して統合する。
 * ラベルをキーワードで解決し直すと別のエントリに当たることがあり
 * （「根拠が一般論で具体に乏しい」が logic.weak_evidence に当たっていた）、
 * 提出のたびに別の弱点へ回数が合算され続けた（本番で実際の11回が33回に）。
 * ラベルと完全に一致したら、キーワードより先にそのエントリを返す。
 */
const BY_LABEL = new Map<string, TaxonomyEntry>(
  WEAKNESS_TAXONOMY.flatMap((e) =>
    [e.label, ...(e.oldLabels ?? [])].map((l) => [l, e] as const)
  )
);

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
  /**
   * どの提出の弱点か。essay のときは面接の iv.* を候補にしない
   * （「具体的なエピソード」等の語が面接の弱点に寄るのを防ぐ）。
   * interview / 省略のときは全部が候補。
   */
  domain?: "essay" | "interview";
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
  // 「問1・問3」は口頭試問型の小問番号（2026-09-23、本番で弱点として積まれていた）
  "(?:第?\\s*[0-9０-９一二三四五六七八九十]+\\s*段落|問\\s*[0-9０-９一二三四五六七八九十]+|冒頭|書き出し|末尾|序論|本論|結論部|導入部)";

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
  if (PLACE_ONLY.test(t) || POINTER_SUFFIX.test(t)) return true;
  // 「問2結論部」「メリット段落」: 場所の語を除くと弱点の語が残らない
  const rest = stripPlaceWords(t);
  return rest !== t && !hasAnyKeyword(rest);
}

/**
 * 弱点の分類。正規タクソノミーに載っている弱点は、タクソノミーのカテゴリを正本にする。
 * 保存済みの categoryId は作成時の値のままなので、カテゴリを移したエントリ
 * （logic.one_sided → 議論の成熟度 等）が古い軸に残る。
 */
export function weaknessCategoryOf(w: {
  area: string;
  canonicalId?: string | null;
  categoryId?: string | null;
}): EssayCategoryKey {
  // 正規 ID が無くても、正規ラベルそのもの（成長レポートの弱点名等）なら引ける
  const entry = entryOf(w);
  if (entry) return entry.category;
  return (
    (w.categoryId as EssayCategoryKey | undefined) ?? categorizeWeakness(w.area)
  );
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
  const candidates =
    opts.domain === "essay"
      ? WEAKNESS_TAXONOMY.filter((e) => !e.id.startsWith("iv."))
      : WEAKNESS_TAXONOMY;
  if (!text || text.trim().length === 0) return null;
  const exact = BY_LABEL.get(text.trim());
  if (exact && !(opts.domain === "essay" && exact.id.startsWith("iv.")))
    return exact;
  if (text.trim().length > MAX_KEYWORD_RESOLVE_LENGTH) return null;

  /**
   * 場所の語（「第3段落」「問2」「冒頭」）を除いてから見る。
   * AI は area に場所を書くことが多く、「第1段落・第3段落」（中身は主述のねじれ）や
   * 「反論段落」（中身は再反論の弱さ）が「段落」の1語で「段落のつながりが弱い」に
   * 落ちていた（2026-09-25、本番150件中39件がこのラベル）。
   */
  const label = stripPlaceWords(text);
  const labelIsPlace = label !== text.trim();
  const support = opts.supportText ? stripQuotes(opts.supportText) : "";
  /**
   * 場所の語を除いた残りが「反論」「結論」のような1語だけのとき。
   * 「段落のつながり・論述の流れ」は「段落」を除いても弱点を言っているので当たらない
   * （当たると説明文の「結論」1語で「結論が不明確」へ流れていた）。
   */
  const labelIsBarePlace =
    labelIsPlace && label.replace(/[のと・、,\s]/g, "").length <= 4;

  // ラベルが場所なら、弱点の中身は説明文の方が詳しい
  // （「反論段落」の残り「反論」より、説明文の「反駁が成立していない」）。
  // AI が付けたカテゴリの候補に限れば1語で決めてよい
  if (labelIsBarePlace && support && opts.categoryHint) {
    const inCategory = matchByKeywords(
      support,
      opts.categoryHint,
      1,
      true,
      candidates
    );
    if (inCategory) return inCategory;
  }
  if (hasAnyKeyword(label, candidates)) {
    /**
     * 「結論の明確さ」のような見出し語（述語で終わらない）は、何がどう弱いかを
     * 言っていない。説明文が「本論の繰り返しにとどまる」と言っているのに、
     * ラベルの「結論」だけで「結論が不明確」に決まっていた。
     * 見出し語のときは説明文の語も足して数える。
     */
    const byLabel =
      support && !PREDICATE_ENDING.test(label)
        ? matchHeading(label, support, opts.categoryHint, candidates)
        : matchByKeywords(label, opts.categoryHint, 1, false, candidates);
    if (byLabel) return byLabel;
  }
  // ラベルで決まらないときだけ説明文を見る。長文は無関係な語を巻き込むので
  // 2語以上が条件。ただし場所だけのラベルは、捨てると今回の弱点が丸ごと
  // 消えるので1語で決める
  if (support) {
    return matchByKeywords(
      support,
      opts.categoryHint,
      labelIsPlace ? 1 : 2,
      false,
      candidates
    );
  }
  return null;
}

/**
 * 場所を指す語。取り除いた残りで弱点を決める。
 * 「序論・本論・結論」は構成の弱点そのもの（「序論・本論・結論の構成バランス」）なので含めない。
 */
const PLACE_TOKEN =
  // 「一文が長い」の「一文」は場所ではないので、番号付きは「第〜」か「〜文目」の形だけ
  /第\s*[0-9０-９一二三四五六七八九十]+\s*(?:段落|文目|文)|[0-9０-９一二三四五六七八九十]+\s*(?:段落|文目)|問\s*[0-9０-９一二三四五六七八九十]+|段落|冒頭|書き出し|末尾|結論部|導入部|前半|後半|全体|部分|箇所/g;

function stripPlaceWords(text: string): string {
  return text.trim().replace(PLACE_TOKEN, "").trim();
}

/**
 * 見出し語ラベルの判定。ラベルの語を2倍、説明文の語を1倍で数える。
 * 説明文は助言の言葉（「結論では〜」「段落を〜」）を広く含むので、同じ重さで
 * 数えると「反論検討」が説明文の「根拠」で別の弱点に流れる。ラベルに当たった
 * 候補の間の優劣を説明文で付けるのが目的。
 */
function matchHeading(
  label: string,
  support: string,
  categoryHint: EssayCategoryKey | undefined,
  entries: readonly TaxonomyEntry[] = WEAKNESS_TAXONOMY
): TaxonomyEntry | null {
  let best: { entry: TaxonomyEntry; score: number } | null = null;
  for (const entry of entries) {
    const inLabel = entry.keywords.filter((k) => label.includes(k)).length;
    if (inLabel === 0) continue;
    let score =
      inLabel * 2 + entry.keywords.filter((k) => support.includes(k)).length;
    if (categoryHint && entry.category === categoryHint) score += 0.5;
    if (!best || score > best.score) best = { entry, score };
  }
  return best ? best.entry : null;
}

/** 述語で終わる（弱点を言い切っている）ラベル。それ以外は見出し語として扱う */
const PREDICATE_ENDING =
  /(い|る|た|だ|ない|ある|です|ます|ず|ぬ|欠如|不足|欠落|不明確|不十分|過多)$/;

/** 説明文の中の答案の引用。引用中の語で弱点を決めると、答案の話題で分類してしまう */
function stripQuotes(text: string): string {
  return text.replace(/「[^」]*」|『[^』]*』/g, "");
}

function hasAnyKeyword(
  text: string,
  entries: readonly TaxonomyEntry[] = WEAKNESS_TAXONOMY
): boolean {
  return entries.some((e) => e.keywords.some((k) => text.includes(k)));
}

/** キーワード一致で最有力の候補を返す。minScore 未満は採らない */
function matchByKeywords(
  text: string,
  categoryHint: EssayCategoryKey | undefined,
  minScore: number,
  /** true なら categoryHint のカテゴリの候補だけを見る */
  onlyHintCategory = false,
  entries: readonly TaxonomyEntry[] = WEAKNESS_TAXONOMY
): TaxonomyEntry | null {
  let best: { entry: TaxonomyEntry; score: number } | null = null;
  for (const entry of entries) {
    if (onlyHintCategory && entry.category !== categoryHint) continue;
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

/** 重点弱点の表示の群。小論文は層（採点の軸）、面接は interview */
export type WeaknessGroupKey = EssayCategoryKey | "interview";

/** 表示順: 文 → 構成 → 論証 → 成熟度 → 設問対応 → AP → 旧軸 → その他 → 面接 */
export const WEAKNESS_GROUP_ORDER: readonly WeaknessGroupKey[] = [
  "expression",
  "structure",
  "logic",
  "reasoningMaturity",
  "responsiveness",
  "apAlignment",
  "originality",
  "other",
  "interview",
];

export const WEAKNESS_GROUP_LABELS: Record<WeaknessGroupKey, string> = {
  expression: "文（表現力）",
  structure: "構成",
  logic: "論証",
  reasoningMaturity: "議論の成熟度",
  responsiveness: "設問対応",
  apAlignment: "AP合致",
  originality: "独自性（旧軸）",
  other: "その他",
  interview: "面接",
};

function entryOf(w: { area: string; canonicalId?: string | null }) {
  return (
    (w.canonicalId ? BY_ID.get(w.canonicalId) : undefined) ??
    BY_LABEL.get(w.area.trim())
  );
}

/** 表示の群。面接の弱点（iv.*）は小論文の層と分ける */
export function weaknessGroupOf(w: {
  area: string;
  canonicalId?: string | null;
  categoryId?: string | null;
}): WeaknessGroupKey {
  const entry = entryOf(w);
  if (entry?.id.startsWith("iv.")) return "interview";
  return weaknessCategoryOf(w);
}

/** カードに出す1行の説明。正規タクソノミーに無い弱点は空文字 */
export function weaknessDescriptionOf(w: {
  area: string;
  canonicalId?: string | null;
}): string {
  return entryOf(w)?.description ?? "";
}

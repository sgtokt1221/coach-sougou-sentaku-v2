export const AI_MODEL_SONNET = "claude-sonnet-4-6";
export const AI_MODEL_STATEMENT = "claude-sonnet-5";

/**
 * 小論文添削・スキルチェック採点で使うモデル。
 *
 * 精度向上のため claude-sonnet-5 を試したが、採点分布が中央に寄って平板化した。
 * 実データ3件での比較（同一答案・同一プロンプト）:
 *   拙い答案(385字/800字) 20点 → 25点（甘くなる）
 *   良い答案(734字/800字) 47点 → 39点（辛くなる）
 *   どの軸も同じ点に揃う傾向（例: 5,5,5,5,5）
 * 生徒間・答案間の差が出ないと指導に使えないため、sonnet-4-6 を維持する。
 * モデルを上げる場合は、この分布が改善しているかを必ず実データで確認すること。
 */
export const AI_MODEL_REVIEW = "claude-sonnet-4-6";

/**
 * 志望理由書は、AP・本人の経験・将来像を長距離で接続する必要があるため
 * 最終生成・添削だけ上位モデルを使う。他の出願書類は標準モデルを維持する。
 */
export function selectDocumentModel(documentType: unknown): string {
  return documentType === "志望理由書" ? AI_MODEL_STATEMENT : AI_MODEL_SONNET;
}

export const AI_PROMPT_VERSIONS = {
  essayReview: {
    // v3: 字数指示の矛盾を解消し、充足率をサーバー計算値として渡すようにした。
    // v4: アンカーを引き下げ、6点を標準に据えて7点以上に軸ごとの加点条件を課した。
    //     校正実測（同一答案・4品質帯）: 普通に良い答案が 40.5点(A) → 37点(B) へ。
    //     D級 16.5→17.0 / C級 27.0→27.0 / A級 42.0→40.0 と、狙った帯だけが動く。
    // 採点結果が動くため、プロンプトを実質変更したらここも必ず上げる
    // （aiMetadata に刻まれる版が変わらないと改定前後のスコア比較ができない）。
    promptVersion: "essay-review-v4",
    schemaVersion: "essay-review-output-v2",
  },
  chocoReview: {
    // v2: 手書きJSON＋正規表現パースから構造化出力へ移行し、模範段落の引用禁止と
    //     命令・データ境界を追加した。
    promptVersion: "choco-review-v2",
    schemaVersion: "choco-review-output-v1",
  },
  skillCheck: {
    // v2: 軸別バンドの 10/8 点の記述を締め、6点を平均に据えた。
    //     校正実測（law-01・同一答案）: 普通に良い答案が 44点(A) → 38点(B) へ。
    //     C級は 24点(C) のまま。小論文添削のB級37点とほぼ揃った（従来は7点ずれ）。
    promptVersion: "skill-check-v2",
    schemaVersion: "skill-check-output-v1",
  },
  documentReview: {
    // v3: 「構成」の評価観点を書類の種類ごとに切り替えた。以前は全種類を
    //     志望理由書の基準（主張・根拠・志望理由・将来像）で採点しており、
    //     自己推薦書や研究計画書に志望理由の流れを求めていた。
    promptVersion: "document-review-v3",
    schemaVersion: "document-review-output-v2",
  },
  statementDraft: {
    promptVersion: "statement-draft-v2",
    schemaVersion: "statement-draft-output-v2",
  },
  templateDraft: {
    promptVersion: "template-draft-v2",
    schemaVersion: "template-draft-output-v2",
  },
  storyCheck: {
    promptVersion: "story-check-v2",
    schemaVersion: "story-check-output-v2",
  },
  individualityCheck: {
    promptVersion: "individuality-check-v2",
    schemaVersion: "individuality-check-output-v2",
  },
} as const;

export const AI_MODEL_SONNET = "claude-sonnet-4-6";
export const AI_MODEL_STATEMENT = "claude-sonnet-5";

/**
 * 応答速度を優先する用途だけに使う。
 *
 * 精度の理由で haiku は全廃したが、音声面接だけは文字起こし→応答→読み上げが
 * 直列に走るため、応答が遅いと会話が成立しない。実測（同一条件3回）で
 * haiku 平均1.6秒 / sonnet 平均3.0秒。ここだけ速さを取る。
 */
export const AI_MODEL_FAST = "claude-haiku-4-5-20251001";

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
    // v5: 実データで v4 の解像度不足が出たため、中位帯に目盛りを戻した。
    //     本番6件（3人）のうち5件が 25点、長谷川葵は4回連続で 6/5/5/5/4 と
    //     5軸すべて完全一致。フィードバック本文は毎回別物だったので AI は
    //     読んでいる。原因は v4 のゲートが二値だったこと:
    //       - 6点は「主張・根拠・具体が全部揃う」が条件、1つ欠けたら5点以下
    //       - 7点以上は反論検討など、実在の高校生がまず満たさない条件
    //     実在の生徒は「構成はある・具体が弱い」で全員同じマスに落ちる。
    //     対策: 3〜10点の基準を軸ごとに書き分けた（5軸 × 各段）。
    //     最初は共通の帯を1点刻みにするだけで試したが効かなかった。記述が
    //     「主張・根拠・具体」という logic の語彙だったため、structure と
    //     expression には判断材料が無く前と同じ値に留まり、具体がそのまま
    //     評価対象の originality だけが一斉に上がって点が甘くなっただけだった。
    //     軸ごとに評価対象を明示し、他軸の判断を持ち込まないよう指示している。
    //     全軸同点を禁じる指示も追加。
    //     あわせて max_tokens 4096→12000、effort を high に明示
    //     （messages.parse は thinking と本文で max_tokens を共有するため、
    //      4096 では採点を吟味する余地が残っていなかった）。
    // 校正は自作の4品質帯ではなく実答案で行うこと。v4 の校正が自作答案
    // （D17/C27/B37/A40）だけで、実データの密集帯を見落とした。
    // 採点結果が動くため、プロンプトを実質変更したらここも必ず上げる
    // （aiMetadata に刻まれる版が変わらないと改定前後のスコア比較ができない）。
    // v6: 総合型選抜との整合を見直した。資料を読んで書く形式が主流なのに、
    //     軸の基準にも重い減点事由にも「資料の読解」が一切無く、課題文や
    //     グラフを取り違えた答案でも logic の「根拠が一般論」(5点)にしか
    //     当たらなかった（材料は sourceText/chartDataSummary で渡していた）。
    //     - 誤読を設問要素の欠落と同じ重さの減点事由にした（logic 4点以下）
    //     - 出題形式ごとの指示を「重視します」から「logic で見る」へ具体化
    //     - 資料のない設問では誤読減点を適用しないと明記
    //     あわせて字数の減点しきい値を充足率70%→80%に上げた（8割が指導の目安）。
    // v7: 監査を受けて軸構成を変更（案1）。
    //     - reasoningMaturity（議論の成熟度）を独立軸として追加
    //     - apAlignment を合計から外し、志望校との相性を見る補助指標にした
    //       （全設問で合計の20%を占め、資料読解や設問対応より重かった）
    //     合計は 構成/論理性/表現力/独自性/議論の成熟度 の5軸50点で固定。
    //     APの有無で満点が40/50に変わる問題も同時に解消した。
    //     ※ 満点と軸の意味が変わるため、既存答案は
    //        scripts/rescore-essays.ts で採点し直すこと。
    // v8: 設問への適合を独立判定にした（監査 P1-12）。
    //     採点前に設問の要求を分解し、要求ごとに met/partial/missing と
    //     答案内の引用を返させる。主題を外した答案は structure を4点、
    //     expression を6点で頭打ちにする（サーバー側で適用）。
    //     文章が整っていれば中位に紛れていた「主題を外した答案」を落とす。
    // v9: 事実主張の確認状態を出させる（監査 P1-11）。答案が持ち出した
    //     固有名詞・統計・制度名を claimChecks に列挙し、資料で裏が取れない
    //     ものを unverified とする。unverified/contradicted は logic の
    //     「答案固有の事実」としても originality の「具体性」としても
    //     加点根拠にしない。架空の固有名詞が具体性として加点されるのを防ぐ。
    //     資料と食い違う主張があれば logic を4点以下（サーバー側で適用）。
    promptVersion: "essay-review-v9",
    schemaVersion: "essay-review-output-v2",
  },
  interviewScore: {
    // v1: 手書きJSONのパースから構造化出力(Zod)へ移行した（監査 P1-1）。
    //     以前は本文から正規表現で JSON を抜き出しており、範囲外の点数も
    //     軸の欠落も型違いも素通りしていた。版も記録していなかったため、
    //     改定前後のスコア比較ができなかった。
    //     あわせてモード別の軸を保存し（P0-2）、合計を内容4軸に固定した（P0-1）。
    promptVersion: "interview-score-v1",
    schemaVersion: "interview-score-output-v1",
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

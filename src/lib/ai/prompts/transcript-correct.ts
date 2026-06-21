/**
 * 音声面接の文字起こし誤変換補正プロンプト。
 *
 * Gemini Live / OpenAI Realtime の入力文字起こしに残る「同音異義語・誤った漢字・助詞の
 * ミス・不自然な文の区切り」を、会話文脈と固有名詞（大学/学部/氏名/高校）を手がかりに
 * 補正する。あくまで音声認識の取り違えを直すだけで、内容・意味・語順は変えない。
 */

/** 補正の振る舞いを定義するシステムプロンプト（保守的・最小介入）。 */
export const TRANSCRIPT_CORRECT_SYSTEM_PROMPT = `あなたは日本語の音声認識（文字起こし）の誤変換を直す校正者です。大学入試（総合型選抜）の模擬面接で、受験生が話した内容の自動文字起こしを受け取り、聞き取り違い・変換ミスだけを直します。

# 直してよいもの（これだけ）
- 同音異義語・誤った漢字の変換ミス（例「医師」と「意思」「石」、「保証」と「保障」）
- 助詞・送り仮名・濁点などの軽微な誤り
- 不自然に切れた／繋がった文の区切り、明らかな衍字・脱字レベルの認識ノイズ
- 文脈・固有名詞（後述）から見て明らかに取り違えと分かる語の置き換え

# 絶対にしないこと
- 意味・主張・語順を変えること。要約・言い換え・敬語化・整文・丁寧語への変換
- 新しい語句や情報の追加、内容の補完（聞き取れていない語を推測で補わない）
- 言いよどみや口語をきれいに整えること（フィラーは別処理済み。残っていても消さない）
- 固有名詞を、発言に出てこないのに無理に挿入すること

# 固有名詞の扱い
文脈として「大学名・学部名・受験生の氏名・出身高校名」が与えられる場合がある。
発言中にそれらに該当する語が誤変換されていれば、与えられた正しい表記に合わせる。
該当する語が発言に出てこなければ、何も足さない。

# 迷ったとき
直すべきか確信が持てない箇所は、そのまま残す（過剰補正で受験生が言っていないことを作らない）。

# 出力
補正後のテキストだけを、前置き・説明・引用符なしで1行で出力する。直す箇所が無ければ入力をそのまま返す。`;

/** 補正対象1発言ぶんのユーザープロンプトを組み立てる。 */
export function buildTurnCorrectPrompt(
  utterance: string,
  ctx: {
    /** 直近の会話の流れ（面接官・受験生のやり取り）。話題を踏まえた補正に使う。 */
    conversationContext?: string;
    universityName?: string;
    facultyName?: string;
    studentName?: string;
    highSchoolName?: string;
  },
): string {
  const lines: string[] = ["# 正しい固有名詞"];
  if (ctx.universityName) lines.push(`- 志望大学: ${ctx.universityName}`);
  if (ctx.facultyName) lines.push(`- 志望学部: ${ctx.facultyName}`);
  if (ctx.studentName) lines.push(`- 受験生の氏名: ${ctx.studentName}`);
  if (ctx.highSchoolName) lines.push(`- 出身高校: ${ctx.highSchoolName}`);
  if (lines.length === 1) lines.push("- （特になし）");

  const convoSection = ctx.conversationContext
    ? `\n\n# 直近の会話の流れ（話題の手がかり。補正には使うが、ここは出力しない）\n${ctx.conversationContext}`
    : "";

  return `${lines.join("\n")}${convoSection}

# 補正対象（直近の受験生の発言の文字起こし。これだけを補正する）
${utterance}

上の「会話の流れ」と固有名詞を手がかりに、補正対象の発言の誤変換だけを直し、補正後のテキストのみを出力してください。`;
}

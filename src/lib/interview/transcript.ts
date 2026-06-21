/**
 * 面接の文字起こし整形ユーティリティ。
 * - normalizeTranscript: Gemini Live 等の delta 連結で残る不要な空白を整形（日本語の字間スペース除去）。
 * - stripFillers: 表示/保存用にフィラー(言い淀み)を除去（フィラー件数の分析は除去前テキストから行う）。
 */

/** 字間に紛れ込む不要な空白を除去・整形する（語の意味は変えない）。 */
export function normalizeTranscript(text: string): string {
  if (!text) return "";
  return text
    // タブ・連続空白を1つに
    .replace(/[ \t ]+/g, " ")
    // 非ASCII(日本語等)同士の間の空白を除去: 「私 は 思う」→「私は思う」
    .replace(/(?<=[^\x00-\x7F])\s+(?=[^\x00-\x7F])/g, "")
    // 日本語句読点の前後の空白を除去
    .replace(/\s*([、。！？「」（）])\s*/g, "$1")
    .trim();
}

/** 除去対象のフィラー（誤検出の少ない、明確な言い淀みに限定）。 */
const FILLERS = [
  "えーと", "えっと", "ええと", "えーっと", "えー", "あのー", "あのう",
  "うーん", "うんと", "んー", "なんか", "そのー", "まぁ", "まあ",
];

/**
 * 表示・保存用にフィラーを除去する（読みやすさ向上）。
 * 文頭または句読点/空白の直後にあるフィラーのみ対象にして過剰除去を避ける。
 */
export function stripFillers(text: string): string {
  if (!text) return "";
  const alt = FILLERS.join("|");
  // 文頭/句読点/空白の直後のフィラー（直後の読点も一緒に）を削除
  const re = new RegExp(`(^|[\\s、。！？「（])(?:${alt})、?`, "g");
  let out = text;
  // 連続するフィラー（例:「えーとあのー」）に対応するため数回適用
  for (let i = 0; i < 3; i++) {
    const next = out.replace(re, "$1");
    if (next === out) break;
    out = next;
  }
  return normalizeTranscript(out);
}

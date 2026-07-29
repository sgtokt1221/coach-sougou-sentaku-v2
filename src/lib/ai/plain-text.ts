/**
 * プレーンテキスト表示のUI向けに、AI応答へ混ざった Markdown 記法を落とす。
 *
 * コーチのチャット欄は whitespace-pre-wrap の素のテキスト表示なので、
 * `**強調**` などが記号のまま画面に出てしまう。プロンプトで禁じても
 * 完全には守られない（実測で5回中1回混入）ため、表示前に確実に取り除く。
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1") // **強調**
    .replace(/(?<![*\w])\*([^*\n]+)\*(?!\*)/g, "$1") // *強調*
    .replace(/^#{1,6}\s+/gm, "") // # 見出し
    .replace(/^[ \t]*[-*][ \t]+/gm, "・") // - 箇条書き
    .replace(/`([^`\n]+)`/g, "$1"); // `コード`
}

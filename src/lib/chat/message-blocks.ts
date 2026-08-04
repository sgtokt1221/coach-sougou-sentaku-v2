/**
 * メッセージ本文を「引用」と「地の文」に分ける。
 *
 * 1通の中で 引用→コメント→引用→コメント と繰り返せるようにするため、
 * 引用は本文中の行として持つ（先頭が "> " の行）。構造化フィールドで持つと
 * 1通に1つしか入らず、順序も表現できない。
 *
 * 連続する引用行はひとかたまりにする（複数行の選択をそのまま引くため）。
 */
export type MessageBlock =
  | { kind: "quote"; text: string }
  | { kind: "text"; text: string };

/** 引用行の目印。入力欄に差し込むときもこれを使う */
export const QUOTE_PREFIX = "> ";

export function parseMessageBlocks(message: string): MessageBlock[] {
  const lines = message.split("\n");
  const blocks: MessageBlock[] = [];
  let buf: string[] = [];
  let mode: "quote" | "text" | null = null;

  const flush = () => {
    if (mode === null || buf.length === 0) {
      buf = [];
      return;
    }
    const text = buf.join("\n");
    // 地の文は前後の空行を落とす。引用の直後に空行が残ると間延びする
    if (mode === "text") {
      const trimmed = text.replace(/^\n+|\n+$/g, "");
      if (trimmed) blocks.push({ kind: "text", text: trimmed });
    } else {
      blocks.push({ kind: "quote", text });
    }
    buf = [];
  };

  for (const line of lines) {
    const isQuote = line.startsWith(">");
    const next = isQuote ? "quote" : "text";
    if (mode !== null && next !== mode) flush();
    mode = next;
    buf.push(isQuote ? line.replace(/^>\s?/, "") : line);
  }
  flush();
  return blocks;
}

/** 選択文字列を引用行に整える（複数行ならすべての行に目印を付ける） */
export function toQuoteLines(text: string): string {
  return text
    .split("\n")
    .map((l) => `${QUOTE_PREFIX}${l}`)
    .join("\n");
}

/**
 * 入力欄の末尾へ引用を足す。
 * 直前の内容と続けて書けるよう、引用の後ろは必ず改行しておく。
 */
export function appendQuote(current: string, quoted: string): string {
  const head = current.length === 0 || current.endsWith("\n") ? current : `${current}\n`;
  const spacer = head.length > 0 && !head.endsWith("\n\n") && head.length > 0 ? "" : "";
  return `${head}${spacer}${toQuoteLines(quoted)}\n`;
}

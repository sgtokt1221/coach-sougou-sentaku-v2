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
  | { kind: "quote"; text: string; source?: string }
  | { kind: "text"; text: string };

/** 引用行の目印。入力欄に差し込むときもこれを使う */
export const QUOTE_PREFIX = "> ";

/**
 * 引用の1行目に置く出典行の目印。「誰のいつの発言か」を引用に添えるため。
 *
 * 引用は本文中の行として持つ設計（1通に複数の引用を順番に並べられる）なので、
 * 出典も行として持たせる。`>>` で始まる行を出典とみなす。
 *
 * 中身は「沖藤 ・ 8/15 16:04」のような表示用の文字列をそのまま入れる。
 * ISO日時を入れると入力欄に生の日時が見えて書きにくいうえ、引用した時点の
 * 表記をそのまま残せばよく、あとから整形し直す必要がない。
 * この行を持たない古いメッセージは、これまで通り出典なしで描かれる。
 */
export const QUOTE_ATTR_PREFIX = ">>";

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
    // 地の文は前後の空行を落とす。引用の直後に空行が残ると間延びする
    if (mode === "text") {
      const trimmed = buf.join("\n").replace(/^\n+|\n+$/g, "");
      if (trimmed) blocks.push({ kind: "text", text: trimmed });
      buf = [];
      return;
    }
    // 引用: 1行目が出典（元は ">>" で始まる行）なら取り出す
    let source: string | undefined;
    const lines = [...buf];
    if (lines[0]?.startsWith(">")) {
      const label = lines[0].replace(/^>\s?/, "").trim();
      if (label) source = label;
      lines.shift();
    }
    const text = lines.join("\n");
    if (text.trim() || source) {
      blocks.push({ kind: "quote", text, ...(source ? { source } : {}) });
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

/**
 * 選択文字列を引用行に整える（複数行ならすべての行に目印を付ける）。
 * source を渡すと1行目に出典（誰のいつの発言か）を入れる。
 */
export function toQuoteLines(text: string, source?: string): string {
  const body = text
    .split("\n")
    .map((l) => `${QUOTE_PREFIX}${l}`)
    .join("\n");
  if (!source?.trim()) return body;
  return `${QUOTE_ATTR_PREFIX} ${source.trim()}\n${body}`;
}

/**
 * 入力欄の末尾へ引用を足す。
 * 直前の内容と続けて書けるよう、引用の後ろは必ず改行しておく。
 */
export function appendQuote(
  current: string,
  quoted: string,
  source?: string,
): string {
  const head = current.length === 0 || current.endsWith("\n") ? current : `${current}\n`;
  return `${head}${toQuoteLines(quoted, source)}\n`;
}

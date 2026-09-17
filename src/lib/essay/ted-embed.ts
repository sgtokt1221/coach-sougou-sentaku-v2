/**
 * 埋め込み再生のURL。
 *
 * TED が現在案内している言語付きの形（/talks/lang/<言語>/<スラッグ>）を使う。
 * 旧来の `?subtitle=ja` は今のTEDで効いている保証がなく、効かなくてもエラーは
 * 出ない（英語字幕のまま再生され、日本語で見るつもりの生徒だけが困る）。
 *
 * 書き起こしを読み込む lecture-info.ts とは分けている。画面から使うため、
 * 一緒にすると講演の全文がブラウザのバンドルに載る。
 */
export function tedEmbedUrl(ted: { talkId: string; language: string }): string {
  return `https://embed.ted.com/talks/lang/${ted.language}/${ted.talkId}`;
}

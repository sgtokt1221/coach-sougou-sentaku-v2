/**
 * AI 応答テキストから JSON オブジェクト文字列を堅牢に抽出する。
 * 1) ```json ... ``` / ``` ... ``` フェンス
 * 2) 最初の { から最後の } まで (フェンス無し・前後に説明文がある場合)
 * 返り値は JSON.parse 前の文字列 (パース失敗は呼び出し側で扱う)。
 */
export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]?.trim()) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return null;
}

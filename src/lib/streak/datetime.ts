/**
 * 日付をJST（日本時間）の "YYYY-MM-DD" 形式に変換
 */
export function toJstDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(d);
}

/**
 * 2つの日付文字列間の日数差を計算
 * @param a 開始日 "YYYY-MM-DD"
 * @param b 終了日 "YYYY-MM-DD"
 * @returns 整数差（bがaより後なら正の値）
 */
export function daysBetween(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00Z');
  const dateB = new Date(b + 'T00:00:00Z');
  const diffTime = dateB.getTime() - dateA.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

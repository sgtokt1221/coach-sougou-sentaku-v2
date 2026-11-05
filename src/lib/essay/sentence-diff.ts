/**
 * 書き直し前後の答案を文単位で比べる（管理者の「前回との差分」）。
 *
 * 字単位の差分（src/lib/text/char-diff.ts）は1文の赤ペン向け。答案全体にかけると
 * 言い換えた文が細切れの赤と青になり、どの文を書き足したのかが読めない。
 * 文を単位に最長共通部分列を取り、「そのまま／足した／消した」の3つに分ける。
 */
export type SentenceDiffPart = { type: "same" | "add" | "del"; text: string };

/** 句点・感嘆符・疑問符で区切る。改行は段落の区切りとして1つの単位に残す */
export function splitSentences(text: string): string[] {
  return text.match(/[^。！？!?\n]*[。！？!?]+|[^。！？!?\n]+|\n/g) ?? [];
}

export function sentenceDiff(before: string, after: string): SentenceDiffPart[] {
  const a = splitSentences(before);
  const b = splitSentences(after);
  const key = (s: string) => s.trim();
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] =
        key(a[i]) === key(b[j])
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const parts: SentenceDiffPart[] = [];
  const push = (type: SentenceDiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) {
      push("same", b[j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // 改行は消した側に出さない（段落の区切りは新しい方に合わせる）
      if (a[i] !== "\n") push("del", a[i]);
      i++;
    } else {
      push("add", b[j]);
      j++;
    }
  }
  for (; i < n; i++) if (a[i] !== "\n") push("del", a[i]);
  for (; j < m; j++) push("add", b[j]);
  return parts;
}

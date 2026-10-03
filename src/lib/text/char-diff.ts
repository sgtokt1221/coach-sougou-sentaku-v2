/**
 * 2つの文の差分を文字単位で取る（赤ペンで「変わった字だけ」を示すため）。
 *
 * 赤ペンの元の文は1文まるごとのことが多く（本番の中央値46字）、元の文と直した文を
 * 2つ並べるだけでは、どこが変わったのかを生徒が読み比べて探すことになっていた。
 * 文は長くても数百字なので、素直な最長共通部分列で十分に速い。
 */
export type DiffPart = { type: "same" | "del" | "ins"; text: string };

export function charDiff(before: string, after: string): DiffPart[] {
  const a = [...before];
  const b = [...after];
  const n = a.length;
  const m = b.length;
  // 長すぎる文は差分を取らず、まるごと差し替えとして扱う（計算量の保険）
  if (n * m > 400_000) {
    return [
      ...(before ? [{ type: "del" as const, text: before }] : []),
      ...(after ? [{ type: "ins" as const, text: after }] : []),
    ];
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], ch: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += ch;
    else parts.push({ type, text: ch });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", a[i]);
      i++;
    } else {
      push("ins", b[j]);
      j++;
    }
  }
  while (i < n) push("del", a[i++]);
  while (j < m) push("ins", b[j++]);
  return parts;
}

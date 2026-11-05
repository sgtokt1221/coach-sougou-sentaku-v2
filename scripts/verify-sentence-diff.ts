/**
 * 文単位の差分（src/lib/essay/sentence-diff.ts）の確認。
 *   npx tsx scripts/verify-sentence-diff.ts
 */
import { sentenceDiff } from "../src/lib/essay/sentence-diff";

let failed = 0;
function check(name: string, before: string, after: string, want: string) {
  const got = sentenceDiff(before, after)
    .map((p) => `${p.type === "same" ? "=" : p.type === "add" ? "+" : "-"}${p.text}`)
    .join("|");
  if (got !== want) {
    failed++;
    console.error(`NG ${name}\n  want: ${want}\n  got:  ${got}`);
  } else console.log(`OK ${name}`);
}

check("同じ", "A。B。", "A。B。", "=A。B。");
check("足した", "A。B。", "A。X。B。", "=A。|+X。|=B。");
check("消した", "A。B。C。", "A。C。", "=A。|-B。|=C。");
check("言い換え", "A。B。", "A。B2。", "=A。|-B。|+B2。");
check("段落を足した", "A。\nC。", "A。\nB。\nC。", "=A。\n|+B。\n|=C。");
check("末尾が句点なし", "A。B", "A。B", "=A。B");
check("空から", "", "A。", "+A。");

if (failed) {
  console.error(`${failed} 件失敗`);
  process.exit(1);
}

import { ALL_CHOCO_PASSAGES } from "../src/data/choco-passages";
import { CHOCO_ROLE_LABELS } from "../src/lib/types/choco";

let errors = 0;
const seen = new Set<string>();
for (const p of ALL_CHOCO_PASSAGES) {
  const where = `${p.id}`;
  if (seen.has(p.id)) {
    console.error(`[dup id] ${where}`);
    errors++;
  }
  seen.add(p.id);
  if (p.paragraphs.length < 4 || p.paragraphs.length > 5) {
    console.error(`[paragraphs ${p.paragraphs.length}] ${where}`);
    errors++;
  }
  const total = p.paragraphs.reduce((n, g) => n + g.text.length, 0);
  if (total < 650 || total > 1000) {
    console.error(`[wordCount ${total}] ${where}`);
    errors++;
  }
  for (const [i, g] of p.paragraphs.entries()) {
    if (!(g.role in CHOCO_ROLE_LABELS)) {
      console.error(`[role ${g.role}] ${where}#${i}`);
      errors++;
    }
    if (!g.keyPoints || g.keyPoints.length === 0) {
      console.error(`[empty keyPoints] ${where}#${i}`);
      errors++;
    }
    if (!g.text || g.text.length < 30) {
      console.error(`[short text] ${where}#${i}`);
      errors++;
    }
  }
}
if (errors > 0) {
  console.error(`\n${errors} 件のエラー`);
  process.exit(1);
}
console.log(`OK: ${ALL_CHOCO_PASSAGES.length} passages, ${seen.size} unique`);

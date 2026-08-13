import { config } from "dotenv"; config({ path: ".env.local" });
import { adminDb } from "../src/lib/firebase/admin";
import { AI_PROMPT_VERSIONS } from "../src/lib/ai/prompt-versions";
const V = AI_PROMPT_VERSIONS.essayReview.promptVersion;
async function main(){
  const users = await adminDb!.collection("users").get();
  const names = new Map(users.docs.map(u => [u.id, String(u.data().displayName ?? u.id)]));
  const snap = await adminDb!.collection("essays").get();
  const per = new Map<string, {v11:number; old:number}>();
  for (const d of snap.docs) {
    const x = d.data();
    if (!x.scores) continue;
    const n = names.get(x.userId) ?? x.userId;
    const cur = per.get(n) ?? {v11:0, old:0};
    if (x.feedback?.aiMetadata?.promptVersion === V) cur.v11++; else cur.old++;
    per.set(n, cur);
  }
  console.log("現行版:", V);
  for (const [n, c] of [...per].sort()) console.log(`  ${n}: 現行 ${c.v11} / 旧版 ${c.old}`);
}
main().then(()=>process.exit(0));

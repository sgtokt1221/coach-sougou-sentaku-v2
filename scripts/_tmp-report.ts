import { config } from "dotenv"; config({ path: ".env.local" });
import { adminDb } from "../src/lib/firebase/admin";
import { AI_PROMPT_VERSIONS } from "../src/lib/ai/prompt-versions";
const V = AI_PROMPT_VERSIONS.essayReview.promptVersion;
async function main(){
  const snap = await adminDb!.collection("essays").orderBy("submittedAt","desc").get();
  const names = new Map<string,string>();
  for (const d of snap.docs) {
    const uid = d.data().userId;
    if (uid && !names.has(uid)) {
      const u = await adminDb!.doc(`users/${uid}`).get();
      names.set(uid, (u.data()?.displayName as string) ?? uid);
    }
  }
  for (const d of snap.docs) {
    const x = d.data();
    if (x.feedback?.aiMetadata?.promptVersion !== V) continue;
    const tf = x.feedback?.taskFulfillment;
    const claims = (x.feedback?.claimChecks ?? []).filter((c: {status:string}) => c.status==="unverified");
    console.log(`${names.get(x.userId)}  ${x.scores?.total}点  ${tf?.answersQuestion === false ? "【設問ずれ】" : ""}${claims.length ? `未確認${claims.length}件` : ""}`);
    console.log(`  ${String(x.topic ?? "").split("\n")[0].slice(0,40)}`);
    if (tf?.answersQuestion === false) console.log(`  → ${tf.note.slice(0,110)}`);
  }
}
main().then(()=>process.exit(0));

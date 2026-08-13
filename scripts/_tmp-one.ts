import { config } from "dotenv"; config({ path: ".env.local" });
import { adminDb } from "../src/lib/firebase/admin";
import { reviewEssayCore } from "../src/lib/essay/review-core";
import { prepareAdmissionPolicy } from "../src/lib/ai/admission-policy";
async function main(){
  const id = process.argv[2];
  const d = await adminDb!.doc(`essays/${id}`).get();
  const e = d.data()!;
  let ap = "";
  const uni = await adminDb!.doc(`universities/${e.targetUniversity}`).get();
  if (uni.exists) {
    const f = (uni.data()!.faculties ?? []).find((x: {id:string}) => x.id === e.targetFaculty);
    if (f?.admissionPolicy) { const p = prepareAdmissionPolicy(f.admissionPolicy);
      if (p.text) ap = `大学: ${uni.data()!.name}\n学部: ${f.name}\nAP: ${p.text}`; }
  }
  const ctx = e.questionContext ?? {};
  const out = await reviewEssayCore({ ocrText: e.ocrText, topic: e.topic,
    questionType: ctx.questionType ?? undefined, wordLimit: ctx.wordLimit ?? undefined,
    admissionPolicy: ap, weaknessList: "（過去の弱点なし）" });
  const tf = out.feedback.taskFulfillment!;
  console.log("total:", out.scores.total, "| subjectMatch:", tf.subjectMatch);
  for (const r of tf.requirements) console.log(` [${r.status}] ${r.requirement}`);
  console.log("note:", tf.note.slice(0,220));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(String(e).slice(0,200));process.exit(1);});

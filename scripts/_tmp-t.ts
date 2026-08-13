import { config } from "dotenv"; config({ path: ".env.local" });
import { adminDb } from "../src/lib/firebase/admin";
async function main(){
  const d = await adminDb!.doc("essays/essay_1786548025430_rdl8llh").get();
  const x = d.data()!;
  console.log("お題:", x.topic);
  console.log("scores:", JSON.stringify(x.scores));
  console.log("設問判定:", JSON.stringify(x.feedback?.taskFulfillment, null, 1));
  console.log("\n本文:\n" + String(x.ocrText ?? "").slice(0, 500));
}
main().then(()=>process.exit(0));

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (getApps().length === 0) initializeApp({ projectId: "demo-coach" });
const db = getFirestore();
async function main() {
  const uid = "UofELGShuoShqDrCnEkoi6f2nqeQ";
  const snap = await db.collection("essays").where("userId", "==", uid).get();
  for (const d of snap.docs) {
    const lcs = d.data().feedback?.languageCorrections ?? [];
    if (!lcs.length) continue;
    console.log(`--- ${d.id} (${d.data().sourceType ?? "manual"}) ---`);
    lcs.forEach((c: any) => console.log(`  [${c.type}] len=${c.original?.length} | ${String(c.original).slice(0, 45)}`));
  }
}
main();

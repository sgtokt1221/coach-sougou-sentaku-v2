import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
if (getApps().length === 0) initializeApp({ projectId: "demo-coach" });
const db = getFirestore();
async function main() {
  const uid = "UofELGShuoShqDrCnEkoi6f2nqeQ";
  const st = await db.doc(`users/${uid}/sentenceDrillState/personal`).get();
  console.log("出題済みキー:", (st.data()?.usedKeys ?? []).length, "件");
  (st.data()?.usedKeys ?? []).forEach((k: string) => console.log("  -", k.slice(0, 30)));
  const drills = await db.collection(`users/${uid}/sentenceDrills`).where("kind", "==", "personal_rewrite").get();
  console.log("書き直しドリルの記録:", drills.size, "件");
  drills.docs.forEach((d) => {
    const x = d.data();
    console.log(`  ${x.lectureId} | ${x.correct}/${x.total} | completedAt: ${x.completedAt?.constructor?.name}`);
  });
}
main();

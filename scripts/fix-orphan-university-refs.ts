/**
 * essays が持つ大学ID・学部IDの孤児参照を直す。
 *
 * 答案は提出時点の targetUniversity / targetFaculty をスナップショットで持つ。
 * 大学データ側のIDが後から正規化・短縮されると、古い答案は存在しないIDを
 * 指したまま残る。この状態で採点し直すと AP が引けず apAlignment が 0 で
 * 保存される（AP未提供時の値）。画面にも0点として出るので沈黙失敗になる。
 *
 * 対応表は明示的に書く。名前の類似で自動推測はしない
 * （学部の取り違えは AP を別学部の基準で採点することになり、実害が大きい）。
 *
 * Usage:
 *   npx tsx scripts/fix-orphan-university-refs.ts           # dry-run
 *   npx tsx scripts/fix-orphan-university-refs.ts --write
 *
 * 対応表に無い孤児は「未対応」として報告するだけで触らない。
 * スコア済みの答案を直した場合は、そのあとで
 * `backfill-essay-rescore.ts --essay <id> --write` を回して採点し直すこと
 * （IDを直しただけでは保存済みの apAlignment=0 は戻らない）。
 */
import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

const isWrite = process.argv.includes("--write");

/** 旧大学ID → 新大学ID */
const UNIVERSITY_RENAMES: Record<string, string> = {
  tsukuba: "tsukuba-u",
};

/** `${大学ID}:${旧学部ID}` → 新学部ID */
const FACULTY_RENAMES: Record<string, string> = {
  "doshisha-u:global-communications": "global-comm",
  "tsukuba-u:medical": "medicine", // 医学群
};

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    }),
  });
}
const db = getFirestore();

async function main() {
  const uniSnap = await db.collection("universities").get();
  const faculties = new Map<string, Map<string, string>>(); // uniId -> (facultyId -> name)
  for (const d of uniSnap.docs) {
    const m = new Map<string, string>();
    for (const f of (d.data().faculties ?? []) as { id: string; name: string }[]) {
      m.set(f.id, f.name);
    }
    faculties.set(d.id, m);
  }

  const essays = await db
    .collection("essays")
    .select("userId", "status", "scores", "targetUniversity", "targetFaculty")
    .get();

  console.log(
    `${isWrite ? "【実書き込み】" : "【dry-run】"} essays ${essays.size}件を走査\n`
  );

  let fixed = 0;
  let unresolved = 0;
  const needsRescore: string[] = [];

  for (const doc of essays.docs) {
    const x = doc.data();
    const uni = x.targetUniversity as string | undefined;
    const fac = x.targetFaculty as string | undefined;
    if (!uni) continue;

    let newUni = uni;
    let newFac = fac;
    const changes: string[] = [];

    // 大学IDが存在しなければ対応表を引く
    if (!faculties.has(uni)) {
      const mapped = UNIVERSITY_RENAMES[uni];
      if (!mapped || !faculties.has(mapped)) {
        console.log(`未対応  ${doc.id}: 大学 ${uni} が存在せず対応表にも無い`);
        unresolved++;
        continue;
      }
      newUni = mapped;
      changes.push(`大学 ${uni} → ${mapped}`);
    }

    // 学部IDがその大学に無ければ対応表を引く
    const facMap = faculties.get(newUni)!;
    if (fac && !facMap.has(fac)) {
      const mapped = FACULTY_RENAMES[`${newUni}:${fac}`];
      if (!mapped || !facMap.has(mapped)) {
        console.log(
          `未対応  ${doc.id}: ${newUni} に学部 ${fac} が無く対応表にも無い`
        );
        unresolved++;
        continue;
      }
      newFac = mapped;
      changes.push(`学部 ${fac} → ${mapped}（${facMap.get(mapped)}）`);
    }

    if (!changes.length) continue;

    console.log(`修正    ${doc.id}: ${changes.join(" / ")}`);
    if (x.scores) {
      needsRescore.push(doc.id);
    }

    if (isWrite) {
      await doc.ref.update({
        targetUniversity: newUni,
        ...(newFac !== undefined ? { targetFaculty: newFac } : {}),
      });
    }
    fixed++;
  }

  console.log(`\n修正 ${fixed}件 / 未対応 ${unresolved}件`);
  if (needsRescore.length) {
    console.log(
      "\nスコアを持つ答案が含まれる。IDを直しただけでは保存済みの apAlignment は" +
        "戻らないので、下記を実行して採点し直すこと:"
    );
    for (const id of needsRescore) {
      console.log(
        `  npx tsx scripts/backfill-essay-rescore.ts --essay ${id} --write`
      );
    }
  }
  if (!isWrite) console.log("\ndry-run。実行するには --write を付ける。");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);

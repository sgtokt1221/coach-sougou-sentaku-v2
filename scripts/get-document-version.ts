/**
 * 指定の版IDを含む書類を探し、その版の本文を出す（読み取りのみ・書き込みなし）。
 *
 * 生徒が「AIの提案を反映したら本文が消えた」ときに、前の版を取り出して返すため。
 *
 * 使い方:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *   npx tsx scripts/get-document-version.ts v-1786176037467
 */
import { adminDb } from "../src/lib/firebase/admin";

const TARGET = process.argv[2];

async function main() {
  if (!TARGET) {
    console.error("版ID を渡してください（例: v-1786176037467）");
    process.exit(1);
  }
  if (!adminDb) throw new Error("Firestore に接続できません");

  const snap = await adminDb.collection("documents").get();
  for (const d of snap.docs) {
    const versions = (d.data().versions ?? []) as {
      id: string;
      content: string;
      wordCount: number;
      createdAt: string;
    }[];
    const hit = versions.find((v) => v.id === TARGET);
    if (!hit) continue;

    const data = d.data();
    console.log("=== 書類 ===");
    console.log("docId :", d.id);
    console.log("userId:", data.userId);
    console.log("title :", data.title);
    console.log("現在の本文:", (data.content ?? "").length, "文字");
    console.log(
      "版一覧:",
      versions.map((v) => `${v.id}(${v.wordCount}字)`).join(" "),
    );
    console.log(
      `\n=== ${hit.id} / ${hit.wordCount}文字 / ${hit.createdAt} ===`,
    );
    console.log(hit.content);
    return;
  }
  console.log("見つかりません:", TARGET);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

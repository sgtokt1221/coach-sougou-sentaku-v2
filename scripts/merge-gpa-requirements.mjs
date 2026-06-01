/**
 * 抽出した要求評定（scripts/gpa-requirements.json, { uniId: { facId: gpa } }）を
 * src/data/universities/*.json の faculties[].requirements.gpa に反映する。
 *
 * - gpa が null の学部のみ設定（既存値は不変）。
 * - 出典は各大学の入試要項（admissionUrl＋募集要項PDF）。bbbot 不使用。
 *
 * 実行: node scripts/merge-gpa-requirements.mjs
 * 反映後は seed-universities.ts で Firestore 再投入（要確認）。
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UNI_DIR = join(ROOT, "src", "data", "universities");
const SRC = join(__dirname, "gpa-requirements.json");

function main() {
  const map = JSON.parse(readFileSync(SRC, "utf-8"));
  let filled = 0;
  const unis = new Set();

  for (const file of readdirSync(UNI_DIR).filter((x) => x.endsWith(".json"))) {
    const path = join(UNI_DIR, file);
    const list = JSON.parse(readFileSync(path, "utf-8"));
    let dirty = false;
    for (const u of list) {
      const facMap = map[u.id];
      if (!facMap) continue;
      for (const fac of u.faculties ?? []) {
        const g = facMap[fac.id];
        if (typeof g !== "number") continue;
        if (!fac.requirements) continue;
        if (fac.requirements.gpa !== null) continue; // null のみ補完
        fac.requirements.gpa = g;
        filled++;
        unis.add(u.name);
        dirty = true;
      }
    }
    if (dirty) writeFileSync(path, JSON.stringify(list, null, 2) + "\n", "utf-8");
  }

  console.log(`補完: ${filled} 学部 / ${unis.size} 大学`);
  console.log([...unis].join(" / "));
}

main();

/**
 * 河合塾 Kei-Net 由来の大学偏差値（scripts/keinet-deviations.json）を
 * 既存の src/data/university-deviations.json に補完マージする。
 *
 * - 既存エントリは保持（マップに無い Coach 大学だけ補完）。
 * - カテゴリ: group ∈ {kyutei,national,public} → kokkou、それ以外 → shiritsu。
 *   該当カテゴリで未一致なら他カテゴリもフォールバック探索。
 * - 名称突合: Coach name の「大學→大学」正規化＋末尾「大学」除去で Kei-Net 短名と一致。
 *   既知ズレは ALIAS で上書き。新規校の学部偏差値は付けない（faculties: {}）。
 *
 * 実行: node scripts/merge-keinet-deviations.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UNI_DIR = join(ROOT, "src", "data", "universities");
const MAP_PATH = join(ROOT, "src", "data", "university-deviations.json");
const KEINET_PATH = join(__dirname, "keinet-deviations.json");
const SOURCE = "河合塾 Kei-Net 2026";

/** Coach 大学名 → Kei-Net 短名 の既知ズレ上書き（突合報告を見て追記） */
const ALIAS = {
  // 例: "東京科学大学": "東京科学",
};

/** Coach name を Kei-Net 短名に正規化 */
function shortName(name) {
  return name.replace(/大學/g, "大学").replace(/大学$/, "").trim();
}

/** group → カテゴリ */
function categoryOf(group) {
  return ["kyutei", "national", "public"].includes(group) ? "kokkou" : "shiritsu";
}

function main() {
  const keinet = JSON.parse(readFileSync(KEINET_PATH, "utf-8"));
  const map = JSON.parse(readFileSync(MAP_PATH, "utf-8"));

  const universities = [];
  for (const f of readdirSync(UNI_DIR).filter((x) => x.endsWith(".json"))) {
    for (const u of JSON.parse(readFileSync(join(UNI_DIR, f), "utf-8"))) universities.push(u);
  }

  let added = 0;
  const stillMissing = [];
  for (const u of universities) {
    if (map[u.id]) continue; // 既存は保持
    const key = ALIAS[u.name] ?? shortName(u.name);
    const primary = categoryOf(u.group);
    const other = primary === "kokkou" ? "shiritsu" : "kokkou";
    const hit = keinet[primary][key] ?? keinet[other][key];
    if (!hit) { stillMissing.push(u.name); continue; }
    map[u.id] = { min: hit.min, max: hit.max, source: SOURCE, faculties: {} };
    added++;
  }

  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n", "utf-8");

  console.log(`補完: ${added} 校 / 収録合計: ${Object.keys(map).length}/${universities.length}`);
  console.log(`なお未突合 (${stillMissing.length}):`);
  console.log(stillMissing.join(" / "));
}

main();

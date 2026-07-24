/**
 * CSV から高校偏差値をマージする（任意の信頼ソース用）。
 *
 * 入力 CSV（ヘッダ必須、UTF-8）。次のいずれかの列構成:
 *   A) schoolId,deviation            … マスタ ID 直指定（最も安全）
 *   B) prefecture,name,deviation     … 府県＋校名（府県内で正規化コア名が一意一致のみ採用）
 *
 * 既定では「現在 deviation 未設定の校のみ」を埋める（minkou 値を壊さない）。
 *   --overwrite を付けると上書きも許可。
 *   --file <path> で CSV パス指定（既定 data/highschool-deviations.csv）。
 *
 * 実行: node scripts/merge-deviations-csv.mjs --file data/highschool-deviations.csv
 * 反映後は seed-highschools.ts を再実行して Firestore に投入すること。
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "data", "highschools");
const PREF_FILE = {
  大阪府: "osaka.json",
  京都府: "kyoto.json",
  兵庫県: "hyogo.json",
  奈良県: "nara.json",
  滋賀県: "shiga.json",
  和歌山県: "wakayama.json",
};
const PREF_NAMES = Object.keys(PREF_FILE);

/** 照合用コア名（build-highschool-deviations.mjs と同一ロジック） */
function normalize(name) {
  let n = name.replace(/【.*?】/g, "").trim();
  n = n.replace(/^[一-鿿぀-ヿ々ヶ]+?[府県市町村]立/, "");
  n = n.replace(/^(国立|私立|公立|組合立)/, "");
  for (const pn of PREF_NAMES) if (n.startsWith(pn)) n = n.slice(pn.length);
  n = n.replace(/(?:幼稚園・|小学校・|中学校・)+高等学校/, "高等学校");
  return n.trim();
}

/** 素朴な CSV パーサ（カンマ区切り・ダブルクオート対応） */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((s) => s.trim()));
  }
  return rows;
}

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? true) : def;
}

function main() {
  const overwrite = process.argv.includes("--overwrite");
  const file = arg("--file", join("data", "highschool-deviations.csv"));
  const rows = parseCsv(readFileSync(join(__dirname, "..", file), "utf-8"));
  const header = rows.shift().map((h) => h.toLowerCase());
  const col = (k) => header.indexOf(k);
  const byId = col("schoolid") >= 0;

  // 府県ごとにマスタを読み、index を作る
  const cache = {}; // file -> { schools, byId, coreUnique:Map<core,school|null> }
  function load(fileName) {
    if (cache[fileName]) return cache[fileName];
    const schools = JSON.parse(readFileSync(join(DATA_DIR, fileName), "utf-8"));
    const idMap = new Map(schools.map((s) => [s.id, s]));
    const core = new Map();
    for (const s of schools) {
      const k = normalize(s.name);
      core.set(k, core.has(k) ? null : s); // 重複は null（曖昧）
    }
    return (cache[fileName] = { fileName, schools, idMap, core, dirty: false });
  }

  let matched = 0, skipped = 0;
  const unmatched = [];
  for (const r of rows) {
    const dev = Number(r[col("deviation")]);
    if (!Number.isFinite(dev)) continue;
    let entry = null, target = null;
    if (byId) {
      const id = r[col("schoolid")];
      const fileName = PREF_FILE[Object.keys(PREF_FILE).find((p) => id.startsWith(PREF_FILE[p].replace(".json", ""))) ?? ""] ||
        Object.values(PREF_FILE).find((f) => id.startsWith(f.replace(".json", "")));
      if (!fileName) { unmatched.push(id); continue; }
      entry = load(fileName);
      target = entry.idMap.get(id) ?? null;
    } else {
      const pref = r[col("prefecture")];
      const name = r[col("name")];
      const fileName = PREF_FILE[pref];
      if (!fileName) { unmatched.push(`${pref}/${name}`); continue; }
      entry = load(fileName);
      target = entry.core.get(normalize(name)) ?? null; // 一意一致のみ
    }
    if (!target) { unmatched.push(r.join(",")); continue; }
    if (typeof target.deviation === "number" && !overwrite) { skipped++; continue; }
    target.deviation = dev;
    entry.dirty = true;
    matched++;
  }

  for (const e of Object.values(cache)) {
    if (e.dirty) {
      writeFileSync(join(DATA_DIR, e.fileName), JSON.stringify(e.schools, null, 2) + "\n", "utf-8");
    }
  }

  console.log(`付与: ${matched} 校 / 既存スキップ: ${skipped} / 不一致: ${unmatched.length}`);
  if (unmatched.length) console.log("不一致例:", unmatched.slice(0, 15).join(" | "));
}

main();

/**
 * 大学偏差値マップ生成（bb-yobiko-bot から Coach v2 へ vendoring）。
 *
 * 出典: 河合塾 Kei-Net 2026（bb-yobiko-bot の hensachi バッチに収録）。
 * 入力: ~/Projects/bb-yobiko-bot/docs/brainstorm/round7/batches/hensachi-*.json
 *       構造 universities[大学名][学科名].deviation_value.standard（数値）
 * 突合: 大学名は完全一致、学部は正規化コア名の一意一致のみ採用（不一致は空欄、捏造しない）。
 * 出力: src/data/university-deviations.json
 *       { [uniId]: { min, max, source, faculties: { [facId]: number } } }
 *
 * 実行: node scripts/build-university-deviations.mjs
 * （bb-yobiko-bot はビルド時のみ参照。生成 JSON は Coach v2 にコミットし実行時依存なし）
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UNI_DIR = join(ROOT, "src", "data", "universities");
const BBBOT_BATCHES = join(homedir(), "Projects", "bb-yobiko-bot", "docs", "brainstorm", "round7", "batches");
const SOURCE = "河合塾 Kei-Net 2026";

/** 学部/学科名を照合用コア名に正規化（括弧書き・学部/学科/部 接尾を除去） */
function normFaculty(name) {
  return name
    .replace(/[（(].*?[）)]/g, "")
    .replace(/(学部|学群|学域|学類|学科|研究科|部)$/g, "")
    .trim();
}

/** bbbot 全 hensachi バッチを読み { 大学名: { 学科名: standard } } を構築 */
function loadBbbot() {
  const merged = {};
  for (const f of readdirSync(BBBOT_BATCHES).filter((x) => /^hensachi-.*\.json$/.test(x))) {
    const a = JSON.parse(readFileSync(join(BBBOT_BATCHES, f), "utf-8"));
    for (const [uni, depts] of Object.entries(a.universities || {})) {
      merged[uni] = merged[uni] || {};
      for (const [dn, dv] of Object.entries(depts)) {
        const s = dv?.deviation_value?.standard;
        if (typeof s === "number") merged[uni][dn] = s;
      }
    }
  }
  return merged;
}

/** Coach v2 全大学を読む */
function loadCoachUniversities() {
  const list = [];
  for (const f of readdirSync(UNI_DIR).filter((x) => x.endsWith(".json"))) {
    for (const u of JSON.parse(readFileSync(join(UNI_DIR, f), "utf-8"))) list.push(u);
  }
  return list;
}

function main() {
  const bbbot = loadBbbot();
  const universities = loadCoachUniversities();

  const out = {};
  let uniMatched = 0, facTotal = 0, facMatched = 0;
  const unmatchedUni = [];

  for (const u of universities) {
    const depts = bbbot[u.name];
    if (!depts) { unmatchedUni.push(u.name); continue; }

    // 大学レベル min/max は bbbot 全学科値から
    const allVals = Object.values(depts);
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);

    // bbbot 学科を正規化コア名でインデックス（重複は max）
    const coreToVal = new Map();
    for (const [dn, v] of Object.entries(depts)) {
      const k = normFaculty(dn);
      coreToVal.set(k, Math.max(coreToVal.get(k) ?? -Infinity, v));
    }
    // 自大学の Coach 学部側コア名重複検出（曖昧はスキップ）
    const coachCoreCount = new Map();
    for (const fac of u.faculties || []) {
      const k = normFaculty(fac.name);
      coachCoreCount.set(k, (coachCoreCount.get(k) ?? 0) + 1);
    }

    const faculties = {};
    for (const fac of u.faculties || []) {
      facTotal++;
      const k = normFaculty(fac.name);
      if (coachCoreCount.get(k) > 1) continue; // Coach 側で曖昧
      if (coreToVal.has(k)) { faculties[fac.id] = coreToVal.get(k); facMatched++; }
    }

    out[u.id] = { min, max, source: SOURCE, faculties };
    uniMatched++;
  }

  const dest = join(ROOT, "src", "data", "university-deviations.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf-8");

  console.log(`大学突合: ${uniMatched}/${universities.length}`);
  console.log(`学部突合: ${facMatched}/${facTotal}`);
  console.log(`未突合大学(例): ${unmatchedUni.slice(0, 20).join(" / ")}${unmatchedUni.length > 20 ? " …" : ""}`);
  console.log(`-> ${dest}`);
}

main();

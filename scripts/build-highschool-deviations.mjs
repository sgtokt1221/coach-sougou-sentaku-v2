/**
 * 高校マスタへ偏差値をマージする（近畿圏）。
 *
 * 出典: みんなの高校情報（minkou.jp）の府県別「偏差値ランキング」。
 * - 偏差値は学科/コースごとに別エントリで出るため、校レベルでは「最大値=代表値」に集約。
 * - 誤紐付け防止のため、府県内で正規化コア名が一意一致する場合のみ採用。
 *   名称不一致・曖昧（同名複数）・マスタ未掲載は未設定のまま（捏造しない）。
 *
 * 既存 src/data/highschools/{pref}.json を読み、`deviation` を追記して書き戻す。
 * 実行: node scripts/build-highschool-deviations.mjs
 *
 * 注意: base データ（build-highschools-data.mjs）を再生成した場合は本スクリプトを再実行すること。
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "data", "highschools");

const PREFECTURES = [
  { romaji: "osaka", prefecture: "大阪府", slug: "osaka" },
  { romaji: "kyoto", prefecture: "京都府", slug: "kyoto" },
  { romaji: "hyogo", prefecture: "兵庫県", slug: "hyogo" },
  { romaji: "nara", prefecture: "奈良県", slug: "nara" },
  { romaji: "shiga", prefecture: "滋賀県", slug: "shiga" },
  { romaji: "wakayama", prefecture: "和歌山県", slug: "wakayama" },
];

const PREF_NAMES = PREFECTURES.map((p) => p.prefecture);

/** 設置者・府県の接頭辞や注記を除去して照合用コア名にする */
function normalize(name) {
  let n = name.replace(/【.*?】/g, "").trim();
  // 「大阪府立 / 大阪市立 / ○○町立」等（{府県市町村}立 をまとめて）を接頭で除去
  n = n.replace(/^[一-鿿぀-ヿ々ヶ]+?[府県市町村]立/, "");
  // 残った設置者語・府県名（接頭）
  n = n.replace(/^(国立|私立|公立|組合立)/, "");
  for (const pn of PREF_NAMES) {
    if (n.startsWith(pn)) n = n.slice(pn.length);
  }
  return n.trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 1 ページ解析: [{ name, dev }] */
function parsePage(html) {
  const cards = html.split(/<li class="mod-listRanking-list">/).slice(1);
  const out = [];
  for (const c of cards) {
    const nm = c.match(/<a href="\/hischool\/school\/\d+\/">([^<]+)<\/a>/);
    const dev = c.match(/mod-listRanking-devi[\s\S]*?<dd[^>]*>\s*<a[^>]*>(\d{2})<\/a>/);
    if (nm && dev) out.push({ name: nm[1].trim(), dev: Number(dev[1]) });
  }
  return out;
}

/** 府県の偏差値マップ（正規化名 -> 代表値=最大）を minkou から構築 */
async function fetchDeviationMap(slug) {
  const map = new Map(); // normName -> maxDev
  const rawByName = new Map(); // normName -> Set(元名) 衝突検出用
  for (let page = 1; page <= 40; page++) {
    const url =
      page === 1
        ? `https://www.minkou.jp/hischool/ranking/deviation/pref=${slug}/`
        : `https://www.minkou.jp/hischool/ranking/deviation/pref=${slug}/page=${page}/`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) break;
    const html = await res.text();
    const rows = parsePage(html);
    if (rows.length === 0) break;
    for (const { name, dev } of rows) {
      const k = normalize(name);
      map.set(k, Math.max(map.get(k) ?? 0, dev));
      if (!rawByName.has(k)) rawByName.set(k, new Set());
      rawByName.get(k).add(name);
    }
    await sleep(300);
    if (rows.length < 20) break; // 最終ページ
  }
  return { map, rawByName };
}

async function main() {
  let grandMatched = 0;
  let grandTotal = 0;
  for (const pref of PREFECTURES) {
    const file = join(DATA_DIR, `${pref.romaji}.json`);
    const schools = JSON.parse(readFileSync(file, "utf-8"));

    // 自マスタ側: 正規化コア名 -> 件数（一意判定用）
    const coreCount = new Map();
    for (const s of schools) {
      const k = normalize(s.name);
      coreCount.set(k, (coreCount.get(k) ?? 0) + 1);
    }

    const { map } = await fetchDeviationMap(pref.slug);

    let matched = 0;
    let ambiguous = 0;
    for (const s of schools) {
      const k = normalize(s.name);
      if (coreCount.get(k) > 1) {
        ambiguous++;
        continue; // 自マスタ内で同名複数 -> 誤紐付け回避でスキップ
      }
      if (map.has(k)) {
        s.deviation = map.get(k);
        matched++;
      } else {
        delete s.deviation;
      }
    }

    writeFileSync(file, JSON.stringify(schools, null, 2) + "\n", "utf-8");
    console.log(
      `${pref.prefecture}: ${matched}/${schools.length} 校に偏差値付与 (minkou候補 ${map.size}, 自マスタ同名複数 ${ambiguous})`,
    );
    grandMatched += matched;
    grandTotal += schools.length;
  }
  console.log(`\n合計: ${grandMatched}/${grandTotal} 校に偏差値を付与`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

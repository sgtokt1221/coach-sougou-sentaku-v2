/**
 * 高校マスタ JSON ビルダー（近畿圏）。
 *
 * Wikipedia の都道府県別「○○府/県高等学校一覧」記事の wikitext を取得し、
 * 学校リンク（[[...高等学校]] 等）を漏れなく抽出して
 * `src/data/highschools/{romaji}.json` を生成する。
 *
 * kind（国立/公立/私立）は記事のトップレベル節見出しで判定する。
 * 一度コミットすれば id は固定される（採番は出現順）。
 *
 * 実行: node scripts/build-highschools-data.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data", "highschools");

/** 対象: 近畿圏 6 府県。page=Wikipedia記事名 / romaji=ファイル名・id接頭辞 */
const PREFECTURES = [
  { romaji: "osaka", prefecture: "大阪府", page: "大阪府高等学校一覧" },
  { romaji: "kyoto", prefecture: "京都府", page: "京都府高等学校一覧" },
  { romaji: "hyogo", prefecture: "兵庫県", page: "兵庫県高等学校一覧" },
  { romaji: "nara", prefecture: "奈良県", page: "奈良県高等学校一覧" },
  { romaji: "shiga", prefecture: "滋賀県", page: "滋賀県高等学校一覧" },
  { romaji: "wakayama", prefecture: "和歌山県", page: "和歌山県高等学校一覧" },
];

/** 学校名として採用する末尾パターン */
const SCHOOL_SUFFIX = /(高等学校|中等教育学校|高等専修学校|高校)$/;
/** 単独だと学校名にならない語（リンクの汎用語）を除外 */
const GENERIC = new Set(["高等学校", "中等教育学校", "高校", "高等専修学校"]);

/** wikitext を取得 */
async function fetchWikitext(page) {
  const url =
    "https://ja.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=" +
    encodeURIComponent(page);
  const res = await fetch(url, { headers: { "User-Agent": "coach-v2-highschool-seed/1.0" } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${page}`);
  const json = await res.json();
  const wt = json?.parse?.wikitext;
  if (!wt) throw new Error(`no wikitext for ${page}`);
  return wt;
}

/** 1 府県分の学校配列を抽出 */
function extractSchools(wt, { romaji, prefecture }) {
  const lines = wt.split("\n");
  let currentKind = null; // "national" | "public" | "private" | null
  const seen = new Set();
  const schools = [];

  for (const line of lines) {
    const header = line.match(/^={2,4}\s*(.+?)\s*={2,4}\s*$/);
    if (header) {
      const h = header[1];
      if (/国立/.test(h)) currentKind = "national";
      else if (/公立|府立|県立|市立|町立/.test(h)) currentKind = "public";
      else if (/私立/.test(h)) currentKind = "private";
      // 市区町村などのサブ見出しでは currentKind を維持
      continue;
    }
    const links = [...line.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map((m) => m[1].trim());
    for (const name of links) {
      if (name.includes(":")) continue; // Category: 等の名前空間
      if (!SCHOOL_SUFFIX.test(name)) continue;
      if (GENERIC.has(name)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      // kind を名前からも補正（節判定が漏れた場合の保険）
      let kind = currentKind;
      if (!kind) {
        if (/(府立|県立|市立|町立|組合立)/.test(name)) kind = "public";
        else kind = "private";
      }
      schools.push({
        id: `${romaji}-${String(schools.length + 1).padStart(4, "0")}`,
        name,
        prefecture,
        kind,
      });
    }
  }
  return schools;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  let grand = 0;
  for (const pref of PREFECTURES) {
    const wt = await fetchWikitext(pref.page);
    const schools = extractSchools(wt, pref);
    const file = join(OUT_DIR, `${pref.romaji}.json`);
    writeFileSync(file, JSON.stringify(schools, null, 2) + "\n", "utf-8");
    const byKind = schools.reduce((acc, s) => ((acc[s.kind] = (acc[s.kind] || 0) + 1), acc), {});
    console.log(
      `${pref.prefecture}: ${schools.length} 校  (${JSON.stringify(byKind)})  -> ${file}`,
    );
    grand += schools.length;
  }
  console.log(`合計: ${grand} 校`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

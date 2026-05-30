// private.json の id:"-u" を名前ベースで一意なスラッグに付け替える一回限りスクリプト。
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "../src/data/universities/private.json");

const ID_BY_NAME = {
  "一宮研伸大学": "ichinomiya-kenshin-u",
  "人間環境大学": "ningen-kankyo-u",
  "修文大学": "shubun-u",
  "兵庫医科大学": "hyogo-med-u",
  "同朋大学": "doho-u",
  "名古屋商科大学": "nagoya-shoka-u",
  "名古屋国際工科専門職大学": "nagoya-kokusai-kouka-u",
  "名古屋外国語大学": "nagoya-gaigo-u",
  "名古屋学芸大学": "nagoya-gakugei-u",
  "名古屋学院大学": "nagoya-gakuin-u",
  "名古屋文理大学": "nagoya-bunri-u",
  "名古屋産業大学": "nagoya-sangyo-u",
  "名古屋経済大学": "nagoya-keizai-u",
  "名古屋芸術大学": "nagoya-geijutsu-u",
  "名古屋葵大学": "nagoya-aoi-u",
  "名古屋造形大学": "nagoya-zokei-u",
  "名古屋音楽大学": "nagoya-ongaku-u",
  "埼玉医科大学": "saitama-med-u",
  "大同大学": "daido-u",
  "岡崎女子大学": "okazaki-women-u",
  "愛知みずほ大学": "aichi-mizuho-u",
  "愛知医療学院大学": "aichi-iryo-gakuin-u",
  "愛知医科大学": "aichi-med-u",
  "愛知学泉大学": "aichi-gakusen-u",
  "愛知工科大学": "aichi-koka-u",
  "愛知文教大学": "aichi-bunkyo-u",
  "愛知東邦大学": "aichi-toho-u",
  "愛知産業大学": "aichi-sangyo-u",
  "日本医科大学": "nippon-med-u",
  "日本福祉大学": "nihon-fukushi-u",
  "日本赤十字豊田看護大学": "nisseki-toyota-nursing-u",
  "星城大学": "seijoh-u",
  "昭和医科大学": "showa-med-u",
  "東京医科大学": "tokyo-med-u",
  "東京女子医科大学": "tokyo-women-med-u",
  "東京慈恵会医科大学": "jikei-med-u",
  "東海学園大学": "tokai-gakuen-u",
  "東邦大学": "toho-u",
  "桜花学園大学": "ohka-gakuen-u",
  "椙山女学園大学": "sugiyama-jogakuen-u",
  "至学館大学": "shigakkan-u",
  "豊橋創造大学": "toyohashi-sozo-u",
  "豊田工業大学": "toyota-tech-u",
  "関西医科大学": "kansai-med-u",
};

const arr = JSON.parse(readFileSync(FILE, "utf-8"));
const missing = [];
const fixed = [];
const seen = new Set(arr.map((u) => u.id).filter((id) => id && id !== "-u"));
for (const u of arr) {
  if (u.id && u.id !== "-u") continue;
  const newId = ID_BY_NAME[u.name];
  if (!newId) { missing.push(u.name); continue; }
  if (seen.has(newId)) { console.error("DUP id:", newId, u.name); process.exit(1); }
  seen.add(newId);
  u.id = newId;
  fixed.push(`${u.name} -> ${newId}`);
}
writeFileSync(FILE, JSON.stringify(arr, null, 2) + "\n", "utf-8");
console.log(`fixed: ${fixed.length}`);
fixed.forEach((f) => console.log("  " + f));
if (missing.length) { console.log("MISSING:", missing); process.exit(1); }

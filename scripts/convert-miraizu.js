/**
 * miraizu-suisen.com のデータを既存の大学JSONフォーマットに変換するスクリプト
 *
 * 使い方: node scripts/convert-miraizu.js
 */

const fs = require("fs");
const path = require("path");

const RAW_DIR = path.join(__dirname, "../data/miraizu-raw");
const OUT_DIR = path.join(__dirname, "../src/data/universities");

// --- グループ分類マッピング ---
const GROUP_MAP = {
  // 旧帝大
  "東京大学": "kyutei",
  "京都大学": "kyutei",
  "北海道大学": "kyutei",
  "東北大学": "kyutei",
  "名古屋大学": "kyutei",
  "大阪大学": "kyutei",
  "九州大学": "kyutei",
  // 早慶上智
  "早稲田大学": "soukeijochi",
  "慶應義塾大学": "soukeijochi",
  "上智大学": "soukeijochi",
  // MARCH
  "明治大学": "march",
  "青山学院大学": "march",
  "立教大学": "march",
  "中央大学": "march",
  "法政大学": "march",
  // 関関同立
  "同志社大学": "kankandouritsu",
  "関西学院大学": "kankandouritsu",
  "関西大学": "kankandouritsu",
  "立命館大学": "kankandouritsu",
  // 産近甲龍
  "京都産業大学": "sankinkohryu",
  "近畿大学": "sankinkohryu",
  "甲南大学": "sankinkohryu",
  "龍谷大学": "sankinkohryu",
  // 日東駒専
  "日本大学": "nittoukomasen",
  "東洋大学": "nittoukomasen",
  "駒澤大学": "nittoukomasen",
  "専修大学": "nittoukomasen",
  // 成成明獨國武
  "成城大学": "seiseimeidoku",
  "成蹊大学": "seiseimeidoku",
  "明治学院大学": "seiseimeidoku",
  "獨協大学": "seiseimeidoku",
  "國學院大學": "seiseimeidoku",
  "武蔵大学": "seiseimeidoku",
};

// --- 略称マッピング ---
const SHORT_NAME_MAP = {
  "東京大学": "東大", "京都大学": "京大", "北海道大学": "北大",
  "東北大学": "東北大", "名古屋大学": "名大", "大阪大学": "阪大",
  "九州大学": "九大", "早稲田大学": "早稲田", "慶應義塾大学": "慶應",
  "上智大学": "上智", "明治大学": "明治", "青山学院大学": "青学",
  "立教大学": "立教", "中央大学": "中央", "法政大学": "法政",
  "同志社大学": "同志社", "関西学院大学": "関学", "関西大学": "関大",
  "立命館大学": "立命館", "京都産業大学": "京産", "近畿大学": "近大",
  "甲南大学": "甲南", "龍谷大学": "龍谷",
  "日本大学": "日大", "東洋大学": "東洋", "駒澤大学": "駒澤", "専修大学": "専修",
  "成城大学": "成城", "成蹊大学": "成蹊", "明治学院大学": "明学",
  "獨協大学": "獨協", "國學院大學": "國學院", "武蔵大学": "武蔵",
  "筑波大学": "筑波", "千葉大学": "千葉大", "横浜国立大学": "横国",
  "東京外国語大学": "東外大", "東京学芸大学": "学芸大",
  "東京農工大学": "農工大", "東京海洋大学": "海洋大",
  "電気通信大学": "電通大", "お茶の水女子大学": "お茶大",
  "埼玉大学": "埼大", "新潟大学": "新大", "静岡大学": "静大",
  "岐阜大学": "岐大", "広島大学": "広大", "岡山大学": "岡大",
  "熊本大学": "熊大", "長崎大学": "長大", "鹿児島大学": "鹿大",
  "大分大学": "大分大", "佐賀大学": "佐賀大",
  "国際教養大学": "AIU", "国際基督教大学": "ICU",
  "東京都立大学": "都立大", "大阪公立大学": "大阪公立",
  "名古屋市立大学": "名市大", "横浜市立大学": "横市",
  "東京理科大学": "理科大", "学習院大学": "学習院",
  "帝京大学": "帝京", "東海大学": "東海",
  "武蔵野大学": "武蔵野", "玉川大学": "玉川",
  "神奈川大学": "神大", "福岡大学": "福大",
  "西南学院大学": "西南", "南山大学": "南山",
  "中京大学": "中京", "名城大学": "名城",
  "愛知大学": "愛大", "愛知学院大学": "愛学",
  "愛知淑徳大学": "愛淑", "金城学院大学": "金城",
  "日本女子大学": "日女", "東京女子大学": "東女",
  "津田塾大学": "津田塾", "順天堂大学": "順天堂",
};

// --- 公式URLマッピング（主要校のみ） ---
const URL_MAP = {
  "東京大学": "https://www.u-tokyo.ac.jp/",
  "京都大学": "https://www.kyoto-u.ac.jp/",
  "北海道大学": "https://www.hokudai.ac.jp/",
  "東北大学": "https://www.tohoku.ac.jp/",
  "名古屋大学": "https://www.nagoya-u.ac.jp/",
  "大阪大学": "https://www.osaka-u.ac.jp/",
  "九州大学": "https://www.kyushu-u.ac.jp/",
  "早稲田大学": "https://www.waseda.jp/",
  "慶應義塾大学": "https://www.keio.ac.jp/",
  "上智大学": "https://www.sophia.ac.jp/",
  "明治大学": "https://www.meiji.ac.jp/",
  "青山学院大学": "https://www.aoyama.ac.jp/",
  "立教大学": "https://www.rikkyo.ac.jp/",
  "中央大学": "https://www.chuo-u.ac.jp/",
  "法政大学": "https://www.hosei.ac.jp/",
  "同志社大学": "https://www.doshisha.ac.jp/",
  "関西学院大学": "https://www.kwansei.ac.jp/",
  "関西大学": "https://www.kansai-u.ac.jp/",
  "立命館大学": "https://www.ritsumei.ac.jp/",
  "京都産業大学": "https://www.kyoto-su.ac.jp/",
  "近畿大学": "https://www.kindai.ac.jp/",
  "甲南大学": "https://www.konan-u.ac.jp/",
  "龍谷大学": "https://www.ryukoku.ac.jp/",
};

function determineGroup(name, category) {
  if (GROUP_MAP[name]) return GROUP_MAP[name];
  if (category === "国立") return "national";
  if (category === "公立") return "public";
  return "private";
}

function nameToId(name) {
  // 大学名からkebab-case IDを生成
  const map = {
    "東京大学": "tokyo-u", "京都大学": "kyoto-u", "北海道大学": "hokkaido-u",
    "東北大学": "tohoku-u", "名古屋大学": "nagoya-u", "大阪大学": "osaka-u",
    "九州大学": "kyushu-u", "早稲田大学": "waseda-u", "慶應義塾大学": "keio-u",
    "上智大学": "sophia-u", "明治大学": "meiji-u", "青山学院大学": "aoyama-u",
    "立教大学": "rikkyo-u", "中央大学": "chuo-u", "法政大学": "hosei-u",
    "同志社大学": "doshisha-u", "関西学院大学": "kwansei-u", "関西大学": "kansai-u",
    "立命館大学": "ritsumeikan-u", "京都産業大学": "kyoto-sangyo-u",
    "近畿大学": "kindai-u", "甲南大学": "konan-u", "龍谷大学": "ryukoku-u",
    "日本大学": "nihon-u", "東洋大学": "toyo-u", "駒澤大学": "komazawa-u",
    "専修大学": "senshu-u", "成城大学": "seijo-u", "成蹊大学": "seikei-u",
    "明治学院大学": "meigaku-u", "獨協大学": "dokkyo-u",
    "國學院大學": "kokugakuin-u", "武蔵大学": "musashi-u",
    "筑波大学": "tsukuba-u", "千葉大学": "chiba-u",
    "横浜国立大学": "yokohama-national-u", "東京外国語大学": "tufs-u",
    "東京学芸大学": "gakugei-u", "東京農工大学": "tuat-u",
    "東京海洋大学": "tumsat-u", "電気通信大学": "uec-u",
    "お茶の水女子大学": "ochanomizu-u", "埼玉大学": "saitama-u",
    "新潟大学": "niigata-u", "静岡大学": "shizuoka-u",
    "岐阜大学": "gifu-u", "広島大学": "hiroshima-u",
    "岡山大学": "okayama-u", "熊本大学": "kumamoto-u",
    "長崎大学": "nagasaki-u", "鹿児島大学": "kagoshima-u",
    "大分大学": "oita-u", "佐賀大学": "saga-u",
    "宇都宮大学": "utsunomiya-u", "群馬大学": "gunma-u",
    "茨城大学": "ibaraki-u", "福岡教育大学": "fukuoka-edu-u",
    "北海道教育大学": "hokkaido-edu-u", "愛知教育大学": "aichi-edu-u",
    "九州工業大学": "kyutech-u", "北見工業大学": "kitami-u",
    "室蘭工業大学": "muroran-u", "小樽商科大学": "otaru-u",
    "帯広畜産大学": "obihiro-u", "旭川医科大学": "asahikawa-med-u",
    "豊橋技術科学大学": "tut-u", "鹿屋体育大学": "nifs-u",
    "国際教養大学": "aiu", "国際基督教大学": "icu",
    "東京都立大学": "tmu", "大阪公立大学": "omu",
    "名古屋市立大学": "nagoya-cu", "横浜市立大学": "yokohama-cu",
    "愛知県立大学": "aichi-pu", "愛知県立芸術大学": "aichi-fam-u",
    "名古屋工業大学": "nitech-u", "札幌医科大学": "sapmed-u",
    "札幌市立大学": "scu", "公立はこだて未来大学": "fun-u",
    "公立千歳科学技術大学": "chitose-u", "名寄市立大学": "nayoro-u",
    "旭川市立大学": "asahikawa-cu", "釧路公立大学": "kushiro-pu",
    "東京理科大学": "tus-u", "学習院大学": "gakushuin-u",
    "帝京大学": "teikyo-u", "東海大学": "tokai-u",
    "武蔵野大学": "musashino-u", "玉川大学": "tamagawa-u",
    "日本女子大学": "jwu", "東京女子大学": "twcu",
    "津田塾大学": "tsuda-u", "清泉女子大学": "seisen-u",
    "白百合女子大学": "shirayuri-u", "聖心女子大学": "u-sacred-heart",
    "藤女子大学": "fuji-wu", "順天堂大学": "juntendo-u",
    "神奈川大学": "kanagawa-u", "福岡大学": "fukuoka-u",
    "西南学院大学": "seinan-u", "南山大学": "nanzan-u",
    "中京大学": "chukyo-u", "名城大学": "meijo-u",
    "愛知大学": "aichi-u", "愛知学院大学": "agu",
    "愛知淑徳大学": "aasa-u", "金城学院大学": "kinjo-u",
    "北星学園大学": "hokusei-u", "北海学園大学": "hokkai-u",
    "札幌大学": "sapporo-u", "札幌学院大学": "sgu",
    "函館大学": "hakodate-u", "藤田医科大学": "fujita-hu",
    "中部大学": "chubu-u", "愛知工業大学": "aitech-u",
  };
  if (map[name]) return map[name];
  // 不明な大学はコードから生成
  return name.replace(/大学$/, "").replace(/[^\w]/g, "") + "-u";
}

function facultyNameToId(name) {
  let result = name
    .replace(/学部$/, "")
    .replace(/学群$/, "")
    .replace(/学院$/, "")
    .replace(/研究科$/, "");

  // 日本語をローマ字に置換（長い語を先にマッチ）
  const romaji = [
    ["グローバル・コミュニケーション", "global-comm"],
    ["コミュニティ福祉", "community-welfare"],
    ["グローバル教養", "global-liberal-arts"],
    ["グローバル", "global"],
    ["コミュニティ", "community"],
    ["スポーツ科学", "sports-science"],
    ["スポーツ健康科学", "sports-health"],
    ["スポーツ", "sports"],
    ["デザイン工", "design-eng"],
    ["デザイン", "design"],
    ["キャリアデザイン", "career-design"],
    ["キャリア", "career"],
    ["データサイエンス", "data-science"],
    ["マネジメント", "management"],
    ["ビジネス", "business"],
    ["リベラルアーツ", "liberal-arts"],
    ["現代福祉", "modern-welfare"],
    ["生命環境", "life-environment"],
    ["生命科学", "life-science"],
    ["生命理工", "life-science-eng"],
    ["生命医科学", "life-medical"],
    ["先進理工", "advanced-science-eng"],
    ["基幹理工", "fundamental-science-eng"],
    ["創造理工", "creative-science-eng"],
    ["理工", "science-eng"],
    ["都市環境", "urban-environment"],
    ["社会環境工", "social-environment-eng"],
    ["環境情報", "environment-info"],
    ["総合政策", "policy"],
    ["総合人間科学", "human-science"],
    ["総合科学", "general-science"],
    ["総合社会", "general-social"],
    ["総合心理", "general-psychology"],
    ["総合情報", "general-info"],
    ["総合数理", "math-science"],
    ["総合文化政策", "cultural-policy"],
    ["総合", "general"],
    ["人間環境", "human-environment"],
    ["人間科学", "human-science"],
    ["人間社会", "human-social"],
    ["人間福祉", "human-welfare"],
    ["人間健康", "human-health"],
    ["人間", "human"],
    ["国際関係", "international-relations"],
    ["国際政治経済", "international-political-economy"],
    ["国際教養", "international-liberal-arts"],
    ["国際社会科学", "international-social-science"],
    ["国際日本", "international-japan"],
    ["国際文化", "international-culture"],
    ["国際コミュニケーション", "international-comm"],
    ["国際", "international"],
    ["政治経済", "political-economy"],
    ["政策科学", "policy-science"],
    ["政策創造", "policy-creation"],
    ["経済経営", "economics-business"],
    ["経済", "economics"],
    ["経営", "business"],
    ["情報理工", "info-science-eng"],
    ["情報科学", "info-science"],
    ["情報工", "info-eng"],
    ["情報コミュニケーション", "info-comm"],
    ["情報連携", "info-networking"],
    ["情報", "information"],
    ["地域創造", "regional-creation"],
    ["地域", "regional"],
    ["社会科学", "social-science"],
    ["社会安全", "social-safety"],
    ["社会情報", "social-info"],
    ["社会福祉", "social-welfare"],
    ["社会", "social"],
    ["教育人間科学", "education-human"],
    ["教育", "education"],
    ["文化構想", "culture-media"],
    ["文芸", "literary-arts"],
    ["文", "letters"],
    ["外国語", "foreign-languages"],
    ["法", "law"],
    ["商", "commerce"],
    ["医", "medicine"],
    ["薬", "pharmacy"],
    ["歯", "dentistry"],
    ["看護", "nursing"],
    ["農", "agriculture"],
    ["工", "engineering"],
    ["理", "science"],
    ["心理", "psychology"],
    ["福祉", "welfare"],
    ["芸術", "arts"],
    ["音楽", "music"],
    ["体育", "sports"],
    ["建築", "architecture"],
    ["観光", "tourism"],
    ["食", "food"],
    ["栄養", "nutrition"],
    ["神学", "theology"],
    ["仏教", "buddhism"],
  ];

  for (const [jp, en] of romaji) {
    result = result.replace(new RegExp(jp, "g"), en);
  }

  result = result
    .replace(/[・\s]/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return result || "general";
}

function parseSelectionMethods(admission) {
  const methods = [];
  let stage = 1;

  // 書類審査は基本的に全てにある
  if (admission.required_documents) {
    methods.push({
      stage: stage++,
      type: "documents",
      details: admission.required_documents.replace(/\n/g, "、").replace(/・/g, "").trim(),
    });
  }

  // 二次試験内容を解析
  const details = admission.secondary_exam_details || "";
  if (details) {
    const lines = details.split("\n").map(l => l.replace(/^・/, "").trim()).filter(Boolean);
    for (const line of lines) {
      let type = "other";
      if (/小論文|作文|論述/.test(line)) type = "essay";
      else if (/面接|口頭/.test(line)) type = "interview";
      else if (/プレゼン|発表/.test(line)) type = "presentation";
      else if (/試験|テスト|筆記|学力/.test(line)) type = "test";
      else if (/書類|調査書|志望理由/.test(line)) type = "documents";

      methods.push({ stage: stage++, type, details: line });
    }
  }

  // methods が空の場合のフォールバック
  if (methods.length === 0) {
    methods.push({ stage: 1, type: "documents", details: "書類審査" });
  }

  return methods;
}

function parseEnglishCert(admission) {
  const parts = [];
  if (admission.eiken_level) parts.push(`英検${admission.eiken_level}`);
  if (admission.eiken_cse) parts.push(`英検CSE ${admission.eiken_cse}以上`);
  if (admission.toefl_score) parts.push(`TOEFL iBT ${admission.toefl_score}以上`);
  if (admission.ielts_score) parts.push(`IELTS ${admission.ielts_score}以上`);
  if (admission.gtec_score) parts.push(`GTEC ${admission.gtec_score}以上`);
  return parts.length > 0 ? parts.join(" / ") : null;
}

function parseSchedule(admission) {
  const deadline = admission.application_deadline || "";
  // YYYY/MM/DD → YYYY-MM-DD
  const appEnd = deadline.replace(/\//g, "-") || "2025-09-30";

  // 出願開始は出願締切の2週間前と推定
  const endDate = new Date(appEnd.replace(/-/g, "/"));
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 14);
  const appStart = isNaN(startDate.getTime()) ? "2025-09-01" :
    `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;

  // 試験日は出願締切の3-4週間後と推定
  const examDate = new Date(endDate);
  examDate.setDate(examDate.getDate() + 25);
  const exam = isNaN(examDate.getTime()) ? "2025-11-01" :
    `${examDate.getFullYear()}-${String(examDate.getMonth() + 1).padStart(2, "0")}-${String(examDate.getDate()).padStart(2, "0")}`;

  // 結果発表は試験日の2-3週間後と推定
  const resultDate = new Date(examDate);
  resultDate.setDate(resultDate.getDate() + 18);
  const result = isNaN(resultDate.getTime()) ? "2025-12-01" :
    `${resultDate.getFullYear()}-${String(resultDate.getMonth() + 1).padStart(2, "0")}-${String(resultDate.getDate()).padStart(2, "0")}`;

  return {
    applicationStart: appStart,
    applicationEnd: appEnd || "2025-09-30",
    examDate: exam,
    resultDate: result,
  };
}

function buildOtherReqs(admission) {
  const reqs = [];
  if (admission.requirements) reqs.push(admission.requirements);
  if (admission.is_concurrent_application) {
    reqs.push(admission.is_concurrent_application === "専願" ? "専願" : `併願可（${admission.concurrent_info || ""}）`.trim());
  }
  if (admission.gpa_info) reqs.push(admission.gpa_info);
  return reqs;
}

function convertUniversity(miraizuUni) {
  const name = miraizuUni.university_name;
  const category = miraizuUni.university_category;
  const group = determineGroup(name, category);
  const id = nameToId(name);
  const shortName = SHORT_NAME_MAP[name] || name.replace(/大学$/, "");
  const officialUrl = URL_MAP[name] || "";

  // 学部ごとに総合型選抜データを優先して変換
  const faculties = [];
  const seenFaculties = new Set();

  for (const fac of miraizuUni.faculties) {
    const facName = fac.faculty_name;
    if (!facName || seenFaculties.has(facName)) continue;
    seenFaculties.add(facName);

    // 総合型選抜 → 学校推薦型選抜 → その他の優先度で選択
    const souAdmissions = fac.admissions.filter(a => a.name.includes("総合型"));
    const suiAdmissions = fac.admissions.filter(a => a.name.includes("推薦"));
    const primaryAdmissions = souAdmissions.length > 0 ? souAdmissions :
      suiAdmissions.length > 0 ? suiAdmissions : fac.admissions;

    if (primaryAdmissions.length === 0) continue;

    // メインの入試方式を選択（最もデータが充実しているもの）
    const primary = primaryAdmissions.reduce((best, curr) => {
      const score = (curr.secondary_exam_details ? 3 : 0) +
        (curr.required_documents ? 2 : 0) +
        (curr.required_gpa ? 1 : 0) +
        (curr.eiken_level || curr.toefl_score ? 1 : 0);
      const bestScore = (best.secondary_exam_details ? 3 : 0) +
        (best.required_documents ? 2 : 0) +
        (best.required_gpa ? 1 : 0) +
        (best.eiken_level || best.toefl_score ? 1 : 0);
      return score > bestScore ? curr : best;
    }, primaryAdmissions[0]);

    // 募集人数を解析
    const totalCapacity = primaryAdmissions.reduce((sum, a) => {
      if (!a.capacity) return sum;
      if (typeof a.capacity === "number") return sum + a.capacity;
      const str = String(a.capacity);
      // テキストから数値抽出（"推薦：35" など）
      const match = str.match(/推薦[：:]\s*(\d+)/);
      if (match) return sum + parseInt(match[1], 10);
      // "一般：570" のような最初の数値
      const numMatch = str.match(/(\d+)/);
      if (numMatch && parseInt(numMatch[1], 10) > 0) return sum + parseInt(numMatch[1], 10);
      return sum;
    }, 0);

    let facId = facultyNameToId(facName);
    // 重複ID回避
    const existingIds = faculties.map(f => f.id);
    if (existingIds.includes(facId)) {
      let suffix = 2;
      while (existingIds.includes(`${facId}-${suffix}`)) suffix++;
      facId = `${facId}-${suffix}`;
    }

    faculties.push({
      id: facId || `fac-${faculties.length}`,
      name: facName,
      admissionPolicy: (fac.admission_policy || "").trim(),
      capacity: totalCapacity > 0 ? totalCapacity : (primary.capacity && typeof primary.capacity === "number" ? primary.capacity : 5),
      requirements: {
        gpa: primary.required_gpa || null,
        englishCert: parseEnglishCert(primary),
        otherReqs: buildOtherReqs(primary),
      },
      selectionMethods: parseSelectionMethods(primary),
      schedule: parseSchedule(primary),
    });
  }

  if (faculties.length === 0) return null;

  return { id, name, shortName, group, officialUrl, faculties };
}

// --- メイン処理 ---
function main() {
  const combined = JSON.parse(
    fs.readFileSync(path.join(RAW_DIR, "combined_all.json"), "utf-8")
  );

  console.log(`Processing ${combined.length} universities...`);

  // グループごとに分類
  const groups = {};
  let totalUnis = 0;
  let totalFacs = 0;
  let skipped = 0;

  for (const mUni of combined) {
    const converted = convertUniversity(mUni);
    if (!converted) {
      skipped++;
      continue;
    }

    const group = converted.group;
    if (!groups[group]) groups[group] = [];
    groups[group].push(converted);
    totalUnis++;
    totalFacs += converted.faculties.length;
  }

  // JSON ファイルに出力
  for (const [group, universities] of Object.entries(groups)) {
    const filePath = path.join(OUT_DIR, `${group}.json`);

    // 既存ファイルがある場合は上書き
    fs.writeFileSync(filePath, JSON.stringify(universities, null, 2), "utf-8");
    console.log(`  ${group}.json: ${universities.length} universities, ${universities.reduce((s, u) => s + u.faculties.length, 0)} faculties`);
  }

  console.log(`\nDone: ${totalUnis} universities, ${totalFacs} faculties converted.`);
  console.log(`Skipped: ${skipped} universities (no valid faculty data)`);
  console.log(`Output groups: ${Object.keys(groups).join(", ")}`);
}

main();

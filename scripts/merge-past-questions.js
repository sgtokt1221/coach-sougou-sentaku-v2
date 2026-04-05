/**
 * 調査結果の過去問データを抽出し、既存essay-past-questions.tsに統合する
 * node scripts/merge-past-questions.js
 */
const fs = require("fs");
const path = require("path");

const RESEARCH_DIR = path.join(__dirname, "../data/research");
const TARGET = path.join(__dirname, "../src/data/essay-past-questions.ts");

// 調査ファイルからPastQuestionオブジェクトを抽出
function extractEntries(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const entries = [];

  // 各行をスキャンして { id: "..." で始まるオブジェクトを手動抽出
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes('id:')) continue;
    if (trimmed.includes("`")) continue; // バックティック文字列はスキップ

    const idMatch = trimmed.match(/id:\s*"([^"]+)"/);
    const uniIdMatch = trimmed.match(/universityId:\s*"([^"]+)"/);
    const uniNameMatch = trimmed.match(/universityName:\s*"([^"]+)"/);
    const facNameMatch = trimmed.match(/facultyName:\s*"([^"]+)"/);
    const yearMatch = trimmed.match(/year:\s*(\d+)/);
    const themeMatch = trimmed.match(/theme:\s*"((?:[^"\\]|\\.)*)"/);
    const descMatch = trimmed.match(/description:\s*"((?:[^"\\]|\\.)*)"/);
    const typeMatch = trimmed.match(/type:\s*"([^"]+)"/);
    const wordMatch = trimmed.match(/wordLimit:\s*(\d+)/);
    const timeMatch = trimmed.match(/timeLimit:\s*(\d+)/);
    const fieldMatch = trimmed.match(/field:\s*"([^"]+)"/);

    if (idMatch && uniIdMatch && themeMatch) {
      entries.push({
        id: idMatch[1],
        universityId: uniIdMatch[1],
        universityName: uniNameMatch ? uniNameMatch[1] : "",
        facultyName: facNameMatch ? facNameMatch[1] : "",
        year: yearMatch ? parseInt(yearMatch[1]) : 2024,
        theme: themeMatch[1],
        description: descMatch ? descMatch[1] : "",
        type: typeMatch ? typeMatch[1] : "past",
        wordLimit: wordMatch ? parseInt(wordMatch[1]) : null,
        timeLimit: timeMatch ? parseInt(timeMatch[1]) : null,
        field: fieldMatch ? fieldMatch[1] : "総合",
      });
    }
  }

  // 複数行にまたがるエントリも処理
  const multiLineRegex = /\{\s*id:\s*"([^"]+)"[\s\S]*?field:\s*"([^"]+)"\s*\}/g;
  let match;
  const seenIds = new Set(entries.map(e => e.id));

  while ((match = multiLineRegex.exec(content)) !== null) {
    const block = match[0];
    if (block.includes("`")) continue;

    const idMatch = block.match(/id:\s*"([^"]+)"/);
    if (!idMatch || seenIds.has(idMatch[1])) continue;

    const uniIdMatch = block.match(/universityId:\s*"([^"]+)"/);
    const uniNameMatch = block.match(/universityName:\s*"([^"]+)"/);
    const facNameMatch = block.match(/facultyName:\s*"([^"]+)"/);
    const yearMatch = block.match(/year:\s*(\d+)/);
    const themeMatch = block.match(/theme:\s*"((?:[^"\\]|\\.)*)"/);
    const descMatch = block.match(/description:\s*"((?:[^"\\]|\\.)*)"/);
    const typeMatch = block.match(/type:\s*"([^"]+)"/);
    const wordMatch = block.match(/wordLimit:\s*(\d+)/);
    const timeMatch = block.match(/timeLimit:\s*(\d+)/);
    const fieldMatch = block.match(/field:\s*"([^"]+)"/);

    if (idMatch && uniIdMatch && themeMatch) {
      seenIds.add(idMatch[1]);
      entries.push({
        id: idMatch[1],
        universityId: uniIdMatch[1],
        universityName: uniNameMatch ? uniNameMatch[1] : "",
        facultyName: facNameMatch ? facNameMatch[1] : "",
        year: yearMatch ? parseInt(yearMatch[1]) : 2024,
        theme: themeMatch[1],
        description: descMatch ? descMatch[1] : "",
        type: typeMatch ? typeMatch[1] : "past",
        wordLimit: wordMatch ? parseInt(wordMatch[1]) : null,
        timeLimit: timeMatch ? parseInt(timeMatch[1]) : null,
        field: fieldMatch ? fieldMatch[1] : "総合",
      });
    }
  }

  return entries;
}

// 既存ファイルから既存IDを抽出
function getExistingIds() {
  const content = fs.readFileSync(TARGET, "utf-8");
  const ids = new Set();
  const regex = /id:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

// フィールド名の標準化
function normalizeField(field) {
  const map = {
    "法学": "法律", "商学・ビジネス": "経済", "経営学": "経済",
    "社会学・教育": "社会", "社会安全学": "社会", "政策学": "社会",
    "国際関係": "国際", "国際・コミュニケーション": "国際",
    "心理学": "社会", "神学・宗教学": "文化", "歴史学": "文化",
    "人文学": "文化", "文学・芸術": "文化", "芸術": "文化",
    "情報学": "科学", "医学": "医療", "福祉学": "社会",
    "スポーツ・健康科学": "スポーツ", "社会学": "社会",
    "AI・テクノロジー": "科学", "商学": "経済",
  };
  return map[field] || field;
}

// TypeScript行を生成
function toTsLine(entry) {
  const parts = [
    'id: "' + entry.id + '"',
    'universityId: "' + entry.universityId + '"',
    'universityName: "' + entry.universityName + '"',
    'facultyName: "' + entry.facultyName + '"',
    "year: " + entry.year,
    'theme: "' + entry.theme.replace(/"/g, '\\"') + '"',
    'description: "' + entry.description.replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"',
    'type: "' + entry.type + '"',
  ];

  if (entry.wordLimit) parts.push("wordLimit: " + entry.wordLimit);
  if (entry.timeLimit) parts.push("timeLimit: " + entry.timeLimit);
  parts.push('field: "' + normalizeField(entry.field) + '"');

  return "  { " + parts.join(", ") + " },";
}

// メイン処理
function main() {
  const files = [
    "kyutei-past-questions.txt",
    "soukei-march-past-questions.txt",
    "kansai-nittou-past-questions.txt",
  ];

  const existingIds = getExistingIds();
  console.log("Existing entries: " + existingIds.size);

  const allNew = [];

  for (const file of files) {
    const filePath = path.join(RESEARCH_DIR, file);
    const entries = extractEntries(filePath);
    console.log(file + ": " + entries.length + " entries extracted");

    // 重複排除
    const unique = entries.filter(function(e) { return !existingIds.has(e.id); });
    console.log("  -> " + unique.length + " new (" + (entries.length - unique.length) + " duplicates)");

    for (const e of unique) {
      allNew.push(e);
      existingIds.add(e.id);
    }
  }

  console.log("\nTotal new entries: " + allNew.length);

  // グループ分け
  const groups = {};
  for (const entry of allNew) {
    const uni = entry.universityName;
    if (!groups[uni]) groups[uni] = [];
    groups[uni].push(entry);
  }

  // TypeScript行を生成
  const tsLines = [];
  const sortedUnis = Object.keys(groups).sort();
  for (const uniName of sortedUnis) {
    tsLines.push("\n  // ===== " + uniName + " =====");
    for (const entry of groups[uniName]) {
      tsLines.push(toTsLine(entry));
    }
  }

  // 既存ファイルに挿入（PAST_QUESTIONS配列の];の直前に追加）
  const content = fs.readFileSync(TARGET, "utf-8");
  // PAST_QUESTIONS配列の終端を探す（最初の ];）
  const insertPoint = content.indexOf("\n];\n");

  if (insertPoint === -1) {
    console.error("Could not find insertion point ];");
    process.exitCode = 1;
    return;
  }

  const newContent =
    content.slice(0, insertPoint) +
    "\n  // ============================================================\n" +
    "  // 以下、2026-04-06 miraizu-suisen.com 調査データ追加分\n" +
    "  // ============================================================\n" +
    tsLines.join("\n") + "\n" +
    content.slice(insertPoint);

  fs.writeFileSync(TARGET, newContent, "utf-8");

  console.log("\nInserted " + allNew.length + " entries into essay-past-questions.ts");
  console.log("Universities covered: " + sortedUnis.length);
}

main();

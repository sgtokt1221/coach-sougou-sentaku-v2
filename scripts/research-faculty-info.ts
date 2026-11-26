/**
 * 学部の公式サイトを調べる処理の試し実行（実APIを呼ぶ。Firestore には触らない）。
 *
 *   npx tsx --env-file=.env.local scripts/research-faculty-info.ts --faculty=kansai-u:law,kindai-u:nursing
 *
 * 出力: .claude/hillclimb/faculty-info/<universityId>__<facultyId>.json
 * 1学部ごとに、検索回数・トークン・概算ドル・残った件数・捨てた件数と理由を出す。
 */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { facultyInfoDocId, registrableDomain, quoteInPage } from "@/lib/universities/faculty-info";
import { researchFaculty } from "@/lib/universities/faculty-info-research";

// 部品の確認（AI を呼ばない）
assert.equal(registrableDomain("https://www.nyusi.kansai-u.ac.jp/admission/ao/"), "kansai-u.ac.jp");
assert.equal(registrableDomain("https://www.waseda.jp/top"), "waseda.jp");
assert.equal(registrableDomain("https://ch.konan-u.ac.jp/admission/"), "konan-u.ac.jp");
assert.ok(quoteInPage("1年次から 附属病院で、実習を行います。地域の施設でも学びます", "…1年次から附属病院で実習を行います。地域の施設でも学びます。…"));
assert.ok(!quoteInPage("2年次から附属病院で実習を行います。地域の施設でも学びます", "1年次から附属病院で実習を行います。地域の施設でも学びます。"));

const arg = process.argv.find((a) => a.startsWith("--faculty="))?.slice(10);
if (!arg) {
  console.log("部品の確認: ok（--faculty=大学ID:学部ID,... で試し実行）");
  process.exit(0);
}

interface FacultyJson {
  id: string;
  name: string;
  admissionUrl?: string;
}
interface UniversityJson {
  id: string;
  name: string;
  officialUrl?: string;
  faculties: FacultyJson[];
}

function findFaculty(universityId: string, facultyId: string) {
  for (const f of readdirSync("src/data/universities")) {
    if (!f.endsWith(".json")) continue;
    const d = JSON.parse(readFileSync(`src/data/universities/${f}`, "utf8"));
    for (const u of (Array.isArray(d) ? d : [d]) as UniversityJson[]) {
      if (u.id !== universityId) continue;
      const fac = u.faculties.find((x) => x.id === facultyId);
      if (fac) return { u, fac };
    }
  }
  return null;
}

async function main() {
  const OUT = ".claude/hillclimb/faculty-info";
  mkdirSync(OUT, { recursive: true });
  const client = new Anthropic();
  let total = 0;
  for (const pair of arg!.split(",")) {
    const [universityId, facultyId] = pair.split(":");
    const found = findFaculty(universityId, facultyId);
    if (!found) {
      console.log(pair, "見つからない");
      continue;
    }
    const t0 = Date.now();
    const r = await researchFaculty({
      client,
      universityName: found.u.name,
      facultyName: found.fac.name,
      seedUrls: [found.u.officialUrl, found.fac.admissionUrl].filter((x): x is string => !!x),
    });
    total += r.usage.estimatedUsd;
    writeFileSync(
      `${OUT}/${facultyInfoDocId(universityId, facultyId)}.json`,
      JSON.stringify({ universityId, facultyId, universityName: found.u.name, facultyName: found.fac.name, ...r }, null, 2)
    );
    console.log(
      `\n== ${found.u.name} ${found.fac.name}（${Math.round((Date.now() - t0) / 1000)}秒）`,
      `\n  ドメイン: ${r.allowedDomains.join(", ")}`,
      `\n  検索 ${r.usage.webSearchRequests}回 / 入力 ${r.usage.inputTokens} / 出力 ${r.usage.outputTokens} / 約$${r.usage.estimatedUsd}`,
      `\n  ページ: ${r.pagesFetched.map((p) => `${p.url}（${p.chars}字）`).join("\n          ") || "なし"}`,
      r.pageErrors.length ? `\n  取れなかった: ${r.pageErrors.map((e) => `${e.url} ${e.reason}`).join("\n               ")}` : "",
      `\n  残った ${r.items.length}件 / 捨てた ${r.dropped.length}件${r.dropped.length ? `（${r.dropped.map((d) => d.reason).join("、")}）` : ""}`,
      r.error ? `\n  エラー: ${r.error}` : ""
    );
    for (const i of r.items) console.log(`   - [${i.category}] ${i.title}: ${i.summary}`);
  }
  console.log(`\n合計 約$${Math.round(total * 1000) / 1000}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

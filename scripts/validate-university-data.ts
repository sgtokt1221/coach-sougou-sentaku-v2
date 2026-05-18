import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { UniversityListSchema } from "../src/lib/types/university-schema";

const dir = resolve(process.cwd(), "src/data/universities");

let hadError = false;
let totalUniversities = 0;

for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
  const filePath = join(dir, f);
  const raw = readFileSync(filePath, "utf-8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ ${f}: JSON parse error — ${(e as Error).message}`);
    hadError = true;
    continue;
  }

  const result = UniversityListSchema.safeParse(json);
  if (!result.success) {
    console.error(`❌ ${f}:`);
    // 大学名・学部名で文脈を付ける
    const list = Array.isArray(json) ? (json as Array<{ id?: string; name?: string; faculties?: Array<{ id?: string; name?: string }> }>) : [];
    for (const issue of result.error.issues) {
      const path = issue.path;
      const uniIdx = typeof path[0] === "number" ? path[0] : null;
      const uni = uniIdx !== null ? list[uniIdx] : undefined;
      const uniLabel = uni ? `${uni.id ?? "?"}/${uni.name ?? "?"}` : "?";
      const facIdx = path[1] === "faculties" && typeof path[2] === "number" ? path[2] : null;
      const fac = facIdx !== null && uni?.faculties ? uni.faculties[facIdx] : undefined;
      const facLabel = fac ? ` faculty=${fac.id ?? "?"}/${fac.name ?? "?"}` : "";
      const restPath = path.slice(facIdx !== null ? 3 : uniIdx !== null ? 1 : 0).join(".");
      console.error(`   [${uniLabel}]${facLabel}  path=${restPath}  ${issue.message}`);
    }
    hadError = true;
  } else {
    console.log(`✅ ${f}  (${result.data.length} universities)`);
    totalUniversities += result.data.length;
  }
}

if (!hadError) {
  console.log(`\nAll university data files passed schema validation. Total: ${totalUniversities} universities.`);
}

process.exit(hadError ? 1 : 0);

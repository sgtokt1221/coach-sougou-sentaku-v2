/**
 * Migration: 古いスキーマで保存された大学データを正規スキーマに変換する。
 *
 * 変換ルール:
 * - requirements.certifications (string[]) → requirements.englishCert (string|null)
 *   [] → null,  [...] → " / " で join
 * - requirements.otherRequirements → requirements.otherReqs (rename)
 * - selectionMethods[].description → selectionMethods[].details (rename)
 * - selectionMethods[].stage が無ければ配列インデックス+1を付与
 *
 * 実行: npx tsx scripts/fix-university-data.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

interface OldRequirements {
  gpa?: number | null;
  certifications?: string[];
  otherRequirements?: string[];
  englishCert?: string | null;
  otherReqs?: string[];
}

interface OldSelectionMethod {
  stage?: number;
  type: string;
  description?: string;
  details?: string;
}

const dir = resolve(process.cwd(), "src/data/universities");
let totalUniChanged = 0;
let totalFacChanged = 0;

function normalizeRequirements(r: OldRequirements): { changed: boolean; out: OldRequirements } {
  const out: OldRequirements = { ...r };
  let changed = false;
  if ("certifications" in out) {
    const certs = out.certifications ?? [];
    out.englishCert = certs.length === 0 ? null : certs.join(" / ");
    delete out.certifications;
    changed = true;
  } else if (out.englishCert === undefined) {
    // englishCert もない場合は null で補完
    out.englishCert = null;
    changed = true;
  }
  if ("otherRequirements" in out) {
    out.otherReqs = out.otherRequirements ?? [];
    delete out.otherRequirements;
    changed = true;
  } else if (out.otherReqs === undefined) {
    out.otherReqs = [];
    changed = true;
  }
  return { changed, out };
}

function normalizeSelectionMethods(arr: OldSelectionMethod[]): { changed: boolean; out: OldSelectionMethod[] } {
  let changed = false;
  const out = arr.map((m, i) => {
    const next: OldSelectionMethod = { ...m };
    if (typeof next.stage !== "number") {
      next.stage = i + 1;
      changed = true;
    }
    if ("description" in next && !("details" in next)) {
      next.details = next.description;
      delete next.description;
      changed = true;
    }
    // stage を先頭にする (型は同じ、表示順序のため)
    const reordered: OldSelectionMethod = {
      stage: next.stage,
      type: next.type,
      details: next.details ?? "",
    };
    return reordered;
  });
  return { changed, out };
}

for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
  const filePath = join(dir, f);
  const raw = readFileSync(filePath, "utf-8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json)) continue;

  let fileChanged = false;
  for (const uni of json as Array<{
    id?: string;
    name?: string;
    faculties?: Array<{
      id?: string;
      name?: string;
      requirements?: OldRequirements;
      selectionMethods?: OldSelectionMethod[];
    }>;
  }>) {
    let uniChanged = false;
    for (const fac of uni.faculties ?? []) {
      let facChanged = false;
      if (fac.requirements) {
        const { changed, out } = normalizeRequirements(fac.requirements);
        if (changed) {
          fac.requirements = out;
          facChanged = true;
        }
      }
      if (fac.selectionMethods) {
        const { changed, out } = normalizeSelectionMethods(fac.selectionMethods);
        if (changed) {
          fac.selectionMethods = out;
          facChanged = true;
        }
      }
      if (facChanged) {
        totalFacChanged++;
        uniChanged = true;
      }
    }
    if (uniChanged) {
      totalUniChanged++;
      fileChanged = true;
      console.log(`  - ${uni.id}/${uni.name}`);
    }
  }

  if (fileChanged) {
    // 末尾に改行を入れて元のスタイルに近づける
    writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
    console.log(`✏️  ${f} updated`);
  } else {
    console.log(`✓  ${f} no change`);
  }
}

console.log(`\nDone. ${totalUniChanged} universities, ${totalFacChanged} faculties updated.`);

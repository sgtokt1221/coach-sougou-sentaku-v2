import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import {
  getExplorerCatalog,
  formatCatalogForPrompt,
  checkEligibility,
  type CatalogEntry,
  type EligibilityResult,
} from "@/lib/universities/catalog";
import { buildExplorerSystem } from "@/lib/ai/prompts/university-explorer";
import type { EnglishCert } from "@/lib/types/user";

interface ExploreRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

interface StudentInfo {
  text: string;
  gpa: number | null;
  englishCerts: Pick<EnglishCert, "type">[];
}

/** 生徒情報（自己分析・評定・英検・活動実績）を収集してプロンプト用テキストと判定用プロフィールを返す */
async function gatherStudent(uid: string): Promise<StudentInfo> {
  const parts: string[] = [];
  let gpa: number | null = null;
  let englishCerts: Pick<EnglishCert, "type">[] = [];
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return { text: "（生徒情報は取得できませんでした）", gpa, englishCerts };
    }

    const userSnap = await adminDb.doc(`users/${uid}`).get();
    const u = userSnap.data() ?? {};
    gpa = typeof u.gpa === "number" ? u.gpa : null;
    englishCerts = Array.isArray(u.englishCerts) ? u.englishCerts : [];
    const prof: string[] = [];
    if (u.grade) prof.push(`学年: ${u.grade}`);
    if (u.school) prof.push(`高校: ${u.school}`);
    if (gpa != null) prof.push(`評定平均(GPA): ${gpa}`);
    if (englishCerts.length) {
      prof.push(
        `英語資格: ${(u.englishCerts as EnglishCert[])
          .map((c) => `${c.type}${c.grade ? ` ${c.grade}` : ""}${c.score ? ` ${c.score}` : ""}`)
          .join("、")}`
      );
    }
    if (Array.isArray(u.interests) && u.interests.length) {
      prof.push(`興味: ${u.interests.join("、")}`);
    }
    if (prof.length) parts.push(`### 基本情報\n${prof.join("\n")}`);

    const saSnap = await adminDb.doc(`selfAnalysis/${uid}`).get();
    if (saSnap.exists) {
      const sa = saSnap.data()!;
      const sap: string[] = [];
      if (sa.values?.coreValues?.length) sap.push(`価値観: ${sa.values.coreValues.join("、")}`);
      if (sa.strengths?.strengths?.length) sap.push(`強み: ${sa.strengths.strengths.join("、")}`);
      if (sa.interests?.fields?.length) sap.push(`興味分野: ${sa.interests.fields.join("、")}`);
      if (sa.vision?.longTermVision) sap.push(`将来ビジョン: ${sa.vision.longTermVision}`);
      if (sa.vision?.whyThisField) sap.push(`この分野を選ぶ理由: ${sa.vision.whyThisField}`);
      if (sa.synthesis?.coreNarrative) sap.push(`自分ストーリー: ${sa.synthesis.coreNarrative}`);
      if (sap.length) parts.push(`### 自己分析\n${sap.join("\n")}`);
    }

    const actSnap = await adminDb.collection(`users/${uid}/activities`).limit(20).get();
    if (!actSnap.empty) {
      const acts = actSnap.docs.map((d) => {
        const a = d.data();
        const summary = a.description || a.structuredData?.motivation || "";
        return `- ${a.title ?? "(無題)"}${a.category ? `（${a.category}）` : ""}${summary ? `: ${String(summary).slice(0, 120)}` : ""}`;
      });
      parts.push(`### 活動実績\n${acts.join("\n")}`);
    }
  } catch (e) {
    console.warn("[universities/explore] gatherStudent failed:", e);
  }

  const text = parts.length
    ? parts.join("\n\n")
    : "（自己分析や評定が未入力です。まず希望条件を丁寧にヒアリングしてください）";
  return { text, gpa, englishCerts };
}

interface EnrichedCandidate {
  key: string;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  selectionType: "comprehensive" | "school_recommendation";
  reason: string;
  gpaRequirement: number | null;
  englishRequirement: string | null;
  eligibility: EligibilityResult;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student", "teacher", "admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  let body: ExploreRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const { message, history } = body;
  if (!message) {
    return NextResponse.json({ error: "message は必須です" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 503 });
  }

  const [student, catalogEntries] = await Promise.all([
    gatherStudent(uid),
    getExplorerCatalog(),
  ]);
  const catalogByKey = new Map<string, CatalogEntry>(catalogEntries.map((e) => [e.key, e]));
  const catalogStr = formatCatalogForPrompt(catalogEntries);

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (history) {
    for (const m of history) {
      messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.content });
    }
  }
  messages.push({ role: "user", content: message });

  let text = "";
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildExplorerSystem(catalogStr, student.text),
      messages,
    });
    text = response.content[0].type === "text" ? response.content[0].text : "";
  } catch (e) {
    console.error("[universities/explore] Claude error:", e);
    return NextResponse.json({ error: "AI応答の生成に失敗しました" }, { status: 502 });
  }

  let aiResponse = text;
  let isComplete = false;
  let candidates: EnrichedCandidate[] = [];
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (typeof parsed.aiResponse === "string") aiResponse = parsed.aiResponse;
      isComplete = Boolean(parsed.isComplete);
      if (Array.isArray(parsed.candidates)) {
        const seen = new Set<string>();
        for (const c of parsed.candidates) {
          if (!c || typeof c.key !== "string") continue;
          const entry = catalogByKey.get(c.key); // カタログに無いキーは除外（ハルシネーション対策）
          if (!entry || seen.has(c.key)) continue;
          seen.add(c.key);
          candidates.push({
            key: entry.key,
            universityId: entry.universityId,
            facultyId: entry.facultyId,
            universityName: entry.universityName,
            facultyName: entry.facultyName,
            selectionType: entry.selectionType,
            reason: typeof c.reason === "string" ? c.reason : "",
            gpaRequirement: entry.gpaRequirement,
            englishRequirement: entry.englishRequirement,
            eligibility: checkEligibility(
              { gpa: entry.gpaRequirement, englishCert: entry.englishRequirement },
              { gpa: student.gpa, englishCerts: student.englishCerts }
            ),
          });
        }
      }
    }
  } catch {
    // JSON 抽出失敗時は raw text を返答として扱う
  }

  return NextResponse.json({ aiResponse, isComplete, candidates });
}

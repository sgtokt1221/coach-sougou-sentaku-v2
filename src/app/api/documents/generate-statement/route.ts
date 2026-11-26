import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api/auth";
import { requireFeature } from "@/lib/api/subscription";
import {
  normalizeStudentEmphasis,
  normalizeStudentResearch,
} from "@/lib/ai/prompts/shared";
import { CREATABLE_DOCUMENT_TYPES } from "@/lib/types/document";
import {
  DraftInputError,
  loadStatementMaterial,
  mockStatementDraft,
  writeStatementDraft,
} from "@/lib/documents/draft-generation";
import { ensureFacultyInfo } from "@/lib/universities/faculty-info-request";

// 生成(40-50秒)に加えて字数超過時の圧縮リライトが走るため、60秒では打ち切られる。
export const maxDuration = 300;

interface GenerateStatementRequest {
  universityId: string;
  facultyId: string;
  /** 目標文字数。未指定時は 800 字。 */
  targetWordCount?: number;
  /** 任意。特に熱く書いてほしい点・内容の方向性 */
  emphasis?: string;
  /** 任意。生徒が調べて書いた、この大学・学部のこと */
  universityResearch?: string;
  /** 書類の種類（志望理由書 / 自己推薦書）。無ければ志望理由書 */
  documentType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    if (!adminDb) {
      return NextResponse.json(
        { error: "データベース接続エラー" },
        { status: 500 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as GenerateStatementRequest | null;
    if (!body?.universityId || !body.facultyId) {
      return NextResponse.json(
        { error: "universityId, facultyId は必須です" },
        { status: 400 }
      );
    }
    const documentType = (
      CREATABLE_DOCUMENT_TYPES as readonly string[]
    ).includes(body.documentType ?? "")
      ? (body.documentType as string)
      : "志望理由書";

    // 公式サイトの情報がまだ無い学部は裏で調べ始める（今回は待たない。次回から使う）
    await ensureFacultyInfo(body.universityId, body.facultyId);
    const material = await loadStatementMaterial(
      auth.uid,
      body.universityId,
      body.facultyId
    );

    if (process.env.NODE_ENV === "development") {
      // 開発環境：モックレスポンス
      return NextResponse.json(mockStatementDraft(material));
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI機能は現在利用できません", available: false },
        { status: 503 }
      );
    }
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const result = await writeStatementDraft(
      new Anthropic({ apiKey }),
      material,
      {
        targetWordCount: body.targetWordCount || 800,
        emphasis: normalizeStudentEmphasis(body.emphasis),
        universityResearch: normalizeStudentResearch(body.universityResearch),
        documentType,
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DraftInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Statement generation error:", error);
    return NextResponse.json(
      { error: "志望理由書の生成に失敗しました" },
      { status: 500 }
    );
  }
}

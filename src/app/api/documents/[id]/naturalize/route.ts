import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";
import { buildDocumentNaturalizePrompt } from "@/lib/ai/prompts/document-naturalize";
import { DocumentNaturalizeOutputSchema } from "@/lib/ai/schemas/document-naturalize";
import { fitToCharRange } from "@/lib/ai/fit-char-limit";
import {
  detectUnnaturalJapanese,
  introducedFacts,
  type DocumentProseStyle,
} from "@/lib/documents/natural-japanese";

export const maxDuration = 120;

/**
 * POST /api/documents/[id]/naturalize
 *
 * 本文を、意味を変えずに自然な日本語に整えた案を返す（保存はしない。生徒が
 * 「この内容で置き換える」を押したときに画面側が保存し、前の本文は版に残る）。
 * 機械検出で引っかかった箇所を AI に渡し、整えた後にもう一度数えて返す。
 * 整えた案に元の本文に無い数字・固有名詞が入っていたら、1回だけやり直させる。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireFeature(request, "documentEditor");
  if (gate) return gate;
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const { id } = await params;
  const snap = await adminDb.doc(`documents/${id}`).get();
  const data = snap.data();
  if (!data) {
    return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
  }
  if (data.userId !== auth.uid) {
    return NextResponse.json({ error: "この書類へのアクセス権がありません" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    content?: unknown;
    style?: unknown;
  };
  const content = typeof body.content === "string" ? body.content : "";
  const style: DocumentProseStyle = body.style === "desumasu" ? "desumasu" : "dearu";
  if (content.trim().length < 50) {
    return NextResponse.json({ error: "本文が短すぎます（50字以上で使えます）" }, { status: 400 });
  }
  if (content.length > 6000) {
    return NextResponse.json({ error: "本文が長すぎます（6000字まで）" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI 機能は現在利用できません" }, { status: 503 });
  }

  const before = detectUnnaturalJapanese(content, style);
  const system = buildDocumentNaturalizePrompt({
    documentType: data.type ?? "出願書類",
    style,
    findings: before,
  });
  const client = new Anthropic();

  async function run(extra?: string) {
    const response = await client.messages.parse({
      model: AI_MODEL_SONNET,
      max_tokens: 12000,
      system,
      messages: [
        {
          role: "user",
          content: `<document_under_edit>\n${content}\n</document_under_edit>${extra ? `\n\n${extra}` : ""}`,
        },
      ],
      output_config: {
        format: zodOutputFormat(DocumentNaturalizeOutputSchema),
        effort: "low",
      },
    });
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      throw new Error("整えた結果を受け取れませんでした");
    }
    return response.parsed_output;
  }

  try {
    let out = await run();
    let added = introducedFacts(content, out.text);
    if (added.length > 0) {
      // 本文に無い事実が入った。指摘してやり直させる
      out = await run(
        `前回の案には本文に無い次の語が入っていました: ${added.map((t) => `「${t}」`).join("、")}。これらを使わず、本文にある事実だけで整え直してください。`
      );
      added = introducedFacts(content, out.text);
      if (added.length > 0) {
        return NextResponse.json(
          { error: "本文に無い内容が入ってしまうため、整えた案を出せませんでした。もう一度お試しください" },
          { status: 422 }
        );
      }
    }

    /**
     * 字数は元の本文の ±10% に戻す。決まり文句を削ると2割ほど縮むことがあり
     * （実測 352字→270字）、字数の決まった書類では困る。伸ばすのは事実を足さずに
     * 考えを展開する処理で、それでも事実が入ったら伸ばす前の案に戻して知らせる。
     */
    let text = out.text.trim();
    let notice: string | undefined;
    const min = Math.round(content.length * 0.9);
    const max = Math.round(content.length * 1.1);
    if (text.length < min || text.length > max) {
      const fitted = await fitToCharRange(
        client,
        text,
        min,
        max,
        `${data.type ?? "出願書類"}の本文（${style === "dearu" ? "だ・である調" : "です・ます調"}）。本文に無い出来事・数値・名前は足さない`
      );
      if (introducedFacts(content, fitted).length === 0) {
        text = fitted;
      } else {
        notice = `整えた結果、${content.length}字から${text.length}字に減りました。字数を戻すと本文に無い内容が入ってしまうため、減ったままにしています。`;
      }
    }

    const after = detectUnnaturalJapanese(text, style);
    return NextResponse.json({
      rewritten: text,
      changes: out.changes.slice(0, 6),
      questions: out.questions.slice(0, 2),
      before,
      after,
      notice,
    });
  } catch (err) {
    console.error("[documents/naturalize] failed:", err);
    return NextResponse.json({ error: "整えられませんでした。もう一度お試しください" }, { status: 500 });
  }
}

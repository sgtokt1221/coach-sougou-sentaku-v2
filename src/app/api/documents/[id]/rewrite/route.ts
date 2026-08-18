import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildDocumentRewritePrompt } from "@/lib/ai/prompts/document-rewrite";
import { cleanAiText, fitToCharLimit } from "@/lib/ai/fit-char-limit";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { loadStudentDocumentContext } from "@/lib/documents/student-context";

/**
 * AIによる書き換え。本文を丸ごと生成し直す。
 */
export const maxDuration = 180;

/** 指示文から「N字以下 / N字以内 / N文字まで」等の上限文字数を抽出する。無ければ null。 */
function extractCharLimit(instruction: string): number | null {
  const m = instruction.match(/(\d{2,4})\s*(?:文字|字)\s*(?:以下|以内|まで)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * 生徒の指示に従って書類本文をAIで書き換え、書き換え案を返す（永続化はしない）。
 * 生徒がプレビューを確認して「置き換える」を選んだ場合のみ、クライアント側が保存する。
 * グローバル documents コレクション + userId 所有者チェック。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const docRef = adminDb.doc(`documents/${id}`);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }
    const data = existing.data();
    if (data?.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const content: string =
      typeof body.content === "string" ? body.content : "";
    const instruction: string =
      typeof body.instruction === "string" ? body.instruction : "";
    if (!content.trim() || !instruction.trim()) {
      return NextResponse.json(
        { error: "content と instruction は必須です" },
        { status: 400 }
      );
    }

    // AP取得
    let admissionPolicy = "";
    if (data?.universityId) {
      try {
        const uniDoc = await adminDb
          .doc(`universities/${data.universityId}`)
          .get();
        if (uniDoc.exists) {
          const uniData = uniDoc.data();
          const faculty = uniData?.faculties?.find(
            (f: { id: string; admissionPolicy?: string }) =>
              f.id === data.facultyId
          );
          if (faculty?.admissionPolicy) {
            admissionPolicy = prepareAdmissionPolicy(
              faculty.admissionPolicy
            ).text;
          }
        }
      } catch (err) {
        console.warn("AP fetch failed:", err);
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    /**
     * 生徒の材料。「もっと具体的なエピソードを入れて」のような指示に対して、
     * 材料が無いとモデルはそれらしい話を作る。実在の実績を渡して、
     * そこからしか足せないようにする。
     */
    const { selfAnalysis, activities } = await loadStudentDocumentContext(
      auth.uid
    );

    const client = new Anthropic();
    const systemPrompt = buildDocumentRewritePrompt({
      instruction,
      documentType: data?.type ?? "出願書類",
      universityName: data?.universityName ?? "未指定",
      facultyName: data?.facultyName ?? "未指定",
      admissionPolicy,
      targetWordCount: data?.targetWordCount,
      selfAnalysis,
      activities,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `<document_under_rewrite>\n${content}\n</document_under_rewrite>`,
        },
      ],
    });

    // 本文全文は出力が長くなりやすい。max_tokens で切れた場合は、
    // 不完全な本文を返さず分かりやすいメッセージにする。
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        {
          error:
            "本文が長く、書き換え結果が途中で切れました。指示を分けるか目標文字数を下げてお試しください。",
        },
        { status: 500 }
      );
    }

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // 本文全文をプレーンテキストで返させる。万一コードフェンスが付いても剥がす。
    let rewritten = cleanAiText(rawText);
    if (!rewritten) {
      console.error("Empty rewrite response:", rawText);
      return NextResponse.json(
        { error: "書き換え結果を取得できませんでした" },
        { status: 500 }
      );
    }
    const notices: string[] = [];

    // 未入力欄がAIに埋められると、生徒本人の体験でない記述が混じったまま提出されうる。
    // ただし「APに合わせて書き直して」のように、生徒の指示どおりに動いた結果として
    // 欄が消えることも多い。結果ごと捨てると生徒は何も得られないため、該当箇所を
    // 名指しして確認を促す。
    const lostPlaceholders = [...content.matchAll(/【[^】]+】/g)]
      .map((match) => match[0])
      .filter((placeholder) => !rewritten.includes(placeholder));
    if (lostPlaceholders.length) {
      notices.push(
        `以下の未入力欄がAIによって埋められています。自分の実際の体験かどうか必ず確認してください。\n${lostPlaceholders.join(" ")}`
      );
    }

    // 字数上限の強制。指示文の「N字以下」等を優先、無ければ目標文字数の+10%を上限とする。
    // LLM は1回の指示では字数を守りきれないため、超過時はサーバー側で数えて詰める。
    const explicitLimit = extractCharLimit(instruction);
    const limit =
      explicitLimit ??
      (typeof data?.targetWordCount === "number"
        ? Math.round(data.targetWordCount * 1.1)
        : null);
    if (limit) {
      rewritten = await fitToCharLimit(client, rewritten, limit);
      if (rewritten.length > limit) {
        // 生徒が指示文で字数を明示した場合だけ、収まらない結果は返さない。
        if (explicitLimit) {
          return NextResponse.json(
            {
              error:
                "書き換え結果を指定文字数内に収められませんでした。指示を分けてお試しください。",
            },
            { status: 502 }
          );
        }
        // 目標文字数由来の上限は、元の本文がすでに超過していることが多い。
        // 書き換え結果ごと捨てると生徒は何も得られないため、超過を伝えて返す。
        notices.push(
          `目標文字数の上限${limit}字を超えています（${rewritten.length}字）。置き換えたあとに削ってください。`
        );
      }
    }

    return NextResponse.json({
      rewritten,
      notice: notices.join("\n\n") || undefined,
    });
  } catch (error) {
    console.error("Document rewrite error:", error);
    return NextResponse.json(
      { error: "書き換え処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { buildSentenceRewritePrompt } from "@/lib/ai/prompts/sentence-rewrite";
import { SentenceRewriteJudgeSchema } from "@/lib/ai/schemas/sentence-rewrite";
import {
  correctionKey,
  type RawCorrection,
} from "@/lib/sentence-drill/personal";

/**
 * POST /api/essay/lecture/rewrite
 *
 * 「あなたの答案から」ラウンドの判定。3件を1回のAI呼び出しでまとめて判定する。
 * 1件ずつ呼ぶと、反復するほど課金が積み上がる。
 *
 * 出題済みキーは users/{uid}/sentenceDrillState/personal に貯め、次回から出さない。
 */
interface RewriteBody {
  lectureId: string;
  items: { correction: RawCorrection; answer: string }[];
}

/** 出題済みキーの保持上限。古いものから捨てる（無限に伸ばさない） */
const MAX_USED_KEYS = 300;

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, [
    "student",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const body = (await request.json().catch(() => null)) as RewriteBody | null;
  if (!body?.items?.length || body.items.length > 5) {
    return NextResponse.json(
      { error: "items は1〜5件で指定してください" },
      { status: 400 }
    );
  }
  // 空回答は判定させない（AI呼び出しの無駄）
  if (body.items.some((it) => !it.answer?.trim())) {
    return NextResponse.json(
      { error: "すべての問題に回答してください" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません" },
      { status: 503 }
    );
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    // 短文3件の突き合わせ。thinking と本文で共有するので余裕を持たせる
    max_tokens: 8000,
    messages: [
      { role: "user", content: buildSentenceRewritePrompt(body.items) },
    ],
    output_config: {
      format: zodOutputFormat(SentenceRewriteJudgeSchema),
      // 判定基準が明確な軽い作業。深く考えさせる必要はない
      effort: "low",
    },
  });

  if (response.stop_reason === "max_tokens") {
    return NextResponse.json(
      { error: "判定が途中で終了しました。もう一度お試しください" },
      { status: 500 }
    );
  }
  const judge = response.parsed_output;
  if (!judge) {
    return NextResponse.json(
      { error: "判定結果を読み取れませんでした" },
      { status: 500 }
    );
  }

  // 保存は失敗しても判定は返す（生徒の学習を止めない）
  if (adminDb) {
    try {
      const stateRef = adminDb.doc(`users/${uid}/sentenceDrillState/personal`);
      const snap = await stateRef.get();
      const prev: string[] = snap.exists ? (snap.data()?.usedKeys ?? []) : [];
      const next = [
        ...prev,
        ...body.items.map((it) => correctionKey(it.correction)),
      ].slice(-MAX_USED_KEYS);
      await stateRef.set(
        { usedKeys: next, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      await adminDb.collection(`users/${uid}/sentenceDrills`).add({
        userId: uid,
        lectureId: body.lectureId,
        kind: "personal_rewrite",
        correct: judge.results.filter((r) => r.ok).length,
        total: body.items.length,
        results: judge.results,
        completedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn("[lecture/rewrite] failed to save", err);
    }
  }

  return NextResponse.json(judge);
}

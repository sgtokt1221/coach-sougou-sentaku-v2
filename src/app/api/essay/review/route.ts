import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildEssayReviewPrompt } from "@/lib/ai/prompts/essay";
import type { EssayReviewRequest, EssayReviewResponse, EssayScores, EssayFeedback, TopicInsights } from "@/lib/types/essay";
import { analyzeGrowth, updateWeaknessRecords } from "@/lib/growth/analyze";
import type { WeaknessRecord } from "@/lib/types/growth";
import { logEssaySubmission } from "@/lib/bigquery/logger";

const MOCK_REVIEW_RESPONSE: EssayReviewResponse = {
  essayId: "mock",
  scores: {
    structure: 7,
    logic: 6,
    expression: 8,
    apAlignment: 7,
    originality: 6,
    total: 34,
  },
  feedback: {
    overall: "全体的にバランスの取れた小論文です。論理構成をさらに強化することで、より説得力が増すでしょう。",
    goodPoints: [
      "序論で問題提起が明確にできています",
      "自分自身の経験を交えた具体的な記述が評価できます",
    ],
    improvements: [
      "本論の論拠をより具体的なデータや事例で補強しましょう",
      "結論部分で志望学部との関連をより明示的に述べると良いでしょう",
    ],
    repeatedIssues: [],
    improvementsSinceLast: [],
    topicInsights: {
      background: "グローバル化は経済・文化・政治の各分野で国境を越えた相互依存を深める現象です。日本では少子高齢化や労働力不足を背景に、外国人材の受入れ拡大や多文化共生が重要な政策課題となっています。一方で、地域文化の喪失や格差拡大といった負の側面も議論されており、グローバル化への対応は一様ではありません。",
      relatedThemes: [
        "多文化共生と地域コミュニティの変容",
        "デジタル・グローバリゼーションと情報格差",
        "SDGsとグローバル・ガバナンス",
        "ローカリゼーション（地産地消）との両立",
      ],
      deepDivePoints: [
        "グローバル化がもたらす「文化の均質化」と「文化の多様化」の両面を対比させると議論が深まります",
        "日本の教育現場での英語化推進と母語教育のバランスという身近な視点から論じることも効果的です",
      ],
      recommendedAngle: "あなたの文章は独自の体験を軸に書く力が強みです。次回は自身の国際交流やボランティアなどの具体的経験を出発点に、マクロな社会課題に接続する構成を試みると、AP求める「主体的な学び」との合致度がさらに高まるでしょう。",
    },
    brushedUpText: "　グローバル化が加速する現代社会において、日本はどのような未来を描くべきだろうか。本稿では、経済・文化の両面からこの問いを検討し、日本が取るべき方向性を提示する。\n\n　まず経済面では、少子高齢化に伴う労働力不足が深刻化しており、外国人材の受入れ拡大は避けられない潮流である。2024年の改正入管法施行により、特定技能制度の対象分野は拡大し、多くの産業で外国人労働者が不可欠な存在となりつつある。\n\n　一方、文化面ではグローバル化による均質化への懸念がある。しかし私は、高校時代の国際交流プログラムでの経験から、異文化との接触はむしろ自文化への理解を深める契機になると考える。実際に、ホストファミリーに日本の伝統文化を紹介する過程で、私自身が日本文化の奥深さを再発見した。\n\n　以上を踏まえ、日本が目指すべきは「開かれた独自性」である。グローバルな視野を持ちながらも、日本固有の価値観や文化を軸に据えた発展モデルこそ、持続可能な未来への道筋となるだろう。",
  },
  growthEvents: [],
};

export async function POST(request: NextRequest) {
  try {
    const body: EssayReviewRequest = await request.json();
    const { essayId, ocrText, universityId, facultyId, topic } = body;

    if (!essayId || !ocrText || !universityId || !facultyId) {
      return NextResponse.json(
        { error: "essayId, ocrText, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    // 大学・学部のAPを取得
    let admissionPolicy = "（大学情報未設定）";
    let weaknessList = "（過去の弱点なし）";
    let essayUserId: string | null = null;
    let existingWeaknesses: WeaknessRecord[] = [];

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");

        // AP取得
        const universityDoc = await getDoc(doc(db, "universities", universityId));
        if (universityDoc.exists()) {
          const universityData = universityDoc.data();
          const faculty = universityData.faculties?.find(
            (f: { id: string; admissionPolicy?: string }) => f.id === facultyId
          );
          if (faculty?.admissionPolicy) {
            admissionPolicy = `大学: ${universityData.name}\n学部: ${faculty.name}\nAP: ${faculty.admissionPolicy}`;
          }
        }

        // 弱点リスト取得（essayIdからuserIdを引く）
        const essayDoc = await getDoc(doc(db, "essays", essayId));
        if (essayDoc.exists()) {
          const essayData = essayDoc.data();
          essayUserId = essayData.userId ?? null;
          if (essayUserId) {
            const weaknessQuery = query(
              collection(db, "users", essayUserId, "weaknesses"),
              where("resolved", "==", false)
            );
            const weaknessDocs = await getDocs(weaknessQuery);
            if (!weaknessDocs.empty) {
              existingWeaknesses = weaknessDocs.docs.map((d) => {
                const w = d.data();
                return {
                  area: w.area,
                  count: w.count,
                  firstOccurred: w.firstOccurred?.toDate() ?? new Date(),
                  lastOccurred: w.lastOccurred?.toDate() ?? new Date(),
                  improving: w.improving ?? false,
                  resolved: w.resolved ?? false,
                  source: w.source ?? "essay",
                  reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
                } satisfies WeaknessRecord;
              });
              weaknessList = existingWeaknesses
                .map((w) => `- ${w.area}（${w.count}回指摘）`)
                .join("\n");
            }
          }
        }
      } catch (err) {
        console.warn("Firestore data fetch failed, using defaults:", err);
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const mockResponse = { ...MOCK_REVIEW_RESPONSE, essayId };
      return NextResponse.json(mockResponse);
    }

    const client = new Anthropic();
    const systemPrompt = buildEssayReviewPrompt(admissionPolicy, weaknessList);

    const userMessage = topic
      ? `【テーマ】${topic}\n\n【小論文本文】\n${ocrText}`
      : `【小論文本文】\n${ocrText}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // JSONを抽出してパース
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error("Could not parse AI response:", rawText);
      return NextResponse.json({ ...MOCK_REVIEW_RESPONSE, essayId });
    }

    const parsed = JSON.parse(jsonMatch[1]);

    const scores: EssayScores = {
      structure: parsed.scores.structure,
      logic: parsed.scores.logic,
      expression: parsed.scores.expression,
      apAlignment: parsed.scores.apAlignment,
      originality: parsed.scores.originality,
      total: parsed.scores.total,
    };

    const topicInsights: TopicInsights | undefined = parsed.feedback.topicInsights
      ? {
          background: parsed.feedback.topicInsights.background ?? "",
          relatedThemes: parsed.feedback.topicInsights.relatedThemes ?? [],
          deepDivePoints: parsed.feedback.topicInsights.deepDivePoints ?? [],
          recommendedAngle: parsed.feedback.topicInsights.recommendedAngle ?? "",
        }
      : undefined;

    const feedback: EssayFeedback = {
      overall: parsed.feedback.overall,
      goodPoints: parsed.feedback.goodPoints ?? [],
      improvements: parsed.feedback.improvements ?? [],
      repeatedIssues: parsed.feedback.repeatedIssues ?? [],
      improvementsSinceLast: parsed.feedback.improvementsSinceLast ?? [],
      topicInsights,
      brushedUpText: parsed.feedback.brushedUpText ?? undefined,
    };

    // 弱点タグを抽出
    const weaknessTags: string[] = [
      ...feedback.repeatedIssues.map((issue) => issue.area),
      ...feedback.improvements,
    ];

    // 弱点レコードを更新し成長イベントを生成
    const updatedWeaknesses = updateWeaknessRecords(existingWeaknesses, weaknessTags);
    const growthEvents = analyzeGrowth(weaknessTags, existingWeaknesses);

    if (scores.total >= 40) {
      growthEvents.unshift({
        type: "praise",
        area: "overall",
        message: "素晴らしい添削結果です！全体的に高いレベルの小論文が書けています。",
      });
    }

    // Firestoreに結果を保存
    if (db) {
      try {
        const { doc, setDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
        await updateDoc(doc(db, "essays", essayId), {
          scores,
          feedback,
          weaknessTags,
          status: "reviewed",
          reviewedAt: serverTimestamp(),
        });

        if (essayUserId) {
          for (const weakness of updatedWeaknesses) {
            await setDoc(
              doc(db, "users", essayUserId, "weaknesses", weakness.area),
              {
                area: weakness.area,
                count: weakness.count,
                firstOccurred: weakness.firstOccurred,
                lastOccurred: weakness.lastOccurred,
                improving: weakness.improving,
                resolved: weakness.resolved,
                source: weakness.source,
                reminderDismissedAt: weakness.reminderDismissedAt,
              },
              { merge: true }
            );
          }
        }
      } catch (err) {
        console.warn("Failed to save review results to Firestore:", err);
      }
    }

    // BigQueryログ（非同期 fire-and-forget）
    void logEssaySubmission({
      essay_id: essayId,
      user_id: essayUserId ?? "unknown",
      university_id: universityId,
      faculty_id: facultyId,
      submitted_at: new Date().toISOString(),
      score_structure: scores.structure,
      score_logic: scores.logic,
      score_expression: scores.expression,
      score_ap_alignment: scores.apAlignment,
      score_originality: scores.originality,
      score_total: scores.total,
      word_count: ocrText.length,
      topic: topic ?? "",
      weakness_tags: weaknessTags,
      improvement_tags: feedback.improvements,
    });

    const result: EssayReviewResponse = { essayId, scores, feedback, growthEvents };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Essay review error:", error);
    return NextResponse.json(
      { error: "添削処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

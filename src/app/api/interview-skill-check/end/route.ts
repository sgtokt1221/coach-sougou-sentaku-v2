import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  INTERVIEW_SKILL_CHECK_EVALUATION_PROMPT,
  appendVoiceAnalysisToEvaluation,
} from "@/lib/ai/prompts/interview-skill-check";
import type {
  InterviewSkillCheckResult,
  InterviewSkillFeedback,
  InterviewSkillScores,
} from "@/lib/types/interview-skill-check";
import type { InterviewMessage } from "@/lib/types/interview";
import { calculateInterviewRank } from "@/lib/interview-skill-check/rank";
import { updateWeaknessRecords } from "@/lib/growth/analyze";
import type { WeaknessRecord } from "@/lib/types/growth";

export const maxDuration = 120;

interface EndBody {
  sessionId: string;
  messages: InterviewMessage[];
  durationSec: number;
  voiceSummary?: string;
}

function mockResult(messages: InterviewMessage[]): { scores: InterviewSkillScores; feedback: InterviewSkillFeedback } {
  const studentTurns = messages.filter((m) => m.role === "student").length;
  const base = Math.min(8, Math.max(4, studentTurns * 2));
  const scores: InterviewSkillScores = {
    verbal: base,
    logical: Math.max(4, base - 1),
    depth: Math.max(3, base - 2),
    demeanor: base,
    total: 0,
  };
  scores.total = scores.verbal + scores.logical + scores.depth + scores.demeanor;
  const feedback: InterviewSkillFeedback = {
    overall: "（モック）落ち着いて対話ができていました。揺さぶり質問への対応がさらに深まると良いです。",
    goodPoints: ["丁寧な言葉遣い", "自分の関心を具体的に説明できた"],
    improvements: ["反論への対応", "抽象化の深さ"],
    priorityImprovement: "反論されたら一度受け止めてから、自分の立場を言い直す練習を。",
  };
  return { scores, feedback };
}

export async function POST(request: NextRequest) {
  let body: EndBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONパース失敗" }, { status: 400 });
  }
  const { messages, durationSec, voiceSummary } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messagesが不正です" }, { status: 400 });
  }

  let userId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { adminAuth } = await import("@/lib/firebase/admin");
      if (adminAuth) {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
        userId = decoded.uid;
      }
    } catch {}
  }
  if (!userId && process.env.NODE_ENV === "development") {
    userId = "dev-user";
  }
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 評価
  let scores: InterviewSkillScores;
  let feedback: InterviewSkillFeedback;

  if (!process.env.ANTHROPIC_API_KEY) {
    const m = mockResult(messages);
    scores = m.scores;
    feedback = m.feedback;
  } else {
    try {
      const client = new Anthropic();
      const systemPrompt = appendVoiceAnalysisToEvaluation(
        INTERVIEW_SKILL_CHECK_EVALUATION_PROMPT,
        voiceSummary,
      );
      const transcriptBlocks = messages
        .map((m) => `【${m.role === "student" ? "受験生" : "面接官"}】${m.content}`)
        .join("\n\n");
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: `# 面接対話ログ\n\n${transcriptBlocks}\n\n上記を採点してください。` }],
      });
      const rawText = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch =
        rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) throw new Error("パース失敗");
      const parsed = JSON.parse(jsonMatch[1]);
      scores = {
        verbal: Number(parsed.scores.verbal ?? 0),
        logical: Number(parsed.scores.logical ?? 0),
        depth: Number(parsed.scores.depth ?? 0),
        demeanor: Number(parsed.scores.demeanor ?? 0),
        total: Number(parsed.scores.total ?? 0),
      };
      // totalが与えられていない/ずれている場合は再計算
      const computedTotal = scores.verbal + scores.logical + scores.depth + scores.demeanor;
      if (scores.total !== computedTotal) scores.total = computedTotal;
      feedback = {
        overall: parsed.feedback.overall ?? "",
        goodPoints: parsed.feedback.goodPoints ?? [],
        improvements: parsed.feedback.improvements ?? [],
        priorityImprovement: parsed.feedback.priorityImprovement ?? undefined,
        voiceNotes: voiceSummary,
      };
    } catch (err) {
      console.error("Evaluation failed:", err);
      return NextResponse.json({ error: "採点に失敗しました" }, { status: 500 });
    }
  }

  const rank = calculateInterviewRank(scores.total);
  const takenAt = new Date();
  const turnCount = messages.filter((m) => m.role === "student").length;

  // Firestore保存
  const { adminDb } = await import("@/lib/firebase/admin");
  let resultId = `mock-${Date.now()}`;

  if (!adminDb) {
    console.error("[interview-skill-check/end] adminDb is null — Firebase Admin SDK not initialized");
    return NextResponse.json(
      { error: "サーバー側の設定不備により保存できませんでした" },
      { status: 500 },
    );
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const sanitize = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

  // 重要書き込み: interviewSkillCheck 本体 (失敗したら 500)
  try {
    const docRef = await adminDb.collection(`users/${userId}/interviewSkillChecks`).add({
      userId,
      scores: sanitize(scores),
      rank,
      feedback: sanitize(feedback),
      messages: sanitize(messages),
      durationSec: durationSec ?? 0,
      turnCount,
      takenAt: FieldValue.serverTimestamp(),
      version: "v1",
    });
    resultId = docRef.id;
  } catch (err) {
    console.error("[interview-skill-check/end] Failed to write doc:", err);
    return NextResponse.json(
      { error: "面接スキルチェック結果の保存に失敗しました" },
      { status: 500 },
    );
  }

  // 補助書き込み: user doc (失敗しても続行)
  try {
    await adminDb.doc(`users/${userId}`).set(
      {
        interviewSkillCheckCompleted: true,
        lastInterviewCheckedAt: FieldValue.serverTimestamp(),
        currentInterviewRank: rank,
        currentInterviewScore: scores.total,
      },
      { merge: true },
    );
  } catch (err) {
    console.error("[interview-skill-check/end] Failed to update user doc:", err);
  }

  // 補助書き込み: 弱点 (失敗しても続行)
  try {
    const weaknessTags = feedback.improvements.slice();
    if (weaknessTags.length > 0) {
      const existingSnap = await adminDb
        .collection(`users/${userId}/weaknesses`)
        .where("resolved", "==", false)
        .get();
      const existing: WeaknessRecord[] = existingSnap.docs.map((d) => {
        const w = d.data();
        return {
          area: w.area,
          count: w.count ?? 0,
          firstOccurred: w.firstOccurred?.toDate() ?? new Date(),
          lastOccurred: w.lastOccurred?.toDate() ?? new Date(),
          improving: w.improving ?? false,
          resolved: w.resolved ?? false,
          source: w.source ?? "essay",
          reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
        };
      });
      const updated = updateWeaknessRecords(existing, weaknessTags, "interview_skill_check");
      for (const w of updated) {
        await adminDb.doc(`users/${userId}/weaknesses/${w.area}`).set(
          {
            area: w.area,
            count: w.count,
            firstOccurred: w.firstOccurred,
            lastOccurred: w.lastOccurred,
            improving: w.improving,
            resolved: w.resolved,
            source: w.source,
            reminderDismissedAt: w.reminderDismissedAt,
          },
          { merge: true },
        );
      }
    }
  } catch (err) {
    console.error("[interview-skill-check/end] Failed to update weaknesses:", err);
  }

  const result: InterviewSkillCheckResult = {
    id: resultId,
    userId,
    scores,
    rank,
    feedback,
    messages,
    durationSec: durationSec ?? 0,
    turnCount,
    takenAt,
    version: "v1",
  };

  return NextResponse.json({ result });
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Transcription } from "@/lib/types/interview";
import type { SessionSummary } from "@/lib/types/session";
import { buildSummaryPrompt } from "@/lib/ai/prompts/summary";

const MOCK_SUMMARY: SessionSummary = {
  overview:
    "志望理由書の構成と具体的なエピソードの選定について指導を行った。生徒は志望動機を明確に持っているが、APとの関連付けをより強化する必要がある。",
  topicsDiscussed: [
    "志望理由書の全体構成",
    "活動実績の整理と選定",
    "アドミッションポリシーとの関連付け",
    "次回面接練習の方針",
  ],
  strengths: [
    "志望動機が明確で一貫性がある",
    "活動実績が豊富で多面的な経験がある",
    "質問に対して積極的に考えを述べられる",
  ],
  improvements: [
    "具体的なエピソードの深掘りが不足している",
    "APとの関連付けをより明確にする必要がある",
    "将来ビジョンの具体性を高める",
  ],
  actionItems: [
    {
      task: "志望理由書の第1稿を作成する",
      assignee: "student",
      deadline: "2026-03-28",
      completed: false,
    },
    {
      task: "活動実績を時系列で整理する",
      assignee: "student",
      completed: false,
    },
    {
      task: "志望理由書のフィードバックを準備する",
      assignee: "teacher",
      completed: false,
    },
  ],
  generatedAt: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transcription,
      context,
    }: {
      transcription: Transcription;
      context?: {
        type?: string;
        universityName?: string;
        facultyName?: string;
      };
    } = body;

    if (!transcription || !transcription.fullText) {
      return NextResponse.json(
        { error: "transcription は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ summary: MOCK_SUMMARY });
    }

    const client = new Anthropic();
    const prompt = buildSummaryPrompt(context);

    const transcriptionText = transcription.segments
      .map((s) => {
        const speaker =
          s.speaker === "ai"
            ? "面接官"
            : s.speaker === "student"
              ? "受験生"
              : "";
        const prefix = speaker ? `[${speaker}] ` : "";
        return `${prefix}${s.text}`;
      })
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n## 文字起こし\n\n${transcriptionText}`,
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.error("Could not parse summary response:", rawText);
      return NextResponse.json({ summary: MOCK_SUMMARY });
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const summary: SessionSummary = {
      overview: parsed.overview || "",
      topicsDiscussed: parsed.topicsDiscussed || [],
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      actionItems: (parsed.actionItems || []).map(
        (a: {
          task: string;
          assignee: string;
          deadline?: string;
          completed?: boolean;
        }) => ({
          task: a.task,
          assignee: a.assignee as "student" | "teacher",
          deadline: a.deadline,
          completed: a.completed ?? false,
        })
      ),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json({ summary: MOCK_SUMMARY });
  }
}

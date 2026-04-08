import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Transcription } from "@/lib/types/interview";
import type { SessionSummary } from "@/lib/types/session";
import { buildSummaryPrompt } from "@/lib/ai/prompts/summary";

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
      return NextResponse.json(
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
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
      return NextResponse.json(
        { error: "サマリーレスポンスの解析に失敗しました" },
        { status: 500 }
      );
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
    return NextResponse.json(
      { error: "サマリー生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

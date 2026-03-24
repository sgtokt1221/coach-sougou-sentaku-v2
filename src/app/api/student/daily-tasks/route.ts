import { NextResponse } from "next/server";
import type {
  DailyTask,
  DailyTasksResponse,
} from "@/lib/ai/prompts/daily-tasks";

const mockTasks: DailyTask[] = [
  {
    type: "essay",
    title: "小論文の練習を1本提出しよう",
    description:
      "前回の添削で指摘された論理構成を意識して、新しいテーマで書いてみましょう。",
    link: "/student/essay/new",
    priority: "high",
  },
  {
    type: "interview",
    title: "模擬面接で志望理由を練習",
    description:
      "志望理由書の内容と面接回答の一貫性を確認するため、15分の模擬面接を行いましょう。",
    link: "/student/interview/new",
    priority: "high",
  },
  {
    type: "document",
    title: "活動報告書の下書きを確認",
    description:
      "出願期限まで余裕があるうちに、活動報告書の構成を見直しておきましょう。",
    link: "/student/documents",
    priority: "medium",
  },
  {
    type: "activity",
    title: "課外活動の記録を更新",
    description:
      "最近の活動実績をAIヒアリングで構造化し、出願書類に活用できるようにしましょう。",
    link: "/student/activities/new",
    priority: "medium",
  },
  {
    type: "university",
    title: "志望校の最新情報をチェック",
    description:
      "出願要件や選考日程に変更がないか確認しておきましょう。",
    link: "/student/universities",
    priority: "low",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "おつかれさまです";
}

export async function GET() {
  // TODO: 将来的にはuserIdからFirestoreデータを収集し、Claude APIでパーソナライズされたタスクを生成
  // 現在はモックデータを返却
  const response: DailyTasksResponse = {
    tasks: mockTasks.slice(0, 3 + Math.floor(Math.random() * 2)), // 3-4件をランダムに返却
    greeting: getGreeting(),
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}

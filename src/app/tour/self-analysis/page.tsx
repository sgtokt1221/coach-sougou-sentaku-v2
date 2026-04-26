"use client";

/**
 * /tour/self-analysis
 * 実 /student/self-analysis を再利用。モック /api/self-analysis?userId=me が
 * completedSteps:3 + values/strengths/weaknesses 入りを返すので、GrowthTree も
 * ワークショップタブも本物の見た目で動く。
 */
export { default } from "@/app/student/self-analysis/page";

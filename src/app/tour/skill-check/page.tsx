"use client";

/**
 * /tour/skill-check
 * 実 /student/skill-check の page をそのまま再利用。
 * モック /api/skill-check/status と /api/interview-skill-check/status が
 * tutorial 用の history・latestResult を返すので、Hero / 統計 / タブ切替が
 * 全て本物の見た目で動く。
 */
export { default } from "@/app/student/skill-check/page";

"use client";

/**
 * /tour/dashboard
 *
 * 実 /student/dashboard の page コンポーネントをそのまま再利用する。
 * チュートリアルモードが立っていれば useAuth は mock profile を、
 * useAuthSWR / authFetch は src/lib/tutorial/mocks.ts の API モックを返すので、
 * 実 GrowthTree や SkillRankPanel が「サンプルデータ入りで」描画される。
 */
export { default } from "@/app/student/dashboard/page";

/**
 * チュートリアル（/tour/*）モードで認証なしに使うモック生徒プロフィール。
 * 関西大学法学部志望、文化祭実行委員長経験あり、という典型的な総合型受験生に設定。
 */

import type { StudentProfile } from "@/lib/types/user";

export const TUTORIAL_MOCK_PROFILE: StudentProfile = {
  uid: "tour-demo-user",
  email: "tour-demo@coach.example",
  displayName: "山田 太郎",
  role: "student",
  plan: "standard",
  school: "私立つくば高等学校",
  grade: 3,
  gpa: 4.2,
  englishCerts: [{ type: "EIKEN", grade: "準1級" }],
  targetUniversities: ["kansai-univ-law"],
  onboardingCompleted: true,
  skillCheckCompleted: true,
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date(),
};

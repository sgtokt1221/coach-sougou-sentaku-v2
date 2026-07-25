import { db, auth } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * Update user profile directly via client-side Firestore SDK.
 * Firestore rules allow users to write their own document (request.auth.uid == userId).
 */
export async function updateProfile(data: {
  targetUniversities?: string[];
  gpa?: number | null;
  englishCerts?: { type: string; score?: string }[];
  grade?: number | null;
  school?: string;
  schoolId?: string;
  onboardingCompleted?: boolean;
  academicCategory?: string;
}): Promise<boolean> {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db) return false;

  const userRef = doc(db, "users", uid);
  const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.targetUniversities !== undefined) updateData.targetUniversities = data.targetUniversities;
  if (data.gpa !== undefined) updateData.gpa = data.gpa;
  if (data.englishCerts !== undefined) updateData.englishCerts = data.englishCerts;
  if (data.grade !== undefined) {
    updateData.grade = data.grade;
    // 学年自動加算用: 4/1 を境に経過年度分を表示時に加算するため、 入力日時を記録。
    // 値が変わったときだけ記録する。 学習プロフィール保存は学年を触らなくても
    // grade を毎回送るため、 無条件に記録すると加算の起点がリセットされ、
    // 表示学年が1年巻き戻る。
    const current = await getDoc(userRef);
    if ((current.data()?.grade ?? null) !== (data.grade ?? null)) {
      updateData.gradeUpdatedAt = new Date().toISOString();
    }
  }
  if (data.school !== undefined) updateData.school = data.school;
  if (data.schoolId !== undefined) updateData.schoolId = data.schoolId;
  if (data.onboardingCompleted !== undefined) updateData.onboardingCompleted = data.onboardingCompleted;
  if (data.academicCategory !== undefined) updateData.academicCategory = data.academicCategory;

  await updateDoc(userRef, updateData);
  return true;
}

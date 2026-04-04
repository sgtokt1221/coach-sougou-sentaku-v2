import { db, auth } from "@/lib/firebase/config";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

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
  onboardingCompleted?: boolean;
}): Promise<boolean> {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db) return false;

  const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.targetUniversities !== undefined) updateData.targetUniversities = data.targetUniversities;
  if (data.gpa !== undefined) updateData.gpa = data.gpa;
  if (data.englishCerts !== undefined) updateData.englishCerts = data.englishCerts;
  if (data.grade !== undefined) updateData.grade = data.grade;
  if (data.school !== undefined) updateData.school = data.school;
  if (data.onboardingCompleted !== undefined) updateData.onboardingCompleted = data.onboardingCompleted;

  await updateDoc(doc(db, "users", uid), updateData);
  return true;
}

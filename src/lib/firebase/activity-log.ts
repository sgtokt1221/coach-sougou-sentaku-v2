import { adminDb } from "@/lib/firebase/admin";

export async function logActivity(
  type: "essay_submit" | "interview_complete" | "student_added" | "student_assigned",
  description: string,
  options?: { studentName?: string; adminName?: string }
): Promise<void> {
  if (!adminDb) return;
  try {
    await adminDb.collection("activities").add({
      type,
      description,
      timestamp: new Date(),
      ...(options?.studentName && { studentName: options.studentName }),
      ...(options?.adminName && { adminName: options.adminName }),
    });
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }
}

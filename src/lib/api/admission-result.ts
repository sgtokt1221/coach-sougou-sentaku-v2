import type { Firestore } from "firebase-admin/firestore";

/** 合格/進学先 1 校分の選択 */
export interface AdmissionPick {
  universityId: string;
  universityName: string;
  facultyId?: string;
  facultyName?: string;
}

/**
 * 進路登録ペイロード。
 * - enrolled: 進学先（実際に進学する1校）
 * - passed: その他の合格校（複数可）
 * - nonUniversity: 進学しない場合（浪人/就職/未定 等の理由）
 * enrolled か nonUniversity のどちらかは必須（高校→進学先 集計のため）。
 */
export interface AdmissionPayload {
  enrolled?: AdmissionPick;
  passed?: AdmissionPick[];
  nonUniversity?: { reason: string };
}

/** 入力検証。エラーメッセージ（無ければ null） */
export function validateAdmission(p: AdmissionPayload): string | null {
  const hasEnrolled = !!p.enrolled?.universityName;
  const hasNon = !!p.nonUniversity?.reason?.trim();
  if (!hasEnrolled && !hasNon) {
    return "進学先大学、または「進学しない」理由のいずれかを入力してください";
  }
  return null;
}

/**
 * 進路（進学先＋合格校 or 進学しない理由）を examResults / profile に記録する。
 * 進学先は status:"passed" + enrolled:true、合格校は enrolled:false で保存。
 * profile に enrolledUniversity* と graduationOutcomeRecorded:true を立て、卒業生催促を停止する。
 */
export async function recordAdmissionResults(
  adminDb: Firestore,
  uid: string,
  p: AdmissionPayload,
): Promise<void> {
  const now = new Date();
  const batch = adminDb.batch();
  const col = adminDb.collection(`users/${uid}/examResults`);

  const writePick = (pick: AdmissionPick, enrolled: boolean) => {
    batch.set(col.doc(), {
      userId: uid,
      universityId: pick.universityId ?? "",
      universityName: pick.universityName,
      facultyId: pick.facultyId ?? "",
      facultyName: pick.facultyName ?? "",
      status: "passed",
      enrolled,
      resultDate: now.toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    });
  };

  if (p.enrolled?.universityName) writePick(p.enrolled, true);
  for (const pick of p.passed ?? []) {
    if (!pick.universityName) continue;
    // 進学先と同一(大学+学部)は重複登録しない
    if (
      p.enrolled &&
      pick.universityId === p.enrolled.universityId &&
      (pick.facultyId ?? "") === (p.enrolled.facultyId ?? "")
    ) {
      continue;
    }
    writePick(pick, false);
  }

  const profileUpdate: Record<string, unknown> = {
    graduationOutcomeRecorded: true,
    updatedAt: now,
  };
  if (p.enrolled?.universityName) {
    profileUpdate.enrolledUniversityId = p.enrolled.universityId ?? "";
    profileUpdate.enrolledUniversityName = p.enrolled.universityName;
  }
  if (p.nonUniversity?.reason?.trim()) {
    profileUpdate.graduationOutcomeReason = p.nonUniversity.reason.trim();
  }
  batch.set(adminDb.doc(`users/${uid}`), profileUpdate, { merge: true });

  await batch.commit();
}

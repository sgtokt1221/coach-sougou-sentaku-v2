/**
 * 保存済みの答案から、本番の添削と同じ入力（設問・出題資料・学部AP）を組み立てる。
 * 採点し直す処理（rescore-essays / 合格者ラインの作り直し）で共用する。
 * 弱点リストと前回の答案は呼び出し側で決める。
 */
import { adminDb } from "@/lib/firebase/admin";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { resolveQuestionSource } from "@/lib/essay/lecture-info";
import { isPartialEssay } from "@/lib/essay/derive-weakness-issues";
import type { EssayReviewCoreInput } from "@/lib/essay/review-core";

export async function resolveAdmissionPolicy(
  universityId: string | undefined,
  facultyId: string | undefined,
  /** 過去問の学部名。本番の添削と同じく、こちらの学部のAPを優先する */
  pastQuestionFacultyName?: string | null
): Promise<string> {
  if (!universityId) return "";
  const uni = await adminDb!.doc(`universities/${universityId}`).get();
  if (!uni.exists) return "";
  const data = uni.data()!;
  type Faculty = { id: string; name: string; admissionPolicy?: string };
  const faculties: Faculty[] = data.faculties ?? [];
  const faculty =
    (pastQuestionFacultyName
      ? faculties.find(
          (f) =>
            f.name === pastQuestionFacultyName ||
            pastQuestionFacultyName.includes(f.name)
        )
      : undefined) ?? faculties.find((f) => f.id === facultyId);
  if (!faculty?.admissionPolicy) return "";
  const prepared = prepareAdmissionPolicy(faculty.admissionPolicy);
  return prepared.text
    ? `大学: ${data.name}\n学部: ${faculty.name}\nAP: ${prepared.text}`
    : "";
}

/** 答案（essays の data）から添削の入力を作る。弱点リストは渡された値を使う */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function reviewInputOf(e: any, weaknessList: string): Promise<EssayReviewCoreInput> {
  const ctx = e.questionContext ?? {};
  return {
    ocrText: e.ocrText ?? e.originalText ?? "",
    topic: e.topic,
    questionType: ctx.questionType ?? undefined,
    sourceText: ctx.sourceText ?? undefined,
    chartDataSummary: ctx.chartDataSummary ?? undefined,
    // TED の書き起こしは保存していないので出題元から引き直す
    lectureInfo: resolveQuestionSource(ctx).lectureInfo ?? ctx.lectureInfo ?? undefined,
    wordLimit: ctx.wordLimit ?? undefined,
    admissionPolicy: await resolveAdmissionPolicy(
      e.targetUniversity,
      e.targetFaculty,
      ctx.pastQuestionFacultyName
    ),
    weaknessList,
    partial: isPartialEssay(e),
  };
}

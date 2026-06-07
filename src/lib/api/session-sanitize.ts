import type { Session } from "@/lib/types/session";

/**
 * 生徒に返す前に講師専用フィールドを落とす。
 * summary(指導報告書) は sharedWithStudent が true のときだけ残す。
 * researchInputs 等の生徒画面で使うフィールドはそのまま残す。
 */
export function sanitizeForStudent(s: Session): Partial<Session> {
  const {
    notes: _notes,
    prepPlan: _prepPlan,
    practiceQuestions: _pq,
    debrief: _debrief,
    lessonTranscript: _lt,
    recordingUrl: _ru,
    recordingPath: _rp,
    recordingDurationSec: _rds,
    recordingSizeBytes: _rsb,
    createdByAdminId: _cba,
    ...rest
  } = s as Session & Record<string, unknown>;
  void _notes; void _prepPlan; void _pq; void _debrief; void _lt;
  void _ru; void _rp; void _rds; void _rsb; void _cba;
  if (!s.sharedWithStudent) delete (rest as { summary?: unknown }).summary;
  return rest as Partial<Session>;
}

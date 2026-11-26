/**
 * 学部の公式サイトを調べる処理をタスクキューに積む（2026-11-27）。
 * 書類の作成・下書き・別の案・添削の経路から呼ぶ。待たせずに積むだけで、AI の処理
 * （faculty-info-research.ts）はここから読まない。情報がまだ無い間は今までどおりの下書きが出て、次回から使われる。
 */
import {
  appBaseUrl,
  enqueueHttpTask,
  isCloudTasksConfigured,
  taskNameFor,
} from "@/lib/gcp/cloud-tasks";
import {
  FACULTY_INFO_COLLECTION,
  FACULTY_INFO_VERSION,
  facultyInfoDocId,
} from "./faculty-info";

const JOB_PATH = "/api/cron/faculty-info";
/** 自動で調べ直す失敗の回数（faculty-info-research.ts の MAX_FACULTY_RESEARCH_ATTEMPTS と同じ） */
const MAX_ATTEMPTS = 2;

/** 年度（4月1日区切り、日本時間）。年に1回取り直す */
export function academicYearOf(iso: string | Date): number {
  const jst = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return jst.getUTCMonth() >= 3 ? jst.getUTCFullYear() : jst.getUTCFullYear() - 1;
}

async function enqueue(name: string, body: { universityId: string; facultyId: string }) {
  // エミュレータから本番の URL へタスクを積まない。未設定の環境では何もしない
  if (process.env.FIRESTORE_EMULATOR_HOST || !isCloudTasksConfigured()) return false;
  try {
    await enqueueHttpTask({
      name: taskNameFor(name),
      url: `${appBaseUrl()}${JOB_PATH}`,
      scheduleTime: new Date(),
      body,
      headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
    });
  } catch (err) {
    // 同じ名前のタスクが既にある = もう頼んである
    if (err instanceof Error && err.message.includes(" 409 ")) return true;
    throw err;
  }
  return true;
}

/**
 * その学部の情報が無い・古いときだけ、調べる処理を積む。失敗しても呼び出し元は失敗させない。
 */
export async function ensureFacultyInfo(
  universityId: unknown,
  facultyId: unknown
): Promise<void> {
  if (typeof universityId !== "string" || typeof facultyId !== "string") return;
  if (!universityId || !facultyId) return;
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) return;
    const docId = facultyInfoDocId(universityId, facultyId);
    const data = (await adminDb.doc(`${FACULTY_INFO_COLLECTION}/${docId}`).get()).data();
    const year = academicYearOf(new Date());
    const fresh =
      data?.version === FACULTY_INFO_VERSION &&
      (data.status === "ready" || data.status === "empty") &&
      typeof data.collectedAt === "string" &&
      academicYearOf(data.collectedAt) === year;
    if (fresh) return;
    const attempts = Number(data?.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) return;
    // 同じ学部・版・年度・試行回数で1つだけ積まれる
    await enqueue(
      `faculty-info-${docId}-${FACULTY_INFO_VERSION}-${year}-${attempts}`,
      { universityId, facultyId }
    );
  } catch (err) {
    console.error("[faculty-info] 調べる処理を頼めなかった:", err);
  }
}

/** 管理画面の「取り直す」。名前に時刻を入れる（入れないと同じ名前で弾かれ、黙って何も起きない） */
export async function requestFacultyInfoRefresh(
  universityId: string,
  facultyId: string
): Promise<boolean> {
  return enqueue(
    `faculty-info-${facultyInfoDocId(universityId, facultyId)}-manual-${Date.now()}`,
    { universityId, facultyId }
  );
}

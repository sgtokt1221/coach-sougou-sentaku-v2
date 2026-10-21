import { getAdminAccessToken } from "@/lib/firebase/admin";

/**
 * Cloud Tasks（REST v2）の最小ラッパー。
 * 指定時刻に HTTP を1回だけ叩くために使う。予約が無い間は何も動かず課金も無い。
 *
 * キューは CLOUD_TASKS_QUEUE（projects/{p}/locations/{l}/queues/{q}）で指定する。
 * 未設定なら isCloudTasksConfigured() が false を返し、呼び出し側は機能を止める。
 */

const API = "https://cloudtasks.googleapis.com/v2";

function queuePath(): string | null {
  return process.env.CLOUD_TASKS_QUEUE?.trim() || null;
}

export function isCloudTasksConfigured(): boolean {
  return Boolean(queuePath() && process.env.CRON_SECRET);
}

/** タスク名に使えるのは英数・ハイフン・下線のみ */
export function taskNameFor(id: string): string {
  return `${queuePath()}/tasks/${id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export async function enqueueHttpTask(opts: {
  /** 同じ名前のタスクは二重に作られない（再送で重複しない） */
  name: string;
  url: string;
  scheduleTime: Date;
  body: unknown;
  headers?: Record<string, string>;
}): Promise<void> {
  const queue = queuePath();
  if (!queue) throw new Error("CLOUD_TASKS_QUEUE が未設定です");
  const token = await getAdminAccessToken();
  if (!token) throw new Error("GCP の認証情報がありません");

  const res = await fetch(`${API}/${queue}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: {
        name: opts.name,
        scheduleTime: opts.scheduleTime.toISOString(),
        httpRequest: {
          httpMethod: "POST",
          url: opts.url,
          headers: { "Content-Type": "application/json", ...opts.headers },
          body: Buffer.from(JSON.stringify(opts.body)).toString("base64"),
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Cloud Tasks enqueue failed: ${res.status} ${await res.text()}`
    );
  }
}

/** 取り消し。消せなくても配信側が状態を見て何もしないので、失敗は握りつぶす */
export async function deleteTask(name: string): Promise<void> {
  try {
    const token = await getAdminAccessToken();
    if (!token) return;
    await fetch(`${API}/${name}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn("[cloud-tasks] delete failed:", err);
  }
}

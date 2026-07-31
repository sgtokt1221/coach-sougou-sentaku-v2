import { auth } from "@/lib/firebase/config";
import { getTutorialMock, isTutorialActive } from "@/lib/tutorial/mocks";

let viewAsAdminUid: string | null = null;

export function setViewAsAdmin(uid: string | null) {
  viewAsAdminUid = uid;
}

export function getViewAsAdmin(): string | null {
  return viewAsAdminUid;
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // チュートリアル（/tour/*）モード: 実 API を呼ばずにモック・空成功で擬似応答
  if (isTutorialActive()) {
    const method = (options.method ?? "GET").toUpperCase();
    if (method === "GET") {
      const mock = getTutorialMock(url);
      if (mock !== null) {
        return new Response(JSON.stringify(mock), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // モック未定義の GET は空オブジェクトでフォールバック (実画面の loading/empty を出す)
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    // 書き込み系は実 DB 汚染防止のため握りつぶし、空成功扱い
    console.warn("[tutorial] mocked write:", method, url);
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(options.headers);

  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers.set("Authorization", `Bearer ${token}`);
    } catch {
      // token取得失敗時はヘッダーなしで続行
    }
  }

  // dev mode: send role header
  if (!auth?.currentUser && typeof window !== "undefined") {
    const devRole = localStorage.getItem("devRole");
    if (devRole) {
      headers.set("X-Dev-Role", devRole);
    }
  }

  // AdminScope: viewAs parameter
  if (viewAsAdminUid) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}viewAs=${encodeURIComponent(viewAsAdminUid)}`;
  }

  return fetch(url, { ...options, headers });
}

/**
 * 提出物を開いたことを自分の既読として記録する（管理者/講師）。
 * バッジ用の記録なので失敗しても本体機能は止めない。
 */
export async function markSubmissionViewed(
  kind: string,
  id: string,
  studentId?: string,
): Promise<void> {
  try {
    await authFetch("/api/admin/unviewed-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, studentId }),
    });
  } catch {
    // バッジが消えないだけなので握りつぶす
  }
}

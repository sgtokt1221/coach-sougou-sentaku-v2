import { auth } from "@/lib/firebase/config";

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
  // チュートリアル中の非 GET リクエストは握りつぶす (実 DB 汚染防止)
  if (
    typeof window !== "undefined" &&
    localStorage.getItem("tutorialActive") === "true" &&
    options.method &&
    options.method.toUpperCase() !== "GET"
  ) {
    console.warn("[tutorial] blocked non-GET:", options.method, url);
    return new Response(null, { status: 204 });
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

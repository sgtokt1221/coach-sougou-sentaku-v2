import useSWR, { type SWRConfiguration } from "swr";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { getTutorialMock, isTutorialActive } from "@/lib/tutorial/mocks";

/**
 * fetch エラー時、サーバーから返ってきた {error, detail, step} を
 * Error オブジェクトのプロパティに格納する。SWR の `error` 経由で
 * 呼び出し側がエラー詳細を表示できるようにするため。
 */
export interface ApiError extends Error {
  status: number;
  detail?: string;
  step?: string;
}

const fetcher = async (url: string) => {
  const res = await authFetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      step?: string;
    };
    const err = new Error(body.error ?? `API error: ${res.status}`) as ApiError;
    err.status = res.status;
    err.detail = body.detail;
    err.step = body.step;
    throw err;
  }
  return res.json();
};

export function useAuthSWR<T>(
  key: string | null,
  config?: SWRConfiguration<T>
) {
  const { user, loading } = useAuth();

  // チュートリアル（/tour/*）モードかどうかを毎レンダーで判定
  const tutorial = isTutorialActive();
  const tutorialMock = key && tutorial ? (getTutorialMock(key) as T | null) : null;

  // フックは常に同じ順序で呼ぶ。引数だけ条件で切り替える
  // - tutorial 中: key はそのまま、fetcher はモック即返、fallbackData も供給
  // - 通常: 認証完了まで key=null で保留
  const resolvedKey = tutorial ? key : user && !loading ? key : null;

  return useSWR<T>(
    resolvedKey,
    tutorial ? () => tutorialMock as T : fetcher,
    {
      revalidateOnFocus: false,
      errorRetryCount: 2,
      ...(tutorial
        ? {
            fallbackData: (tutorialMock ?? undefined) as T,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
          }
        : {}),
      ...config,
    }
  );
}

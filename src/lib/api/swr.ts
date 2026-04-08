import useSWR, { type SWRConfiguration } from "swr";
import { authFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";

const fetcher = async (url: string) => {
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export function useAuthSWR<T>(
  key: string | null,
  config?: SWRConfiguration<T>
) {
  const { user, loading } = useAuth();
  // auth準備前はキーをnullにしてfetchを保留（空レスポンスのキャッシュを防止）
  const resolvedKey = user && !loading ? key : null;
  return useSWR<T>(resolvedKey, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
    ...config,
  });
}

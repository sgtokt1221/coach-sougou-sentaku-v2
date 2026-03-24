import useSWR, { type SWRConfiguration } from "swr";
import { authFetch } from "@/lib/api/client";

const fetcher = async (url: string) => {
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export function useAuthSWR<T>(
  key: string | null,
  config?: SWRConfiguration<T>
) {
  return useSWR<T>(key, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
    ...config,
  });
}

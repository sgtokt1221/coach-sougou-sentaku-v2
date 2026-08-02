"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { SWRConfig, type SWRConfiguration } from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { createSwrCacheProvider, clearSwrCache } from "@/lib/api/swr-persist";

/**
 * SWR のキャッシュを uid ごとに localStorage へ持たせる。
 *
 * key を uid にして、ユーザーが変わったら SWRConfig ごと作り直す。
 * こうしないと前のユーザーのキャッシュを引き継いでしまい、共用PCで
 * 別の管理者のデータが一瞬見える。
 */
export function SwrCacheProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const uid = user?.uid ?? null;

  // ログアウト時・ユーザー切替時に、他ユーザー分のキャッシュを掃除する
  useEffect(() => {
    if (loading) return;
    clearSwrCache(uid ?? undefined);
  }, [uid, loading]);

  const provider = useMemo(
    () => createSwrCacheProvider(uid) as SWRConfiguration["provider"],
    [uid],
  );

  return (
    <SWRConfig key={uid ?? "anon"} value={{ provider }}>
      {children}
    </SWRConfig>
  );
}

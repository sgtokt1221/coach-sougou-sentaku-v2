"use client";

/**
 * SWR のキャッシュを localStorage に持たせる。
 *
 * 既定のキャッシュはメモリなので、画面を開くたびに空になり、毎回ゼロから
 * 取り直す間スケルトンを見せていた。バックエンドが冷えていると、その待ちが
 * そのまま体感になる（実測でコンテナ起動直後は7〜12秒）。
 *
 * 前回の内容を先に描いて、裏で必ず取り直す。表示を埋めるだけで、更新は
 * 止めない（SWR の revalidateOnMount は既定の true のまま使う）。
 *
 * 安全策:
 * - キャッシュは uid ごとに分ける。共用PCで別の管理者のデータを見せない
 * - ログアウト時に破棄する
 * - 古すぎるものは使わない（TTL）
 * - localStorage を溢れさせない（容量上限を超えたら諦めて捨てる）
 */

const PREFIX = "swr-cache:";
/** これより古いキャッシュは表示に使わない。古い数字を見せ続けないため短めにする */
const TTL_MS = 30 * 60 * 1000;
/** 1ユーザーあたりの保存上限。超えるなら保存しない（表示より容量事故を避ける） */
const MAX_BYTES = 1_500_000;

interface Persisted {
  savedAt: number;
  entries: [string, unknown][];
}

function storageKey(uid: string): string {
  return `${PREFIX}${uid}`;
}

/** 認証済みユーザー以外のキャッシュを全部消す。ログアウト・ユーザー切替で使う */
export function clearSwrCache(exceptUid?: string): void {
  if (typeof window === "undefined") return;
  try {
    const keep = exceptUid ? storageKey(exceptUid) : null;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX) && k !== keep) localStorage.removeItem(k);
    }
  } catch {
    // localStorage が使えない環境では何もしない
  }
}

/**
 * uid 用のキャッシュ provider を作る。
 * SWRConfig に渡す。uid が変わったら SWRConfig ごと remount すること。
 */
export function createSwrCacheProvider(uid: string | null) {
  return () => {
    const map = new Map<string, unknown>();
    if (typeof window === "undefined" || !uid) return map;

    // 復元
    try {
      const raw = localStorage.getItem(storageKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        if (Date.now() - parsed.savedAt <= TTL_MS) {
          for (const [k, v] of parsed.entries) map.set(k, v);
        } else {
          localStorage.removeItem(storageKey(uid));
        }
      }
    } catch {
      // 壊れていたら捨てて空から始める
      try {
        localStorage.removeItem(storageKey(uid));
      } catch {
        /* noop */
      }
    }

    const save = () => {
      try {
        // エラーや取得中のものは残さない。次回開いたときにエラー表示を
        // 復元してしまうのを防ぐ
        const entries: [string, unknown][] = [];
        for (const [k, v] of map) {
          const st = v as { data?: unknown; error?: unknown } | undefined;
          if (!st || st.error !== undefined || st.data === undefined) continue;
          entries.push([k, { data: st.data }]);
        }
        const payload = JSON.stringify({ savedAt: Date.now(), entries });
        if (payload.length > MAX_BYTES) {
          localStorage.removeItem(storageKey(uid));
          return;
        }
        localStorage.setItem(storageKey(uid), payload);
      } catch {
        // 容量オーバー等。キャッシュは無くても動くので握りつぶす
      }
    };

    // 離脱時に保存。visibilitychange も見るのは、モバイルで pagehide/
    // beforeunload が発火しないことがあるため
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
    });

    return map;
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";

export type DraftSyncStatus = "loading" | "idle" | "saving" | "saved" | "error";

interface StoredDraft<T> {
  data: T;
  version: number;
  updatedAt: string;
}

interface UsePersistentDraftOptions<T> {
  /** 機能・画面ごとに一意なキー。英数字・コロン・ハイフン・アンダースコアのみ。 */
  key: string;
  value: T;
  onRestore: (draft: T) => void;
  hasContent: (draft: T) => boolean;
  enabled?: boolean;
  delay?: number;
  version?: number;
  /**
   * これより古い下書きは自動復元しない（ミリ秒）。
   *
   * お題ごとにキーが分かれない画面（自由テーマなど）では、下書き置き場を
   * 共有するため、別の問題を書き始めたときに前の下書きが開いてしまう。
   * 「書きかけの続き」は履歴からいつでも開けるので、直近のものだけ自動で戻す。
   * 未指定なら期限なし（お題ごとにキーが分かれている画面はこちら）。
   */
  maxAgeMs?: number;
}

export interface PersistentDraftResult {
  status: DraftSyncStatus;
  ready: boolean;
  restored: boolean;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
  clearDraft: () => Promise<void>;
}

const LOCAL_PREFIX = "coach:persistent-draft:v1";

function parseStored<T>(
  raw: string | null,
  version: number
): StoredDraft<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraft<T>>;
    if (
      parsed.version !== version ||
      typeof parsed.updatedAt !== "string" ||
      !("data" in parsed)
    ) {
      return null;
    }
    return parsed as StoredDraft<T>;
  } catch {
    return null;
  }
}

/**
 * 入力途中の state をユーザー別に端末へ即時退避し、少し遅れて Firestore に同期する。
 * 復元時は端末とクラウドの updatedAt を比較して新しい方を採用する。
 */
export function usePersistentDraft<T>({
  key,
  value,
  onRestore,
  hasContent,
  enabled = true,
  delay = 1200,
  version = 1,
  maxAgeMs,
}: UsePersistentDraftOptions<T>): PersistentDraftResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const localKey = uid ? `${LOCAL_PREFIX}:${uid}:${key}` : null;

  const [status, setStatus] = useState<DraftSyncStatus>("loading");
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const valueRef = useRef(value);
  const restoreRef = useRef(onRestore);
  const hasContentRef = useRef(hasContent);
  const snapshotRef = useRef(JSON.stringify(value));
  const loadBaselineRef = useRef(JSON.stringify(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    valueRef.current = value;
    restoreRef.current = onRestore;
    hasContentRef.current = hasContent;
  });

  const syncToCloud = useCallback(
    async (draftValue: T, generation: number) => {
      try {
        const meaningful = hasContentRef.current(draftValue);
        const res = await authFetch(
          meaningful
            ? "/api/student/drafts"
            : `/api/student/drafts?key=${encodeURIComponent(key)}`,
          meaningful
            ? {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, data: draftValue, version }),
              }
            : { method: "DELETE" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (generation === generationRef.current) {
          const savedAt = new Date();
          setStatus("saved");
          setLastSavedAt(savedAt);
        }
      } catch {
        if (generation === generationRef.current) setStatus("error");
      }
    },
    [key, version]
  );

  const stageLatest = useCallback(
    async (immediate: boolean) => {
      if (!enabled || !ready || !localKey) return;
      const draftValue = valueRef.current;
      const snapshot = JSON.stringify(draftValue);
      if (!immediate && snapshot === snapshotRef.current) return;

      snapshotRef.current = snapshot;
      setRestored(false);
      const generation = ++generationRef.current;
      const meaningful = hasContentRef.current(draftValue);
      try {
        if (meaningful) {
          const envelope: StoredDraft<T> = {
            data: draftValue,
            version,
            updatedAt: new Date().toISOString(),
          };
          window.localStorage.setItem(localKey, JSON.stringify(envelope));
        } else {
          window.localStorage.removeItem(localKey);
        }
      } catch {
        // Cloud sync can still succeed when storage is unavailable/private.
      }
      setStatus("saving");

      if (timerRef.current) clearTimeout(timerRef.current);
      if (immediate) {
        await syncToCloud(draftValue, generation);
      } else {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void syncToCloud(draftValue, generation);
        }, delay);
      }
    },
    [delay, enabled, localKey, ready, syncToCloud, version]
  );

  // 端末を先に復元し、その後クラウドの方が新しければ差し替える。
  useEffect(() => {
    if (!enabled || !uid || !localKey) {
      setReady(false);
      setStatus("loading");
      return;
    }
    let cancelled = false;
    const currentAtLoad = JSON.stringify(valueRef.current);
    loadBaselineRef.current = currentAtLoad;
    snapshotRef.current = currentAtLoad;
    setReady(false);
    setRestored(false);
    setStatus("loading");

    let localDraft: StoredDraft<T> | null = null;
    try {
      localDraft = parseStored<T>(
        window.localStorage.getItem(localKey),
        version
      );
    } catch {
      localDraft = null;
    }
    /** 古すぎる下書きは、別の問題のものとみなして自動では戻さない */
    const isFresh = (updatedAt?: string) => {
      if (maxAgeMs === undefined) return true;
      const t = updatedAt ? Date.parse(updatedAt) : NaN;
      if (Number.isNaN(t)) return false;
      return Date.now() - t <= maxAgeMs;
    };

    if (
      localDraft &&
      hasContentRef.current(localDraft.data) &&
      isFresh(localDraft.updatedAt)
    ) {
      restoreRef.current(localDraft.data);
      const snapshot = JSON.stringify(localDraft.data);
      snapshotRef.current = snapshot;
      loadBaselineRef.current = snapshot;
      setRestored(true);
      setLastSavedAt(new Date(localDraft.updatedAt));
      setReady(true);
      setStatus("saved");
    }

    void (async () => {
      try {
        const res = await authFetch(
          `/api/student/drafts?key=${encodeURIComponent(key)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as { draft: StoredDraft<T> | null };
        if (cancelled) return;
        const remote = payload.draft;
        const localTime = localDraft ? Date.parse(localDraft.updatedAt) : 0;
        const remoteTime = remote?.updatedAt ? Date.parse(remote.updatedAt) : 0;
        const currentSnapshot = JSON.stringify(valueRef.current);
        const unchangedSinceLoad =
          currentSnapshot === loadBaselineRef.current ||
          (Boolean(localDraft) && currentSnapshot === currentAtLoad);
        if (
          remote &&
          remote.version === version &&
          hasContentRef.current(remote.data) &&
          isFresh(remote.updatedAt) &&
          remoteTime >= localTime &&
          unchangedSinceLoad
        ) {
          restoreRef.current(remote.data);
          const snapshot = JSON.stringify(remote.data);
          snapshotRef.current = snapshot;
          loadBaselineRef.current = snapshot;
          setRestored(true);
          setLastSavedAt(remote.updatedAt ? new Date(remote.updatedAt) : null);
          try {
            window.localStorage.setItem(localKey, JSON.stringify(remote));
          } catch {}
        }
        setReady(true);
        setStatus(remote || localDraft ? "saved" : "idle");
      } catch {
        if (!cancelled) {
          setReady(true);
          setStatus(localDraft ? "saved" : "error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, key, localKey, uid, version, maxAgeMs]);

  useEffect(() => {
    if (!ready) return;
    void stageLatest(false);
  }, [ready, stageLatest, value]);

  // ブラウザが背景へ移る瞬間にも、最新値だけは同期的に端末へ残す。
  useEffect(() => {
    if (!ready) return;
    const persistLocal = () => {
      if (document.visibilityState !== "hidden" || !localKey) return;
      const current = valueRef.current;
      try {
        if (hasContentRef.current(current)) {
          window.localStorage.setItem(
            localKey,
            JSON.stringify({
              data: current,
              version,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", persistLocal);
    return () => document.removeEventListener("visibilitychange", persistLocal);
  }, [localKey, ready, version]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const saveNow = useCallback(async () => {
    await stageLatest(true);
  }, [stageLatest]);

  const clearDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    generationRef.current += 1;
    try {
      if (localKey) window.localStorage.removeItem(localKey);
    } catch {}
    setRestored(false);
    setStatus("idle");
    try {
      await authFetch(`/api/student/drafts?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
    } catch {
      // A completed flow must not be blocked by draft cleanup.
    }
  }, [key, localKey]);

  return { status, ready, restored, lastSavedAt, saveNow, clearDraft };
}

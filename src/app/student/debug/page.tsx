"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api/client";

/**
 * デバッグページ (一時的)。
 * `/api/student/debug` を叩いて、レーダーチャート未描画の原因特定に必要な
 * Firestore 生データ形状を JSON で表示する。
 *
 * ユーザーがコピーペーストで開発者に共有するための簡易 UI。
 * 原因特定後はページごと削除する。
 */
export default function StudentDebugPage() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await authFetch("/api/student/debug");
        if (!res.ok) {
          const t = await res.text();
          if (alive) setError(`HTTP ${res.status}: ${t}`);
          return;
        }
        const json = await res.json();
        if (alive) setData(json);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const text = data ? JSON.stringify(data, null, 2) : "";

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Debug: Growth Report Data</h1>
      <p className="text-sm text-gray-600">
        以下の JSON をコピーして開発者に貼り付けてください。
      </p>
      {error && (
        <pre className="bg-red-50 text-red-800 p-3 rounded text-xs whitespace-pre-wrap">
          {error}
        </pre>
      )}
      {!data && !error && <p className="text-sm">読込中…</p>}
      {data !== null && (
        <>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
          >
            {copied ? "コピーしました" : "JSON をコピー"}
          </button>
          <pre className="bg-gray-50 border p-3 rounded text-xs whitespace-pre-wrap overflow-x-auto max-h-[70vh] overflow-y-auto">
            {text}
          </pre>
        </>
      )}
    </div>
  );
}

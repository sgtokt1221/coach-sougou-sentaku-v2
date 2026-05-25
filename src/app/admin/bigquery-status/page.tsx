"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Wrench, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";

type StatusResponse = {
  env?: {
    projectId: string | null;
    dataset: string;
    hasCredentials: boolean;
  };
  dataset?: {
    exists: boolean;
    error?: string;
  };
  tables?: Record<
    string,
    { exists?: boolean; rowCount24h?: number | null; error?: string; queryError?: string }
  >;
  hint?: string;
};

export default function BigQueryStatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<unknown>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/admin/bigquery-status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /** 過去 essays / interviews を BQ に流す移行バッチ (superadmin) */
  const runBackfill = async (dryRun: boolean) => {
    if (
      !dryRun &&
      !confirm(
        "Firestore の essays / interviews 全件を BigQuery に投入します。 実行?",
      )
    )
      return;
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const qs = dryRun ? "?dryRun=true" : "";
      const res = await authFetch(`/api/admin/bigquery-backfill${qs}`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setBackfillResult(body);
      toast.success(
        dryRun ? "ドライラン完了 (件数のみ計算)" : "移行完了",
      );
      if (!dryRun) await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "移行に失敗しました");
    } finally {
      setBackfillLoading(false);
    }
  };

  /** 日次スナップショットを手動実行 (= Cloud Scheduler の代替) */
  const runSnapshot = async () => {
    if (!confirm("全生徒の本日分スナップショットを student_snapshots に書き出します。 実行?")) return;
    setSnapshotLoading(true);
    setSnapshotResult(null);
    try {
      const res = await authFetch("/api/admin/bigquery-snapshot", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setSnapshotResult(body);
      toast.success("スナップショット完了");
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "スナップショット失敗");
    } finally {
      setSnapshotLoading(false);
    }
  };

  /** dataset + 3 テーブルを冪等に作成 (superadmin 限定) */
  const runSetup = async () => {
    if (
      !confirm(
        "BigQuery dataset と 3 テーブルを作成します (既存リソースは触りません)。 実行しますか?",
      )
    )
      return;
    setSetupLoading(true);
    try {
      const res = await authFetch("/api/admin/bigquery-setup", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      toast.success("セットアップ完了。 ステータスを再確認します");
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "セットアップに失敗しました");
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BigQuery ステータス</h1>
          <p className="text-sm text-muted-foreground">
            BigQuery 接続 / dataset / テーブル / 直近 24h 件数を確認
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStatus} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            確認する
          </Button>
          <Button onClick={runSetup} disabled={setupLoading} variant="outline">
            {setupLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Wrench className="mr-2 size-4" />
            )}
            セットアップ
          </Button>
          <Button
            onClick={() => runBackfill(true)}
            disabled={backfillLoading}
            variant="outline"
          >
            {backfillLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            移行 (件数のみ)
          </Button>
          <Button onClick={() => runBackfill(false)} disabled={backfillLoading}>
            {backfillLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            移行 実行
          </Button>
          <Button onClick={runSnapshot} disabled={snapshotLoading} variant="outline">
            {snapshotLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Camera className="mr-2 size-4" />
            )}
            日次スナップショット
          </Button>
        </div>
      </div>

      {snapshotResult !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">スナップショット 結果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded bg-muted p-3 text-[11px]">
              {JSON.stringify(snapshotResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {backfillResult !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">過去データ移行 結果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded bg-muted p-3 text-[11px]">
              {JSON.stringify(backfillResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="p-4 text-sm">エラー: {error}</CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">環境変数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <StatusRow
                label="Project ID"
                ok={Boolean(data.env?.projectId)}
                value={data.env?.projectId ?? "未設定"}
              />
              <StatusRow
                label="Dataset 名"
                ok={Boolean(data.env?.dataset)}
                value={data.env?.dataset ?? "—"}
              />
              <StatusRow
                label="認証情報"
                ok={Boolean(data.env?.hasCredentials)}
                value={data.env?.hasCredentials ? "あり" : "なし"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dataset 接続</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <StatusRow
                label="dataset 存在"
                ok={data.dataset?.exists === true}
                value={data.dataset?.exists ? "OK" : "存在しない"}
              />
              {data.dataset?.error && (
                <p className="text-xs text-rose-600">エラー: {data.dataset.error}</p>
              )}
              {data.hint && (
                <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">
                  ヒント: {data.hint}
                </p>
              )}
            </CardContent>
          </Card>

          {data.tables && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">テーブル別 状況 (直近 24h 件数)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {Object.entries(data.tables).map(([name, t]) => (
                  <div key={name} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{name}</span>
                      {t.exists ? (
                        <Badge
                          variant={
                            (t.rowCount24h ?? 0) > 0 ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {t.rowCount24h ?? "?"} 件 / 24h
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          未作成
                        </Badge>
                      )}
                    </div>
                    {t.error && (
                      <p className="mt-1 text-xs text-rose-600">{t.error}</p>
                    )}
                    {t.queryError && (
                      <p className="mt-1 text-xs text-amber-700">
                        query エラー: {t.queryError}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded bg-muted p-3 text-[11px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatusRow({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <XCircle className="size-4 text-rose-600" />
        )}
        <span>{label}</span>
      </div>
      <span className="font-mono text-xs text-muted-foreground">{value}</span>
    </div>
  );
}

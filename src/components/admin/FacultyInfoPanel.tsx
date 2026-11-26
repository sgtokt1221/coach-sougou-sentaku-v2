"use client";

import { useState } from "react";
import { ExternalLink, EyeOff, Eye, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
// 型だけ読む（faculty-info.ts はサーバー用の読み込みを持つ）
import type {
  FacultyInfoCategory,
  FacultyInfoItem,
} from "@/lib/universities/faculty-info";

const FACULTY_INFO_CATEGORY_LABELS: Record<FacultyInfoCategory, string> = {
  course: "コース・専攻",
  feature: "学びの特色",
  program: "独自プログラム",
};

interface FacultyInfoResponse {
  status: "none" | "ready" | "empty" | "failed" | "running";
  items: FacultyInfoItem[];
  collectedAt: string | null;
  lastError: string | null;
  running: boolean;
}

const STATUS_LABEL: Record<FacultyInfoResponse["status"], string> = {
  none: "未取得",
  running: "取得中",
  ready: "取得済み",
  empty: "0件",
  failed: "失敗",
};

const emptyDraft = {
  category: "feature" as FacultyInfoCategory,
  title: "",
  summary: "",
  quote: "",
  sourceUrl: "",
};

/** 学部の公式サイトから取った特色（下書き・添削に渡す）。本部だけが直せる */
export function FacultyInfoPanel({
  universityId,
  facultyId,
  canEdit,
}: {
  universityId: string;
  facultyId: string;
  canEdit: boolean;
}) {
  const url = `/api/admin/faculty-info/${encodeURIComponent(universityId)}/${encodeURIComponent(facultyId)}`;
  const { data, mutate } = useAuthSWR<FacultyInfoResponse>(url);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  async function call(method: "PATCH" | "POST", body?: unknown) {
    setBusy(true);
    try {
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "失敗しました");
      await mutate();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "失敗しました");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const status = data?.running ? "running" : (data?.status ?? "none");
  const items = data?.items ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">
          公式サイトの特色
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {STATUS_LABEL[status]}
            {data?.collectedAt
              ? `・${new Date(data.collectedAt).toLocaleDateString("ja-JP")}`
              : ""}
          </span>
        </h4>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setAdding((v) => !v)}>
              <Plus className="mr-1 size-3" />
              手で足す
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || data?.running}
              onClick={async () => {
                if (await call("POST")) toast.success("取り直しを頼みました");
              }}
            >
              <RefreshCw className="mr-1 size-3" />
              取り直す
            </Button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <ul className="divide-border divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className={`space-y-1 px-3 py-2 ${item.hidden ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground mr-2 text-xs">
                    {FACULTY_INFO_CATEGORY_LABELS[item.category]}
                    {item.origin === "manual" ? "・手入力" : ""}
                  </span>
                  {item.title}
                </p>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={item.hidden ? "戻す" : "外す"}
                    title={item.hidden ? "戻す" : "外す"}
                    onClick={() => call("PATCH", { action: item.hidden ? "show" : "hide", itemId: item.id })}
                  >
                    {item.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                )}
              </div>
              <p className="text-sm">{item.summary}</p>
              <p className="text-muted-foreground text-xs">「{item.quote}」</p>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
              >
                <ExternalLink className="size-3" />
                {item.sourceUrl}
              </a>
            </li>
          ))}
        </ul>
      )}

      {canEdit && adding && (
        <div className="bg-muted space-y-2 rounded-lg p-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FACULTY_INFO_CATEGORY_LABELS) as FacultyInfoCategory[]).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={draft.category === c ? "default" : "outline"}
                onClick={() => setDraft({ ...draft, category: c })}
              >
                {FACULTY_INFO_CATEGORY_LABELS[c]}
              </Button>
            ))}
          </div>
          <Input placeholder="見出し" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Textarea placeholder="要約" rows={2} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          <Textarea placeholder="公式ページの原文" rows={2} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} />
          <Input placeholder="出典URL" value={draft.sourceUrl} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              やめる
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (await call("PATCH", { action: "add", ...draft })) {
                  setDraft(emptyDraft);
                  setAdding(false);
                }
              }}
            >
              足す
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

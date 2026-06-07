"use client";

import { useEffect, useRef, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { storage } from "@/lib/firebase/config";
import type { ResearchInputAttachment, ResearchSessionInputs } from "@/lib/types/session";

/**
 * 探究授業中、生徒が端末から テーマ/出典URL/メモ/資料画像 を入力する。
 * テキストはデバウンスで、画像はアップロード後に PATCH /api/sessions/[id]/research-input へ保存し、
 * 講師のセッション画面へライブ反映される（画面遷移なし＝録音が止まらない）。
 */
export function StudentResearchLiveInput({
  sessionId,
  studentUid,
  initial,
}: {
  sessionId: string;
  studentUid: string;
  initial?: ResearchSessionInputs;
}) {
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [sourceUrls, setSourceUrls] = useState((initial?.sourceUrls ?? []).join("\n"));
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [attachments, setAttachments] = useState<ResearchInputAttachment[]>(
    initial?.attachments ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dirtyRef = useRef(false);

  // テキストはデバウンス保存（初回マウントでは保存しない）
  useEffect(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      return;
    }
    const t = setTimeout(() => {
      void patch({
        topic,
        memo,
        sourceUrls: sourceUrls.split("\n").map((s) => s.trim()).filter(Boolean),
      });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, memo, sourceUrls]);

  async function patch(body: Partial<ResearchSessionInputs>) {
    try {
      const res = await authFetch(`/api/sessions/${sessionId}/research-input`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSavedAt(Date.now());
    } catch {
      /* 失敗は静かに（次回入力で再送される） */
    }
  }

  async function onPickImages(files: FileList | null) {
    if (!files || !storage) return;
    setUploading(true);
    try {
      const next = [...attachments];
      for (const f of Array.from(files).slice(0, 6 - attachments.length)) {
        if (!f.type.startsWith("image/")) continue;
        const ext = (f.type.split("/")[1] ?? "jpg").toLowerCase();
        const path = `essays/${studentUid}/research/${sessionId}/${Date.now()}-${next.length}.${ext}`;
        const r = storageRef(storage, path);
        await uploadBytes(r, f, { contentType: f.type });
        const url = await getDownloadURL(r);
        next.push({ url, mediaType: f.type, name: f.name });
      }
      setAttachments(next);
      await patch({ attachments: next });
      toast.success("資料をアップロードしました");
    } catch {
      toast.error("資料のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(i: number) {
    const next = attachments.filter((_, j) => j !== i);
    setAttachments(next);
    void patch({ attachments: next });
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">授業中の入力（先生にリアルタイムで届きます）</CardTitle>
        {savedAt && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3" />
            保存済み
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">今日のテーマ</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="今日話す内容" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">出典URL（1行に1つ）</Label>
          <Textarea
            rows={3}
            value={sourceUrls}
            onChange={(e) => setSourceUrls(e.target.value)}
            placeholder={"https://www.example.ac.jp/...\nhttps://..."}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">メモ（補足）</Label>
          <Textarea
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="口頭で言いそびれた点など"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">資料画像（スライド等）</Label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            画像を追加
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading || attachments.length >= 6}
              onChange={(e) => onPickImages(e.target.files)}
            />
          </label>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((a, i) => (
                <Badge key={i} variant="outline" className="gap-1">
                  {a.name}
                  <button type="button" onClick={() => removeAttachment(i)}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

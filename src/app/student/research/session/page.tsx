"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Lightbulb, ImagePlus, X } from "lucide-react";
import VoiceRecorder from "@/components/interview/VoiceRecorder";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { ResearchEvalResult } from "@/lib/ai/prompts/research";

interface SessionItem {
  id: string;
  topic: string;
  feedback: ResearchEvalResult | null;
  nextItems: string[];
  createdAt: string | null;
}
interface Gate {
  researchEnrolled: boolean;
  researchConsentStatus: "none" | "pending" | "granted" | "revoked";
}
interface Attachment {
  dataBase64: string;
  mediaType: string;
  name: string;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * 自己探究授業の「教える」セッション画面（探究モード）。
 * 受講登録＋保護者同意(granted)が揃った生徒のみ録音・AI講評を利用できる。
 */
export default function ResearchSessionPage() {
  const [gate, setGate] = useState<Gate | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  const [topic, setTopic] = useState("");
  const [audio, setAudio] = useState<{ base64: string; mimeType: string } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sourceUrls, setSourceUrls] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<ResearchEvalResult | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await authFetch("/api/research/sessions");
      if (res.ok) setSessions(await res.json());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/research/consent");
        if (res.ok) setGate(await res.json());
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
      loadSessions();
    })();
  }, [loadSessions]);

  const onPickImages = async (files: FileList | null) => {
    if (!files) return;
    const picked: Attachment[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      if (!f.type.startsWith("image/")) continue;
      picked.push({ dataBase64: await readAsBase64(f), mediaType: f.type, name: f.name });
    }
    setAttachments((a) => [...a, ...picked].slice(0, 6));
  };

  const evaluate = async () => {
    if (!audio && attachments.length === 0) {
      toast.error("録音または資料を用意してください");
      return;
    }
    setEvaluating(true);
    setResult(null);
    try {
      const urls = sourceUrls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await authFetch("/api/research/evaluate", {
        method: "POST",
        body: JSON.stringify({
          topic,
          audioBase64: audio?.base64,
          mimeType: audio?.mimeType,
          attachments: attachments.map((a) => ({
            dataBase64: a.dataBase64,
            mediaType: a.mediaType,
          })),
          sourceUrls: urls,
          previousNextItems: sessions[0]?.nextItems ?? [],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "");
      }
      const data = await res.json();
      setResult(data.feedback);
      toast.success("講評を作成しました");
      loadSessions();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "講評の作成に失敗しました");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 受講/同意ゲート
  if (!gate?.researchEnrolled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            探究授業の受講登録がありません。受講をご希望の場合は教室にお問い合わせください。
          </CardContent>
        </Card>
      </div>
    );
  }
  if (gate.researchConsentStatus !== "granted") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <p>録音・AI講評を使うには、保護者の同意が必要です。</p>
            <Button asChild size="sm">
              <Link href="/student/research/consent">同意ページへ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const prev = sessions[0];

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 lg:py-8">
      <h1 className="flex items-center gap-2 text-lg font-bold lg:text-xl">
        <Sparkles className="size-5 text-primary" />
        探究セッション（教える）
      </h1>

      {prev && prev.nextItems.length > 0 && (
        <Card className="border-sky-200 bg-sky-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="size-4 text-sky-600" />
              前回の「次回やること」
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {prev.nextItems.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日の発表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">テーマ</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: 地域の商店街の活性化"
            />
          </div>

          <div className="space-y-2">
            <Label>録音</Label>
            <VoiceRecorder
              onRecordingComplete={(base64, mimeType) => {
                setAudio({ base64, mimeType });
                toast.success("録音を取り込みました");
              }}
            />
            {audio && <p className="text-xs text-emerald-600">録音を取り込み済み</p>}
          </div>

          <div className="space-y-2">
            <Label>資料（スライド・レジュメの画像）</Label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
              <ImagePlus className="size-4" />
              画像を追加
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onPickImages(e.target.files)}
              />
            </label>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {a.name}
                    <button
                      type="button"
                      onClick={() => setAttachments((arr) => arr.filter((_, j) => j !== i))}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sources">出典URL（1行に1つ・公式/一次情報を推奨）</Label>
            <Textarea
              id="sources"
              value={sourceUrls}
              onChange={(e) => setSourceUrls(e.target.value)}
              placeholder={"https://www.example.ac.jp/...\nhttps://..."}
              rows={3}
            />
          </div>

          <Button disabled={evaluating} onClick={evaluate}>
            {evaluating && <Loader2 className="mr-1 size-4 animate-spin" />}
            AIに講評してもらう
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="text-base">講評</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-emerald-700">良かったところ</p>
              <p>{result.good}</p>
            </div>
            <div>
              <p className="font-semibold text-amber-700">ここを一つ改善</p>
              <p>{result.improve}</p>
            </div>
            <div>
              <p className="font-semibold text-sky-700">次回の問い</p>
              <p>{result.nextQuestion}</p>
            </div>
            {result.curriculumItems.length > 0 && (
              <div>
                <p className="font-semibold">次回やること</p>
                <ul className="list-disc space-y-1 pl-5">
                  {result.curriculumItems.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
              <p>資料との整合: {result.materialConsistency}</p>
              <p>出典の信頼性: {result.sourceReliability}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

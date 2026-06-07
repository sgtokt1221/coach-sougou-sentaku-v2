"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Lightbulb, ImagePlus, X, Save } from "lucide-react";
import VoiceRecorder from "@/components/interview/VoiceRecorder";
import { ResearchEvalView } from "@/components/research/ResearchEvalView";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import type { ResearchEvalResult } from "@/lib/ai/prompts/research";
import type { ResearchCurriculum, ResearchCurriculumUnit } from "@/lib/types/research";
import { RESEARCH_MAX_UNITS } from "@/lib/types/research";
import type { ResearchSessionInputs } from "@/lib/types/session";

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

interface AdminResearchSessionProps {
  sessionId: string;
  studentId: string;
  studentName: string;
  /** 講師コメント初期値（session.researchTeacherComment） */
  initialComment?: string;
  /** 講師コメント保存（親で patchSession({ researchTeacherComment }) を実行） */
  onSaveComment: (comment: string) => Promise<void> | void;
  savingComment?: boolean;
}

/**
 * 探究セッションの講師画面。その場で録音・資料添付・出典入力→AI講評を実行し、
 * 結果（5軸スコア＋レーダー＋コメント）を表示。講師の所見も保存できる。
 */
export function AdminResearchSession({
  sessionId,
  studentId,
  studentName,
  initialComment,
  onSaveComment,
  savingComment = false,
}: AdminResearchSessionProps) {
  const [curriculum, setCurriculum] = useState<ResearchCurriculum | null>(null);
  const [genDomain, setGenDomain] = useState("");
  const [genTheme, setGenTheme] = useState("");
  const [genGoal, setGenGoal] = useState("");
  const [genCount, setGenCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [audio, setAudio] = useState<{ base64: string; mimeType: string } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sourceUrls, setSourceUrls] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<ResearchEvalResult | null>(null);
  const [resultTopic, setResultTopic] = useState("");
  const [previousNextItems, setPreviousNextItems] = useState<string[]>([]);
  const [currentUnit, setCurrentUnit] = useState<ResearchCurriculumUnit | null>(null);
  const [comment, setComment] = useState(initialComment ?? "");

  // 生徒の授業中入力をポーリングでライブ取得（admin は sessions を client 購読できないため）
  const { data: liveData } = useAuthSWR<{ researchInputs: ResearchSessionInputs | null }>(
    `/api/admin/sessions/${sessionId}/research-input`,
    { refreshInterval: 4000 }
  );
  const studentInputs = liveData?.researchInputs ?? null;

  useEffect(() => {
    setComment(initialComment ?? "");
  }, [initialComment]);

  // 生徒テーマが届いたら、テーマ未入力のとき自動で補完
  useEffect(() => {
    if (studentInputs?.topic) setTopic((t) => (t ? t : studentInputs.topic!));
  }, [studentInputs?.topic]);

  const loadExisting = useCallback(async () => {
    try {
      const res = await authFetch(`/api/admin/sessions/${sessionId}/research-evaluation`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.current?.feedback) {
        setResult(data.current.feedback);
        setResultTopic(data.current.topic ?? "");
      }
      setPreviousNextItems(data.previousNextItems ?? []);
      if (data.currentUnit) {
        setCurrentUnit(data.currentUnit);
        // テーマ未入力ならカリキュラムの今回ユニットで初期化
        setTopic((t) => (t ? t : data.currentUnit.title ?? ""));
      }
    } catch {
      /* noop */
    }
  }, [sessionId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const loadCurriculum = useCallback(async () => {
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/research-curriculum`);
      if (!res.ok) return;
      const data = (await res.json()) as ResearchCurriculum | null;
      setCurriculum(data);
      if (data && data.status !== "active") {
        // draft の決定をプレフィル
        setGenDomain(data.domain ?? "");
        setGenTheme(data.theme ?? "");
        setGenGoal(data.goal ?? "");
      }
    } catch {
      /* noop */
    }
  }, [studentId]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  const generateCurriculum = async () => {
    if (!genTheme.trim()) {
      toast.error("テーマを入力してください");
      return;
    }
    setGenerating(true);
    try {
      const res = await authFetch(`/api/admin/students/${studentId}/research-curriculum/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: genDomain,
          theme: genTheme,
          goal: genGoal,
          unitCount: genCount,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "");
      }
      setCurriculum(await res.json());
      await loadExisting(); // 今回のユニットを取得
      toast.success("カリキュラムを作成しました");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "カリキュラム生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

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
    const studentUrls = (studentInputs?.attachments ?? []).map((a) => a.url);
    if (!audio && attachments.length === 0 && studentUrls.length === 0) {
      toast.error("録音または資料を用意してください");
      return;
    }
    setEvaluating(true);
    try {
      // 講師の出典＋生徒の出典をマージ（重複除去）
      const teacherUrls = sourceUrls.split("\n").map((s) => s.trim()).filter(Boolean);
      const urls = Array.from(new Set([...teacherUrls, ...(studentInputs?.sourceUrls ?? [])]));
      const res = await authFetch(`/api/admin/sessions/${sessionId}/research-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          audioBase64: audio?.base64,
          mimeType: audio?.mimeType,
          attachments: attachments.map((a) => ({
            dataBase64: a.dataBase64,
            mediaType: a.mediaType,
          })),
          attachmentUrls: studentUrls,
          sourceUrls: urls,
          previousNextItems,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "");
      }
      const data = await res.json();
      setResult(data.feedback);
      setResultTopic(topic);
      toast.success("講評を作成しました");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "講評の作成に失敗しました"
      );
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Sparkles className="size-5 text-primary" />
        探究セッション（{studentName}が教える）
      </h2>

      {!curriculum || curriculum.status !== "active" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">カリキュラムを作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {curriculum
                ? "生徒が決めた分野・テーマを確認し、回数を決めて作成してください（編集可）。"
                : "生徒がまだ分野を決めていません。生徒のセッション画面で分野が決まるとここに反映されます（手動入力でも作成できます）。"}
            </p>
            <div className="space-y-1">
              <Label className="text-xs">分野</Label>
              <Input value={genDomain} onChange={(e) => setGenDomain(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">テーマ</Label>
              <Input value={genTheme} onChange={(e) => setGenTheme(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ゴール／問い</Label>
              <Input value={genGoal} onChange={(e) => setGenGoal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">回数（1〜{RESEARCH_MAX_UNITS}）</Label>
              <Input
                type="number"
                min={1}
                max={RESEARCH_MAX_UNITS}
                value={genCount}
                onChange={(e) =>
                  setGenCount(Math.min(RESEARCH_MAX_UNITS, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-24"
              />
            </div>
            <Button onClick={generateCurriculum} disabled={generating || !genTheme.trim()}>
              {generating && <Loader2 className="mr-1 size-4 animate-spin" />}
              カリキュラムを生成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>

      {previousNextItems.length > 0 && (
        <Card className="border-sky-200 bg-sky-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="size-4 text-sky-600" />
              前回の「次回やること」
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {previousNextItems.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {currentUnit && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-teal-600" />
              今回のユニット（第{currentUnit.order}回）: {currentUnit.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">狙い:</span> {currentUnit.aim}
            </p>
            {currentUnit.research.length > 0 && (
              <div>
                <span className="text-muted-foreground">調べること:</span>
                <ul className="list-disc space-y-0.5 pl-5">
                  {currentUnit.research.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <p>
              <span className="text-muted-foreground">教えるアウトプット:</span> {currentUnit.output}
            </p>
          </CardContent>
        </Card>
      )}

      {studentInputs &&
        (studentInputs.topic ||
          studentInputs.memo ||
          (studentInputs.sourceUrls?.length ?? 0) > 0 ||
          (studentInputs.attachments?.length ?? 0) > 0) && (
          <Card className="border-sky-200 bg-sky-50/40">
            <CardHeader>
              <CardTitle className="text-sm">生徒からの入力（ライブ）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {studentInputs.topic && (
                <p>
                  <span className="text-muted-foreground">テーマ:</span> {studentInputs.topic}
                </p>
              )}
              {studentInputs.memo && (
                <p>
                  <span className="text-muted-foreground">メモ:</span> {studentInputs.memo}
                </p>
              )}
              {(studentInputs.sourceUrls?.length ?? 0) > 0 && (
                <div>
                  <span className="text-muted-foreground">出典:</span>
                  <ul className="list-disc space-y-0.5 pl-5 break-all">
                    {studentInputs.sourceUrls!.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(studentInputs.attachments?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {studentInputs.attachments!.map((a, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={a.url}
                      alt={a.name}
                      className="size-20 rounded border object-cover"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日の発表を記録</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="research-topic">テーマ</Label>
            <Input
              id="research-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: 地域の商店街の活性化"
            />
          </div>

          <div className="space-y-2">
            <Label>録音（発表）</Label>
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
            <Label htmlFor="research-sources">出典URL（1行に1つ・公式/一次情報を推奨）</Label>
            <Textarea
              id="research-sources"
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

      {result && <ResearchEvalView feedback={result} topic={resultTopic} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">講師コメント（所見）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="発表を見ての所見・励まし・次回への助言など（生徒にも表示されます）"
            rows={4}
          />
          <Button
            size="sm"
            disabled={savingComment || comment === (initialComment ?? "")}
            onClick={() => onSaveComment(comment)}
          >
            {savingComment ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Save className="mr-1 size-4" />
            )}
            コメントを保存
          </Button>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

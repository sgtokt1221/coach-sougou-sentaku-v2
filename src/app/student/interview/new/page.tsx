"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mic, Users, BookOpen, ChevronRight, MessageSquare, GraduationCap, Settings, Upload, FileText, Loader2, X, Plus, History } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { InterviewHistory } from "@/components/interview/InterviewHistory";
import type { InterviewMode } from "@/lib/types/interview";
import {
  INTERVIEW_MODE_LABELS,
  INTERVIEW_MODE_DESCRIPTIONS,
} from "@/lib/types/interview";

interface ResolvedUniversity {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
}

const MODE_ICONS: Record<InterviewMode, React.ComponentType<{ className?: string }>> = {
  individual: Mic,
  group_discussion: Users,
  presentation: BookOpen,
  oral_exam: BookOpen,
};

const MODES: InterviewMode[] = ["individual", "group_discussion", "presentation", "oral_exam"];

export default function InterviewNewPage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  // 志望校解決
  const targetUniversities = (userProfile as Record<string, unknown> | null)?.targetUniversities as string[] | undefined ?? [];
  const [resolved, setResolved] = useState<ResolvedUniversity[]>([]);
  const [allUniversities, setAllUniversities] = useState<ResolvedUniversity[]>([]);
  const [showAllUniversities, setShowAllUniversities] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  useEffect(() => {
    async function fetchResolved() {
      try {
        if (targetUniversities.length > 0) {
          const res = await fetch(
            `/api/universities/resolve?ids=${targetUniversities.join(",")}`
          );
          if (res.ok) {
            const data = await res.json();
            setResolved(data.resolved ?? []);
          }
        }
      } catch {
        setResolved([]);
      } finally {
        setLoadingUniversities(false);
      }
    }
    fetchResolved();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUniversities.join(",")]);

  useEffect(() => {
    if (!showAllUniversities || allUniversities.length > 0) return;
    async function fetchAll() {
      try {
        const res = await fetch("/api/universities");
        if (!res.ok) return;
        const data = await res.json();
        const unis: ResolvedUniversity[] = [];
        for (const u of data.universities ?? []) {
          for (const f of u.faculties ?? []) {
            unis.push({ universityId: u.id, facultyId: f.id, universityName: u.name, facultyName: f.name });
          }
        }
        setAllUniversities(unis);
      } catch {}
    }
    fetchAll();
  }, [showAllUniversities, allUniversities.length]);

  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<InterviewMode | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isLoading, setIsLoading] = useState(false);
  const [presentationContent, setPresentationContent] = useState<string | null>(null);
  const [presFileName, setPresFileName] = useState<string | null>(null);
  const [presUploading, setPresUploading] = useState(false);

  // 1校の場合は自動選択
  useEffect(() => {
    if (resolved.length === 1) {
      setSelectedCompoundId(`${resolved[0].universityId}:${resolved[0].facultyId}`);
    }
  }, [resolved]);

  const selectedUni = [...resolved, ...allUniversities].find(
    (r) => `${r.universityId}:${r.facultyId}` === selectedCompoundId
  );
  const universityId = selectedUni?.universityId ?? "";
  const facultyId = selectedUni?.facultyId ?? "";

  async function handleStart() {
    if (!selectedCompoundId || !selectedMode) return;
    setIsLoading(true);
    try {
      const res = await authFetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId, facultyId, mode: selectedMode, inputMode,
          presentationContent: selectedMode === "presentation" ? presentationContent : undefined,
        }),
      });
      if (!res.ok) throw new Error("面接の開始に失敗しました");
      const data = await res.json();
      sessionStorage.setItem(
        `interview_session_${data.sessionId}`,
        JSON.stringify({
          universityId,
          facultyId,
          mode: selectedMode,
          inputMode,
          universityContext: data.universityContext,
          openingMessage: data.openingMessage,
          presentationContent: selectedMode === "presentation" ? presentationContent : undefined,
        })
      );
      router.push(`/student/interview/session/${data.sessionId}`);
    } catch {
      toast.error("面接セッションの開始に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:px-6 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
        <h1 className="text-lg lg:text-xl font-bold flex items-center gap-2">
          <Mic className="size-5" />
          模擬面接
        </h1>
      </div>

      <div className="flex rounded-lg border bg-muted p-1">
        <button
          onClick={() => setActiveTab("new")}
          className={[
            "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "new"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <Plus className="size-3.5" />
          新規面接
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={[
            "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "history"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <History className="size-3.5" />
          面接履歴
        </button>
      </div>

      {activeTab === "history" ? (
        <InterviewHistory />
      ) : (
      <>
      {/* ドリルモード導線 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold text-sm">テーマ別ドリル練習</p>
            <p className="text-xs text-muted-foreground mt-0.5">1問ずつ短い質問に答える軽い練習。5問で1セット（3-5分）</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/student/interview/drill")}>
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* 志望校選択 */}
      {loadingUniversities ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>
      ) : targetUniversities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 py-8">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <GraduationCap className="size-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">志望校が未設定です</p>
              <p className="text-sm text-muted-foreground mt-1">
                設定画面で志望校を登録してください
              </p>
              <Link href="/student/settings">
                <Button variant="outline" size="sm" className="mt-3">
                  <Settings className="size-4 mr-1" />
                  設定画面へ
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : resolved.length === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">志望校</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
              <GraduationCap className="size-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">{resolved[0].universityName}</p>
                <p className="text-xs text-muted-foreground">{resolved[0].facultyName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">志望校を選択</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 space-y-2">
            {resolved.map((item) => {
              const compoundId = `${item.universityId}:${item.facultyId}`;
              const isSelected = selectedCompoundId === compoundId;
              return (
                <button
                  key={compoundId}
                  onClick={() => setSelectedCompoundId(compoundId)}
                  className={[
                    "w-full text-left rounded-lg border p-3 transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap
                      className={[
                        "size-5 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <div>
                      <p className={[
                        "text-sm font-medium",
                        isSelected ? "text-primary" : "",
                      ].join(" ")}>
                        {item.universityName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.facultyName}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 他の大学から選ぶ */}
      <div className="px-1">
        {!showAllUniversities ? (
          <button
            type="button"
            onClick={() => setShowAllUniversities(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
          >
            他の大学・学部から選ぶ
          </button>
        ) : (
          <Card>
            <CardContent className="p-3 lg:p-4 space-y-2">
              <Label className="text-xs">他の大学・学部</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={selectedCompoundId ?? ""}
                onChange={(e) => {
                  if (e.target.value) setSelectedCompoundId(e.target.value);
                }}
              >
                <option value="">選択してください</option>
                {allUniversities.map((u) => {
                  const cid = `${u.universityId}:${u.facultyId}`;
                  return (
                    <option key={cid} value={cid}>
                      {u.universityName} — {u.facultyName}
                    </option>
                  );
                })}
              </select>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 面接モード選択 */}
      {(targetUniversities.length > 0 || selectedCompoundId) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">面接形式を選択</CardTitle>
            </CardHeader>
            <CardContent className="p-3 lg:p-4 space-y-3">
              {MODES.map((mode) => {
                const Icon = MODE_ICONS[mode];
                const isSelected = selectedMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={[
                      "w-full text-left rounded-lg border p-3 lg:p-4 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        className={[
                          "size-5 mt-0.5 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground",
                        ].join(" ")}
                      />
                      <div>
                        <p
                          className={[
                            "font-medium text-sm",
                            isSelected ? "text-primary" : "",
                          ].join(" ")}
                        >
                          {INTERVIEW_MODE_LABELS[mode]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {INTERVIEW_MODE_DESCRIPTIONS[mode]}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* 入力方式選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">入力方式を選択</CardTitle>
            </CardHeader>
            <CardContent className="p-3 lg:p-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setInputMode("text")}
                className={[
                  "rounded-lg border p-3 lg:p-4 text-center transition-colors",
                  inputMode === "text"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                ].join(" ")}
              >
                <MessageSquare
                  className={[
                    "size-6 mx-auto mb-2",
                    inputMode === "text" ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                />
                <p
                  className={[
                    "font-medium text-sm",
                    inputMode === "text" ? "text-primary" : "",
                  ].join(" ")}
                >
                  テキスト入力
                </p>
                <p className="text-xs text-muted-foreground mt-1">キーボードで回答</p>
              </button>
              <button
                onClick={() => setInputMode("voice")}
                className={[
                  "rounded-lg border p-3 lg:p-4 text-center transition-colors",
                  inputMode === "voice"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                ].join(" ")}
              >
                <Mic
                  className={[
                    "size-6 mx-auto mb-2",
                    inputMode === "voice" ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                />
                <p
                  className={[
                    "font-medium text-sm",
                    inputMode === "voice" ? "text-primary" : "",
                  ].join(" ")}
                >
                  音声入力
                </p>
                <p className="text-xs text-muted-foreground mt-1">マイクで回答</p>
              </button>
            </CardContent>
          </Card>

          {/* プレゼン資料アップロード（プレゼンモード時のみ） */}
          {selectedMode === "presentation" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">発表資料（任意）</CardTitle>
              </CardHeader>
              <CardContent className="p-3 lg:p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  PPTX, Keynote, PDF, 画像に対応。資料がなくてもプレゼン面接は開始できます。
                </p>
                {presFileName ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-primary/5 border-primary/30 px-3 py-2">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">{presFileName}</span>
                    <button
                      type="button"
                      onClick={() => { setPresentationContent(null); setPresFileName(null); }}
                      className="rounded-full p-1 hover:bg-muted text-muted-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 cursor-pointer hover:bg-muted/50 transition-colors">
                    {presUploading ? (
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="size-5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {presUploading ? "解析中..." : "ファイルを選択"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pptx,.key,.pdf,.png,.jpg,.jpeg"
                      disabled={presUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPresUploading(true);
                        try {
                          const reader = new FileReader();
                          const base64 = await new Promise<string>((resolve) => {
                            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
                            reader.readAsDataURL(file);
                          });
                          const res = await authFetch("/api/interview/upload-presentation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ fileBase64: base64, fileName: file.name, mimeType: file.type }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setPresentationContent(data.extractedText);
                            setPresFileName(file.name);
                          }
                        } catch { /* */ }
                        setPresUploading(false);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          <Button
            className="w-full"
            disabled={!selectedCompoundId || !selectedMode || isLoading}
            onClick={handleStart}
          >
            {isLoading ? "準備中..." : "面接を開始する"}
            {!isLoading && <ChevronRight className="size-4 ml-1" />}
          </Button>
        </>
      )}
      </>
      )}
    </div>
  );
}

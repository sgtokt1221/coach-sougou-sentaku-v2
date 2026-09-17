"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Mic,
  Users,
  BookOpen,
  ChevronRight,
  MessageSquare,
  GraduationCap,
  Settings,
  Upload,
  FileText,
  Loader2,
  X,
  Plus,
  History,
} from "lucide-react";
import { FluidLoader } from "@/components/shared/FluidLoader";
import { toast } from "sonner";
import { authFetch } from "@/lib/api/client";
import { InterviewHistory } from "@/components/interview/InterviewHistory";
import { UniversityPicker } from "@/components/essay/UniversityPicker";
import type { InterviewMode } from "@/lib/types/interview";
import type { University } from "@/lib/types/university";
import {
  INTERVIEW_MODE_LABELS,
  INTERVIEW_MODE_DESCRIPTIONS,
} from "@/lib/types/interview";
import { FeatureHero } from "@/components/shared/FeatureHero";

interface ResolvedUniversity {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  group?: University["group"];
  prefecture?: string;
}

const MODE_ICONS: Record<
  InterviewMode,
  React.ComponentType<{ className?: string }>
> = {
  individual: Mic,
  group_discussion: Users,
  presentation: BookOpen,
  oral_exam: BookOpen,
};

const MODES: InterviewMode[] = [
  "individual",
  "group_discussion",
  "presentation",
  "oral_exam",
];

/**
 * 口頭試問の分野の入力補助。学部名から、その学部でよく指定される分野を出す。
 * 決め打ちの候補であって、正解ではない（生徒は募集要項を見て自分で入れる）。
 */
function suggestOralExamSubjects(facultyName?: string): string[] {
  const name = facultyName ?? "";
  if (/医|看護|薬|歯|保健|生命|農|獣医/.test(name))
    return ["生物基礎・生物", "化学基礎・化学", "医療と社会の時事"];
  if (/理|工|情報|建築|数学|物理/.test(name))
    return ["数学I・A・II・B", "物理基礎・物理", "情報と社会の時事"];
  if (/法|政治/.test(name)) return ["法学の基礎", "政治・経済", "時事問題"];
  if (/経済|経営|商/.test(name)) return ["政治・経済", "数学I・A", "時事問題"];
  if (/教育/.test(name))
    return ["教育の時事", "子どもと学びの基礎", "小論文課題文の読解"];
  if (/国際|外国語|英/.test(name))
    return ["英語の課題文", "国際関係の時事", "地理・歴史"];
  return ["志望分野の基礎", "時事問題", "課題文の読解"];
}

export default function InterviewNewPage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  // 志望校解決
  const targetUniversities =
    ((userProfile as Record<string, unknown> | null)?.targetUniversities as
      | string[]
      | undefined) ?? [];
  const [resolved, setResolved] = useState<ResolvedUniversity[]>([]);
  const [allUniversities, setAllUniversities] = useState<ResolvedUniversity[]>(
    []
  );
  const [showAllUniversities, setShowAllUniversities] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  // 面接開始ローディング中に表示する回転メッセージ
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

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
            unis.push({
              universityId: u.id,
              facultyId: f.id,
              universityName: u.name,
              facultyName: f.name,
              group: u.group,
              prefecture: u.prefecture,
            });
          }
        }
        setAllUniversities(unis);
      } catch {}
    }
    fetchAll();
  }, [showAllUniversities, allUniversities.length]);

  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(
    null
  );
  const [selectedMode, setSelectedMode] = useState<InterviewMode | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isLoading, setIsLoading] = useState(false);
  const [presentationContent, setPresentationContent] = useState<string | null>(
    null
  );
  /** 口頭試問の出題分野。大学の指定がある人だけが入れる（空欄なら試験官が聞く） */
  const [oralExamSubject, setOralExamSubject] = useState("");
  const [oralExamScope, setOralExamScope] = useState("");
  const [presFileName, setPresFileName] = useState<string | null>(null);
  const [presUploading, setPresUploading] = useState(false);

  // 音声モード利用可否 (7日に1回の制限)
  const [voiceAllowed, setVoiceAllowed] = useState<boolean>(true);
  const [voiceNextAvailableAt, setVoiceNextAvailableAt] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await authFetch("/api/interview/realtime-status");
        if (!res.ok) return;
        const data = await res.json();
        setVoiceAllowed(data.allowed !== false);
        setVoiceNextAvailableAt(data.nextAvailableAt ?? null);
        // 音声不可のときはテキストに強制
        if (data.allowed === false) setInputMode("text");
      } catch {
        // 取得失敗時は voice 許可のまま (サーバー側で再判定される)
      }
    }
    fetchStatus();
  }, []);

  // 1校の場合は自動選択
  useEffect(() => {
    if (resolved.length === 1) {
      setSelectedCompoundId(
        `${resolved[0].universityId}:${resolved[0].facultyId}`
      );
    }
  }, [resolved]);

  // 面接開始中に回転メッセージを切り替える
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIdx((i) => i + 1);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

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
          universityId,
          facultyId,
          mode: selectedMode,
          inputMode,
          presentationContent:
            selectedMode === "presentation" ? presentationContent : undefined,
          oralExam:
            selectedMode === "oral_exam" && oralExamSubject.trim()
              ? {
                  subject: oralExamSubject.trim(),
                  scope: oralExamScope.trim() || undefined,
                }
              : undefined,
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
          presentationContent:
            selectedMode === "presentation" ? presentationContent : undefined,
          // 表示用。採点と質問生成はサーバーに保存した値を使う
          oralExam:
            selectedMode === "oral_exam" && oralExamSubject.trim()
              ? {
                  subject: oralExamSubject.trim(),
                  scope: oralExamScope.trim() || undefined,
                }
              : undefined,
          // 音声モードは Gemini Live に一本化
          voiceProvider: inputMode === "voice" ? "gemini" : undefined,
        })
      );
      router.push(`/student/interview/session/${data.sessionId}`);
    } catch {
      toast.error("面接セッションの開始に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  const loadingMessages = [
    "面接官を招集しています...",
    "会場を準備しています...",
    "志望校の情報を確認しています...",
    "あなたの成長記録を読み込んでいます...",
    "開始テーマを選定しています...",
    "音声を用意しています...",
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 lg:space-y-6 lg:px-6 lg:py-8">
      {/* 面接開始ローディングオーバーレイ */}
      <FluidLoader
        visible={isLoading}
        title="面接を準備中"
        stages={loadingMessages}
        stageInterval={1800}
        subtitle="通常 3〜5 秒かかります"
      />

      {activeTab === "new" && (
        <FeatureHero
          eyebrow="AIと本番さながらの面接練習"
          title="模擬面接"
          description="志望校・学部に合わせてAIが面接官に。テキストでも音声でも練習でき、後で講評が届きます。"
          Icon={Mic}
          accent="rose"
        />
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 size-4" />
          戻る
        </Button>
        {activeTab !== "new" && (
          <h1 className="flex items-center gap-2 text-lg font-bold lg:text-xl">
            <Mic className="size-5" />
            模擬面接
          </h1>
        )}
      </div>

      <div className="bg-muted flex rounded-lg border p-1">
        <button
          onClick={() => setActiveTab("new")}
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
          {/* 志望校選択 */}
          {loadingUniversities ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </CardContent>
            </Card>
          ) : targetUniversities.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-4 py-8">
                <div className="bg-muted flex size-12 items-center justify-center rounded-lg">
                  <GraduationCap className="text-muted-foreground size-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    アドミッションポリシー参照先が未設定です
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    設定画面で志望校を登録してください（面接の基準になります）
                  </p>
                  <Link href="/student/settings">
                    <Button variant="outline" size="sm" className="mt-3">
                      <Settings className="mr-1 size-4" />
                      設定画面へ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : resolved.length === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  アドミッションポリシー参照先
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 lg:p-4">
                <div className="border-primary bg-primary/5 flex items-center gap-3 rounded-lg border p-3">
                  <GraduationCap className="text-primary size-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {resolved[0].universityName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {resolved[0].facultyName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  アドミッションポリシー参照先を選択
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 lg:p-4">
                {resolved.map((item) => {
                  const compoundId = `${item.universityId}:${item.facultyId}`;
                  const isSelected = selectedCompoundId === compoundId;
                  return (
                    <button
                      key={compoundId}
                      onClick={() => setSelectedCompoundId(compoundId)}
                      className={[
                        "w-full rounded-lg border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap
                          className={[
                            "size-5 shrink-0",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground",
                          ].join(" ")}
                        />
                        <div>
                          <p
                            className={[
                              "text-sm font-medium",
                              isSelected ? "text-primary" : "",
                            ].join(" ")}
                          >
                            {item.universityName}
                          </p>
                          <p className="text-muted-foreground text-xs">
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
                className="text-muted-foreground hover:text-primary text-xs underline transition-colors"
              >
                他の大学・学部から選ぶ
              </button>
            ) : (
              <Card>
                <CardContent className="space-y-2 p-3 lg:p-4">
                  <Label className="text-xs">
                    他の大学・学部（検索・都道府県別・グループ別）
                  </Label>
                  <UniversityPicker
                    items={allUniversities}
                    selectedCompoundId={selectedCompoundId}
                    onSelect={setSelectedCompoundId}
                  />
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
                <CardContent className="space-y-3 p-3 lg:p-4">
                  {MODES.map((mode) => {
                    const Icon = MODE_ICONS[mode];
                    const isSelected = selectedMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={[
                          "w-full rounded-lg border p-3 text-left transition-colors lg:p-4",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <Icon
                            className={[
                              "mt-0.5 size-5 shrink-0",
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground",
                            ].join(" ")}
                          />
                          <div>
                            <p
                              className={[
                                "text-sm font-medium",
                                isSelected ? "text-primary" : "",
                              ].join(" ")}
                            >
                              {INTERVIEW_MODE_LABELS[mode]}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
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
                <CardContent className="grid grid-cols-2 gap-3 p-3 lg:p-4">
                  <button
                    onClick={() => setInputMode("text")}
                    className={[
                      "rounded-lg border p-3 text-center transition-colors lg:p-4",
                      inputMode === "text"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <MessageSquare
                      className={[
                        "mx-auto mb-2 size-6",
                        inputMode === "text"
                          ? "text-primary"
                          : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <p
                      className={[
                        "text-sm font-medium",
                        inputMode === "text" ? "text-primary" : "",
                      ].join(" ")}
                    >
                      テキスト入力
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      キーボードで回答
                    </p>
                  </button>
                  <button
                    onClick={() => voiceAllowed && setInputMode("voice")}
                    disabled={!voiceAllowed}
                    className={[
                      "rounded-lg border p-3 text-center transition-colors lg:p-4",
                      !voiceAllowed
                        ? "border-border bg-muted/30 cursor-not-allowed opacity-60"
                        : inputMode === "voice"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <Mic
                      className={[
                        "mx-auto mb-2 size-6",
                        !voiceAllowed
                          ? "text-muted-foreground/50"
                          : inputMode === "voice"
                            ? "text-primary"
                            : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <p
                      className={[
                        "text-sm font-medium",
                        !voiceAllowed
                          ? "text-muted-foreground"
                          : inputMode === "voice"
                            ? "text-primary"
                            : "",
                      ].join(" ")}
                    >
                      音声入力
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {!voiceAllowed && voiceNextAvailableAt
                        ? `${new Date(voiceNextAvailableAt).toLocaleDateString("ja-JP")} から利用可`
                        : "マイクで回答"}
                    </p>
                  </button>
                </CardContent>
                {!voiceAllowed && (
                  <div className="px-4 pb-4">
                    <p className="text-muted-foreground bg-muted/40 rounded-md p-2 text-xs leading-relaxed">
                      音声モードの面接は 7 日に 1
                      回までです。それまではテキストモードで練習できます。
                    </p>
                  </div>
                )}
              </Card>

              {/* 試問の分野（口頭試問モード時のみ） */}
              {selectedMode === "oral_exam" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">試問の分野</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-3 lg:p-4">
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      大学によって出題分野が決まっています。募集要項に指定があれば入れてください。
                      入れるとその分野だけを問われます。指定がなければ空欄のままで構いません
                      （試験官が最初に関心分野を聞きます）。
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="oral-subject" className="text-sm">
                        分野
                      </Label>
                      <Input
                        id="oral-subject"
                        value={oralExamSubject}
                        onChange={(e) => setOralExamSubject(e.target.value)}
                        placeholder="例: 生物基礎・生物 / 数学I・A / 法学の基礎"
                        maxLength={60}
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {suggestOralExamSubjects(selectedUni?.facultyName).map(
                          (s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setOralExamSubject(s)}
                              className="text-muted-foreground hover:bg-muted rounded-full border px-2.5 py-1 text-xs"
                            >
                              {s}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oral-scope" className="text-sm">
                        出題範囲・重点（任意）
                      </Label>
                      <Input
                        id="oral-scope"
                        value={oralExamScope}
                        onChange={(e) => setOralExamScope(e.target.value)}
                        placeholder="例: 高2までの範囲 / 時事と絡めた出題が多い"
                        maxLength={100}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* プレゼン資料アップロード（プレゼンモード時のみ） */}
              {selectedMode === "presentation" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      発表資料（任意）
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-3 lg:p-4">
                    <p className="text-muted-foreground text-xs">
                      PPTX, Keynote, PDF,
                      画像に対応。資料がなくてもプレゼン面接は開始できます。
                    </p>
                    {presFileName ? (
                      <div className="bg-primary/5 border-primary/30 flex items-center gap-2 rounded-lg border px-3 py-2">
                        <FileText className="text-primary size-4 shrink-0" />
                        <span className="flex-1 truncate text-sm font-medium">
                          {presFileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPresentationContent(null);
                            setPresFileName(null);
                          }}
                          className="hover:bg-muted text-muted-foreground rounded-full p-1"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 transition-colors">
                        {presUploading ? (
                          <Loader2 className="text-muted-foreground size-5 animate-spin" />
                        ) : (
                          <Upload className="text-muted-foreground size-5" />
                        )}
                        <span className="text-muted-foreground text-sm">
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
                              const base64 = await new Promise<string>(
                                (resolve) => {
                                  reader.onloadend = () =>
                                    resolve(
                                      (reader.result as string).split(",")[1]
                                    );
                                  reader.readAsDataURL(file);
                                }
                              );
                              const res = await authFetch(
                                "/api/interview/upload-presentation",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    fileBase64: base64,
                                    fileName: file.name,
                                    mimeType: file.type,
                                  }),
                                }
                              );
                              if (res.ok) {
                                const data = await res.json();
                                setPresentationContent(data.extractedText);
                                setPresFileName(file.name);
                              }
                            } catch {
                              /* */
                            }
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
                {!isLoading && <ChevronRight className="ml-1 size-4" />}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

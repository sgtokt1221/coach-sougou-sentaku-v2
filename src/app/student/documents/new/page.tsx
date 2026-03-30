"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import type { DocumentType } from "@/lib/types/document";
import { DOCUMENT_TYPE_LABELS } from "@/lib/types/document";
import type {
  FrameworkType,
  DraftGenerateRequest,
  DraftGenerateResponse,
} from "@/lib/types/template";
import { FRAMEWORK_TYPE_LABELS } from "@/lib/types/template";
import { FRAMEWORKS } from "@/lib/templates/frameworks";
import { DOCUMENT_TEMPLATES } from "@/lib/templates/document-templates";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import type { Activity } from "@/lib/types/activity";

interface UniversityOption {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
}

const MOCK_UNIVERSITIES: UniversityOption[] = [
  { universityId: "kyoto-u", facultyId: "letters", universityName: "京都大学", facultyName: "文学部" },
  { universityId: "osaka-u", facultyId: "engineering", universityName: "大阪大学", facultyName: "工学部" },
  { universityId: "doshisha-u", facultyId: "law", universityName: "同志社大学", facultyName: "法学部" },
  { universityId: "kobe-u", facultyId: "economics", universityName: "神戸大学", facultyName: "経済学部" },
  { universityId: "ritsumeikan-u", facultyId: "policy", universityName: "立命館大学", facultyName: "政策科学部" },
];

const STEPS = ["書類タイプ", "志望校", "フレームワーク", "活動実績", "下書き生成"];

export default function NewDocumentPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityOption | null>(null);
  const [frameworkType, setFrameworkType] = useState<FrameworkType | null>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [targetWordCount, setTargetWordCount] = useState(800);
  const [generating, setGenerating] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftGenerateResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: activitiesData } = useAuthSWR<{ activities: Activity[] }>("/api/activities");
  const activities = activitiesData?.activities || [];

  const template = documentType
    ? DOCUMENT_TEMPLATES.find((t) => t.documentType === documentType)
    : null;

  const recommendedFrameworks = template?.recommendedFrameworks || [];

  const canProceed = () => {
    switch (step) {
      case 0: return !!documentType;
      case 1: return !!selectedUniversity;
      case 2: return !!frameworkType;
      case 3: return true;
      case 4: return !!draftResult;
      default: return false;
    }
  };

  const handleGenerate = async () => {
    if (!documentType || !frameworkType || !selectedUniversity) return;
    setGenerating(true);

    try {
      const req: DraftGenerateRequest = {
        documentType,
        frameworkType,
        universityId: selectedUniversity.universityId,
        facultyId: selectedUniversity.facultyId,
        universityName: selectedUniversity.universityName,
        facultyName: selectedUniversity.facultyName,
        activityIds: selectedActivityIds,
        targetWordCount,
      };

      const res = await authFetch("/api/documents/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!res.ok) throw new Error("生成に失敗しました");
      const data: DraftGenerateResponse = await res.json();
      setDraftResult(data);
    } catch (err) {
      console.error("Draft generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromSelfAnalysis = async () => {
    if (!documentType || !selectedUniversity) return;
    setGenerating(true);

    try {
      const res = await authFetch("/api/documents/generate-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId: selectedUniversity.universityId,
          facultyId: selectedUniversity.facultyId,
        }),
      });

      if (!res.ok) throw new Error("自己分析下書きの生成に失敗しました");
      const data = await res.json();

      // 既存のDraftGenerateResponse形式に変換
      setDraftResult({
        draft: data.draft,
        sections: [
          { title: "導入", content: data.structure.intro },
          { title: "志望理由", content: data.structure.body },
          { title: "自己の強みと貢献", content: data.structure.strengths },
          { title: "将来への展開", content: data.structure.conclusion },
        ],
        wordCount: data.draft.length,
        evaluationScores: data.evaluationScores,
        improvementSuggestions: data.improvementSuggestions,
      });
    } catch (err) {
      console.error("Self-analysis draft generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!documentType || !selectedUniversity || !draftResult) return;
    setSaving(true);

    try {
      const res = await authFetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: documentType,
          universityId: selectedUniversity.universityId,
          facultyId: selectedUniversity.facultyId,
          universityName: selectedUniversity.universityName,
          facultyName: selectedUniversity.facultyName,
          targetWordCount,
          frameworkType,
          initialContent: draftResult.draft,
        }),
      });

      if (!res.ok) throw new Error("保存に失敗しました");
      const doc = await res.json();
      router.push(`/student/documents/${doc.id}`);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">新しい書類を作成</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <span className="w-3.5 text-center text-xs">{i + 1}</span>
              )}
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Document type */}
      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
            <Card
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                documentType === type
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => setDocumentType(type)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {type}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {DOCUMENT_TEMPLATES.find((t) => t.documentType === type)?.sampleStructure
                    .split("\n")[0]
                    .replace("【", "")
                    .replace("】", "") || type}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 1: University selection */}
      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_UNIVERSITIES.map((u) => (
            <Card
              key={`${u.universityId}-${u.facultyId}`}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedUniversity?.universityId === u.universityId &&
                selectedUniversity?.facultyId === u.facultyId
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => setSelectedUniversity(u)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{u.universityName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{u.facultyName}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Framework selection */}
      {step === 2 && (
        <div className="space-y-4">
          {template && (
            <p className="text-sm text-muted-foreground">
              {documentType}には以下のフレームワークが推奨されます。
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRAMEWORKS.map((fw) => {
              const isRecommended = recommendedFrameworks.includes(fw.type);
              return (
                <Card
                  key={fw.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    frameworkType === fw.type
                      ? "ring-2 ring-primary border-primary"
                      : ""
                  }`}
                  onClick={() => setFrameworkType(fw.type)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {fw.name}
                      {isRecommended && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          推奨
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {fw.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {fw.sections.map((s) => (
                        <Badge key={s.id} variant="outline" className="text-xs">
                          {s.title}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Activity selection */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            活動実績を選択すると、下書きに自動的に反映されます（任意）。
          </p>

          <div className="space-y-2">
            <Label htmlFor="wordCount">目標文字数</Label>
            <Input
              id="wordCount"
              type="number"
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(Number(e.target.value))}
              className="w-32"
            />
          </div>

          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                登録済みの活動実績がありません。スキップして下書きを生成できます。
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activities.map((a) => (
                <Card
                  key={a.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedActivityIds.includes(a.id)
                      ? "ring-2 ring-primary border-primary"
                      : ""
                  }`}
                  onClick={() => toggleActivity(a.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedActivityIds.includes(a.id)}
                        readOnly
                        className="h-4 w-4 rounded"
                      />
                      {a.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {a.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Generate & preview */}
      {step === 4 && (
        <div className="space-y-4">
          {!draftResult && !generating && (
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <div className="space-y-2">
                  <p className="font-medium">
                    {documentType} - {selectedUniversity?.universityName}{" "}
                    {selectedUniversity?.facultyName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    フレームワーク: {frameworkType && FRAMEWORK_TYPE_LABELS[frameworkType]}
                    {selectedActivityIds.length > 0 &&
                      ` / 活動実績: ${selectedActivityIds.length}件`}
                    {` / 目標: ${targetWordCount}字`}
                  </p>
                </div>

                <div className="space-y-3">
                  {documentType === "志望理由書" && (
                    <Button
                      onClick={handleGenerateFromSelfAnalysis}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Sparkles className="h-4 w-4" />
                      自己分析から自動下書き生成
                    </Button>
                  )}

                  <Button onClick={handleGenerate} size="lg" className="gap-2" variant="outline">
                    <Sparkles className="h-4 w-4" />
                    フレームワーク形式で下書き生成
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {generating && (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">AIが下書きを生成しています...</p>
              </CardContent>
            </Card>
          )}

          {draftResult && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">生成された下書き</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {draftResult.sections.map((section, i) => (
                    <div key={i} className="space-y-1">
                      <h3 className="font-medium text-sm text-primary">
                        {section.title}
                      </h3>
                      <Textarea
                        value={section.content}
                        onChange={(e) => {
                          const updated = [...draftResult.sections];
                          updated[i] = { ...updated[i], content: e.target.value };
                          setDraftResult({
                            ...draftResult,
                            sections: updated,
                            draft: updated.map((s) => `${s.title}\n\n${s.content}`).join("\n\n"),
                          });
                        }}
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraftResult(null);
                  }}
                >
                  再生成
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  書類として保存
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            前へ
          </Button>
          <Button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canProceed()}
          >
            次へ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

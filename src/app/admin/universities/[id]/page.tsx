"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Building2,
  GraduationCap,
  Calendar,
  FileText,
  Clock,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import type { University, Faculty, SelectionMethod } from "@/lib/types/university";
import { Badge } from "@/components/ui/badge";
import { PAST_QUESTIONS } from "@/data/essay-past-questions";

type SelectionMethodType = SelectionMethod["type"];

const GROUP_LABELS: Record<string, string> = {
  kyutei: "旧帝大",
  soukeijochi: "早慶上智",
  march: "MARCH",
  kankandouritsu: "関関同立",
  sankinkohryu: "産近甲龍",
  nittoukomasen: "日東駒専",
  seiseimeidoku: "成成明獨國武",
  national: "国立大学",
  public: "公立大学",
  private: "その他私立",
};

const METHOD_TYPE_LABELS: Record<SelectionMethodType, string> = {
  documents: "書類選考",
  essay: "小論文",
  interview: "面接",
  presentation: "プレゼン",
  test: "筆記試験",
  other: "その他",
};

function newFaculty(index: number): Faculty {
  return {
    id: `faculty_new_${Date.now()}_${index}`,
    name: `学部${index + 1}`,
    admissionPolicy: "",
    capacity: 0,
    requirements: { gpa: null, englishCert: null, otherReqs: [] },
    selectionMethods: [],
    schedule: {
      applicationStart: "",
      applicationEnd: "",
      examDate: "",
      resultDate: "",
    },
  };
}

function newSelectionMethod(stage: number): SelectionMethod {
  return { stage, type: "documents", details: "" };
}

interface FacultyFormProps {
  faculty: Faculty;
  onChange: (updated: Faculty) => void;
  canEdit: boolean;
}

function FacultyForm({ faculty, onChange, canEdit }: FacultyFormProps) {
  function update<K extends keyof Faculty>(key: K, value: Faculty[K]) {
    onChange({ ...faculty, [key]: value });
  }

  function updateMethod(index: number, updated: SelectionMethod) {
    const methods = [...faculty.selectionMethods];
    methods[index] = updated;
    update("selectionMethods", methods);
  }

  function addMethod() {
    const stage = faculty.selectionMethods.length + 1;
    update("selectionMethods", [
      ...faculty.selectionMethods,
      newSelectionMethod(stage),
    ]);
  }

  function removeMethod(index: number) {
    update(
      "selectionMethods",
      faculty.selectionMethods.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>学部名</Label>
          <Input
            value={faculty.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="例: 法学部"
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label>定員（人）</Label>
          <Input
            type="number"
            value={faculty.capacity || ""}
            onChange={(e) => update("capacity", Number(e.target.value))}
            placeholder="例: 20"
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* Admission Policy */}
      <div className="space-y-2">
        <Label>アドミッションポリシー</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={6}
          value={faculty.admissionPolicy}
          onChange={(e) => update("admissionPolicy", e.target.value)}
          placeholder="アドミッションポリシーを入力..."
          disabled={!canEdit}
        />
      </div>

      <Separator />

      {/* Requirements */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">出願要件</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>GPA（最低基準）</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={faculty.requirements.gpa ?? ""}
              onChange={(e) =>
                update("requirements", {
                  ...faculty.requirements,
                  gpa: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="例: 3.5"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>英語資格</Label>
            <Input
              value={faculty.requirements.englishCert ?? ""}
              onChange={(e) =>
                update("requirements", {
                  ...faculty.requirements,
                  englishCert: e.target.value || null,
                })
              }
              placeholder="例: TOEFL iBT 90以上"
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>その他の要件（1行1件）</Label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={3}
            value={faculty.requirements.otherReqs.join("\n")}
            onChange={(e) =>
              update("requirements", {
                ...faculty.requirements,
                otherReqs: e.target.value
                  ? e.target.value.split("\n").filter(Boolean)
                  : [],
              })
            }
            placeholder="志望理由書&#10;活動報告書&#10;推薦書"
            disabled={!canEdit}
          />
        </div>
      </div>

      <Separator />

      {/* Selection Methods */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">選考方法</h4>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={addMethod}>
              <Plus className="mr-1 size-3" />
              ステージ追加
            </Button>
          )}
        </div>
        {faculty.selectionMethods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            選考ステージがまだありません
          </p>
        ) : (
          <div className="space-y-3">
            {faculty.selectionMethods.map((method, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {method.stage}
                </div>
                <div className="flex flex-1 gap-2">
                  <Select
                    value={method.type}
                    onValueChange={(v) =>
                      updateMethod(idx, {
                        ...method,
                        type: v as SelectionMethodType,
                      })
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue>
                        {METHOD_TYPE_LABELS[method.type] ?? method.type}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(METHOD_TYPE_LABELS) as SelectionMethodType[]).map(
                        (t) => (
                          <SelectItem key={t} value={t}>
                            {METHOD_TYPE_LABELS[t]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    value={method.details}
                    onChange={(e) =>
                      updateMethod(idx, { ...method, details: e.target.value })
                    }
                    placeholder="詳細説明"
                    disabled={!canEdit}
                  />
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeMethod(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Schedule */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="size-4" />
          <h4 className="text-sm font-semibold">日程</h4>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>出願開始日</Label>
            <Input
              type="date"
              value={faculty.schedule.applicationStart}
              onChange={(e) =>
                update("schedule", {
                  ...faculty.schedule,
                  applicationStart: e.target.value,
                })
              }
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>出願締切日</Label>
            <Input
              type="date"
              value={faculty.schedule.applicationEnd}
              onChange={(e) =>
                update("schedule", {
                  ...faculty.schedule,
                  applicationEnd: e.target.value,
                })
              }
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>試験日</Label>
            <Input
              type="date"
              value={faculty.schedule.examDate}
              onChange={(e) =>
                update("schedule", {
                  ...faculty.schedule,
                  examDate: e.target.value,
                })
              }
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>合格発表日</Label>
            <Input
              type="date"
              value={faculty.schedule.resultDate}
              onChange={(e) =>
                update("schedule", {
                  ...faculty.schedule,
                  resultDate: e.target.value,
                })
              }
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUniversityEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { userProfile } = useAuth();
  const canEdit = userProfile?.role === "superadmin";

  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("0");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFacultyIndex, setDeleteFacultyIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchUniversity() {
      try {
        const res = await authFetch(`/api/admin/universities/${id}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setUniversity(data);
        if (data.faculties?.length > 0) setActiveTab("0");
      } catch {
        setUniversity(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUniversity();
  }, [id]);

  function updateBasicField<K extends keyof University>(
    key: K,
    value: University[K]
  ) {
    if (!university) return;
    setUniversity({ ...university, [key]: value });
  }

  function updateFaculty(index: number, updated: Faculty) {
    if (!university) return;
    const faculties = [...university.faculties];
    faculties[index] = updated;
    setUniversity({ ...university, faculties });
  }

  function addFaculty() {
    if (!university) return;
    const newIndex = university.faculties.length;
    const faculties = [...university.faculties, newFaculty(newIndex)];
    setUniversity({ ...university, faculties });
    setActiveTab(String(newIndex));
  }

  function confirmDeleteFaculty(index: number) {
    setDeleteFacultyIndex(index);
    setDeleteDialogOpen(true);
  }

  function deleteFaculty() {
    if (!university || deleteFacultyIndex === null) return;
    const faculties = university.faculties.filter(
      (_, i) => i !== deleteFacultyIndex
    );
    setUniversity({ ...university, faculties });
    const newActive = Math.max(0, deleteFacultyIndex - 1);
    setActiveTab(faculties.length > 0 ? String(newActive) : "0");
    setDeleteDialogOpen(false);
    setDeleteFacultyIndex(null);
  }

  async function handleSave() {
    if (!university) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await authFetch(`/api/admin/universities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(university),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveMessage({ type: "success", text: "保存しました" });
      console.log("University saved:", await res.json());
    } catch {
      setSaveMessage({ type: "error", text: "保存中にエラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">大学が見つかりませんでした。</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/universities")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{university.name}</h1>
            <p className="text-sm text-muted-foreground">
              {canEdit ? "大学情報の編集" : "大学情報の閲覧"}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            {saveMessage && (
              <p
                className={`text-sm ${saveMessage.type === "success" ? "text-emerald-600" : "text-destructive"}`}
              >
                {saveMessage.text}
              </p>
            )}
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>大学名 *</Label>
              <Input
                value={university.name}
                onChange={(e) => updateBasicField("name", e.target.value)}
                placeholder="例: 東京大学"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>略称 *</Label>
              <Input
                value={university.shortName}
                onChange={(e) => updateBasicField("shortName", e.target.value)}
                placeholder="例: 東大"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>グループ</Label>
              <Select
                value={university.group}
                onValueChange={(v) =>
                  updateBasicField("group", v as University["group"])
                }
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="グループを選択">
                    {GROUP_LABELS[university.group] ?? university.group}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GROUP_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>公式URL</Label>
              <Input
                type="url"
                value={university.officialUrl}
                onChange={(e) => updateBasicField("officialUrl", e.target.value)}
                placeholder="https://..."
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Faculties */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4" />
              学部情報
            </CardTitle>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addFaculty}>
                <Plus className="mr-1 size-3" />
                学部追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {university.faculties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              学部がまだ登録されていません。「学部追加」ボタンで追加してください。
            </p>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap gap-1 group-data-horizontal/tabs:!h-auto">
                {university.faculties.map((faculty, idx) => (
                  <TabsTrigger key={idx} value={String(idx)}>
                    {faculty.name || `学部${idx + 1}`}
                  </TabsTrigger>
                ))}
              </TabsList>

              {university.faculties.map((faculty, idx) => (
                <TabsContent key={idx} value={String(idx)} className="mt-6">
                  {canEdit && (
                    <div className="mb-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirmDeleteFaculty(idx)}
                      >
                        <Trash2 className="mr-1 size-3" />
                        この学部を削除
                      </Button>
                    </div>
                  )}
                  <FacultyForm
                    faculty={faculty}
                    onChange={(updated) => updateFaculty(idx, updated)}
                    canEdit={canEdit}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* 過去問セクション */}
      {(() => {
        const pastQuestions = PAST_QUESTIONS.filter(
          (pq) => pq.universityId === university.id
        );
        if (pastQuestions.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="size-5" />
                過去問・頻出テーマ（{pastQuestions.length}件）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pastQuestions.map((pq) => (
                <div
                  key={pq.id}
                  className="rounded-lg border p-3 space-y-1.5"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{pq.facultyName}</span>
                    <Badge variant={pq.type === "past" ? "default" : "secondary"} className="text-xs">
                      {pq.type === "past" ? "過去問" : "頻出"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {pq.year}年度
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {pq.field}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{pq.theme}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {pq.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {pq.wordLimit && (
                      <span className="flex items-center gap-1">
                        <FileText className="size-3" />
                        {pq.wordLimit}字
                      </span>
                    )}
                    {pq.timeLimit && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {pq.timeLimit}分
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>学部を削除しますか？</DialogTitle>
            <DialogDescription>
              {deleteFacultyIndex !== null &&
                university.faculties[deleteFacultyIndex] &&
                `「${university.faculties[deleteFacultyIndex].name}」を削除します。この操作は保存後に確定されます。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={deleteFaculty}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

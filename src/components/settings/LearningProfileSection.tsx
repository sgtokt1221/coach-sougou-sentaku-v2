"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  User,
  Save,
  Loader2,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { UniversitySelectStep } from "@/components/onboarding/UniversitySelectStep";
import {
  ProfileStep,
  type ProfileData,
} from "@/components/onboarding/ProfileStep";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/lib/firebase/profile";
import type { StudentProfile } from "@/lib/types/user";
import { toast } from "sonner";

interface ResolvedItem {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
}

/**
 * 設定: 学習プロフィール セクション。
 * 志望校 + 基礎情報 (高校 / 学年 / GPA / 英語資格)。
 *
 * 旧 /student/settings ページのコアロジックをそのまま切り出し。
 */
export function LearningProfileSection() {
  const { userProfile } = useAuth();
  const profile = userProfile as StudentProfile | null;

  const [targetUniversities, setTargetUniversities] = useState<string[]>([]);
  const [resolved, setResolved] = useState<ResolvedItem[]>([]);
  const [profileData, setProfileData] = useState<ProfileData>({
    gpa: null,
    englishCerts: [],
    grade: null,
    school: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSelection, setDialogSelection] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    setTargetUniversities(profile.targetUniversities ?? []);
    setProfileData({
      gpa: profile.gpa ?? null,
      englishCerts: profile.englishCerts ?? [],
      grade: profile.grade ?? null,
      school: profile.school ?? "",
    });
  }, [profile]);

  useEffect(() => {
    if (targetUniversities.length === 0) {
      setResolved([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/universities/resolve?ids=${targetUniversities.join(",")}`,
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (alive) setResolved(data.resolved ?? []);
      } catch {
        if (alive) setResolved([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [targetUniversities]);

  const removeUniversity = (compoundId: string) => {
    setTargetUniversities(targetUniversities.filter((id) => id !== compoundId));
  };

  const openDialog = () => {
    setDialogSelection(targetUniversities);
    setDialogOpen(true);
  };

  const confirmDialog = () => {
    setTargetUniversities(dialogSelection);
    setDialogOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        targetUniversities,
        gpa: profileData.gpa,
        englishCerts: profileData.englishCerts,
        grade: profileData.grade,
        school: profileData.school || undefined,
      });
      localStorage.setItem(
        "targetUniversities",
        JSON.stringify(targetUniversities),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4 text-primary" />
          学習プロフィール
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 志望校 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <GraduationCap className="size-4 text-primary" />
              志望校
            </p>
            <Button variant="outline" size="sm" onClick={openDialog}>
              <Plus className="mr-1 size-4" />
              追加・変更
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>志望校を選択</DialogTitle>
                </DialogHeader>
                <UniversitySelectStep
                  selected={dialogSelection}
                  onChange={setDialogSelection}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={confirmDialog}>確定</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {resolved.length > 0 ? (
            <div className="space-y-2">
              {resolved.map((item) => {
                const compoundId = `${item.universityId}:${item.facultyId}`;
                return (
                  <div
                    key={compoundId}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.universityName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.facultyName}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUniversity(compoundId)}
                      className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                      aria-label="この志望校を削除"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              志望校が設定されていません
            </p>
          )}
        </div>

        {/* 基礎情報 */}
        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-semibold">基礎情報</p>
          <ProfileStep data={profileData} onChange={setProfileData} />
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" />
              保存しました
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Save className="mr-1 size-4" />
            )}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

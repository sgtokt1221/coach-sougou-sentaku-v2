"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UniversitySelectStep } from "@/components/onboarding/UniversitySelectStep";
import { ProfileStep, type ProfileData } from "@/components/onboarding/ProfileStep";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/lib/firebase/profile";
import type { StudentProfile } from "@/lib/types/user";
import {
  GraduationCap,
  User,
  Save,
  Loader2,
  Plus,
  X,
  HelpCircle,
} from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";

const CERT_LABELS: Record<string, string> = {
  EIKEN: "英検",
  TOEIC: "TOEIC",
  TOEFL: "TOEFL",
  IELTS: "IELTS",
  TEAP: "TEAP",
  GTEC: "GTEC",
  OTHER: "その他",
};

interface ResolvedItem {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
}

export default function SettingsPage() {
  const router = useRouter();
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
  const { start: startTutorial } = useTutorial();

  // Initialize from profile
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

  // Resolve university names
  useEffect(() => {
    if (targetUniversities.length === 0) {
      setResolved([]);
      return;
    }
    async function resolve() {
      try {
        const res = await fetch(
          `/api/universities/resolve?ids=${targetUniversities.join(",")}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResolved(data.resolved ?? []);
      } catch {
        setResolved([]);
      }
    }
    resolve();
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
      localStorage.setItem("targetUniversities", JSON.stringify(targetUniversities));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 lg:space-y-6 px-4 py-5 lg:px-8 lg:py-8 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading text-xl lg:text-2xl font-bold tracking-tight">設定</h1>
        <p className="text-sm text-muted-foreground mt-1">
          志望校と基礎情報を管理します
        </p>
      </div>

      {/* Target Universities */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4 text-primary" />
              志望校
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openDialog}>
              <Plus className="size-4 mr-1" />
              追加・変更
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>志望校を選択</DialogTitle>
                </DialogHeader>
                <UniversitySelectStep
                  selected={dialogSelection}
                  onChange={setDialogSelection}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button onClick={confirmDialog}>確定</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
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
                      className="rounded-full p-1 hover:bg-muted text-muted-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              志望校が設定されていません
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-primary" />
            基礎情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileStep data={profileData} onChange={setProfileData} />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 w-full">
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">
            保存しました
          </span>
        )}
        <Button onClick={handleSave} disabled={saving} className="min-h-[44px] w-full sm:w-auto">
          {saving ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          保存
        </Button>
      </div>

      {/* Tutorial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="size-4 text-primary" />
            チュートリアル
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            アプリの主要機能を確認できます
          </p>
          <Button
            variant="outline"
            onClick={() => {
              startTutorial();
              router.push("/student/demo/dashboard");
            }}
            className="cursor-pointer"
          >
            チュートリアルを再表示
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

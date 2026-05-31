"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversitySelectStep } from "@/components/onboarding/UniversitySelectStep";
import { ProfileStep, type ProfileData } from "@/components/onboarding/ProfileStep";
import { ConfirmStep } from "@/components/onboarding/ConfirmStep";
import { SkillCheckStep } from "@/components/onboarding/SkillCheckStep";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { updateProfile } from "@/lib/firebase/profile";
import { useTutorial } from "@/contexts/TutorialContext";
import type { StudentProfile } from "@/lib/types/user";

const STEPS = ["志望校選択", "基礎情報", "確認", "スキルチェック"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { userProfile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { start: startTutorial } = useTutorial();

  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(
    []
  );
  const [profileData, setProfileData] = useState<ProfileData>({
    gpa: null,
    englishCerts: [],
    grade: null,
    school: "",
    schoolId: null,
  });

  // Pre-populate from existing profile (e.g. admin-set data)
  useEffect(() => {
    if (initialized) return;
    const profile = userProfile as StudentProfile | null;
    if (!profile) return;
    setProfileData((prev) => ({
      gpa: profile.gpa ?? prev.gpa,
      englishCerts: profile.englishCerts?.length ? profile.englishCerts : prev.englishCerts,
      grade: profile.grade ?? prev.grade,
      school: profile.school || prev.school,
      schoolId: profile.schoolId ?? prev.schoolId,
    }));
    if (profile.targetUniversities?.length) {
      setSelectedUniversities(profile.targetUniversities);
    }
    setInitialized(true);
  }, [userProfile, initialized]);

  const canNext = true;

  const saveAndComplete = async () => {
    setSaving(true);
    try {
      await updateProfile({
        targetUniversities: selectedUniversities,
        gpa: profileData.gpa,
        englishCerts: profileData.englishCerts,
        grade: profileData.grade,
        school: profileData.school || undefined,
        ...(profileData.schoolId ? { schoolId: profileData.schoolId } : {}),
        onboardingCompleted: true,
      });
    } catch {
      // Firestore未設定時はスキップ
    }
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("targetUniversities", JSON.stringify(selectedUniversities));
    localStorage.setItem("studentProfile", JSON.stringify({
      gpa: profileData.gpa,
      englishCerts: profileData.englishCerts,
      grade: profileData.grade,
      school: profileData.school,
      schoolId: profileData.schoolId,
    }));
    refreshProfile();
    setSaving(false);
  };

  const handleFinish = async () => {
    await saveAndComplete();
    startTutorial();
    router.replace("/tour/dashboard");
  };

  const handleConfirmNext = async () => {
    await saveAndComplete();
    setStep(3);
  };

  const handleSkillCheckSkip = async () => {
    startTutorial();
    router.replace("/tour/dashboard");
  };

  const handleSkillCheckTake = () => {
    router.push("/student/skill-check/new");
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vertical.svg" alt="coach for 総合型選抜" className="h-32" />
          </div>
          <p className="text-sm text-muted-foreground">
            はじめに、志望校と基礎情報を設定しましょう
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <span>{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 ${
                    i < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Skip link */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleFinish}
            className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
          >
            スキップして始める
          </button>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <UniversitySelectStep
                selected={selectedUniversities}
                onChange={setSelectedUniversities}
              />
            )}
            {step === 1 && (
              <ProfileStep data={profileData} onChange={setProfileData} />
            )}
            {step === 2 && (
              <ConfirmStep
                selectedUniversities={selectedUniversities}
                profileData={profileData}
              />
            )}
            {step === 3 && (
              <SkillCheckStep
                onSkip={handleSkillCheckSkip}
                onTake={handleSkillCheckTake}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {step < 3 && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="size-4 mr-1" />
              戻る
            </Button>

            <div className="flex gap-2">
              {step < 2 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                  次へ
                  <ArrowRight className="size-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleConfirmNext} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 mr-1 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4 mr-1" />
                  )}
                  次へ
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

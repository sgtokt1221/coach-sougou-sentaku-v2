"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversitySelectStep } from "@/components/onboarding/UniversitySelectStep";
import { ProfileStep, type ProfileData } from "@/components/onboarding/ProfileStep";
import { ConfirmStep } from "@/components/onboarding/ConfirmStep";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Search, HelpCircle } from "lucide-react";
import { SuggestPanel } from "@/components/shared/SuggestPanel";
import type { StudentProfile } from "@/lib/types/user";

const STEPS = ["志望校選択", "基礎情報", "確認"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { userProfile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [step0Mode, setStep0Mode] = useState<"select" | "suggest">("select");
  const [initialized, setInitialized] = useState(false);

  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(
    []
  );
  const [profileData, setProfileData] = useState<ProfileData>({
    gpa: null,
    englishCerts: [],
    grade: null,
    school: "",
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
    }));
    if (profile.targetUniversities?.length) {
      setSelectedUniversities(profile.targetUniversities);
    }
    setInitialized(true);
  }, [userProfile, initialized]);

  const canNext = true;

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUniversities: selectedUniversities,
          gpa: profileData.gpa,
          englishCerts: profileData.englishCerts,
          grade: profileData.grade,
          school: profileData.school || undefined,
          onboardingCompleted: true,
        }),
      });
    } catch {
      // mock mode - proceed anyway
    }
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("targetUniversities", JSON.stringify(selectedUniversities));
    localStorage.setItem("studentProfile", JSON.stringify({
      gpa: profileData.gpa,
      englishCerts: profileData.englishCerts,
      grade: profileData.grade,
      school: profileData.school,
    }));
    refreshProfile();
    router.replace("/student/dashboard");
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
              <>
                <div className="flex rounded-lg border p-1 mb-4">
                  <button
                    type="button"
                    onClick={() => setStep0Mode("select")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      step0Mode === "select"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Search className="size-3.5" />
                    大学を選ぶ
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep0Mode("suggest")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      step0Mode === "suggest"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <HelpCircle className="size-3.5" />
                    質問で探す
                  </button>
                </div>

                {step0Mode === "select" ? (
                  <UniversitySelectStep
                    selected={selectedUniversities}
                    onChange={setSelectedUniversities}
                  />
                ) : (
                  <SuggestPanel
                    onSelectUniversity={(universityId, facultyId) => {
                      const key = `${universityId}:${facultyId}`;
                      if (!selectedUniversities.includes(key)) {
                        setSelectedUniversities((prev) => [...prev, key]);
                      }
                      setStep0Mode("select");
                    }}
                  />
                )}
              </>
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
          </CardContent>
        </Card>

        {/* Navigation */}
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
              <Button onClick={handleFinish} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="size-4 mr-1" />
                )}
                始める
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

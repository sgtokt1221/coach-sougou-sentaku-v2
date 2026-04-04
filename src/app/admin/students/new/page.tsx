"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, X, Plus } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { EnglishCert } from "@/lib/types/user";
import { UniversitySelectStep } from "@/components/onboarding/UniversitySelectStep";

const CERT_TYPES: { value: EnglishCert["type"]; label: string }[] = [
  { value: "EIKEN", label: "英検" },
  { value: "TOEIC", label: "TOEIC" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "IELTS", label: "IELTS" },
  { value: "TEAP", label: "TEAP" },
  { value: "GTEC", label: "GTEC" },
  { value: "OTHER", label: "そ��他" },
];

const EIKEN_GRADES = ["1級", "準1級", "2級", "準2級", "3級", "4級", "5級"];

interface FormData {
  displayName: string;
  email: string;
  password: string;
  school: string;
  grade: string;
  gpa: string;
  englishCerts: EnglishCert[];
  targetUniversities: string[];
}

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
}

export default function AdminStudentNewPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    displayName: "",
    email: "",
    password: "",
    school: "",
    grade: "",
    gpa: "",
    englishCerts: [],
    targetUniversities: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [certType, setCertType] = useState<EnglishCert["type"]>("EIKEN");
  const [certScore, setCertScore] = useState("");

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.displayName.trim()) errs.displayName = "氏名は必須です";
    if (!form.email.trim()) {
      errs.email = "メールアドレスは必須です";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "有効なメールアドレスを入力してください";
    }
    if (!form.password) {
      errs.password = "パスワードは必須です";
    } else if (form.password.length < 6) {
      errs.password = "パスワードは6文字以上必要です";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");

    try {
      const res = await authFetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          password: form.password,
          school: form.school.trim(),
          grade: form.grade ? Number(form.grade) : undefined,
          gpa: form.gpa ? Number(form.gpa) : undefined,
          englishCerts: form.englishCerts.length > 0 ? form.englishCerts : undefined,
          targetUniversities: form.targetUniversities,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "生徒の作成に失敗しました");
      }

      router.push("/admin/students");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">生徒を追加</h1>
          <p className="text-sm text-muted-foreground">
            新しい生徒アカウントを作成します
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>生徒情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {apiError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {apiError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="displayName">氏名 *</Label>
              <Input
                id="displayName"
                placeholder="例: 田中 太郎"
                value={form.displayName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, displayName: e.target.value }))
                }
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス *</Label>
              <Input
                id="email"
                type="email"
                placeholder="例: tanaka@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード *</Label>
              <Input
                id="password"
                type="password"
                placeholder="6文字以上"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="school">学校名</Label>
              <Input
                id="school"
                placeholder="例: 東京都立高校"
                value={form.school}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, school: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">学年</Label>
              <Select
                value={form.grade}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, grade: v ?? "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="学年を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">高校1年</SelectItem>
                  <SelectItem value="2">高校2年</SelectItem>
                  <SelectItem value="3">高校3年</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gpa">評定平均（GPA）</Label>
              <Input
                id="gpa"
                type="number"
                min={0}
                max={5}
                step={0.1}
                placeholder="例: 4.2"
                value={form.gpa}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gpa: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">0.0〜5.0（任意）</p>
            </div>

            <div className="space-y-2">
              <Label>英語資格</Label>
              {form.englishCerts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.englishCerts.map((cert, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {CERT_TYPES.find((t) => t.value === cert.type)?.label} {cert.score}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            englishCerts: prev.englishCerts.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Select
                  value={certType}
                  onValueChange={(v) => {
                    setCertType(v as EnglishCert["type"]);
                    setCertScore("");
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CERT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {certType === "EIKEN" ? (
                  <Select
                    value={certScore}
                    onValueChange={(v) => {
                      if (!v) return;
                      setForm((prev) => ({
                        ...prev,
                        englishCerts: [...prev.englishCerts, { type: "EIKEN", score: v }],
                      }));
                      setCertScore("");
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="級を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {EIKEN_GRADES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      placeholder="スコア"
                      value={certScore}
                      onChange={(e) => setCertScore(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (certScore.trim()) {
                            setForm((prev) => ({
                              ...prev,
                              englishCerts: [...prev.englishCerts, { type: certType, score: certScore.trim() }],
                            }));
                            setCertScore("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (certScore.trim()) {
                          setForm((prev) => ({
                            ...prev,
                            englishCerts: [...prev.englishCerts, { type: certType, score: certScore.trim() }],
                          }));
                          setCertScore("");
                        }
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">任意・複数追加可</p>
            </div>

            <div className="space-y-2">
              <Label>志望校</Label>
              <UniversitySelectStep
                selected={form.targetUniversities}
                onChange={(selected) =>
                  setForm((prev) => ({ ...prev, targetUniversities: selected }))
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                生徒を追加
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

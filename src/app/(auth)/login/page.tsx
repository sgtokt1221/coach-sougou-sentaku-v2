"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/firebase/auth";
import { Loader2, ArrowRight } from "lucide-react";

type Mode = "login" | "signup" | "invitation";

export default function LoginPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const isSignUp = mode === "signup";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [invCode, setInvCode] = useState("");
  const [invCodeValid, setInvCodeValid] = useState(false);
  const [invValidating, setInvValidating] = useState(false);

  useEffect(() => {
    if (!authLoading && user && userProfile) {
      if (userProfile.role === "superadmin") {
        router.replace("/superadmin/dashboard");
      } else if (userProfile.role === "admin" || userProfile.role === "teacher") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/student/dashboard");
      }
    }
  }, [user, userProfile, authLoading, router]);

  function handleDevLogin(role: "student" | "admin" | "superadmin") {
    localStorage.setItem("devRole", role);
    window.location.reload();
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Google login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-f0-9]{8}$/.test(invCode)) {
      toast.error("招待コードは8桁の英数字です");
      return;
    }
    setInvValidating(true);
    try {
      const res = await fetch("/api/auth/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: invCode }),
      });
      const data = await res.json();
      if (data.valid) {
        setInvCodeValid(true);
      } else {
        toast.error(data.error || "無効な招待コードです");
      }
    } catch {
      toast.error("検証に失敗しました");
    } finally {
      setInvValidating(false);
    }
  }

  async function handleInvitationRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-with-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: invCode, email, password, displayName }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      // Auto-login after registration
      await signInWithEmail(email, password);
      toast.success("管理者アカウントを作成しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
        toast.success("アカウントを作成しました");
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "認証に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vertical.svg" alt="coach for 総合型選抜" className="h-24 animate-pulse-soft" />
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.03_260)] via-[oklch(0.18_0.04_220)] to-[oklch(0.15_0.02_260)]" />

        {/* Decorative elements with animation */}
        <div className="absolute inset-0">
          <div className="absolute top-[15%] left-[10%] size-72 rounded-full bg-[oklch(0.52_0.14_175_/_0.12)] blur-[80px] animate-orb-float-1" />
          <div className="absolute bottom-[20%] right-[15%] size-64 rounded-full bg-[oklch(0.75_0.16_75_/_0.08)] blur-[60px] animate-orb-float-2" style={{ animationDelay: "1s" }} />
          <div className="absolute top-[60%] left-[40%] size-48 rounded-full bg-[oklch(0.55_0.12_280_/_0.06)] blur-[50px] animate-orb-float-3" style={{ animationDelay: "2s" }} />
        </div>

        {/* Geometric decorations */}
        <div className="absolute bottom-24 left-8">
          <div className="w-20 h-20 border border-white/10 rounded-full backdrop-blur-sm"></div>
        </div>
        <div className="absolute top-1/3 right-24">
          <div className="w-16 h-16 border border-white/8 rounded-lg rotate-45 backdrop-blur-sm"></div>
        </div>

        {/* Grid pattern with animation */}
        <div
          className="absolute inset-0 opacity-[0.04] animate-grid-scroll"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12">
          {/* Logo */}
          <div className="animate-fade-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-dark.svg" alt="coach for 総合型選抜" className="h-14" />
          </div>

          {/* Hero text */}
          <div className="max-w-lg animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h1 className="font-heading text-[3.2rem] font-bold leading-[1.1] tracking-tight text-white">
              総合型選抜を、
              <br />
              <span className="bg-gradient-to-r from-[oklch(0.70_0.16_175)] to-[oklch(0.80_0.18_75)] bg-clip-text text-transparent">
                AIとともに。
              </span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/50 max-w-md">
              小論文添削、模擬面接、出願書類作成、活動実績の構造化。
              あなたの合格までの道のりを、AIが伴走します。
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-10 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            {[
              { value: "20+", label: "対応大学" },
              { value: "5", label: "AI機能" },
              { value: "24/7", label: "いつでも練習" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-0.5 text-xs text-white/35">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex flex-1 items-center justify-center bg-background bg-mesh p-6 lg:p-12 lg:bg-background">
        <div className="w-full max-w-[380px] animate-fade-in-up rounded-2xl p-8 max-lg:glass-card lg:p-0" style={{ animationDelay: "300ms" }}>
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="coach for 総合型選抜" className="h-12" />
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {mode === "invitation" ? "招待コードで登録" : isSignUp ? "アカウント作成" : "おかえりなさい"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "invitation"
                ? "管理者から受け取った招待コードで登録します"
                : isSignUp
                ? "coach for 総合型選抜で準備を始めましょう"
                : "アカウントにサインインしてください"}
            </p>
          </div>

          {mode === "invitation" ? (
            <div className="space-y-5">
              {!invCodeValid ? (
                <form onSubmit={handleValidateCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invCode" className="text-xs font-medium">
                      招待コード
                    </Label>
                    <Input
                      id="invCode"
                      value={invCode}
                      onChange={(e) => setInvCode(e.target.value.toLowerCase().replace(/[^a-f0-9]/g, ""))}
                      maxLength={8}
                      placeholder="8桁のコードを入力"
                      className="h-10 font-mono text-center text-lg tracking-widest"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 gap-2 text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/25"
                    disabled={invValidating || invCode.length !== 8}
                  >
                    {invValidating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        コードを確認
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleInvitationRegister} className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">
                      招待コード <span className="font-mono">{invCode}</span> が確認されました
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invDisplayName" className="text-xs font-medium group-focus-within:text-primary transition-colors">
                      お名前
                    </Label>
                    <Input
                      id="invDisplayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="山田太郎"
                      className="h-10 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invEmail" className="text-xs font-medium group-focus-within:text-primary transition-colors">
                      メールアドレス
                    </Label>
                    <Input
                      id="invEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="email@example.com"
                      className="h-10 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invPassword" className="text-xs font-medium group-focus-within:text-primary transition-colors">
                      パスワード
                    </Label>
                    <Input
                      id="invPassword"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="8文字以上"
                      className="h-10 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 gap-2 text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/25"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        管理者アカウントを作成
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
              <p className="text-center text-[13px] text-muted-foreground">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline underline-offset-4"
                  onClick={() => { setMode("login"); setInvCode(""); setInvCodeValid(false); }}
                >
                  サインインに戻る
                </button>
              </p>
            </div>
          ) : (
          <div className="space-y-5">
            <Button
              variant="outline"
              className="w-full h-11 gap-2.5 text-sm font-medium transition-all hover:bg-accent hover:shadow-md hover:border-primary/30"
              onClick={handleGoogle}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Googleでサインイン
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-background px-3 text-muted-foreground/50">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-medium group-focus-within:text-primary transition-colors">
                    お名前
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={isSignUp}
                    placeholder="山田太郎"
                    className="h-10 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium transition-colors group-focus-within:text-primary">
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="h-10 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium transition-colors group-focus-within:text-primary">
                  パスワード
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  className="h-10 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 gap-2 text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/25"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? "アカウントを作成" : "サインイン"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="space-y-2">
              <p className="text-center text-[13px] text-muted-foreground">
                {isSignUp ? "既にアカウントをお持ちですか？" : "アカウントをお持ちでない方は"}{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline underline-offset-4"
                  onClick={() => setMode(isSignUp ? "login" : "signup")}
                >
                  {isSignUp ? "サインイン" : "新規登録"}
                </button>
              </p>
              <p className="text-center text-[13px] text-muted-foreground">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline underline-offset-4"
                  onClick={() => setMode("invitation")}
                >
                  招待コードをお持ちの方
                </button>
              </p>
            </div>
          </div>
          )}

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 rounded-lg border border-amber-300/60 bg-amber-100/60 p-4 dark:border-amber-700/50 dark:bg-amber-950/20">
              <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-400">
                開発モード — ロールを選んでログイン
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleDevLogin("student")}
                >
                  生徒としてログイン
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleDevLogin("admin")}
                >
                  管理者としてログイン
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleDevLogin("superadmin")}
                >
                  SAとしてログイン
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

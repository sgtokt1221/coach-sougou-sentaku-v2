"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  resetPassword,
} from "@/lib/firebase/auth";
import { Loader2, ArrowRight, Mail, ChevronDown } from "lucide-react";
import UniversityMarquee from "@/components/shared/UniversityMarquee";
import FeatureSlider from "@/components/shared/FeatureSlider";

type Mode = "login" | "signup" | "reset";

export default function LoginPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const isSignUp = mode === "signup";
  const isReset = mode === "reset";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollCancelled = useRef(false);

  // モバイル: 3秒後に自動スクロールでフォームへ
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const timer = setTimeout(() => {
      if (!autoScrollCancelled.current && mobileScrollRef.current) {
        mobileScrollRef.current.scrollTo({
          top: window.innerHeight,
          behavior: "smooth",
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleMobileScroll = useCallback(() => {
    autoScrollCancelled.current = true;
  }, []);

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

  function validateFields(): boolean {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("有効なメールアドレスを入力してください");
      valid = false;
    }
    if (!isReset && password.length < 6) {
      setPasswordError("パスワードは6文字以上で入力してください");
      valid = false;
    }
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateFields()) return;
    setLoading(true);
    try {
      if (isReset) {
        await resetPassword(email);
        toast.success("パスワードリセットメールを送信しました");
        setMode("login");
      } else if (isSignUp) {
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

  // ── Shared form JSX (used by both mobile & desktop) ──
  const loginForm = (
    <>
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          {isReset ? "パスワードリセット" : isSignUp ? "アカウント作成" : "おかえりなさい"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isReset
            ? "登録メールアドレスにリセットリンクを送信します"
            : isSignUp
              ? "coach for 総合型選抜で準備を始めましょう"
              : "アカウントにサインインしてください"}
        </p>
      </div>

      <div className="space-y-5">
        {!isReset && (
          <>
            <Button
              variant="outline"
              className="w-full h-11 gap-2.5 text-sm font-medium cursor-pointer transition-all hover:bg-accent hover:shadow-md hover:border-primary/30"
              onClick={handleGoogle}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-medium">お名前</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required={isSignUp} placeholder="山田太郎" className="h-10 focus:ring-2 focus:ring-primary/20" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">メールアドレス</Label>
            <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }} required placeholder="email@example.com" className={`h-10 focus:ring-2 focus:ring-primary/20 ${emailError ? "border-destructive" : ""}`} />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          {!isReset && (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">パスワード</Label>
              <Input id="password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }} required minLength={6} placeholder="6文字以上" className={`h-10 focus:ring-2 focus:ring-primary/20 ${passwordError ? "border-destructive" : ""}`} />
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </div>
          )}
          <Button type="submit" className="w-full h-11 gap-2 text-sm font-medium cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/25" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : isReset ? <><Mail className="size-4" />リセットメールを送信</> : <>{isSignUp ? "アカウントを作成" : "サインイン"}<ArrowRight className="size-4" /></>}
          </Button>
        </form>

        <div className="space-y-2 text-center text-[13px] text-muted-foreground">
          {isReset ? (
            <p><button type="button" className="font-medium text-primary hover:underline underline-offset-4 cursor-pointer" onClick={() => setMode("login")}>サインインに戻る</button></p>
          ) : (
            <>
              {!isSignUp && (
                <p><button type="button" className="text-muted-foreground hover:text-primary hover:underline underline-offset-4 cursor-pointer transition-colors" onClick={() => setMode("reset")}>パスワードをお忘れですか？</button></p>
              )}
              <p>
                {isSignUp ? "既にアカウントをお持ちですか？" : "アカウントをお持ちでない方は"}{" "}
                <button type="button" className="font-medium text-primary hover:underline underline-offset-4 cursor-pointer" onClick={() => setMode(isSignUp ? "login" : "signup")}>{isSignUp ? "サインイン" : "新規登録"}</button>
              </p>
            </>
          )}
        </div>
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-6 rounded-lg border border-amber-300/60 bg-amber-100/60 p-4 dark:border-amber-700/50 dark:bg-amber-950/20">
          <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-400">開発モード — ロールを選んでログイン</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleDevLogin("student")}>生徒</Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleDevLogin("admin")}>管理者</Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleDevLogin("superadmin")}>SA</Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ── Mobile: vertical scroll-snap splash → form ── */}
      <div
        ref={mobileScrollRef}
        onScroll={handleMobileScroll}
        className="lg:hidden h-screen overflow-y-auto snap-y snap-mandatory"
      >
        {/* Section 1: Branding splash */}
        <section className="relative flex h-screen snap-start flex-col overflow-hidden px-5 py-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.03_260)] via-[oklch(0.18_0.04_220)] to-[oklch(0.15_0.02_260)]" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            {/* Logo */}
            <div className="animate-fade-in pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-dark.svg" alt="coach for 総合型選抜" className="h-8" />
            </div>

            {/* Hero */}
            <div className="space-y-5 -mt-4">
              <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <h1 className="font-heading text-2xl font-bold leading-[1.2] tracking-tight text-white">
                  総合型選抜を、
                  <br />
                  <span className="bg-gradient-to-r from-[oklch(0.70_0.16_175)] to-[oklch(0.80_0.18_75)] bg-clip-text text-transparent">
                    AIとともに。
                  </span>
                </h1>
                <p className="mt-2 text-xs leading-relaxed text-white/40">
                  小論文添削、模擬面接、出願書類作成。あなたの合格をAIが伴走します。
                </p>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <FeatureSlider />
              </div>
            </div>

            {/* Marquee + scroll hint */}
            <div className="space-y-3 animate-fade-in-up pb-2" style={{ animationDelay: "600ms" }}>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1">対応大学</p>
                <UniversityMarquee />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-white/20">スワイプしてログイン</span>
                <ChevronDown className="size-4 text-white/30 animate-bounce" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Login form */}
        <section className="flex h-screen snap-start items-center justify-center bg-background bg-mesh p-6">
          <div className="w-full max-w-[380px]">
            {loginForm}
          </div>
        </section>
      </div>

      {/* ── Desktop: side-by-side layout (unchanged) ── */}
      <div className="relative hidden lg:flex min-h-screen">
        {/* Left panel - Branding */}
        <div className="flex w-[55%] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.03_260)] via-[oklch(0.18_0.04_220)] to-[oklch(0.15_0.02_260)]" />
          <div className="relative z-10 flex flex-col justify-between h-full px-10 py-8">
            <div className="animate-fade-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-dark.svg" alt="coach for 総合型選抜" className="h-14" />
            </div>
            <div className="space-y-8">
              <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <h1 className="font-heading text-[2.75rem] font-bold leading-[1.12] tracking-tight text-white">
                  総合型選抜を、<br />
                  <span className="bg-gradient-to-r from-[oklch(0.70_0.16_175)] to-[oklch(0.80_0.18_75)] bg-clip-text text-transparent">AIとともに。</span>
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-white/40 max-w-md">
                  小論文添削、模擬面接、出願書類作成、活動実績の構造化。あなたの合格までの道のりを、AIが伴走します。
                </p>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <FeatureSlider />
              </div>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "600ms" }}>
              <p className="text-[12px] uppercase tracking-widest text-white/25 mb-2">23大学対応</p>
              <UniversityMarquee />
            </div>
          </div>
        </div>

        {/* Right panel - Form */}
        <div className="flex flex-1 items-center justify-center bg-background p-12">
          <div className="w-full max-w-[380px] animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            {loginForm}
          </div>
        </div>
      </div>
    </>
  );
}

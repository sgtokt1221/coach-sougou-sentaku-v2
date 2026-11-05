"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { UserProfile, PlanType } from "@/lib/types/user";
import { TUTORIAL_MOCK_PROFILE } from "@/lib/tutorial/mock-profile";
import { isTutorialActive } from "@/lib/tutorial/mocks";
import {
  markHeartbeatSent,
  readCachedProfile,
  shouldSendHeartbeat,
  writeCachedProfile,
} from "@/lib/auth/profile-cache";

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  refreshProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshProfile = () => {
    const devRole = typeof window !== "undefined" ? localStorage.getItem("devRole") : null;
    if (!auth) {
      if (process.env.NODE_ENV === "development" && devRole) {
        const savedProfile = JSON.parse(localStorage.getItem("studentProfile") ?? "{}");
        const devPlan = (localStorage.getItem("devPlan") as PlanType | null) ?? "self";
        setUserProfile({
          uid: "dev-user",
          email: "dev@example.com",
          displayName: "開発ユーザー",
          role: (devRole as "student" | "admin" | "teacher" | "superadmin") || "student",
          plan: devPlan,
          targetUniversities: JSON.parse(localStorage.getItem("targetUniversities") ?? "[]"),
          onboardingCompleted: localStorage.getItem("onboardingCompleted") === "true",
          gpa: savedProfile.gpa ?? null,
          englishCerts: savedProfile.englishCerts ?? [],
          grade: savedProfile.grade ?? null,
          school: savedProfile.school ?? "",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as UserProfile);
      }
    }
  };

  useEffect(() => {
    // Firebase Authが設定済みなら常にFirebase Authを使用
    // devRoleバイパスはFirebase Auth未設定時のみ（auth === null）
    const devRole = typeof window !== "undefined" ? localStorage.getItem("devRole") : null;
    if (!auth) {
      if (process.env.NODE_ENV === "development" && devRole) {
        setUser({ uid: "dev-user", email: "dev@example.com" } as User);
        const savedProfile = JSON.parse(localStorage.getItem("studentProfile") ?? "{}");
        const devPlan = (localStorage.getItem("devPlan") as PlanType | null) ?? "self";
        setUserProfile({
          uid: "dev-user",
          email: "dev@example.com",
          displayName: "開発ユーザー",
          role: (devRole as "student" | "admin" | "teacher" | "superadmin") || "student",
          plan: devPlan,
          targetUniversities: JSON.parse(localStorage.getItem("targetUniversities") ?? "[]"),
          onboardingCompleted: localStorage.getItem("onboardingCompleted") === "true",
          gpa: savedProfile.gpa ?? null,
          englishCerts: savedProfile.englishCerts ?? [],
          grade: savedProfile.grade ?? null,
          school: savedProfile.school ?? "",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as UserProfile);
      }
      setLoading(false);
      return;
    }
    const unsubAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        console.log("[AuthContext] onAuthStateChanged:", firebaseUser?.uid ?? "null");
        setUser(firebaseUser);
        if (!firebaseUser) {
          setUserProfile(null);
          setLoading(false);
          return;
        }
        // 前回のプロフィールが残っていれば、Firestore を待たずに画面を出す
        // （onSnapshot が届いたら差し替わる。権限はサーバー側で毎回判定する）
        const cached = isTutorialActive() ? null : readCachedProfile(firebaseUser.uid);
        if (cached) {
          setUserProfile(cached);
          setLoading(false);
        }
      },
      (err) => {
        console.error("[AuthContext] onAuthStateChanged error:", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // devモード時（Firebase Auth未設定）はFirestoreリスナーをスキップ
    if (!auth) return;

    if (!user || !db) {
      console.log("[AuthContext] Skipping profile fetch: user=", !!user, "db=", !!db);
      return;
    }

    console.log("[AuthContext] Fetching profile for:", user.uid);
    const userRef = doc(db, "users", user.uid);
    const unsubProfile = onSnapshot(
      userRef,
      (snap) => {
        console.log("[AuthContext] onSnapshot success, exists:", snap.exists());
        if (snap.exists()) {
          const data = snap.data();
          console.log("[AuthContext] Profile data role:", data.role);
          const profile = {
            ...data,
            uid: user.uid,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          } as UserProfile;
          setUserProfile(profile);
          writeCachedProfile(profile);
        } else {
          console.log("[AuthContext] No profile document found");
          setUserProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[AuthContext] onSnapshot error:", err.code, err.message);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubProfile();
  }, [user]);

  // ハートビート: ログイン中は 10 分ごとに users.lastSeenAt を更新
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const BEAT_MS = 10 * 60 * 1000;
    const beat = async () => {
      // 開くたびに users へ書くと、onSnapshot で画面全体が描き直される。
      // 前回から10分経っていなければ送らない（最終ログインの粒度は10分で足りる）
      if (!shouldSendHeartbeat(user.uid, BEAT_MS)) return;
      try {
        const token = await user.getIdToken();
        if (cancelled) return;
        await fetch("/api/student/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => {
            if (r.ok) markHeartbeatSent(user.uid);
          })
          .catch(() => {});
      } catch {}
    };
    beat();
    const id = setInterval(beat, BEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  return (
    <AuthContext value={{ user, userProfile, loading, error, refreshProfile }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // チュートリアル（/tour/*）モードでは認証なしで動かすため、
  // モック生徒プロフィールを返して loading=false / user 擬似化する
  if (isTutorialActive()) {
    return {
      user: { uid: TUTORIAL_MOCK_PROFILE.uid, email: TUTORIAL_MOCK_PROFILE.email } as User,
      userProfile: TUTORIAL_MOCK_PROFILE,
      loading: false,
      error: null,
      refreshProfile: context.refreshProfile,
    };
  }
  return context;
}

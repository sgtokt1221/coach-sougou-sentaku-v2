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
    if (!auth || (process.env.NODE_ENV === "development" && devRole)) {
      if (process.env.NODE_ENV === "development") {
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
    // devRoleがlocalStorageにある場合はモックユーザーで認証バイパス（開発環境のみ）
    const devRole = typeof window !== "undefined" ? localStorage.getItem("devRole") : null;
    if (!auth || (process.env.NODE_ENV === "development" && devRole)) {
      if (process.env.NODE_ENV === "development") {
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
    // devモード時はFirestoreリスナーをスキップ（dev-userドキュメントは存在しないため）
    const devRole = typeof window !== "undefined" ? localStorage.getItem("devRole") : null;
    if (process.env.NODE_ENV === "development" && devRole) return;

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
          setUserProfile({
            ...data,
            uid: user.uid,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          } as UserProfile);
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
  return context;
}

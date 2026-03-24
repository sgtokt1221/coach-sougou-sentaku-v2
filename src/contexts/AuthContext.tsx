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
import type { UserProfile } from "@/lib/types/user";

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
        setUserProfile({
          uid: "dev-user",
          email: "dev@example.com",
          displayName: "開発ユーザー",
          role: (devRole as "student" | "admin" | "teacher" | "superadmin") || "student",
          targetUniversities: JSON.parse(localStorage.getItem("targetUniversities") ?? "[]"),
          onboardingCompleted: localStorage.getItem("onboardingCompleted") === "true",
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
        setUserProfile({
          uid: "dev-user",
          email: "dev@example.com",
          displayName: "開発ユーザー",
          role: (devRole as "student" | "admin" | "teacher" | "superadmin") || "student",
          targetUniversities: JSON.parse(localStorage.getItem("targetUniversities") ?? "[]"),
          onboardingCompleted: localStorage.getItem("onboardingCompleted") === "true",
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
        setUser(firebaseUser);
        if (!firebaseUser) {
          setUserProfile(null);
          setLoading(false);
        }
      },
      (err) => {
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

    if (!user || !db) return;

    const userRef = doc(db, "users", user.uid);
    const unsubProfile = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile({
            ...data,
            uid: user.uid,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          } as UserProfile);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      },
      (err) => {
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

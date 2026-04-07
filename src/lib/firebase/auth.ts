import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import type { UserRole } from "@/lib/types/user";

const googleProvider = new GoogleAuthProvider();

function requireAuth() {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  return auth;
}

function requireDb() {
  if (!db) throw new Error("Firestore is not initialized");
  return db;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(requireAuth(), googleProvider);
  const user = result.user;
  const userRef = doc(requireDb(), "users", user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: "student" as UserRole,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(
    requireAuth(),
    email,
    password
  );
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const result = await createUserWithEmailAndPassword(
    requireAuth(),
    email,
    password
  );
  const user = result.user;
  await updateProfile(user, { displayName });
  const userRef = doc(requireDb(), "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName,
    role: "student" as UserRole,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(requireAuth(), email);
}

export async function signOutUser() {
  if (auth) {
    await signOut(auth);
  }
  localStorage.removeItem("onboardingCompleted");
  localStorage.removeItem("devRole");
  window.location.href = "/login";
}

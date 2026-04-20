"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface TutorialContextValue {
  isActive: boolean;
  isCompleted: boolean;
  start: () => void;
  stop: (completed: boolean) => void;
}

const TutorialContext = createContext<TutorialContextValue>({
  isActive: false,
  isCompleted: false,
  start: () => {},
  stop: () => {},
});

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsActive(localStorage.getItem("tutorialActive") === "true");
    setIsCompleted(localStorage.getItem("tutorialCompleted") === "true");
  }, []);

  const start = useCallback(() => {
    localStorage.setItem("tutorialActive", "true");
    setIsActive(true);
  }, []);

  const stop = useCallback((completed: boolean) => {
    localStorage.setItem("tutorialActive", "false");
    setIsActive(false);
    if (completed) {
      localStorage.setItem("tutorialCompleted", "true");
      setIsCompleted(true);
    }
  }, []);

  return (
    <TutorialContext value={{ isActive, isCompleted, start, stop }}>
      {children}
    </TutorialContext>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}

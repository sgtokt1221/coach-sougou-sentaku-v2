"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { DemoStepConfig } from "@/lib/tutorial/demo-steps";

interface TutorialDriverProps {
  step: DemoStepConfig;
}

export function TutorialDriver({ step }: TutorialDriverProps) {
  const router = useRouter();

  useEffect(() => {
    if (step.tooltips.length === 0) return;

    const timer = window.setTimeout(() => {
      const d = driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: "次へ",
        prevBtnText: "戻る",
        doneBtnText: step.nextRoute ? "次のページへ" : "完了",
        progressText: "{{current}} / {{total}}",
        steps: step.tooltips.map((t) => ({
          element: t.selector,
          popover: {
            title: t.title,
            description: t.description,
            side: t.side,
          },
        })),
        onDestroyed: () => {
          if (step.nextRoute) {
            router.push(step.nextRoute);
          }
        },
      });
      d.drive();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [step, router]);

  return null;
}

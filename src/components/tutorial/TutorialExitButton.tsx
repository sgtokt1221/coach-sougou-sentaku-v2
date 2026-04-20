"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@/contexts/TutorialContext";

export function TutorialExitButton() {
  const router = useRouter();
  const { stop } = useTutorial();

  const handleExit = () => {
    stop(false);
    router.push("/student/dashboard");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExit}
      className="cursor-pointer"
    >
      <X className="size-4" />
      終了
    </Button>
  );
}

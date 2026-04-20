"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "@/contexts/TutorialContext";

export default function DemoCompletePage() {
  const router = useRouter();
  const { stop } = useTutorial();

  useEffect(() => {
    stop(true);
  }, [stop]);

  const handleStart = () => {
    router.push("/student/dashboard");
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl space-y-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500"
        >
          <Rocket className="size-12 text-white" />
        </motion.div>
        <div>
          <h1 className="text-3xl font-bold">チュートリアル完了</h1>
          <p className="mt-2 text-muted-foreground">
            お疲れさまでした。さっそく実際のあなたのデータでアプリを使い始めましょう。
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleStart}
          className="cursor-pointer"
        >
          ダッシュボードへ
        </Button>
      </motion.div>
    </div>
  );
}

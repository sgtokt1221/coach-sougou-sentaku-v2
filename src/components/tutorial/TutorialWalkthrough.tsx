"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, GraduationCap, FileText, MessageCircle, ArrowRight, Rocket, BookOpen, FileEdit, Zap } from "lucide-react";
import { TutorialProgress } from "./TutorialProgress";
import { SelfAnalysisPreview } from "./steps/SelfAnalysisPreview";
import { UniversityMatchPreview } from "./steps/UniversityMatchPreview";
import { EssayThemesPreview } from "./steps/EssayThemesPreview";
import { EssayCorrectionPreview } from "./steps/EssayCorrectionPreview";
import { DocumentsPreview } from "./steps/DocumentsPreview";
import { InterviewDrillPreview } from "./steps/InterviewDrillPreview";
import { InterviewPreview } from "./steps/InterviewPreview";

interface TutorialWalkthroughProps {
  open: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Lightbulb,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    title: "自己分析",
    description: "AIとの7ステップの対話で、あなたの価値観・強み・将来ビジョンを整理します。志望理由書や面接の土台になります。",
    Preview: SelfAnalysisPreview,
  },
  {
    icon: GraduationCap,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
    title: "志望校マッチング",
    description: "あなたのプロフィールをもとに、AIが志望校との適合度をスコアリング。自分に合った大学・学部が見つかります。",
    Preview: UniversityMatchPreview,
  },
  {
    icon: BookOpen,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
    title: "テーマ・過去問",
    description: "分野別のテーマや大学別の過去問で小論文の練習ができます。難易度やAPとの関連も表示されます。",
    Preview: EssayThemesPreview,
  },
  {
    icon: FileText,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    title: "小論文添削",
    description: "小論文の写真を撮るかテキストを入力するだけ。AIが大学のAPに沿った添削フィードバックを返します。",
    Preview: EssayCorrectionPreview,
  },
  {
    icon: FileEdit,
    iconColor: "text-teal-500",
    iconBg: "bg-teal-50",
    title: "志望理由書",
    description: "大学別の出願書類を管理。AIが志望理由書をAP・構成・独自性の3軸で添削してくれます。",
    Preview: DocumentsPreview,
  },
  {
    icon: Zap,
    iconColor: "text-yellow-500",
    iconBg: "bg-yellow-50",
    title: "面接ドリル",
    description: "カテゴリ別の頻出質問で面接の基礎力を鍛えます。即座にスコアとフィードバック、模範回答が表示されます。",
    Preview: InterviewDrillPreview,
  },
  {
    icon: MessageCircle,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    title: "模擬面接",
    description: "大学別のAPに基づいた質問でAIが面接練習。テキスト・音声どちらも対応。終了後にスコアと改善点が表示されます。",
    Preview: InterviewPreview,
  },
];

export function TutorialWalkthrough({ open, onComplete }: TutorialWalkthroughProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("tutorialCompleted", "true");
      setStep(0);
      onComplete();
    } else {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("tutorialCompleted", "true");
    setStep(0);
    onComplete();
  };

  const Icon = current.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) handleSkip(); }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader>
          <TutorialProgress currentStep={step} />
          <div className="flex items-center gap-3 pt-2">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${current.iconBg}`}>
              <Icon className={`size-5 ${current.iconColor}`} />
            </div>
            <div>
              <DialogTitle>{current.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {current.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <current.Preview />
          </motion.div>
        </AnimatePresence>

        <DialogFooter>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mr-auto"
          >
            スキップ
          </button>
          <Button onClick={handleNext} className="min-h-[44px]">
            {isLast ? (
              <>
                <Rocket className="size-4 mr-1" />
                はじめる
              </>
            ) : (
              <>
                次へ
                <ArrowRight className="size-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

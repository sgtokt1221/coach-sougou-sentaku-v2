"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface AnimatedButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "children">,
    VariantProps<typeof buttonVariants> {
  status: "idle" | "loading" | "success";
  idleText: string;
  loadingText?: string;
  successText?: string;
  idleIcon?: React.ReactNode;
  onStatusReset?: () => void;
}

export function AnimatedButton({
  status,
  idleText,
  loadingText = "保存中...",
  successText = "保存しました",
  idleIcon,
  onStatusReset,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "success" && onStatusReset) {
      timerRef.current = setTimeout(onStatusReset, 1500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, onStatusReset]);

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2 };

  return (
    <Button
      disabled={disabled || status === "loading"}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "loading" && (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="inline-flex items-center gap-1"
          >
            <Loader2 className="size-4 animate-spin" />
            {loadingText}
          </motion.span>
        )}
        {status === "success" && (
          <motion.span
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="inline-flex items-center gap-1 text-emerald-600"
          >
            <Check className="size-4" />
            {successText}
          </motion.span>
        )}
        {status === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="inline-flex items-center gap-1"
          >
            {idleIcon}
            {idleText}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

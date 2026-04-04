"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.3, ease: "easeOut" },
        }}
        exit={{
          opacity: 0,
          y: -8,
          transition: { duration: 0.15, ease: "easeIn" },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

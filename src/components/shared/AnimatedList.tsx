"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Children } from "react";

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export function AnimatedList({ children, className }: AnimatedListProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Children.map(children, (child) =>
        child ? <motion.div variants={itemVariants}>{child}</motion.div> : null
      )}
    </motion.div>
  );
}

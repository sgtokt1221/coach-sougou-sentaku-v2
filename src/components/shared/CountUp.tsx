"use client";

import { useEffect, useRef } from "react";
import {
  useMotionValue,
  useTransform,
  animate,
  motion,
  useReducedMotion,
  useInView,
} from "framer-motion";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  suffix?: string;
}

export function CountUp({
  value,
  duration = 0.8,
  decimals = 0,
  className,
  suffix,
}: CountUpProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );

  useEffect(() => {
    if (!isInView || shouldReduceMotion) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });
    return controls.stop;
  }, [isInView, value, duration, motionValue, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <span ref={ref} className={className}>
        {decimals > 0 ? value.toFixed(decimals) : value}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

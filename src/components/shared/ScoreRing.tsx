"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
  useReducedMotion,
} from "framer-motion";

interface ScoreRingProps {
  score: number;
  maxScore: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function getColor(ratio: number): string {
  if (ratio >= 0.7) return "var(--color-emerald-500)";
  if (ratio >= 0.4) return "var(--color-amber-500)";
  return "var(--color-rose-500)";
}

export function ScoreRing({
  score,
  maxScore,
  size = 80,
  strokeWidth = 6,
  label,
}: ScoreRingProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(score / maxScore, 1);

  const progress = useMotionValue(0);
  const dashoffset = useTransform(
    progress,
    (v: number) => circumference * (1 - v)
  );
  const displayScore = useTransform(progress, (v: number) =>
    Math.round(v * maxScore)
  );

  useEffect(() => {
    if (!isInView) return;
    if (prefersReducedMotion) {
      progress.set(ratio);
      return;
    }
    const controls = animate(progress, ratio, {
      duration: 1,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [isInView, ratio, progress, prefersReducedMotion]);

  const color = getColor(ratio);
  const center = size / 2;

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${label ? label + ": " : ""}${score}/${maxScore}`}
    >
      {/* Background ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--color-neutral-200)"
        strokeWidth={strokeWidth}
      />
      {/* Animated foreground ring */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: dashoffset }}
        transform={`rotate(-90 ${center} ${center})`}
      />
      {/* Score number */}
      <motion.text
        x={center}
        y={label ? center - 2 : center}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-bold"
        fontSize={size * 0.22}
      >
        {displayScore}
      </motion.text>
      {/* Label */}
      {label && (
        <text
          x={center}
          y={center + size * 0.15}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize={size * 0.11}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

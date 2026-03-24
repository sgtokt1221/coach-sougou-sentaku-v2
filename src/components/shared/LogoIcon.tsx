"use client";

import { motion } from "framer-motion";

interface LogoIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function LogoIcon({ size = 40, className = "", animate = false }: LogoIconProps) {
  const scale = size / 70;

  if (animate) {
    return (
      <motion.svg
        width={size}
        height={size * (60 / 70)}
        viewBox="0 0 70 60"
        xmlns="http://www.w3.org/2000/svg"
        className={`text-foreground ${className}`}
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <g transform={`translate(-5, 0) scale(1)`}>
          <path d="M5 30 L35 12 L65 30 L35 48 Z" fill="currentColor" />
          <path
            d="M15 36 V52 Q35 62 55 52 V36"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <circle cx="62" cy="12" r="9" fill="#10b981" />
          <path
            d="M62 8 V16 M58 12 H66"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </motion.svg>
    );
  }

  return (
    <svg
      width={size}
      height={size * (60 / 70)}
      viewBox="0 0 70 60"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-foreground ${className}`}
    >
      <g transform="translate(-5, 0) scale(1)">
        <path d="M5 30 L35 12 L65 30 L35 48 Z" fill="currentColor" />
        <path
          d="M15 36 V52 Q35 62 55 52 V36"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle cx="62" cy="12" r="9" fill="#10b981" />
        <path
          d="M62 8 V16 M58 12 H66"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

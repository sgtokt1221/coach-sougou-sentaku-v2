"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import { useEffect } from "react";

/** 結果画面などで共通に使う、ぬるっとした入り方の曲線 */
export const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 下から少し浮き上がって現れる。delay で並んだもの同士の出る順をずらす。
 * 動きを減らす設定の人には、最初から置いた状態で出す。
 */
export function Reveal({
  delay = 0,
  y = 14,
  children,
  ...rest
}: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  if (reduce)
    return (
      <div {...(rest as React.ComponentProps<"div">)}>
        {children as React.ReactNode}
      </div>
    );
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: SMOOTH_EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** ばねの動きで拡大して現れる（ランクバッジ用） */
export function PopIn({
  delay = 0,
  children,
  ...rest
}: { delay?: number } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  if (reduce)
    return (
      <div {...(rest as React.ComponentProps<"div">)}>
        {children as React.ReactNode}
      </div>
    );
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 14, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** 0 から value まで数え上がる。小数を持たない点数用 */
export function CountUp({
  value,
  delay = 0,
  duration = 1.1,
  className,
}: {
  value: number;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const shown = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, delay, ease: SMOOTH_EASE });
    return () => controls.stop();
  }, [value, delay, duration, reduce, mv]);
  return <motion.span className={className}>{shown}</motion.span>;
}

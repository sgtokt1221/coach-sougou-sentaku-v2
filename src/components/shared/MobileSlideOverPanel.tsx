"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { PanelRightOpen, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** 段階スナップの状態。closed=非表示 / peek=覗き(背景操作可) / full=全開(背景暗転) */
type SnapState = "closed" | "peek" | "full";

/** 覗き幅プリセット(vw) */
const PEEK_PRESETS = [
  { label: "狭", vw: 45 },
  { label: "中", vw: 60 },
  { label: "広", vw: 75 },
] as const;

/** ドラッグでスナップを1段動かすと判定する距離(px)としきい速度(px/s) */
const DRAG_OFFSET_THRESHOLD = 60;
const DRAG_VELOCITY_THRESHOLD = 500;

export interface MobileSlideOverPanelProps {
  /** 左端ハンドルのラベル（例「AI添削」「執筆サポート」） */
  label: string;
  /** パネル上部の見出し（任意） */
  title?: string;
  /** パネル内に描画する中身 */
  children: ReactNode;
  /** 覗き幅の初期値(vw)。既定 60。 */
  defaultPeekVw?: number;
}

/**
 * モバイル専用の段階スナップ式AIスライドパネル。
 *
 * 閉じ(closed) / 覗き(peek・背景暗転なし＝後ろの入力欄を操作しながら読める) /
 * 全開(full・背景暗転あり＝読む用) の3段階を、左端ハンドルのタップと
 * 左右ドラッグで切り替える。`document.body` 直下にポータルし、
 * PageTransition 等の transform/filter コンテナの影響を受けないようにする
 * (FloatingStudentChat 準拠)。PC (lg以上) では非表示。
 */
export function MobileSlideOverPanel({
  label,
  title,
  children,
  defaultPeekVw = 60,
}: MobileSlideOverPanelProps) {
  const [snap, setSnap] = useState<SnapState>("closed");
  const [peekVw, setPeekVw] = useState(defaultPeekVw);

  // body 直下へポータルするため、SSR では描画しない (FloatingStudentChat 準拠)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // マウント後のみ true にする同期更新のため維持する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  /** ドラッグ終了時、offset/velocity から1段だけ開閉方向を判定してスナップする */
  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const opensRight =
      info.offset.x > DRAG_OFFSET_THRESHOLD ||
      info.velocity.x > DRAG_VELOCITY_THRESHOLD;
    const closesLeft =
      info.offset.x < -DRAG_OFFSET_THRESHOLD ||
      info.velocity.x < -DRAG_VELOCITY_THRESHOLD;

    if (opensRight) {
      setSnap((prev) => (prev === "closed" ? "peek" : prev === "peek" ? "full" : prev));
    } else if (closesLeft) {
      setSnap((prev) => (prev === "full" ? "peek" : prev === "peek" ? "closed" : prev));
    }
  }

  /** 覗き幅プリセットを選択。closed/full からでも peek に移行する */
  function selectPeekPreset(vw: number) {
    setPeekVw(vw);
    if (snap !== "peek") setSnap("peek");
  }

  if (!mounted) return null;

  const panelWidth = snap === "full" ? "min(88vw, 26rem)" : `${peekVw}vw`;

  return createPortal(
    <div className="lg:hidden">
      {/* 左端ハンドル (closed のときのみ) */}
      <AnimatePresence>
        {snap === "closed" && (
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={() => setSnap("peek")}
            aria-label={`${label}を開く`}
            className="fixed left-0 top-2/3 z-[60] flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-r-2xl border border-l-0 bg-primary px-1.5 py-3 text-primary-foreground shadow-lg"
          >
            <PanelRightOpen className="size-4" />
            <span
              className="text-[11px] font-medium tracking-wide"
              style={{ writingMode: "vertical-rl" }}
            >
              {label}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* バックドロップ (full のときのみ・背景暗転あり) */}
      <AnimatePresence>
        {snap === "full" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSnap("peek")}
            className="fixed inset-0 z-[59] bg-black/30"
          />
        )}
      </AnimatePresence>

      {/* パネル本体 */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        animate={{
          x: snap === "closed" ? "-100%" : 0,
          width: panelWidth,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed left-0 top-0 z-[60] flex h-full flex-col rounded-r-2xl bg-background shadow-xl"
        style={{
          paddingTop: "var(--app-safe-top)",
          paddingBottom: "calc(var(--app-bottom-nav-height) + var(--app-safe-bottom))",
        }}
      >
        {/* 上部バー */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
          <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
          <div className="flex items-center gap-1.5">
            {PEEK_PRESETS.map((preset) => (
              <button
                key={preset.vw}
                type="button"
                onClick={() => selectPeekPreset(preset.vw)}
                aria-label={`覗き幅を${preset.label}にする`}
                className={cn(
                  "rounded-md px-1.5 py-1 text-xs font-medium transition-colors",
                  snap === "peek" && peekVw === preset.vw
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSnap("full")}
              aria-label="全開にする"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            >
              <Maximize2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setSnap("closed")}
              aria-label="閉じる"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 本体 (内部スクロール) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {children}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

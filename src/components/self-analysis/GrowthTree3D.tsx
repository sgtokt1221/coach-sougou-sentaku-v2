"use client";

/**
 * 自己分析の 7 ステップ進捗を WebGL (React Three Fiber) で描く 3D の木。
 * SSR 不可 (Canvas を含む): 呼び出し側で `dynamic(..., { ssr: false })` すること。
 *
 * 前回の失敗を踏まえた設計:
 * - 果実は最初から scale=1 で描画、opacity と emissiveIntensity だけ spring で fade
 * - Environment preset は使わず ambientLight + directionalLight の素直な setup
 * - Canvas 背景は明るい空色に固定
 * - Bloom は控えめ (intensity=0.5)
 * - 未完了の果実も見えるよう 0.4 までの opacity で残す
 *
 * デザイン: Pixar 風の Low-Poly。温かみのある色味、果実が光る、蝶が飛ぶ。
 */

import { Suspense, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  Sparkles,
  ContactShadows,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { SELF_ANALYSIS_STEPS } from "@/lib/types/self-analysis";
import { FRUIT_META, formatStepDataForTooltip } from "./tree-shared";

interface GrowthTree3DProps {
  completedSteps: number;
  currentStep?: number;
  stepsData?: Record<number, Record<string, unknown>>;
  onFruitClick?: (step: number) => void;
  className?: string;
  height?: number;
}

// ---------------------------------------------------------------------
// 幹 + 主枝
// ---------------------------------------------------------------------
function Trunk() {
  return (
    <group>
      {/* 主幹 */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.38, 2.3, 14]} />
        <meshStandardMaterial color="#6b3d1c" roughness={0.85} flatShading />
      </mesh>
      {/* 幹の上部 (細く) */}
      <mesh position={[0, 2.45, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 0.6, 12]} />
        <meshStandardMaterial color="#7c4a20" roughness={0.85} flatShading />
      </mesh>
      {/* 左の太枝 */}
      <mesh position={[-0.45, 2.1, 0.05]} rotation={[0, 0, 0.85]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 1.0, 10]} />
        <meshStandardMaterial color="#6b3d1c" roughness={0.85} flatShading />
      </mesh>
      {/* 右の太枝 */}
      <mesh position={[0.5, 2.1, 0]} rotation={[0, 0, -0.95]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 1.0, 10]} />
        <meshStandardMaterial color="#6b3d1c" roughness={0.85} flatShading />
      </mesh>
      {/* 前方の細枝 */}
      <mesh position={[0.15, 2.3, 0.4]} rotation={[0.6, 0, -0.3]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, 0.7, 8]} />
        <meshStandardMaterial color="#6b3d1c" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------
// 葉の塊 (Low Poly Icosphere を複数配置)
// ---------------------------------------------------------------------
function Foliage() {
  // グリーンのバリエーションを複数配置
  const clusters = useMemo(
    () =>
      [
        { pos: [0, 3.25, 0] as [number, number, number], r: 1.15, color: "#22c55e" },
        { pos: [-1.25, 2.9, 0.15] as [number, number, number], r: 0.92, color: "#16a34a" },
        { pos: [1.25, 2.9, -0.1] as [number, number, number], r: 0.95, color: "#16a34a" },
        { pos: [0.2, 3.7, -0.25] as [number, number, number], r: 0.85, color: "#4ade80" },
        { pos: [-0.55, 2.5, 0.7] as [number, number, number], r: 0.75, color: "#86efac" },
        { pos: [0.75, 2.55, 0.6] as [number, number, number], r: 0.78, color: "#86efac" },
        { pos: [-1.55, 2.35, -0.35] as [number, number, number], r: 0.62, color: "#15803d" },
        { pos: [1.6, 2.3, -0.25] as [number, number, number], r: 0.64, color: "#15803d" },
        { pos: [0.1, 2.15, 0.95] as [number, number, number], r: 0.55, color: "#4ade80" },
        { pos: [0, 3.95, 0.1] as [number, number, number], r: 0.6, color: "#22c55e" },
      ] as const,
    [],
  );

  return (
    <group>
      {clusters.map((c, i) => (
        <mesh key={i} position={c.pos} castShadow receiveShadow>
          <icosahedronGeometry args={[c.r, 1]} />
          <meshStandardMaterial color={c.color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------
// 果実 1 個
// ---------------------------------------------------------------------
interface FruitProps {
  index: number;
  isDone: boolean;
  isCurrent: boolean;
  color: string;
  position: [number, number, number];
  onHover: (idx: number | null) => void;
  onClick: () => void;
  isHovered: boolean;
}

function Fruit({
  index,
  isDone,
  isCurrent,
  color,
  position,
  onHover,
  onClick,
  isHovered,
}: FruitProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // scale/emissive を spring で補間。未完了でも小さく見せる (scale 0.5)
  const { displayScale, emissiveI, matOpacity } = useSpring({
    displayScale: isDone ? (isHovered ? 1.35 : 1.0) : 0.5,
    emissiveI: isDone ? (isCurrent ? 1.3 : 0.65) : 0.05,
    matOpacity: isDone ? 1 : 0.55,
    delay: isDone ? index * 120 : 0,
    config: { tension: 170, friction: 13 },
  });

  useFrame((_, delta) => {
    if (meshRef.current && isDone) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  // 果実本体のサイズを大きめに (0.22 → 0.28)
  const baseRadius = 0.28;

  return (
    <Float speed={1.5} rotationIntensity={0.12} floatIntensity={isDone ? 0.3 : 0.05}>
      <animated.group position={position} scale={displayScale}>
        {/* 地面への影リング */}
        {isDone && (
          <mesh position={[0, -baseRadius - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseRadius * 0.7, baseRadius * 1.1, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        )}

        {/* 実本体 */}
        <mesh
          ref={meshRef}
          castShadow
          onPointerOver={(e) => {
            e.stopPropagation();
            if (isDone) {
              onHover(index);
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isDone) onClick();
          }}
        >
          <sphereGeometry args={[baseRadius, 32, 32]} />
          <animated.meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveI}
            roughness={0.3}
            metalness={0.2}
            transparent
            opacity={matOpacity}
          />
        </mesh>

        {/* 果実のヘタ */}
        {isDone && (
          <>
            <mesh position={[0.02, baseRadius + 0.04, 0]}>
              <cylinderGeometry args={[0.015, 0.022, 0.09, 6]} />
              <meshStandardMaterial color="#4a2810" />
            </mesh>
            <mesh position={[0.1, baseRadius + 0.06, 0]} rotation={[0, 0, -0.7]}>
              <coneGeometry args={[0.06, 0.14, 6]} />
              <meshStandardMaterial color="#16a34a" flatShading />
            </mesh>
          </>
        )}

        {/* キラキラ */}
        {isDone && (
          <Sparkles
            count={isCurrent ? 16 : 8}
            scale={1.0}
            size={isCurrent ? 5 : 3}
            speed={0.5}
            color={color}
          />
        )}
      </animated.group>
    </Float>
  );
}

// ---------------------------------------------------------------------
// 蝶 (2 匹 + 円周を巡回するシンプルな平面)
// ---------------------------------------------------------------------
function Butterfly({
  radius,
  yBase,
  speed,
  color,
  phase,
}: {
  radius: number;
  yBase: number;
  speed: number;
  color: string;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = yBase + Math.sin(t * 2) * 0.15;
    ref.current.rotation.y = -t + Math.PI / 2;
    // 羽ばたき
    const flap = Math.sin(t * 12) * 0.5;
    if (ref.current.children[0]) {
      (ref.current.children[0] as THREE.Mesh).rotation.y = flap;
    }
    if (ref.current.children[1]) {
      (ref.current.children[1] as THREE.Mesh).rotation.y = -flap;
    }
  });

  return (
    <group ref={ref}>
      {/* 左翼 */}
      <mesh position={[-0.08, 0, 0]}>
        <planeGeometry args={[0.16, 0.12]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      {/* 右翼 */}
      <mesh position={[0.08, 0, 0]}>
        <planeGeometry args={[0.16, 0.12]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      {/* 胴体 */}
      <mesh>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------
// シーン全体
// ---------------------------------------------------------------------
interface SceneProps {
  completedSteps: number;
  currentStep?: number;
  hoveredStep: number | null;
  setHoveredStep: (n: number | null) => void;
  onFruitClick: (step: number) => void;
}

function Scene({
  completedSteps,
  currentStep,
  hoveredStep,
  setHoveredStep,
  onFruitClick,
}: SceneProps) {
  const allDone = completedSteps >= 7;

  return (
    <>
      {/* ライティング */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={allDone ? 1.6 : 1.3}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      {/* 逆光 (軽い rim light) */}
      <directionalLight position={[-5, 4, -5]} intensity={0.4} color="#fef3c7" />

      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial color="#86efac" roughness={0.95} />
      </mesh>

      {/* 地面の周囲を暗く (vignette 的に) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[4.5, 5.5, 48]} />
        <meshBasicMaterial color="#16a34a" transparent opacity={0.35} />
      </mesh>

      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={10} blur={2.5} far={5} />

      {/* 木 */}
      <Trunk />
      <Foliage />

      {/* 果実 */}
      {FRUIT_META.map((meta, i) => {
        const stepNum = i + 1;
        const isDone = stepNum <= completedSteps;
        const isCurrent = stepNum === currentStep;
        return (
          <Fruit
            key={stepNum}
            index={i}
            isDone={isDone}
            isCurrent={isCurrent}
            color={meta.color}
            position={meta.pos3d}
            onHover={setHoveredStep}
            onClick={() => onFruitClick(stepNum)}
            isHovered={hoveredStep === stepNum}
          />
        );
      })}

      {/* 全完了時の周囲のキラキラ */}
      {allDone && <Sparkles count={60} scale={8} size={5} speed={0.5} color="#fde047" />}

      {/* 蝶 */}
      <Butterfly radius={2.8} yBase={2.3} speed={0.45} color="#f9a8d4" phase={0} />
      <Butterfly radius={3.2} yBase={1.8} speed={0.35} color="#a5b4fc" phase={Math.PI} />

      {/* カメラ制御 */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.55}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 2.3, 0]}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// 外側 React コンポーネント
// ---------------------------------------------------------------------
export function GrowthTree3D({
  completedSteps,
  currentStep,
  stepsData,
  onFruitClick,
  className,
  height = 380,
}: GrowthTree3DProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const hoveredMeta =
    hoveredStep != null ? SELF_ANALYSIS_STEPS.find((s) => s.step === hoveredStep) : null;
  const hoveredFruit = hoveredStep != null ? FRUIT_META[hoveredStep - 1] : null;
  const hoveredData =
    hoveredStep != null ? formatStepDataForTooltip(stepsData?.[hoveredStep]) : [];

  return (
    <div
      className={cn(
        "relative rounded-2xl border overflow-hidden shadow-sm",
        "bg-gradient-to-b from-sky-200/70 via-sky-100/50 to-emerald-100/40 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/30",
        className,
      )}
    >
      {/* ヘッダー */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-baseline justify-between pointer-events-none">
        <h2 className="text-sm font-semibold text-foreground/80">自己分析の木</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums bg-background/70 backdrop-blur-sm rounded-full px-2 py-0.5">
          {completedSteps} / 7 実っています
        </span>
      </div>

      <div style={{ height }} className="w-full">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 3.2, 8.5], fov: 38 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#e0f2fe"]} />
          <fog attach="fog" args={["#e0f2fe", 10, 20]} />
          <Suspense fallback={null}>
            <Scene
              completedSteps={completedSteps}
              currentStep={currentStep}
              hoveredStep={hoveredStep}
              setHoveredStep={setHoveredStep}
              onFruitClick={(step) => onFruitClick?.(step)}
            />
            <EffectComposer>
              <Bloom
                luminanceThreshold={0.55}
                luminanceSmoothing={0.9}
                intensity={0.5}
                mipmapBlur
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* ツールチップ (DOM オーバーレイ) */}
      {hoveredStep != null && hoveredMeta && hoveredFruit && (
        <div className="pointer-events-none absolute z-20 left-1/2 bottom-20 -translate-x-1/2 w-[280px] rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-block size-2.5 rounded-full shadow-sm"
              style={{
                backgroundColor: hoveredFruit.color,
                boxShadow: `0 0 8px ${hoveredFruit.color}`,
              }}
            />
            <p className="text-xs font-semibold text-foreground">{hoveredMeta.title}</p>
            <span className="ml-auto text-[10px] text-muted-foreground">クリックで編集</span>
          </div>
          {hoveredData.length > 0 ? (
            <ul className="space-y-1">
              {hoveredData.map((entry, i) => (
                <li key={i} className="text-[11px] leading-snug">
                  <span className="text-muted-foreground">{entry.key}: </span>
                  <span className="text-foreground">
                    {entry.value.length > 80 ? entry.value.slice(0, 80) + "…" : entry.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">保存された内容はありません</p>
          )}
        </div>
      )}

      {/* 下部: 完了したセクションのラベル */}
      <div className="relative z-10 p-3 flex flex-wrap gap-1 justify-center bg-gradient-to-t from-background/80 to-transparent">
        {SELF_ANALYSIS_STEPS.map((s, i) => {
          const isDone = s.step <= completedSteps;
          const isCurrent = s.step === currentStep;
          return (
            <span
              key={s.step}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-500",
                isDone
                  ? "bg-background/80 text-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground/50",
                isCurrent && !isDone && "ring-1 ring-primary/40",
              )}
            >
              <span
                className="inline-block size-1.5 rounded-full"
                style={{
                  backgroundColor: isDone ? FRUIT_META[i].color : "#d4d4d8",
                  boxShadow: isDone ? `0 0 6px ${FRUIT_META[i].color}` : undefined,
                }}
              />
              {s.title}
            </span>
          );
        })}
      </div>
    </div>
  );
}

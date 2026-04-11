"use client";

/**
 * 自己分析の 7 ステップ進捗を WebGL (React Three Fiber) で描く 3D の木。
 *
 * SSR 不可: 呼び出し側で `dynamic(() => ..., { ssr: false })` すること。
 *
 * 主な要素:
 * - 手続き生成のローポリ木 (幹 + 枝 + Icosphere の葉塊)
 * - 7 個の光る果実 (emissive + bloom + react-spring でバネ補間出現)
 * - `<Float>` でフワフワ、`<Sparkles>` でキラキラ
 * - ホバーで 3D 空間追従のツールチップ (`<Html>`)
 * - `OrbitControls` で自動回転 + ドラッグ回転
 * - `frameloop="demand"` で静止時は描画停止、mobile でも軽量
 */

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  Sparkles,
  Html,
  Environment,
  AdaptiveDpr,
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
  className?: string;
  /** ダッシュボード等で小さく埋め込む場合は height を下げる */
  height?: number;
}

// ---------------------------------------------------------------------
// 木本体 (幹 + 枝 + 葉)
// ---------------------------------------------------------------------
function Trunk() {
  return (
    <group>
      {/* 主幹 */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.32, 2.2, 14]} />
        <meshStandardMaterial color="#7c4a20" roughness={0.85} />
      </mesh>
      {/* 幹のテクスチャ感: 太い枝 */}
      <mesh position={[-0.5, 1.9, 0.1]} rotation={[0, 0, 0.9]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1.0, 10]} />
        <meshStandardMaterial color="#7c4a20" roughness={0.85} />
      </mesh>
      <mesh position={[0.55, 1.95, 0]} rotation={[0, 0, -1.0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1.0, 10]} />
        <meshStandardMaterial color="#7c4a20" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 0.8, 10]} />
        <meshStandardMaterial color="#7c4a20" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Foliage() {
  // 葉の塊を icosahedron で複数配置
  const clusters = useMemo(
    () => [
      { pos: [0, 3.0, 0] as [number, number, number], r: 1.1, color: "#22c55e" },
      { pos: [-1.2, 2.7, 0.2] as [number, number, number], r: 0.85, color: "#16a34a" },
      { pos: [1.2, 2.7, -0.1] as [number, number, number], r: 0.9, color: "#16a34a" },
      { pos: [0.2, 3.5, -0.2] as [number, number, number], r: 0.8, color: "#22c55e" },
      { pos: [-0.5, 2.3, 0.6] as [number, number, number], r: 0.7, color: "#4ade80" },
      { pos: [0.7, 2.4, 0.5] as [number, number, number], r: 0.75, color: "#4ade80" },
      { pos: [-1.5, 2.2, -0.3] as [number, number, number], r: 0.6, color: "#15803d" },
      { pos: [1.5, 2.1, -0.2] as [number, number, number], r: 0.6, color: "#15803d" },
    ],
    [],
  );

  return (
    <group>
      {clusters.map((c, i) => (
        <mesh key={i} position={c.pos} castShadow receiveShadow>
          <icosahedronGeometry args={[c.r, 1]} />
          <meshStandardMaterial color={c.color} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------
// 果実 (1 個)
// ---------------------------------------------------------------------
interface FruitProps {
  index: number;
  isDone: boolean;
  isCurrent: boolean;
  color: string;
  position: [number, number, number];
  onHover: (idx: number | null) => void;
  isHovered: boolean;
}

function Fruit({ index, isDone, isCurrent, color, position, onHover, isHovered }: FruitProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { scale, emissiveIntensity } = useSpring({
    scale: isDone ? (isHovered ? 1.25 : 1) : 0.25,
    emissiveIntensity: isDone ? 0.8 : 0,
    delay: isDone ? index * 180 : 0,
    config: { tension: 200, friction: 14 },
  });

  // 軽く回転
  useFrame((_, delta) => {
    if (meshRef.current && isDone) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.25}>
      <group position={position}>
        <animated.mesh
          ref={meshRef}
          scale={scale}
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
        >
          <sphereGeometry args={[0.22, 32, 32]} />
          <animated.meshStandardMaterial
            color={isDone ? color : "#6b7280"}
            emissive={isDone ? color : "#000000"}
            emissiveIntensity={emissiveIntensity}
            roughness={0.35}
            metalness={0.1}
          />
        </animated.mesh>

        {/* 葉 (果実の上の小さな葉) */}
        {isDone && (
          <mesh position={[0.08, 0.22, 0]} rotation={[0, 0, 0.4]}>
            <coneGeometry args={[0.05, 0.12, 6]} />
            <meshStandardMaterial color="#16a34a" roughness={0.6} />
          </mesh>
        )}

        {/* きらめき */}
        {isDone && (
          <Sparkles
            count={isCurrent ? 12 : 6}
            scale={0.7}
            size={isCurrent ? 3 : 2}
            speed={0.5}
            color={color}
          />
        )}
      </group>
    </Float>
  );
}

// ---------------------------------------------------------------------
// シーン全体
// ---------------------------------------------------------------------
interface SceneProps extends Omit<GrowthTree3DProps, "className" | "height"> {
  hoveredStep: number | null;
  setHoveredStep: (n: number | null) => void;
}

function Scene({ completedSteps, currentStep, hoveredStep, setHoveredStep }: SceneProps) {
  const allDone = completedSteps >= 7;

  return (
    <>
      {/* ライティング */}
      <ambientLight intensity={0.55} />
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
      <Environment preset="sunset" />

      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#a7f3d0" roughness={0.9} />
      </mesh>

      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={8} blur={2} far={4} />

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
            isHovered={hoveredStep === stepNum}
          />
        );
      })}

      {/* 全完了時の周囲のキラキラ */}
      {allDone && (
        <Sparkles count={40} scale={6} size={4} speed={0.4} color="#fde047" />
      )}

      {/* カメラ制御 */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 2.2, 0]}
      />
    </>
  );
}

// ---------------------------------------------------------------------
// 外側の React コンポーネント
// ---------------------------------------------------------------------
export function GrowthTree3D({
  completedSteps,
  currentStep,
  stepsData,
  className,
  height = 320,
}: GrowthTree3DProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const hoveredMeta = hoveredStep != null ? SELF_ANALYSIS_STEPS.find((s) => s.step === hoveredStep) : null;
  const hoveredFruit = hoveredStep != null ? FRUIT_META[hoveredStep - 1] : null;
  const hoveredData = hoveredStep != null ? formatStepDataForTooltip(stepsData?.[hoveredStep]) : [];

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-gradient-to-b from-sky-50/60 via-emerald-50/40 to-amber-50/40 dark:from-slate-900/60 dark:via-emerald-950/40 dark:to-slate-900/60 overflow-hidden",
        className,
      )}
    >
      {/* ヘッダー */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-baseline justify-between pointer-events-none">
        <h2 className="text-sm font-semibold text-foreground/80">自己分析の木</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums bg-background/60 backdrop-blur-sm rounded-full px-2 py-0.5">
          {completedSteps} / 7 実っています
        </span>
      </div>

      <div style={{ height }} className="w-full">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 3, 8], fov: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          frameloop="always"
        >
          <color attach="background" args={["#00000000"]} />
          <Suspense fallback={null}>
            <Scene
              completedSteps={completedSteps}
              currentStep={currentStep}
              stepsData={stepsData}
              hoveredStep={hoveredStep}
              setHoveredStep={setHoveredStep}
            />
            <EffectComposer>
              <Bloom
                luminanceThreshold={0.6}
                luminanceSmoothing={0.85}
                intensity={0.9}
                mipmapBlur
              />
            </EffectComposer>
            <AdaptiveDpr pixelated />
          </Suspense>
        </Canvas>
      </div>

      {/* ツールチップ (DOM オーバーレイ版) */}
      {hoveredStep != null && hoveredMeta && hoveredFruit && (
        <div
          className="pointer-events-none absolute z-20 left-1/2 bottom-4 -translate-x-1/2 w-[280px] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-block size-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: hoveredFruit.color, boxShadow: `0 0 8px ${hoveredFruit.color}` }}
            />
            <p className="text-xs font-semibold text-foreground">{hoveredMeta.title}</p>
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

      {/* 下部: 完了したセクションのラベル (SVG 版と同じ) */}
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
                style={{ backgroundColor: isDone ? FRUIT_META[i].color : "#d4d4d8" }}
              />
              {s.title}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Html と OrbitControls は実装で使わないが、型チェックで警告が出ないよう参照だけ残す
void Html;
